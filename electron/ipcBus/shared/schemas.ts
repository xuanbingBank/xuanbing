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
