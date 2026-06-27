/**
 * @file .xuanbing 文件服务，负责文件引用管理、读取预览、校验、导出、导入。
 *
 * renderer 不直接持有文件路径，通过 fileRef（token）操作。
 * fileRef 有过期时间。
 */

import { randomUUID } from 'node:crypto'
import path from 'node:path'
import fs from 'node:fs'
import { app } from 'electron'
import { readXuanbingFile, readXuanbingFilePreview } from '../file-db/xuanbing-file-reader'
import { validateFile } from '../file-db/xuanbing-file-validator'
import { dryRunImport, importPackage } from '../file-db/xuanbing-file-importer'
import { exportToPath } from '../file-db/xuanbing-file-exporter'
import { ensureNotDatabaseFile, ensurePathWithinDir, ensureXuanbingExtension } from '../file-db/safe-file-path'
import { AuditRepository } from '../repositories/audit.repository'
import { throwDbError, DB_DIR_NAMES } from '../ipcBus/shared/database'
import type { XuanbingConflictStrategy } from '../ipcBus/shared/database'
import type {
  ExportPackageResult,
  FileReadPreview,
  ImportPlan,
  ImportResult,
  XuanbingFileRef
} from '../file-db/xuanbing-file-types'
import type { XuanbingFileType } from '../ipcBus/shared/database'

/**
 * 启动期清理标记，确保 cleanupTmpFiles 只在进程内首次使用 service 时执行一次。
 */
let tmpCleanupDone = false

/**
 * 清理 userData 目录下残留的 `.tmp-*` 临时文件。
 *
 * atomicWriteFile 在异常退出时可能留下 `.tmp-<uuid>-<name>` 残留文件，
 * 启动期一次性扫描删除，避免磁盘累积垃圾。
 *
 * 扫描范围：userData 顶层（非递归，避免遍历无关目录）+ 全部已知子目录
 * （db/backups/exports/imports/file-db/logs，递归清理，含 app-data 层）。
 *
 * @param userDataDir userData 目录绝对路径。
 */
function cleanupTmpFiles(userDataDir: string): void {
  const knownSubDirs = [
    DB_DIR_NAMES.db,
    DB_DIR_NAMES.backups,
    DB_DIR_NAMES.exports,
    DB_DIR_NAMES.imports,
    DB_DIR_NAMES.fileDb,
    DB_DIR_NAMES.logs
  ]

  const tryRemoveTmp = (fullPath: string, entry: string): void => {
    if (!entry.startsWith('.tmp-')) {
      return
    }
    try {
      if (fs.statSync(fullPath).isFile()) {
        fs.unlinkSync(fullPath)
      }
    } catch {
      // 忽略单个文件清理失败，不阻断启动
    }
  }

  // 1. userData 顶层（非递归，避免遍历无关目录）
  try {
    for (const entry of fs.readdirSync(userDataDir)) {
      tryRemoveTmp(path.join(userDataDir, entry), entry)
    }
  } catch {
    // 顶层读取失败忽略
  }

  // 2. 已知子目录（递归，覆盖 app-data 层与直接层）
  const cleanDirRecursive = (dir: string, depth: number): void => {
    // 限制递归深度，避免误入超大目录树
    if (depth > 3) {
      return
    }
    let entries: string[]
    try {
      entries = fs.readdirSync(dir)
    } catch {
      return
    }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry)
      let stat: ReturnType<typeof fs.statSync>
      try {
        stat = fs.statSync(fullPath)
      } catch {
        continue
      }
      if (stat.isDirectory()) {
        cleanDirRecursive(fullPath, depth + 1)
      } else if (stat.isFile()) {
        tryRemoveTmp(fullPath, entry)
      }
    }
  }

  for (const sub of knownSubDirs) {
    cleanDirRecursive(path.join(userDataDir, sub), 0)
    cleanDirRecursive(path.join(userDataDir, DB_DIR_NAMES.root, sub), 0)
  }
}

/**
 * 文件引用记录（main 进程内部）。
 */
interface FileRefRecord {
  token: string
  filePath: string
  displayName: string
  size: number
  expiresAt: number
  mode: 'read' | 'write'
}

/**
 * .xuanbing 文件服务。
 */
export class XuanbingFileService {
  private readonly auditRepo = new AuditRepository()
  private readonly refs = new Map<string, FileRefRecord>()
  private readonly dbFile: string
  private readonly appVersion: string
  /** 过期引用回收定时器 handle，便于退出时清理。 */
  private cleanupTimer: ReturnType<typeof setInterval> | undefined

  public constructor(options: { dbFile: string; appVersion: string }) {
    this.dbFile = options.dbFile
    this.appVersion = options.appVersion

    // 进程内首次实例化时清理 .tmp-* 残留文件
    if (!tmpCleanupDone) {
      tmpCleanupDone = true
      try {
        cleanupTmpFiles(app.getPath('userData'))
      } catch {
        // 清理失败不影响 service 正常使用
      }
    }

    // 每 5 分钟回收过期 fileRef，避免 refs Map 长期堆积
    this.cleanupTimer = setInterval(() => this.cleanupExpiredRefs(), 5 * 60 * 1000)
    // nodejs 中 unref 后定时器不会阻止进程退出
    this.cleanupTimer.unref?.()
  }

  /**
   * 注册文件引用（从 dialog 选择的路径生成 fileRef）。
   *
   * @param filePath 文件路径。
   * @param mode 读/写模式。
   * @returns 文件引用。
   */
  registerFileRef(filePath: string, mode: 'read' | 'write'): XuanbingFileRef {
    ensureXuanbingExtension(filePath)
    ensureNotDatabaseFile(filePath, this.dbFile)

    const token = randomUUID()
    const displayName = path.basename(filePath)
    let size = 0

    try {
      size = fs.statSync(filePath).size
    } catch {
      // 写入模式文件可能不存在
    }

    const expiresAt = Date.now() + 5 * 60 * 1000 // 5 分钟过期

    this.refs.set(token, {
      token,
      filePath,
      displayName,
      size,
      expiresAt,
      mode
    })

    return {
      token,
      displayName,
      size,
      expiresAt
    }
  }

  /**
   * 解析 fileRef token 为文件路径，过期或不存在则抛错。
   *
   * @param token 文件引用 token。
   * @param expectedMode 期望的读写模式，不匹配则抛错。
   * @returns 文件路径与记录。
   */
  private resolveRef(
    token: string,
    expectedMode?: 'read' | 'write'
  ): { filePath: string; record: FileRefRecord } {
    const record = this.refs.get(token)

    if (!record) {
      throwDbError('XUANBING_FILE_INVALID', 'File reference not found or expired.', {
        safeDetail: { reason: 'ref_not_found' }
      })
    }

    if (Date.now() > record.expiresAt) {
      this.refs.delete(token)
      throwDbError('XUANBING_FILE_INVALID', 'File reference has expired.', {
        safeDetail: { reason: 'ref_expired' }
      })
    }

    if (expectedMode && record.mode !== expectedMode) {
      throwDbError(
        'XUANBING_FILE_REF_INVALID',
        `Expected ${expectedMode} mode but got ${record.mode}.`,
        {
          severity: 'high',
          safeDetail: { reason: 'mode_mismatch', expected: expectedMode, got: record.mode }
        }
      )
    }

    return { filePath: record.filePath, record }
  }

  /**
   * 读取文件预览（不返回敏感 payload）。
   *
   * @param fileRef 文件引用。
   * @returns 文件预览。
   */
  readPreview(fileRef: XuanbingFileRef): FileReadPreview {
    const { filePath } = this.resolveRef(fileRef.token, 'read')
    const preview = readXuanbingFilePreview(filePath)

    return {
      fileRef,
      fileType: preview.fileType as XuanbingFileType,
      formatVersion: preview.formatVersion,
      schemaVersion: preview.schemaVersion,
      appVersion: preview.appVersion,
      metadata: preview.metadata,
      createdAt: preview.createdAt,
      updatedAt: preview.updatedAt,
      checksum: preview.checksum,
      payloadSize: preview.payloadSize,
      valid: preview.valid
    }
  }

  /**
   * 校验文件。
   *
   * @param fileRef 文件引用。
   * @returns 校验结果。
   */
  validate(fileRef: XuanbingFileRef): { valid: boolean; errors: string[] } {
    const { filePath } = this.resolveRef(fileRef.token, 'read')
    const file = readXuanbingFile(filePath)
    return validateFile(file)
  }

  /**
   * 导出包到指定路径（通过 saveDialog 获取路径后调用）。
   *
   * @param filePath 目标文件路径。
   * @param type 文件类型。
   * @param metadata 元数据。
   * @param redact 是否脱敏。
   * @returns 导出结果。
   */
  async exportPackage(
    filePath: string,
    type: XuanbingFileType,
    metadata?: { name?: string; description?: string; author?: string; tags?: string[] },
    redact?: boolean
  ): Promise<ExportPackageResult> {
    ensureXuanbingExtension(filePath)
    ensureNotDatabaseFile(filePath, this.dbFile)

    // 限制导出路径必须在允许的目录内（userData / downloads），防止路径穿越
    const allowedDirs = [app.getPath('userData'), app.getPath('downloads')]
    let matchedDir: string | undefined
    for (const dir of allowedDirs) {
      try {
        ensurePathWithinDir(filePath, dir)
        matchedDir = dir
        break
      } catch {
        // 尝试下一个允许目录
      }
    }
    if (!matchedDir) {
      throwDbError('XUANBING_FILE_PATH_FORBIDDEN', 'Export path is outside allowed directories.', {
        severity: 'high',
        safeDetail: { reason: 'outside_allowed_dirs' }
      })
    }

    const result = await exportToPath(filePath, type, this.appVersion, metadata, redact, matchedDir)

    this.auditRepo.create({
      actorType: 'system',
      actorId: 'xuanbing-file-service',
      action: 'export',
      entityType: 'xuanbing-file',
      entityId: filePath,
      after: { fileType: type, size: result.size, checksum: result.checksum }
    })

    const fileRef = this.registerFileRef(filePath, 'read')

    return {
      fileRef,
      fileType: result.fileType,
      size: result.size,
      checksum: result.checksum,
      exportedAt: result.exportedAt
    }
  }

  /**
   * dryRun 导入。
   *
   * @param fileRef 文件引用。
   * @param conflictStrategy 冲突策略。
   * @returns 导入计划。
   */
  dryRunImport(fileRef: XuanbingFileRef, conflictStrategy: XuanbingConflictStrategy = 'skip'): ImportPlan {
    const { filePath } = this.resolveRef(fileRef.token, 'read')
    return dryRunImport(filePath, fileRef, conflictStrategy)
  }

  /**
   * 正式导入。
   *
   * @param fileRef 文件引用。
   * @param plan 导入计划（必须先 dryRun）。
   * @returns 导入结果。
   */
  importPackage(fileRef: XuanbingFileRef, plan: ImportPlan): ImportResult {
    const { filePath } = this.resolveRef(fileRef.token, 'read')
    const result = importPackage(filePath, plan)

    this.auditRepo.create({
      actorType: 'system',
      actorId: 'xuanbing-file-service',
      action: 'import',
      entityType: 'xuanbing-file',
      entityId: filePath,
      after: { success: result.success, imported: result.imported, skipped: result.skipped, rolledBack: result.rolledBack },
      metadata: { errors: result.errors }
    })

    return result
  }

  /**
   * 解析 fileRef token 为文件路径（公开方法，供 IPC 层使用）。
   *
   * @param token 文件引用 token。
   * @param expectedMode 期望的读写模式，不匹配则抛错。
   * @returns 文件路径。
   */
  resolveFilePath(token: string, expectedMode?: 'read' | 'write'): string {
    const { filePath } = this.resolveRef(token, expectedMode)
    return filePath
  }

  /**
   * 清理过期文件引用。
   */
  cleanupExpiredRefs(): void {
    const now = Date.now()
    for (const [token, record] of this.refs) {
      if (now > record.expiresAt) {
        this.refs.delete(token)
      }
    }
  }

  /**
   * 释放资源：清理过期引用回收定时器，应在 app 退出（before-quit）时调用。
   */
  dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = undefined
    }
  }

  /**
   * 撤销文件引用。
   *
   * @param token 文件引用 token。
   */
  revokeRef(token: string): void {
    this.refs.delete(token)
  }
}
