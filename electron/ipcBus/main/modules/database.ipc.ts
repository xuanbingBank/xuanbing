/**
 * @file 数据库管理相关 IPC 处理器（健康检查、统计、备份、恢复、VACUUM、清理日志）。
 *
 * IPC handler 不写复杂 SQL，只调用 service。
 * service 负责业务事务。
 * 所有输入输出经契约 schema 校验。
 */

import { IPC_CHANNELS, requestContracts } from '../../shared'
import type { IpcMainBus } from '../ipc-main-bus'
import { createIpcError } from '../ipc-errors'
import type { DatabaseService } from '../../../services/database.service'

interface ClearLogsInput {
  olderThanDays?: number
}

export interface DatabaseIpcModuleOptions {
  bus: IpcMainBus
  databaseService: DatabaseService
}

/**
 * 注册数据库管理 IPC 处理器。
 *
 * @param options 模块选项。
 */
export function registerDatabaseIpc(options: DatabaseIpcModuleOptions): void {
  const { bus, databaseService } = options

  bus.registerHandler(requestContracts[IPC_CHANNELS.databaseGetHealth], async () => {
    return databaseService.getHealth()
  })

  bus.registerHandler(requestContracts[IPC_CHANNELS.databaseGetStats], async () => {
    return databaseService.getStats()
  })

  bus.registerHandler(requestContracts[IPC_CHANNELS.databaseBackup], async () => {
    const result = databaseService.backup()
    return {
      backupPath: result.backupPath,
      backupName: result.backupName,
      size: result.size,
      sha256: result.sha256,
      createdAt: result.createdAt
    }
  })

  bus.registerHandler(requestContracts[IPC_CHANNELS.databaseRestore], async ({ input }) => {
    const restoreInput = input as { backupPath: string; confirm: boolean }

    if (!restoreInput.confirm) {
      throw createIpcError('IPC_VALIDATION_ERROR', 'Restore requires explicit confirmation (confirm=true).')
    }

    const result = databaseService.restore(restoreInput.backupPath)
    return {
      success: result.success,
      restoredFrom: result.restoredFrom,
      preRestoreBackupPath: result.preRestoreBackupPath,
      healthReport: result.healthReport,
      restoredAt: result.restoredAt
    }
  })

  bus.registerHandler(requestContracts[IPC_CHANNELS.databaseVacuum], async () => {
    const success = databaseService.vacuum()
    return { success }
  })

  bus.registerHandler(requestContracts[IPC_CHANNELS.databaseClearLogs], async ({ input }) => {
    const clearInput = input as ClearLogsInput

    if (clearInput.olderThanDays && clearInput.olderThanDays > 0) {
      const cutoff = new Date(Date.now() - clearInput.olderThanDays * 24 * 60 * 60 * 1000).toISOString()
      const deleted = databaseService.clearOldLogs(cutoff)
      return { deleted }
    }

    const deleted = databaseService.clearLogs()
    return { deleted }
  })
}
