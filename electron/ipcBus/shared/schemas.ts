/**
 * @file 统一 IPC 总线共使用的请求、响应与事件校验模型。
 */

import { IPC_ERROR_CODES } from './errors'
import { z } from './zod'
import type { IpcError, IpcResult } from './errors'
import type { ZodSchema } from './zod'

/* ───────────────────────── 窗口管理 schemas（从 windows/shared 透传） ───────────────────────── */

export {
  openWindowRequestSchema,
  openWindowResponseSchema,
  windowControlRequestSchema,
  windowControlResponseSchema,
  windowRefSchema,
  windowListResponseSchema,
  setWindowTitleRequestSchema,
  windowStateChangedEventSchema,
  windowRouteChangedEventSchema,
  getInitPayloadResponseSchema,
  getCurrentWindowResponseSchema
} from '../../windows/shared/window-schemas'

export type {
  OpenWindowRequestInput,
  OpenWindowResponseOutput,
  WindowControlRequestInput,
  WindowControlResponseOutput,
  WindowListResponseOutput,
  SetWindowTitleRequestInput,
  GetInitPayloadResponseOutput,
  GetCurrentWindowResponseOutput
} from '../../windows/shared/window-schemas'

import { WINDOW_ROLES } from '../../windows/shared/window-types'

/* ───────────────────────── 文件对话框 ───────────────────────── */

/**
 * 文件选择对话框支持的属性枚举。
 */
export const FILE_DIALOG_PROPERTIES = [
  'openFile',
  'openDirectory',
  'multiSelections',
  'showHiddenFiles',
  'createDirectory',
  'promptToCreate'
] as const

/**
 * 后台任务运行时支持的种类类型。
 */
export const TASK_KINDS = ['sync', 'import', 'export', 'analysis'] as const

/**
 * 后台任务启动后返回的状态集合。
 */
export const TASK_START_STATUSES = ['queued', 'running'] as const

/**
 * 后台任务进度阶段枚举。
 */
export const TASK_PROGRESS_PHASES = ['queued', 'running', 'completed', 'failed', 'canceled'] as const

/**
 * 定义应用信息响应模型。
 */
export const appInfoResponseSchema = z.object({
  appName: z.string({ minLength: 1 }),
  appVersion: z.string({ minLength: 1 }),
  electronVersion: z.string({ minLength: 1 }),
  chromeVersion: z.string({ minLength: 1 }),
  platform: z.string({ minLength: 1 }),
  isPackaged: z.boolean()
})

/**
 * 定义文件选择过滤器模型。
 */
export const fileDialogFilterSchema = z.object({
  name: z.string({ minLength: 1 }),
  extensions: z.array(z.string({ minLength: 1 }), { minLength: 1 })
})

/**
 * 定义文件选择对话框请求模型。
 */
export const fileDialogRequestSchema = z.object({
  title: z.string({ minLength: 1 }).optional(),
  defaultPath: z.string({ minLength: 1 }).optional(),
  buttonLabel: z.string({ minLength: 1 }).optional(),
  properties: z.array(z.enum(FILE_DIALOG_PROPERTIES), { minLength: 1 }).optional(),
  filters: z.array(fileDialogFilterSchema, { minLength: 1 }).optional()
})

/**
 * 定义文件选择对话框响应模型。
 */
export const fileDialogResponseSchema = z.object({
  canceled: z.boolean(),
  filePaths: z.array(z.string({ minLength: 1 }))
})

/**
 * 定义窗口控制请求模型。
 */
export const windowActionRequestSchema = z.object({
  windowId: z.number({ integer: true, min: 1 }).optional()
})

/**
 * 定义窗口控制响应模型。
 */
export const windowActionResponseSchema = z.object({
  windowId: z.number({ integer: true, min: 1 }),
  state: z.enum(['minimized', 'maximized', 'closed', 'normal'] as const)
})

/* ───────────────────────── 窗口管理补充 schemas ───────────────────────── */

/**
 * 设置窗口标题 IPC 请求模型（在 shared 基础上增加可选 windowId）。
 */
export const windowSetTitleIpcRequestSchema = z.object({
  title: z.string({ minLength: 1, maxLength: 256 }),
  windowId: z.number({ integer: true, min: 1 }).optional()
})

/**
 * 按角色关闭窗口请求模型。
 */
export const windowCloseByRoleRequestSchema = z.object({
  role: z.enum(WINDOW_ROLES)
})

/**
 * 窗口计数响应模型（用于 closeAll / closeByRole 等批量操作）。
 */
export const windowCountResponseSchema = z.object({
  count: z.number({ integer: true, min: 0 })
})

/**
 * 设置窗口标题响应模型。
 */
export const windowSetTitleResponseSchema = z.object({
  windowId: z.number({ integer: true, min: 1 }),
  title: z.string()
})

/**
 * 窗口创建事件模型。
 */
export const windowCreatedEventSchema = z.object({
  windowId: z.number({ integer: true, min: 1 }),
  role: z.enum(WINDOW_ROLES),
  instanceKey: z.string({ minLength: 1 }),
  route: z.string({ minLength: 1 }),
  timestamp: z.number({ min: 0 })
})

/* ───────────────────────── 后台任务 ───────────────────────── */

/**
 * 定义后台任务启动请求模型。
 */
export const taskStartRequestSchema = z.object({
  taskId: z.string({ minLength: 1, maxLength: 128 }),
  kind: z.enum(TASK_KINDS),
  payload: z.unknown().optional(),
  abortable: z.boolean().optional()
})

/**
 * 定义后台任务启动响应模型。
 */
export const taskStartResponseSchema = z.object({
  taskId: z.string({ minLength: 1, maxLength: 128 }),
  accepted: z.boolean(),
  status: z.enum(TASK_START_STATUSES)
})

/**
 * 定义后台任务取消请求模型。
 */
export const taskCancelRequestSchema = z.object({
  taskId: z.string({ minLength: 1, maxLength: 128 }),
  reason: z.string({ minLength: 1, maxLength: 256 }).optional()
})

/**
 * 定义后台任务取消响应模型。
 */
export const taskCancelResponseSchema = z.object({
  taskId: z.string({ minLength: 1, maxLength: 128 }),
  cancelled: z.boolean()
})

/**
 * 定义统一错误模型。
 */
export const ipcErrorSchema = z.object({
  code: z.enum(Object.values(IPC_ERROR_CODES) as [string, ...string[]]),
  message: z.string({ minLength: 1 }),
  detail: z.unknown().optional(),
  cause: z.string({ minLength: 1 }).optional(),
  retryable: z.boolean().optional()
}) as ZodSchema<IpcError>

/**
 * 定义统一结果元信息模型。
 */
export const ipcResultMetaSchema = z.object({
  requestId: z.string({ minLength: 1 }),
  durationMs: z.number({ min: 0 })
})

/**
 * 定义后台任务进度事件模型。
 */
export const taskProgressEventSchema = z.object({
  taskId: z.string({ minLength: 1, maxLength: 128 }),
  phase: z.enum(TASK_PROGRESS_PHASES),
  percent: z.number({ min: 0, max: 100 }),
  completedUnits: z.number({ min: 0 }).optional(),
  totalUnits: z.number({ min: 0 }).optional(),
  message: z.string({ minLength: 1, maxLength: 512 }).optional()
})

/**
 * 定义后台任务完成事件模型。
 */
export const taskCompletedEventSchema = z.object({
  taskId: z.string({ minLength: 1, maxLength: 128 }),
  result: z.unknown().optional(),
  completedAt: z.string({ minLength: 1 }).optional()
})

/**
 * 定义后台任务失败事件模型。
 */
export const taskFailedEventSchema = z.object({
  taskId: z.string({ minLength: 1, maxLength: 128 }),
  error: ipcErrorSchema,
  failedAt: z.string({ minLength: 1 }).optional()
})

/**
 * 定义窗口焦点变化事件模型。
 */
export const windowFocusChangedEventSchema = z.object({
  windowId: z.number({ integer: true, min: 1 }),
  focused: z.boolean()
})

/* ───────────────────────── 数据库 schemas ───────────────────────── */

/**
 * 数据库健康报告模型。
 */
export const dbHealthResponseSchema = z.object({
  healthy: z.boolean(),
  dbExists: z.boolean(),
  writable: z.boolean(),
  pragmaOk: z.boolean(),
  pragmaIssues: z.array(z.string()),
  migrationLatest: z.boolean(),
  pendingMigrations: z.boolean(),
  schemaVersion: z.number(),
  expectedSchemaVersion: z.number(),
  walEnabled: z.boolean(),
  dbFileSize: z.number(),
  latestBackupTime: z.string().nullable(),
  integrityCheck: z.string(),
  issues: z.array(z.string()),
  checkedAt: z.string({ minLength: 1 })
})

/**
 * 数据库统计响应模型。
 */
export const dbStatsResponseSchema = z.object({
  app_settings: z.number(),
  window_states: z.number(),
  tasks: z.number(),
  task_events: z.number(),
  app_logs: z.number(),
  audit_logs: z.number(),
  file_assets: z.number(),
  sync_outbox: z.number(),
  sync_inbox: z.number()
})

/**
 * 数据库备份响应模型。
 */
export const dbBackupResponseSchema = z.object({
  backupPath: z.string({ minLength: 1 }),
  backupName: z.string({ minLength: 1 }),
  size: z.number({ min: 0 }),
  sha256: z.string({ minLength: 1 }),
  createdAt: z.string({ minLength: 1 })
})

/**
 * 数据库恢复请求模型。
 */
export const dbRestoreRequestSchema = z.object({
  backupPath: z.string({ minLength: 1 }),
  confirm: z.boolean()
})

/**
 * 数据库恢复响应模型。
 */
export const dbRestoreResponseSchema = z.object({
  success: z.boolean(),
  restoredFrom: z.string({ minLength: 1 }),
  preRestoreBackupPath: z.string().nullable(),
  healthReport: z.unknown().nullable(),
  restoredAt: z.string({ minLength: 1 })
})

/**
 * 数据库 vacuum 响应模型。
 */
export const dbVacuumResponseSchema = z.object({
  success: z.boolean()
})

/**
 * 数据库清理日志响应模型。
 */
export const dbClearLogsResponseSchema = z.object({
  deleted: z.number({ min: 0 })
})

/* ───────────────────────── 任务数据 schemas ───────────────────────── */

/**
 * 任务数据列表请求模型。
 */
export const taskDataListRequestSchema = z.object({
  page: z.number({ integer: true, min: 1 }).optional(),
  pageSize: z.number({ integer: true, min: 1 }).optional(),
  status: z.string().optional(),
  type: z.string().optional()
})

/**
 * 任务数据项模型。
 */
export const taskDataItemSchema = z.object({
  id: z.string({ minLength: 1 }),
  type: z.string({ minLength: 1 }),
  title: z.string({ minLength: 1 }),
  status: z.string({ minLength: 1 }),
  progress: z.number({ min: 0 }),
  input: z.unknown(),
  output: z.unknown(),
  error: z.string().nullable(),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
  canceledAt: z.string().nullable(),
  createdAt: z.string({ minLength: 1 }),
  updatedAt: z.string({ minLength: 1 })
})

/**
 * 任务数据列表响应模型。
 */
export const taskDataListResponseSchema = z.object({
  items: z.array(taskDataItemSchema),
  total: z.number({ min: 0 }),
  page: z.number({ min: 1 }),
  pageSize: z.number({ min: 1 }),
  totalPages: z.number({ min: 0 }),
  hasMore: z.boolean()
})

/**
 * 任务数据创建请求模型。
 */
export const taskDataCreateRequestSchema = z.object({
  id: z.string().optional(),
  type: z.string({ minLength: 1 }),
  title: z.string({ minLength: 1, maxLength: 256 }),
  status: z.string().optional(),
  progress: z.number({ min: 0, max: 100 }).optional(),
  input: z.unknown().optional()
})

/**
 * 任务数据更新请求模型。
 */
export const taskDataUpdateRequestSchema = z.object({
  id: z.string({ minLength: 1 }),
  status: z.string().optional(),
  progress: z.number({ min: 0, max: 100 }).optional(),
  output: z.unknown().optional(),
  error: z.string().nullable().optional()
})

/**
 * 任务数据 ID 请求模型。
 */
export const taskDataByIdRequestSchema = z.object({
  id: z.string({ minLength: 1 })
})

/* ───────────────────────── 设置 schemas ───────────────────────── */

/**
 * 设置获取请求模型。
 */
export const settingGetRequestSchema = z.object({
  namespace: z.string({ minLength: 1 }),
  key: z.string({ minLength: 1 })
})

/**
 * 设置设置请求模型。
 */
export const settingSetRequestSchema = z.object({
  namespace: z.string({ minLength: 1 }),
  key: z.string({ minLength: 1 }),
  value: z.unknown(),
  valueType: z.string().optional(),
  description: z.string().optional()
})

/**
 * 设置列表请求模型。
 */
export const settingListRequestSchema = z.object({
  namespace: z.string({ minLength: 1 })
})

/**
 * 设置项模型。
 */
export const settingItemSchema = z.object({
  id: z.string({ minLength: 1 }),
  namespace: z.string({ minLength: 1 }),
  key: z.string({ minLength: 1 }),
  value: z.unknown(),
  valueType: z.string({ minLength: 1 }),
  description: z.string(),
  isSystem: z.boolean(),
  createdAt: z.string({ minLength: 1 }),
  updatedAt: z.string({ minLength: 1 })
})

/**
 * 设置列表响应模型。
 */
export const settingListResponseSchema = z.array(settingItemSchema)

/* ───────────────────────── .xuanbing 文件 schemas ───────────────────────── */

/**
 * 文件引用模型。
 */
export const xuanbingFileRefSchema = z.object({
  token: z.string({ minLength: 1 }),
  displayName: z.string({ minLength: 1 }),
  size: z.number({ min: 0 }),
  expiresAt: z.number({ min: 0 })
})

/**
 * 文件对话框请求模型。
 */
export const xuanbingFileDialogRequestSchema = z.object({
  title: z.string().optional(),
  defaultPath: z.string().optional()
})

/**
 * 文件对话框响应模型。
 */
export const xuanbingFileDialogResponseSchema = z.object({
  canceled: z.boolean(),
  fileRef: xuanbingFileRefSchema.nullable()
})

/**
 * 文件读取预览响应模型。
 */
export const xuanbingFilePreviewResponseSchema = z.object({
  fileRef: xuanbingFileRefSchema,
  fileType: z.string({ minLength: 1 }),
  formatVersion: z.number({ min: 1 }),
  schemaVersion: z.number({ min: 1 }),
  appVersion: z.string({ minLength: 1 }),
  metadata: z.object({
    name: z.string(),
    description: z.string(),
    author: z.string(),
    tags: z.array(z.string())
  }),
  createdAt: z.string({ minLength: 1 }),
  updatedAt: z.string({ minLength: 1 }),
  checksum: z.string({ minLength: 1 }),
  payloadSize: z.number({ min: 0 }),
  valid: z.boolean()
})

/**
 * 文件校验响应模型。
 */
export const xuanbingFileValidateResponseSchema = z.object({
  valid: z.boolean(),
  errors: z.array(z.string())
})

/**
 * 文件导出请求模型。
 */
export const xuanbingFileExportRequestSchema = z.object({
  fileRef: xuanbingFileRefSchema,
  type: z.string({ minLength: 1 }),
  metadata: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    author: z.string().optional(),
    tags: z.array(z.string()).optional()
  }).optional(),
  redact: z.boolean().optional()
})

/**
 * 文件导出响应模型。
 */
export const xuanbingFileExportResponseSchema = z.object({
  fileRef: xuanbingFileRefSchema,
  fileType: z.string({ minLength: 1 }),
  size: z.number({ min: 0 }),
  checksum: z.string({ minLength: 1 }),
  exportedAt: z.string({ minLength: 1 })
})

/**
 * dryRun 导入请求模型。
 */
export const xuanbingFileDryRunImportRequestSchema = z.object({
  fileRef: xuanbingFileRefSchema,
  conflictStrategy: z.string().optional()
})

/**
 * 导入计划项模型。
 */
export const importPlanItemSchema = z.object({
  key: z.string({ minLength: 1 }),
  action: z.string({ minLength: 1 }),
  reason: z.string().optional(),
  existingId: z.string().optional()
})

/**
 * dryRun 导入响应模型。
 */
export const xuanbingFileDryRunImportResponseSchema = z.object({
  fileRef: xuanbingFileRefSchema,
  fileType: z.string({ minLength: 1 }),
  schemaVersion: z.number({ min: 1 }),
  items: z.array(importPlanItemSchema),
  summary: z.object({
    create: z.number({ min: 0 }),
    update: z.number({ min: 0 }),
    skip: z.number({ min: 0 }),
    conflict: z.number({ min: 0 }),
    error: z.number({ min: 0 }),
    total: z.number({ min: 0 })
  }),
  conflictStrategy: z.string({ minLength: 1 })
})

/**
 * 正式导入请求模型。
 */
export const xuanbingFileImportRequestSchema = z.object({
  fileRef: xuanbingFileRefSchema,
  plan: xuanbingFileDryRunImportResponseSchema
})

/**
 * 正式导入响应模型。
 */
export const xuanbingFileImportResponseSchema = z.object({
  success: z.boolean(),
  imported: z.number({ min: 0 }),
  skipped: z.number({ min: 0 }),
  errors: z.array(z.object({
    key: z.string({ minLength: 1 }),
    message: z.string({ minLength: 1 })
  })),
  rolledBack: z.boolean(),
  importedAt: z.string({ minLength: 1 })
})

/**
 * 为成功数据模型创建统一的包装模型。
 *
 * @param dataSchema 成功数据的校验模型。
 * @returns 统一的包装校验模型。
 */
export function createIpcResultSchema<TData>(dataSchema: ZodSchema<TData>): ZodSchema<IpcResult<TData>> {
  return z.union([
    z.object({
      ok: z.literal(true),
      data: dataSchema,
      meta: ipcResultMetaSchema.optional()
    }),
    z.object({
      ok: z.literal(false),
      error: ipcErrorSchema,
      meta: ipcResultMetaSchema.optional()
    })
  ]) as ZodSchema<IpcResult<TData>>
}

/**
 * 定义通用 IPC 结果模型。
 */
export const ipcResultSchema = createIpcResultSchema(z.unknown())
