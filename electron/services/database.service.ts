/**
 * @file 数据库服务，负责健康检查、备份、恢复、统计、清理。
 *
 * service 负责业务事务，调用 repository / database 基础层。
 * 不依赖 Vue / renderer。
 */

import { checkHealth, getDatabaseStats } from '../database/db-health'
import { backupDatabase, listBackups, verifyBackup } from '../database/db-backup'
import { restoreDatabase, vacuumDatabase, clearAllLogs, clearOldLogs } from '../database/db-restore'
import { AuditRepository } from '../repositories/audit.repository'
import type { DbPaths } from '../database/db-path'
import type { DbHealthReport } from '../database/db-health'
import type { BackupResult } from '../database/db-backup'
import type { RestoreOptions, RestoreResult } from '../database/db-restore'

/**
 * 数据库服务。
 */
export class DatabaseService {
  private readonly auditRepo = new AuditRepository()
  private readonly paths: DbPaths

  public constructor(paths: DbPaths) {
    this.paths = paths
  }

  /**
   * 获取健康报告。
   *
   * @returns 健康报告。
   */
  getHealth(): DbHealthReport {
    return checkHealth(this.paths)
  }

  /**
   * 获取数据库统计。
   *
   * @returns 各表行数。
   */
  getStats(): Record<string, number> {
    return getDatabaseStats()
  }

  /**
   * 创建备份。
   *
   * @param prefix 备份前缀。
   * @returns 备份结果。
   */
  backup(prefix?: string): BackupResult {
    const result = backupDatabase(this.paths, { prefix })

    this.auditRepo.create({
      actorType: 'system',
      actorId: 'database-service',
      action: 'backup',
      entityType: 'database',
      entityId: this.paths.dbFile,
      after: { backupPath: result.backupPath, size: result.size },
      metadata: { sha256: result.sha256 }
    })

    return result
  }

  /**
   * 列出备份。
   *
   * @returns 备份列表。
   */
  listBackups() {
    return listBackups(this.paths)
  }

  /**
   * 校验备份。
   *
   * @param backupPath 备份路径。
   * @returns 是否校验通过。
   */
  verifyBackup(backupPath: string): boolean {
    return verifyBackup(backupPath)
  }

  /**
   * 恢复数据库。
   *
   * @param backupPath 备份路径。
   * @param options 恢复选项。
   * @returns 恢复结果。
   */
  restore(backupPath: string, options?: RestoreOptions): RestoreResult {
    const result = restoreDatabase(this.paths, backupPath, options)

    this.auditRepo.create({
      actorType: 'system',
      actorId: 'database-service',
      action: 'restore-db',
      entityType: 'database',
      entityId: this.paths.dbFile,
      after: { restoredFrom: backupPath, success: result.success },
      metadata: { preRestoreBackupPath: result.preRestoreBackupPath }
    })

    return result
  }

  /**
   * VACUUM 数据库。
   *
   * @returns 是否成功。
   */
  vacuum(): boolean {
    return vacuumDatabase()
  }

  /**
   * 清理全部日志。
   *
   * @returns 删除行数。
   */
  clearLogs(): number {
    return clearAllLogs()
  }

  /**
   * 清理旧日志。
   *
   * @param beforeTimestamp 清理此时间之前的日志。
   * @returns 删除行数。
   */
  clearOldLogs(beforeTimestamp: string): number {
    return clearOldLogs(beforeTimestamp)
  }
}
