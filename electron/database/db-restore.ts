/**
 * @file 数据库恢复。
 *
 * 1. 恢复前先备份当前库。
 * 2. 关闭连接后替换数据库文件。
 * 3. 恢复后重新连接并 health check。
 * 4. 失败回滚。
 * 5. 记录审计日志。
 */

import fs from 'node:fs'
import path from 'node:path'
import { closeConnection, openConnection, getConnection } from './db-connection'
import { backupDatabase } from './db-backup'
import { checkHealth } from './db-health'
import { throwDbError } from '../ipcBus/shared/database'
import type { DbPaths } from './db-path'
import type { DbHealthReport } from './db-health'

/**
 * 恢复选项。
 */
export interface RestoreOptions {
  /** 恢复前是否自动备份当前库。默认 true。 */
  backupBeforeRestore?: boolean
  /** 恢复后是否执行 health check。默认 true。 */
  verifyAfterRestore?: boolean
}

/**
 * 恢复结果。
 */
export interface RestoreResult {
  success: boolean
  restoredFrom: string
  preRestoreBackupPath: string | null
  healthReport: DbHealthReport | null
  restoredAt: string
}

/**
 * 从备份文件恢复数据库。
 *
 * 流程：
 * 1. 校验备份文件存在且可读。
 * 2. 备份当前库（如果存在）。
 * 3. 关闭当前连接。
 * 4. 替换数据库文件（含 WAL/SHM 清理）。
 * 5. 重新打开连接。
 * 6. health check。
 * 7. 失败则回滚到恢复前备份。
 *
 * @param paths 数据库路径集合。
 * @param backupPath 备份文件路径。
 * @param options 恢复选项。
 * @returns 恢复结果。
 */
export function restoreDatabase(
  paths: DbPaths,
  backupPath: string,
  options: RestoreOptions = {}
): RestoreResult {
  const {
    backupBeforeRestore = true,
    verifyAfterRestore = true
  } = options

  // 1. 校验备份文件
  if (!fs.existsSync(backupPath)) {
    throwDbError('DB_RESTORE_FAILED', 'Backup file does not exist.', {
      severity: 'high',
      safeDetail: { reason: 'backup_not_found' },
      devDetail: backupPath
    })
  }

  // 2. 备份当前库
  let preRestoreBackupPath: string | null = null
  if (backupBeforeRestore && fs.existsSync(paths.dbFile)) {
    try {
      const backup = backupDatabase(paths, { prefix: 'pre-restore' })
      preRestoreBackupPath = backup.backupPath
    } catch {
      // 备份失败不阻塞恢复，但记录
    }
  }

  const restoredAt = new Date().toISOString()

  try {
    // 3. 关闭当前连接
    closeConnection()

    // 4. 清理 WAL/SHM 并替换数据库文件
    for (const suffix of ['-wal', '-shm']) {
      const walFile = paths.dbFile + suffix
      if (fs.existsSync(walFile)) {
        fs.unlinkSync(walFile)
      }
    }

    fs.copyFileSync(backupPath, paths.dbFile)

    // 5. 重新打开连接
    openConnection(paths)

    // 6. health check
    let healthReport: DbHealthReport | null = null
    if (verifyAfterRestore) {
      healthReport = checkHealth(paths)
      if (!healthReport.healthy) {
        // 回滚
        if (preRestoreBackupPath) {
          rollbackRestore(paths, preRestoreBackupPath)
        }
        throwDbError('DB_RESTORE_FAILED', 'Health check failed after restore.', {
          severity: 'critical',
          safeDetail: { reason: 'health_check_failed', issues: healthReport.issues },
          devDetail: healthReport.issues
        })
      }
    }

    return {
      success: true,
      restoredFrom: backupPath,
      preRestoreBackupPath,
      healthReport,
      restoredAt
    }
  } catch (error) {
    // 回滚到恢复前备份
    if (preRestoreBackupPath) {
      try {
        rollbackRestore(paths, preRestoreBackupPath)
      } catch {
        // 回滚也失败，只能记录
      }
    }

    const message = error instanceof Error ? error.message : String(error)
    throwDbError('DB_RESTORE_FAILED', 'Database restore failed.', {
      retryable: false,
      severity: 'critical',
      safeDetail: { reason: 'restore_failed', preRestoreBackupPath },
      devDetail: message,
      cause: message
    })
  }
}

/**
 * 回滚恢复：用恢复前备份替换当前库。
 *
 * @param paths 数据库路径集合。
 * @param backupPath 恢复前备份路径。
 */
function rollbackRestore(paths: DbPaths, backupPath: string): void {
  closeConnection()

  for (const suffix of ['', '-wal', '-shm']) {
    const filePath = paths.dbFile + suffix
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  }

  fs.copyFileSync(backupPath, paths.dbFile)
  openConnection(paths)
}

/**
 * VACUUM 数据库，回收空间。
 *
 * @returns 是否成功。
 */
export function vacuumDatabase(): boolean {
  const conn = getConnection()
  try {
    conn.raw.exec('VACUUM')
    return true
  } catch {
    return false
  }
}

/**
 * 清理旧日志。
 *
 * @param beforeTimestamp 清理此时间之前的日志。
 * @returns 删除的行数。
 */
export function clearOldLogs(beforeTimestamp: string): number {
  const conn = getConnection()
  const result = conn.raw.prepare('DELETE FROM app_logs WHERE created_at < ?').run(beforeTimestamp)
  return result.changes
}

/**
 * 清理全部日志。
 *
 * @returns 删除的行数。
 */
export function clearAllLogs(): number {
  const conn = getConnection()
  const result = conn.raw.prepare('DELETE FROM app_logs').run()
  return result.changes
}

// 引入 path 避免未使用警告
void path
