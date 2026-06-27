/**
 * @file 汇总 IPC 总线的全部请求契约与事件契约映射。
 */

import { DEFAULT_IPC_MAX_PAYLOAD_BYTES, DEFAULT_IPC_TIMEOUT_MS, IPC_CHANNELS, IPC_EVENTS, IPC_PERMISSIONS } from './constants'
import {
  appInfoResponseSchema,
  dbBackupResponseSchema,
  dbClearLogsResponseSchema,
  dbHealthResponseSchema,
  dbRestoreRequestSchema,
  dbRestoreResponseSchema,
  dbStatsResponseSchema,
  dbVacuumResponseSchema,
  fileDialogRequestSchema,
  fileDialogResponseSchema,
  getCurrentWindowResponseSchema,
  getInitPayloadResponseSchema,
  openWindowRequestSchema,
  openWindowResponseSchema,
  settingGetRequestSchema,
  settingItemSchema,
  settingListRequestSchema,
  settingListResponseSchema,
  settingSetRequestSchema,
  taskCancelRequestSchema,
  taskCancelResponseSchema,
  taskCompletedEventSchema,
  taskDataByIdRequestSchema,
  taskDataCreateRequestSchema,
  taskDataItemSchema,
  taskDataListRequestSchema,
  taskDataListResponseSchema,
  taskDataUpdateRequestSchema,
  taskFailedEventSchema,
  taskProgressEventSchema,
  taskStartRequestSchema,
  taskStartResponseSchema,
  windowCloseByRoleRequestSchema,
  windowControlRequestSchema,
  windowControlResponseSchema,
  windowCountResponseSchema,
  windowCreatedEventSchema,
  windowFocusChangedEventSchema,
  windowListResponseSchema,
  windowRouteChangedEventSchema,
  windowSetTitleIpcRequestSchema,
  windowSetTitleResponseSchema,
  windowStateChangedEventSchema,
  xuanbingFileDialogRequestSchema,
  xuanbingFileDialogResponseSchema,
  xuanbingFileRefSchema,
  xuanbingFileDryRunImportRequestSchema,
  xuanbingFileDryRunImportResponseSchema,
  xuanbingFileExportRequestSchema,
  xuanbingFileExportResponseSchema,
  xuanbingFileImportRequestSchema,
  xuanbingFileImportResponseSchema,
  xuanbingFilePreviewResponseSchema,
  xuanbingFileValidateResponseSchema
} from './schemas'
import { z } from './zod'
import type { EventContract, EventContractMap, IpcEventDirection, IpcPermission, IpcRequestChannel, RequestContract, RequestContractMap } from './types'
import type { ZodSchema } from './zod'

/**
 * 带上默认超时与负载限制的请求契约工厂。
 *
 * @param definition 原始请求契约定义。
 * @returns 带上默认值的请求契约。
 */
export function defineRequestContract<
  TChannel extends IpcRequestChannel,
  TPermission extends IpcPermission,
  TInputSchema extends ZodSchema<unknown>,
  TOutputSchema extends ZodSchema<unknown>
>(
  definition: RequestContract<TInputSchema, TOutputSchema, TPermission, TChannel>
): RequestContract<TInputSchema, TOutputSchema, TPermission, TChannel> {
  return {
    ...definition,
    timeoutMs: definition.timeoutMs ?? DEFAULT_IPC_TIMEOUT_MS,
    maxPayloadBytes: definition.maxPayloadBytes ?? DEFAULT_IPC_MAX_PAYLOAD_BYTES
  }
}

/**
 * 定义事件契约。
 *
 * @param definition 原始事件契约定义。
 * @returns 带上默认值的事件契约。
 */
export function defineEventContract<
  TPermission extends IpcPermission,
  TPayloadSchema extends ZodSchema<unknown>,
  TEvent extends import('./types').IpcEventChannel
>(
  definition: EventContract<TPayloadSchema, TPermission, TEvent>
): EventContract<TPayloadSchema, TPermission, TEvent> {
  return definition
}

/**
 * 定义空对象模型，用于无参数的请求输入。
 *
 * @returns 空对象的校验模型。
 */
export function createEmptyObjectSchema(): ZodSchema<Record<string, never>> {
  return z.object({}) as ZodSchema<Record<string, never>>
}

/**
 * 全部集合的请求契约映射。
 */
export const requestContracts = {
  [IPC_CHANNELS.appInfoGet]: defineRequestContract({
    channel: IPC_CHANNELS.appInfoGet,
    description: '获取应用静态信息。',
    permission: IPC_PERMISSIONS.public,
    inputSchema: createEmptyObjectSchema(),
    outputSchema: appInfoResponseSchema,
    timeoutMs: DEFAULT_IPC_TIMEOUT_MS,
    maxPayloadBytes: DEFAULT_IPC_MAX_PAYLOAD_BYTES
  }),
  [IPC_CHANNELS.fileDialogOpen]: defineRequestContract({
    channel: IPC_CHANNELS.fileDialogOpen,
    description: '通过主进程安全打开本地文件选择对话框。',
    permission: IPC_PERMISSIONS.fileRead,
    inputSchema: fileDialogRequestSchema,
    outputSchema: fileDialogResponseSchema,
    timeoutMs: DEFAULT_IPC_TIMEOUT_MS,
    maxPayloadBytes: 32 * 1024,
    audit: true,
    rateLimit: {
      maxCalls: 5,
      windowMs: 60_000
    }
  }),

  /* ───────────────────────── 窗口管理 ───────────────────────── */

  [IPC_CHANNELS.windowOpen]: defineRequestContract({
    channel: IPC_CHANNELS.windowOpen,
    description: '打开或聚焦指定角色的窗口。',
    permission: IPC_PERMISSIONS.windowOpen,
    inputSchema: openWindowRequestSchema,
    outputSchema: openWindowResponseSchema,
    timeoutMs: DEFAULT_IPC_TIMEOUT_MS,
    maxPayloadBytes: 256 * 1024,
    audit: true
  }),
  [IPC_CHANNELS.windowMinimize]: defineRequestContract({
    channel: IPC_CHANNELS.windowMinimize,
    description: '最小化目标窗口。',
    permission: IPC_PERMISSIONS.windowControlSelf,
    inputSchema: windowControlRequestSchema,
    outputSchema: windowControlResponseSchema,
    timeoutMs: DEFAULT_IPC_TIMEOUT_MS,
    maxPayloadBytes: DEFAULT_IPC_MAX_PAYLOAD_BYTES
  }),
  [IPC_CHANNELS.windowMaximize]: defineRequestContract({
    channel: IPC_CHANNELS.windowMaximize,
    description: '最大化或还原目标窗口。',
    permission: IPC_PERMISSIONS.windowControlSelf,
    inputSchema: windowControlRequestSchema,
    outputSchema: windowControlResponseSchema,
    timeoutMs: DEFAULT_IPC_TIMEOUT_MS,
    maxPayloadBytes: DEFAULT_IPC_MAX_PAYLOAD_BYTES
  }),
  [IPC_CHANNELS.windowClose]: defineRequestContract({
    channel: IPC_CHANNELS.windowClose,
    description: '关闭目标窗口（遵循角色 closeBehavior）。',
    permission: IPC_PERMISSIONS.windowCloseSelf,
    inputSchema: windowControlRequestSchema,
    outputSchema: windowControlResponseSchema,
    timeoutMs: DEFAULT_IPC_TIMEOUT_MS,
    maxPayloadBytes: DEFAULT_IPC_MAX_PAYLOAD_BYTES,
    audit: true
  }),
  [IPC_CHANNELS.windowRestore]: defineRequestContract({
    channel: IPC_CHANNELS.windowRestore,
    description: '从最小化或最大化状态恢复目标窗口。',
    permission: IPC_PERMISSIONS.windowControlSelf,
    inputSchema: windowControlRequestSchema,
    outputSchema: windowControlResponseSchema,
    timeoutMs: DEFAULT_IPC_TIMEOUT_MS,
    maxPayloadBytes: DEFAULT_IPC_MAX_PAYLOAD_BYTES
  }),
  [IPC_CHANNELS.windowHide]: defineRequestContract({
    channel: IPC_CHANNELS.windowHide,
    description: '隐藏目标窗口。',
    permission: IPC_PERMISSIONS.windowControlSelf,
    inputSchema: windowControlRequestSchema,
    outputSchema: windowControlResponseSchema,
    timeoutMs: DEFAULT_IPC_TIMEOUT_MS,
    maxPayloadBytes: DEFAULT_IPC_MAX_PAYLOAD_BYTES
  }),
  [IPC_CHANNELS.windowShow]: defineRequestContract({
    channel: IPC_CHANNELS.windowShow,
    description: '显示目标窗口。',
    permission: IPC_PERMISSIONS.windowControlSelf,
    inputSchema: windowControlRequestSchema,
    outputSchema: windowControlResponseSchema,
    timeoutMs: DEFAULT_IPC_TIMEOUT_MS,
    maxPayloadBytes: DEFAULT_IPC_MAX_PAYLOAD_BYTES
  }),
  [IPC_CHANNELS.windowFocus]: defineRequestContract({
    channel: IPC_CHANNELS.windowFocus,
    description: '聚焦目标窗口或按角色聚焦。',
    permission: IPC_PERMISSIONS.windowFocus,
    inputSchema: windowControlRequestSchema,
    outputSchema: windowControlResponseSchema,
    timeoutMs: DEFAULT_IPC_TIMEOUT_MS,
    maxPayloadBytes: DEFAULT_IPC_MAX_PAYLOAD_BYTES
  }),
  [IPC_CHANNELS.windowReload]: defineRequestContract({
    channel: IPC_CHANNELS.windowReload,
    description: '重新加载目标窗口页面。',
    permission: IPC_PERMISSIONS.windowControlSelf,
    inputSchema: windowControlRequestSchema,
    outputSchema: windowControlResponseSchema,
    timeoutMs: DEFAULT_IPC_TIMEOUT_MS,
    maxPayloadBytes: DEFAULT_IPC_MAX_PAYLOAD_BYTES
  }),
  [IPC_CHANNELS.windowList]: defineRequestContract({
    channel: IPC_CHANNELS.windowList,
    description: '列出全部存活窗口引用。',
    permission: IPC_PERMISSIONS.windowList,
    inputSchema: createEmptyObjectSchema(),
    outputSchema: windowListResponseSchema,
    timeoutMs: DEFAULT_IPC_TIMEOUT_MS,
    maxPayloadBytes: DEFAULT_IPC_MAX_PAYLOAD_BYTES
  }),
  [IPC_CHANNELS.windowGetCurrent]: defineRequestContract({
    channel: IPC_CHANNELS.windowGetCurrent,
    description: '获取当前调用方窗口信息（windowId 由主进程从 IPC sender 解析）。',
    permission: IPC_PERMISSIONS.public,
    inputSchema: createEmptyObjectSchema(),
    outputSchema: getCurrentWindowResponseSchema,
    timeoutMs: DEFAULT_IPC_TIMEOUT_MS,
    maxPayloadBytes: DEFAULT_IPC_MAX_PAYLOAD_BYTES
  }),
  [IPC_CHANNELS.windowSetTitle]: defineRequestContract({
    channel: IPC_CHANNELS.windowSetTitle,
    description: '更新目标窗口标题。',
    permission: IPC_PERMISSIONS.windowControlSelf,
    inputSchema: windowSetTitleIpcRequestSchema,
    outputSchema: windowSetTitleResponseSchema,
    timeoutMs: DEFAULT_IPC_TIMEOUT_MS,
    maxPayloadBytes: DEFAULT_IPC_MAX_PAYLOAD_BYTES
  }),
  [IPC_CHANNELS.windowGetInitPayload]: defineRequestContract({
    channel: IPC_CHANNELS.windowGetInitPayload,
    description: '消费当前窗口的初始化数据（一次性）。',
    permission: IPC_PERMISSIONS.public,
    inputSchema: createEmptyObjectSchema(),
    outputSchema: getInitPayloadResponseSchema,
    timeoutMs: DEFAULT_IPC_TIMEOUT_MS,
    maxPayloadBytes: 256 * 1024
  }),
  [IPC_CHANNELS.windowCloseAll]: defineRequestContract({
    channel: IPC_CHANNELS.windowCloseAll,
    description: '关闭全部窗口。',
    permission: IPC_PERMISSIONS.windowControlAny,
    inputSchema: createEmptyObjectSchema(),
    outputSchema: windowCountResponseSchema,
    timeoutMs: DEFAULT_IPC_TIMEOUT_MS,
    maxPayloadBytes: DEFAULT_IPC_MAX_PAYLOAD_BYTES,
    audit: true
  }),
  [IPC_CHANNELS.windowCloseByRole]: defineRequestContract({
    channel: IPC_CHANNELS.windowCloseByRole,
    description: '关闭指定角色的全部窗口。',
    permission: IPC_PERMISSIONS.windowCloseAny,
    inputSchema: windowCloseByRoleRequestSchema,
    outputSchema: windowCountResponseSchema,
    timeoutMs: DEFAULT_IPC_TIMEOUT_MS,
    maxPayloadBytes: DEFAULT_IPC_MAX_PAYLOAD_BYTES,
    audit: true
  }),

  /* ───────────────────────── 后台任务 ───────────────────────── */

  [IPC_CHANNELS.taskStart]: defineRequestContract({
    channel: IPC_CHANNELS.taskStart,
    description: '启动一个可跟踪、可取消的长任务。',
    permission: IPC_PERMISSIONS.taskRun,
    inputSchema: taskStartRequestSchema,
    outputSchema: taskStartResponseSchema,
    timeoutMs: 30_000,
    maxPayloadBytes: 128 * 1024,
    audit: true,
    rateLimit: {
      maxCalls: 10,
      windowMs: 60_000
    }
  }),
  [IPC_CHANNELS.taskCancel]: defineRequestContract({
    channel: IPC_CHANNELS.taskCancel,
    description: '取消正在运行的任务。',
    permission: IPC_PERMISSIONS.taskCancel,
    inputSchema: taskCancelRequestSchema,
    outputSchema: taskCancelResponseSchema,
    timeoutMs: DEFAULT_IPC_TIMEOUT_MS,
    maxPayloadBytes: DEFAULT_IPC_MAX_PAYLOAD_BYTES,
    audit: true
  }),

  /* ───────────────────────── 数据库 ───────────────────────── */

  [IPC_CHANNELS.databaseGetHealth]: defineRequestContract({
    channel: IPC_CHANNELS.databaseGetHealth,
    description: '获取 SQLite 数据库健康报告。',
    permission: IPC_PERMISSIONS.databaseRead,
    inputSchema: createEmptyObjectSchema(),
    outputSchema: dbHealthResponseSchema,
    timeoutMs: DEFAULT_IPC_TIMEOUT_MS,
    maxPayloadBytes: DEFAULT_IPC_MAX_PAYLOAD_BYTES
  }),
  [IPC_CHANNELS.databaseGetStats]: defineRequestContract({
    channel: IPC_CHANNELS.databaseGetStats,
    description: '获取 SQLite 各表行数统计。',
    permission: IPC_PERMISSIONS.databaseRead,
    inputSchema: createEmptyObjectSchema(),
    outputSchema: dbStatsResponseSchema,
    timeoutMs: DEFAULT_IPC_TIMEOUT_MS,
    maxPayloadBytes: DEFAULT_IPC_MAX_PAYLOAD_BYTES
  }),
  [IPC_CHANNELS.databaseBackup]: defineRequestContract({
    channel: IPC_CHANNELS.databaseBackup,
    description: '手动触发 SQLite 备份。',
    permission: IPC_PERMISSIONS.databaseBackup,
    inputSchema: createEmptyObjectSchema(),
    outputSchema: dbBackupResponseSchema,
    timeoutMs: 60_000,
    maxPayloadBytes: DEFAULT_IPC_MAX_PAYLOAD_BYTES,
    audit: true
  }),
  [IPC_CHANNELS.databaseRestore]: defineRequestContract({
    channel: IPC_CHANNELS.databaseRestore,
    description: '从备份恢复 SQLite 数据库（需要二次确认）。',
    permission: IPC_PERMISSIONS.databaseRestore,
    inputSchema: dbRestoreRequestSchema,
    outputSchema: dbRestoreResponseSchema,
    timeoutMs: 120_000,
    maxPayloadBytes: DEFAULT_IPC_MAX_PAYLOAD_BYTES,
    audit: true
  }),
  [IPC_CHANNELS.databaseVacuum]: defineRequestContract({
    channel: IPC_CHANNELS.databaseVacuum,
    description: '对 SQLite 执行 VACUUM。',
    permission: IPC_PERMISSIONS.databaseWrite,
    inputSchema: createEmptyObjectSchema(),
    outputSchema: dbVacuumResponseSchema,
    timeoutMs: 120_000,
    maxPayloadBytes: DEFAULT_IPC_MAX_PAYLOAD_BYTES,
    audit: true
  }),
  [IPC_CHANNELS.databaseClearLogs]: defineRequestContract({
    channel: IPC_CHANNELS.databaseClearLogs,
    description: '清理 app_logs 与 audit_logs 旧数据（清空全部需二次确认）。',
    permission: IPC_PERMISSIONS.databaseWrite,
    // 保留 as ZodSchema 断言：移除后 InferZodSchema 无法解析具体 ZodObject 类型，
    // 会在 types.ts 的 InferRequestInput 中触发类型实例化错误。
    inputSchema: z.object({
      olderThanDays: z.number({ integer: true, min: 1 }).optional(),
      confirm: z.boolean().optional()
    }) as ZodSchema<{ olderThanDays?: number; confirm?: boolean }>,
    outputSchema: dbClearLogsResponseSchema,
    timeoutMs: DEFAULT_IPC_TIMEOUT_MS,
    maxPayloadBytes: DEFAULT_IPC_MAX_PAYLOAD_BYTES,
    audit: true
  }),

  /* ───────────────────────── 任务数据持久化 ───────────────────────── */

  [IPC_CHANNELS.taskDataList]: defineRequestContract({
    channel: IPC_CHANNELS.taskDataList,
    description: '分页查询任务数据列表。',
    permission: IPC_PERMISSIONS.taskDataRead,
    inputSchema: taskDataListRequestSchema,
    outputSchema: taskDataListResponseSchema,
    timeoutMs: DEFAULT_IPC_TIMEOUT_MS,
    maxPayloadBytes: DEFAULT_IPC_MAX_PAYLOAD_BYTES
  }),
  [IPC_CHANNELS.taskDataGetById]: defineRequestContract({
    channel: IPC_CHANNELS.taskDataGetById,
    description: '按 ID 查询任务数据详情（含事件）。',
    permission: IPC_PERMISSIONS.taskDataRead,
    inputSchema: taskDataByIdRequestSchema,
    outputSchema: taskDataItemSchema,
    timeoutMs: DEFAULT_IPC_TIMEOUT_MS,
    maxPayloadBytes: DEFAULT_IPC_MAX_PAYLOAD_BYTES
  }),
  [IPC_CHANNELS.taskDataCreate]: defineRequestContract({
    channel: IPC_CHANNELS.taskDataCreate,
    description: '创建任务数据记录。',
    permission: IPC_PERMISSIONS.taskDataWrite,
    inputSchema: taskDataCreateRequestSchema,
    outputSchema: taskDataItemSchema,
    timeoutMs: DEFAULT_IPC_TIMEOUT_MS,
    maxPayloadBytes: 256 * 1024,
    audit: true
  }),
  [IPC_CHANNELS.taskDataUpdate]: defineRequestContract({
    channel: IPC_CHANNELS.taskDataUpdate,
    description: '更新任务数据状态、进度、输出。',
    permission: IPC_PERMISSIONS.taskDataWrite,
    inputSchema: taskDataUpdateRequestSchema,
    outputSchema: taskDataItemSchema,
    timeoutMs: DEFAULT_IPC_TIMEOUT_MS,
    maxPayloadBytes: 256 * 1024,
    audit: true
  }),
  [IPC_CHANNELS.taskDataDelete]: defineRequestContract({
    channel: IPC_CHANNELS.taskDataDelete,
    description: '按 ID 删除任务数据。',
    permission: IPC_PERMISSIONS.taskDataWrite,
    inputSchema: taskDataByIdRequestSchema,
    // 保留 as ZodSchema 断言：同上，避免 InferRequestOutput 类型实例化失败。
    outputSchema: z.object({ deleted: z.boolean() }) as ZodSchema<{ deleted: boolean }>,
    timeoutMs: DEFAULT_IPC_TIMEOUT_MS,
    maxPayloadBytes: DEFAULT_IPC_MAX_PAYLOAD_BYTES,
    audit: true
  }),

  /* ───────────────────────── 设置 ───────────────────────── */

  [IPC_CHANNELS.settingGet]: defineRequestContract({
    channel: IPC_CHANNELS.settingGet,
    description: '按 namespace+key 获取设置项。',
    permission: IPC_PERMISSIONS.settingRead,
    inputSchema: settingGetRequestSchema,
    outputSchema: settingItemSchema.nullable(),
    timeoutMs: DEFAULT_IPC_TIMEOUT_MS,
    maxPayloadBytes: DEFAULT_IPC_MAX_PAYLOAD_BYTES
  }),
  [IPC_CHANNELS.settingSet]: defineRequestContract({
    channel: IPC_CHANNELS.settingSet,
    description: '写入或更新设置项。',
    permission: IPC_PERMISSIONS.settingWrite,
    inputSchema: settingSetRequestSchema,
    outputSchema: settingItemSchema,
    timeoutMs: DEFAULT_IPC_TIMEOUT_MS,
    maxPayloadBytes: 64 * 1024,
    audit: true
  }),
  [IPC_CHANNELS.settingListByNamespace]: defineRequestContract({
    channel: IPC_CHANNELS.settingListByNamespace,
    description: '列出指定 namespace 下的全部设置项。',
    permission: IPC_PERMISSIONS.settingRead,
    inputSchema: settingListRequestSchema,
    outputSchema: settingListResponseSchema,
    timeoutMs: DEFAULT_IPC_TIMEOUT_MS,
    maxPayloadBytes: DEFAULT_IPC_MAX_PAYLOAD_BYTES
  }),
  [IPC_CHANNELS.settingDelete]: defineRequestContract({
    channel: IPC_CHANNELS.settingDelete,
    description: '按 namespace+key 删除设置项。',
    permission: IPC_PERMISSIONS.settingWrite,
    inputSchema: settingGetRequestSchema,
    // 保留 as ZodSchema 断言：同上，避免 InferRequestOutput 类型实例化失败。
    outputSchema: z.object({ deleted: z.boolean() }) as ZodSchema<{ deleted: boolean }>,
    timeoutMs: DEFAULT_IPC_TIMEOUT_MS,
    maxPayloadBytes: DEFAULT_IPC_MAX_PAYLOAD_BYTES,
    audit: true
  }),

  /* ───────────────────────── .xuanbing 文件 ───────────────────────── */

  [IPC_CHANNELS.xuanbingFileOpenDialog]: defineRequestContract({
    channel: IPC_CHANNELS.xuanbingFileOpenDialog,
    description: '打开 .xuanbing 文件选择对话框，返回 fileRef。',
    permission: IPC_PERMISSIONS.xuanbingFileRead,
    inputSchema: xuanbingFileDialogRequestSchema,
    outputSchema: xuanbingFileDialogResponseSchema,
    timeoutMs: DEFAULT_IPC_TIMEOUT_MS,
    maxPayloadBytes: DEFAULT_IPC_MAX_PAYLOAD_BYTES,
    audit: true
  }),
  [IPC_CHANNELS.xuanbingFileSaveDialog]: defineRequestContract({
    channel: IPC_CHANNELS.xuanbingFileSaveDialog,
    description: '打开 .xuanbing 文件保存对话框，返回 fileRef。',
    permission: IPC_PERMISSIONS.xuanbingFileWrite,
    inputSchema: xuanbingFileDialogRequestSchema,
    outputSchema: xuanbingFileDialogResponseSchema,
    timeoutMs: DEFAULT_IPC_TIMEOUT_MS,
    maxPayloadBytes: DEFAULT_IPC_MAX_PAYLOAD_BYTES,
    audit: true
  }),
  [IPC_CHANNELS.xuanbingFileReadPreview]: defineRequestContract({
    channel: IPC_CHANNELS.xuanbingFileReadPreview,
    description: '读取 .xuanbing 文件预览（不返回 payload）。',
    permission: IPC_PERMISSIONS.xuanbingFileRead,
    inputSchema: z.object({ fileRef: xuanbingFileRefSchema }),
    outputSchema: xuanbingFilePreviewResponseSchema,
    timeoutMs: DEFAULT_IPC_TIMEOUT_MS,
    maxPayloadBytes: DEFAULT_IPC_MAX_PAYLOAD_BYTES
  }),
  [IPC_CHANNELS.xuanbingFileValidate]: defineRequestContract({
    channel: IPC_CHANNELS.xuanbingFileValidate,
    description: '校验 .xuanbing 文件合法性。',
    permission: IPC_PERMISSIONS.xuanbingFileRead,
    inputSchema: z.object({ fileRef: xuanbingFileRefSchema }),
    outputSchema: xuanbingFileValidateResponseSchema,
    timeoutMs: DEFAULT_IPC_TIMEOUT_MS,
    maxPayloadBytes: DEFAULT_IPC_MAX_PAYLOAD_BYTES
  }),
  [IPC_CHANNELS.xuanbingFileExportPackage]: defineRequestContract({
    channel: IPC_CHANNELS.xuanbingFileExportPackage,
    description: '导出 .xuanbing 文件包。',
    permission: IPC_PERMISSIONS.xuanbingFileExport,
    inputSchema: xuanbingFileExportRequestSchema,
    outputSchema: xuanbingFileExportResponseSchema,
    timeoutMs: 60_000,
    maxPayloadBytes: 16 * 1024 * 1024,
    audit: true
  }),
  [IPC_CHANNELS.xuanbingFileDryRunImport]: defineRequestContract({
    channel: IPC_CHANNELS.xuanbingFileDryRunImport,
    description: 'dryRun 导入 .xuanbing 文件，返回导入计划。',
    permission: IPC_PERMISSIONS.xuanbingFileRead,
    inputSchema: xuanbingFileDryRunImportRequestSchema,
    outputSchema: xuanbingFileDryRunImportResponseSchema,
    timeoutMs: 60_000,
    maxPayloadBytes: 16 * 1024 * 1024
  }),
  [IPC_CHANNELS.xuanbingFileImportPackage]: defineRequestContract({
    channel: IPC_CHANNELS.xuanbingFileImportPackage,
    description: '正式导入 .xuanbing 文件，事务执行。',
    permission: IPC_PERMISSIONS.xuanbingFileImport,
    inputSchema: xuanbingFileImportRequestSchema,
    outputSchema: xuanbingFileImportResponseSchema,
    timeoutMs: 120_000,
    maxPayloadBytes: 16 * 1024 * 1024,
    audit: true
  })
} as const satisfies RequestContractMap

/**
 * 全部集合的事件契约映射。
 */
export const eventContracts = {
  [IPC_EVENTS.taskProgress]: defineEventContract({
    event: IPC_EVENTS.taskProgress,
    description: '向渲染进程推送任务进度。',
    direction: 'main-to-renderer' as IpcEventDirection,
    permission: IPC_PERMISSIONS.taskRun,
    payloadSchema: taskProgressEventSchema,
    audit: false
  }),
  [IPC_EVENTS.taskCompleted]: defineEventContract({
    event: IPC_EVENTS.taskCompleted,
    description: '向渲染进程推送任务完成事件。',
    direction: 'main-to-renderer' as IpcEventDirection,
    permission: IPC_PERMISSIONS.taskRun,
    payloadSchema: taskCompletedEventSchema,
    audit: false
  }),
  [IPC_EVENTS.taskFailed]: defineEventContract({
    event: IPC_EVENTS.taskFailed,
    description: '向渲染进程推送任务失败事件。',
    direction: 'main-to-renderer' as IpcEventDirection,
    permission: IPC_PERMISSIONS.taskRun,
    payloadSchema: taskFailedEventSchema,
    audit: true
  }),
  [IPC_EVENTS.windowFocusChanged]: defineEventContract({
    event: IPC_EVENTS.windowFocusChanged,
    description: '向渲染进程推送窗口焦点变化。',
    direction: 'main-to-renderer' as IpcEventDirection,
    permission: IPC_PERMISSIONS.windowControl,
    payloadSchema: windowFocusChangedEventSchema,
    audit: false
  }),
  [IPC_EVENTS.windowStateChanged]: defineEventContract({
    event: IPC_EVENTS.windowStateChanged,
    description: '向渲染进程推送窗口状态变化（最小化、最大化、恢复等）。',
    direction: 'main-to-renderer' as IpcEventDirection,
    permission: IPC_PERMISSIONS.windowControl,
    payloadSchema: windowStateChangedEventSchema,
    audit: false
  }),
  [IPC_EVENTS.windowRouteChanged]: defineEventContract({
    event: IPC_EVENTS.windowRouteChanged,
    description: '向渲染进程推送窗口路由变化。',
    direction: 'main-to-renderer' as IpcEventDirection,
    permission: IPC_PERMISSIONS.windowControl,
    payloadSchema: windowRouteChangedEventSchema,
    audit: false
  }),
  [IPC_EVENTS.windowCreated]: defineEventContract({
    event: IPC_EVENTS.windowCreated,
    description: '向渲染进程推送窗口创建事件。',
    direction: 'main-to-renderer' as IpcEventDirection,
    permission: IPC_PERMISSIONS.windowControl,
    payloadSchema: windowCreatedEventSchema,
    audit: false
  })
} as const satisfies EventContractMap

export { IPC_CHANNELS, IPC_EVENTS }
