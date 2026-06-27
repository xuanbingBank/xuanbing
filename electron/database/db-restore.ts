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
import { closeConnection, openConnection, getConnection } from './db-connection'
import { backupDatabase } from './db-backup'
import { checkHealth } from './db-health'
import { runTransaction } from './db-transaction'
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
 * 模块级标记：恢复流程失败且连接已不可用。
 *
 * rollbackRestore 自身失败时置为 true，调用方据此感知连接已失效，
 * 不再静默吞错使应用进入无连接状态。
 */
let restoreConnectionUnavailable = false

/**
 * 查询恢复流程是否已将连接置为不可用状态。
 *
 * @returns 若 rollbackRestore 失败导致连接不可用，返回 true。
 */
export function isRestoreConnectionUnavailable(): boolean {
  return restoreConnectionUnavailable
}

/**
 * 原子化复制文件：先写入 .tmp 再 rename，崩溃时只留 .tmp 不污染目标。
 *
 * @param src 源文件路径。
 * @param dest 目标文件路径。
 */
function atomicCopyFileSync(src: string, dest: string): void {
  const tmpPath = dest + '.tmp'
  fs.copyFileSync(src, tmpPath)
  fs.renameSync(tmpPath, dest)
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

  // 2. 备份当前库（备份失败必须中止恢复，否则原库被覆盖后无法回滚，会导致数据丢失）
  let preRestoreBackupPath: string | null = null
  if (backupBeforeRestore && fs.existsSync(paths.dbFile)) {
    try {
      const backup = backupDatabase(paths, { prefix: 'pre-restore' })
      preRestoreBackupPath = backup.backupPath
    } catch (backupError) {
      // 备份失败：中止恢复，避免覆盖原库后无法回滚导致数据丢失
      console.error('[db-restore] pre-restore backup failed, aborting restore:', backupError)
      const message = backupError instanceof Error ? backupError.message : String(backupError)
      throwDbError('DB_RESTORE_FAILED', 'Pre-restore backup failed, aborting restore to protect original database.', {
        retryable: false,
        severity: 'high',
        safeDetail: { reason: 'pre_restore_backup_failed' },
        devDetail: message,
        cause: message
      })
    }
  }

  const restoredAt = new Date().toISOString()

  let healthReport: DbHealthReport | null = null
  let healthCheckFailed = false

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

    // 原子化复制：先写 .tmp 再 rename，崩溃只留 .tmp 不污染目标
    atomicCopyFileSync(backupPath, paths.dbFile)

    // 5. 重新打开连接
    openConnection(paths)

    // 6. health check
    if (verifyAfterRestore) {
      healthReport = checkHealth(paths)
      if (!healthReport.healthy) {
        healthCheckFailed = true
      }
    }
  } catch (error) {
    // 仅处理 try 内的非健康检查异常：回滚一次，回滚失败则显式标记连接不可用
    if (preRestoreBackupPath) {
      try {
        rollbackRestore(paths, preRestoreBackupPath)
      } catch (rollbackError) {
        // 回滚也失败：显式标记连接不可用，避免应用进入无连接状态被静默吞错
        restoreConnectionUnavailable = true
        console.error('[db-restore] rollbackRestore failed, connection unavailable:', rollbackError)
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

  // 健康检查失败：在此处统一回滚一次（不在 try 内重复回滚），然后抛错
  if (healthCheckFailed) {
    if (preRestoreBackupPath) {
      try {
        rollbackRestore(paths, preRestoreBackupPath)
      } catch (rollbackError) {
        restoreConnectionUnavailable = true
        console.error('[db-restore] rollbackRestore failed after health check, connection unavailable:', rollbackError)
      }
    }
    throwDbError('DB_RESTORE_FAILED', 'Health check failed after restore.', {
      severity: 'critical',
      safeDetail: { reason: 'health_check_failed', issues: healthReport?.issues },
      devDetail: healthReport?.issues
    })
  }

  // 恢复成功：复位连接不可用标记
  restoreConnectionUnavailable = false

  return {
    success: true,
    restoredFrom: backupPath,
    preRestoreBackupPath,
    healthReport,
    restoredAt
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

  // 原子化复制：避免中途崩溃污染目标库文件
  atomicCopyFileSync(backupPath, paths.dbFile)
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
  } catch (err) {
    console.warn('[db-restore] vacuum failed', err)
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
  return runTransaction((tx) => {
    const logResult = tx.prepare('DELETE FROM app_logs WHERE created_at < ?').run(beforeTimestamp)
    const auditResult = tx.prepare('DELETE FROM audit_logs WHERE created_at < ?').run(beforeTimestamp)
    return logResult.changes + auditResult.changes
  })
}

/**
 * 清理全部日志。
 *
 * @returns 删除的行数。
 */
export function clearAllLogs(): number {
  return runTransaction((tx) => {
    const logResult = tx.prepare('DELETE FROM app_logs').run()
    const auditResult = tx.prepare('DELETE FROM audit_logs').run()
    return logResult.changes + auditResult.changes
  })
}
