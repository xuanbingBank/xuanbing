/**
 * @file 数据库客户端，renderer 唯一访问 SQLite 的入口。
 *
 * 页面只调用 client。client 不写裸 channel。
 * client 处理 Result unwrap。client 处理错误映射。
 * 类型来自 shared。
 */

import type {
  DatabaseBackupOutput,
  DatabaseClearLogsOutput,
  DatabaseHealthOutput,
  DatabaseRestoreInput,
  DatabaseRestoreOutput,
  DatabaseStatsOutput,
  DatabaseVacuumOutput
} from '../../../electron/ipcBus/renderer/desktop-api'

/**
 * 获取 desktop API。
 *
 * @returns desktop API。
 */
function getDesktop(): Window['desktop'] {
  if (typeof window === 'undefined' || !window.desktop) {
    throw new Error('window.desktop is not available. Preload may not have loaded.')
  }
  return window.desktop
}

/**
 * 数据库客户端。
 */
export const databaseClient = {
  /**
   * 获取健康报告。
   */
  async getHealth(): Promise<DatabaseHealthOutput> {
    return getDesktop().database.getHealth()
  },

  /**
   * 获取统计。
   */
  async getStats(): Promise<DatabaseStatsOutput> {
    return getDesktop().database.getStats()
  },

  /**
   * 备份。
   */
  async backup(): Promise<DatabaseBackupOutput> {
    return getDesktop().database.backup()
  },

  /**
   * 恢复。
   */
  async restore(input: DatabaseRestoreInput): Promise<DatabaseRestoreOutput> {
    return getDesktop().database.restore(input)
  },

  /**
   * VACUUM。
   */
  async vacuum(): Promise<DatabaseVacuumOutput> {
    return getDesktop().database.vacuum()
  },

  /**
   * 清理日志。
   */
  async clearLogs(olderThanDays?: number): Promise<DatabaseClearLogsOutput> {
    return getDesktop().database.clearLogs(olderThanDays)
  }
}
