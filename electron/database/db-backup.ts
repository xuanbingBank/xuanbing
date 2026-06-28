/**
 * @file 数据库备份。
 *
 * 1. 手动备份。
 * 2. migration 前备份。
 * 3. 文件名包含时间。
 * 4. 保留最近 N 个。
 * 5. 支持校验和清理。
 */

import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import Database from 'better-sqlite3'
import { getConnection } from './db-connection'
import { createBackupFileName } from './db-path'
import { throwDbError, MAX_BACKUPS_TO_KEEP } from '../ipcBus/shared/database'
import type { DbPaths } from './db-path'

/**
 * 备份选项。
 */
export interface BackupOptions {
  /** 备份文件名前缀。 */
  prefix?: string
  /** 备份后是否校验。 */
  verify?: boolean
}

/**
 * 备份结果。
 */
export interface BackupResult {
  backupPath: string
  backupName: string
  size: number
  sha256: string
  createdAt: string
}

/**
 * 对指定文件执行 fsync 后关闭，确保数据落盘。
 *
 * Windows 上对只读 fd 调用 fsync 可能返回 EPERM（已知平台差异），
 * 此时降级为告警：copyFileSync 已完成文件写入，fsync 仅影响崩溃一致性，
 * 不影响备份文件本身的完整性。
 *
 * @param filePath 目标文件路径。
 */
function fsyncFile(filePath: string): void {
  const fd = fs.openSync(filePath, 'r')
  try {
    fs.fsyncSync(fd)
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === 'EPERM' || code === 'ENOTSUP' || code === 'ENOSYS') {
      console.warn('[db-backup] fsync unsupported on this platform, skipped', filePath, code)
    } else {
      throw err
    }
  } finally {
    fs.closeSync(fd)
  }
}

/**
 * 使用 WAL checkpoint + 文件复制创建一致性备份（同步）。
 *
 * 1. 执行 PRAGMA wal_checkpoint(TRUNCATE) 将 WAL 内容刷入主库。
 * 2. 使用 fs.copyFileSync 复制数据库文件到备份目录。
 *
 * TODO: 此函数全程使用同步 IO（copyFileSync / readFileSync / statSync），
 * 大库会阻塞 Electron 主线程。后续建议将整体备份流程移至 Worker 线程，
 * 或改用 better-sqlite3 的 backup API 在独立连接上执行。
 *
 * @param paths 数据库路径集合。
 * @param options 备份选项。
 * @returns 备份结果。
 */
export function backupDatabase(paths: DbPaths, options: BackupOptions = {}): BackupResult {
  const conn = getConnection()
  const backupName = createBackupFileName(options.prefix ?? 'app')
  const backupPath = path.join(paths.backupsDir, backupName)

  // 确保备份目录存在
  if (!fs.existsSync(paths.backupsDir)) {
    fs.mkdirSync(paths.backupsDir, { recursive: true })
  }

  try {
    // 强制 WAL checkpoint，将所有未写入主库的页刷入主库文件
    conn.raw.pragma('wal_checkpoint(TRUNCATE)')
    // 原子化复制：先写 .tmp 再 rename，崩溃时只留 .tmp 不污染目标备份
    const tmpPath = backupPath + '.tmp'
    fs.copyFileSync(conn.dbFile, tmpPath)
    // fsync .tmp 确保数据落盘后再 rename，避免崩溃后最终备份为半写入状态
    fsyncFile(tmpPath)
    fs.renameSync(tmpPath, backupPath)
    // fsync 最终备份文件，保证文件内容持久化到磁盘
    fsyncFile(backupPath)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throwDbError('DB_BACKUP_FAILED', 'Failed to create database backup.', {
      retryable: true,
      severity: 'high',
      safeDetail: { reason: 'backup_transfer_failed' },
      devDetail: message,
      cause: message
    })
  }

  const stat = fs.statSync(backupPath)
  const buffer = fs.readFileSync(backupPath)
  const sha256 = createHash('sha256').update(buffer).digest('hex')

  // 备份后可选校验：以只读打开执行 integrity_check，确保备份可读且结构完整
  if (options.verify) {
    if (!verifyBackup(backupPath)) {
      throwDbError('DB_BACKUP_FAILED', 'Backup verification failed.', {
        retryable: true,
        severity: 'high',
        safeDetail: { reason: 'verify_failed' }
      })
    }
  }

  // 清理旧备份，保留最近 N 个
  cleanupOldBackups(paths, MAX_BACKUPS_TO_KEEP)

  return {
    backupPath,
    backupName,
    size: stat.size,
    sha256,
    createdAt: new Date().toISOString()
  }
}

/**
 * 清理旧备份，保留最近 N 个。
 *
 * @param paths 数据库路径集合。
 * @param keep 保留数量。
 */
export function cleanupOldBackups(paths: DbPaths, keep: number): void {
  if (!fs.existsSync(paths.backupsDir)) {
    return
  }

  // 清理崩溃残留的 .sqlite.tmp 文件（原子复制未完成时遗留），不参与保留计数
  for (const name of fs.readdirSync(paths.backupsDir)) {
    if (name.endsWith('.sqlite.tmp')) {
      const tmpPath = path.join(paths.backupsDir, name)
      try {
        fs.unlinkSync(tmpPath)
      } catch (err) {
        console.warn('[db-backup] cleanupOldBackups unlink tmp failed', tmpPath, err)
      }
    }
  }

  const entries = fs.readdirSync(paths.backupsDir)
    .filter((name) => name.endsWith('.sqlite'))
    .map((name) => {
      const filePath = path.join(paths.backupsDir, name)
      const stat = fs.statSync(filePath)
      return { name, filePath, mtime: stat.mtimeMs }
    })
    .sort((a, b) => b.mtime - a.mtime)

  const toDelete = entries.slice(keep)
  for (const entry of toDelete) {
    try {
      fs.unlinkSync(entry.filePath)
    } catch (err) {
      console.warn('[db-backup] cleanupOldBackups unlink failed', entry.filePath, err)
    }
  }
}

/**
 * 列出全部备份。
 *
 * @param paths 数据库路径集合。
 * @returns 备份列表。
 */
export function listBackups(paths: DbPaths): Array<{
  name: string
  path: string
  size: number
  createdAt: string
}> {
  if (!fs.existsSync(paths.backupsDir)) {
    return []
  }

  return fs.readdirSync(paths.backupsDir)
    .filter((name) => name.endsWith('.sqlite'))
    .map((name) => {
      const filePath = path.join(paths.backupsDir, name)
      const stat = fs.statSync(filePath)
      return {
        name,
        path: filePath,
        size: stat.size,
        createdAt: stat.mtime.toISOString()
      }
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/**
 * 获取最近一次备份时间。
 *
 * @param paths 数据库路径集合。
 * @returns 最近备份时间 ISO string，无备份返回 null。
 */
export function getLatestBackupTime(paths: DbPaths): string | null {
  const backups = listBackups(paths)
  return backups.length > 0 ? backups[0].createdAt : null
}

/**
 * 校验备份文件完整性（尝试以只读打开并执行 integrity_check）。
 *
 * @param backupPath 备份文件路径。
 * @returns 是否校验通过。
 */
export function verifyBackup(backupPath: string): boolean {
  let db: { pragma(name: string, options?: { simple?: boolean }): unknown; close(): void } | null = null
  try {
    db = new Database(backupPath, { readonly: true, fileMustExist: true })
    const result = db.pragma('integrity_check', { simple: true })
    return result === 'ok'
  } catch (err) {
    console.warn('[db-backup] verifyBackup failed', err)
    return false
  } finally {
    if (db) {
      try {
        db.close()
      } catch (err) {
        console.warn('[db-backup] verifyBackup close failed', err)
      }
    }
  }
}
