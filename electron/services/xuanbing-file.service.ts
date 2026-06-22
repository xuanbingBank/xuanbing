/**
 * @file .xuanbing 文件服务，负责文件引用管理、读取预览、校验、导出、导入。
 *
 * renderer 不直接持有文件路径，通过 fileRef（token）操作。
 * fileRef 有过期时间。
 */

import { randomUUID } from 'node:crypto'
import path from 'node:path'
import fs from 'node:fs'
import { readXuanbingFile, readXuanbingFilePreview } from '../file-db/xuanbing-file-reader'
import { validateFile } from '../file-db/xuanbing-file-validator'
import { dryRunImport, importPackage } from '../file-db/xuanbing-file-importer'
import { exportToPath } from '../file-db/xuanbing-file-exporter'
import { ensureNotDatabaseFile, ensureXuanbingExtension } from '../file-db/safe-file-path'
import { AuditRepository } from '../repositories/audit.repository'
import { nowIso } from '../repositories/base.repository'
import { throwDbError } from '../ipcBus/shared/database'
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

  public constructor(options: { dbFile: string; appVersion: string }) {
    this.dbFile = options.dbFile
    this.appVersion = options.appVersion
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
   * @returns 文件路径与记录。
   */
  private resolveRef(token: string): { filePath: string; record: FileRefRecord } {
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

    return { filePath: record.filePath, record }
  }

  /**
   * 读取文件预览（不返回敏感 payload）。
   *
   * @param fileRef 文件引用。
   * @returns 文件预览。
   */
  readPreview(fileRef: XuanbingFileRef): FileReadPreview {
    const { filePath } = this.resolveRef(fileRef.token)
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
    const { filePath } = this.resolveRef(fileRef.token)
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
  exportPackage(
    filePath: string,
    type: XuanbingFileType,
    metadata?: { name?: string; description?: string; author?: string; tags?: string[] },
    redact?: boolean
  ): ExportPackageResult {
    ensureXuanbingExtension(filePath)
    ensureNotDatabaseFile(filePath, this.dbFile)

    const result = exportToPath(filePath, type, this.appVersion, metadata, redact)

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
    const { filePath } = this.resolveRef(fileRef.token)
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
    const { filePath } = this.resolveRef(fileRef.token)
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
   * @returns 文件路径。
   */
  resolveFilePath(token: string): string {
    const { filePath } = this.resolveRef(token)
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
   * 撤销文件引用。
   *
   * @param token 文件引用 token。
   */
  revokeRef(token: string): void {
    this.refs.delete(token)
  }
}

// 引入 nowIso 避免未使用警告
void nowIso
