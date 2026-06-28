/**
 * @file 自动更新 IPC 模块,封装 electron-updater 能力。
 *
 * 提供四个请求通道:
 * - update:check    检查是否有可用更新
 * - update:download 下载已检测到的更新包
 * - update:install  退出应用并安装已下载的更新
 * - update:status   查询当前更新状态
 *
 * 提供五个事件推送通道(主进程 → 渲染进程):
 * - update:progress        下载进度
 * - update:downloaded      下载完成
 * - update:available       检测到可用更新
 * - update:error           更新过程发生错误
 * - update:status.changed  状态变化
 */

import { autoUpdater } from 'electron-updater'
import type { ProgressInfo, UpdateInfo } from 'electron-updater'
import { z } from '../../shared'
import type { EventContractLike, IpcMainBus, RequestContractLike } from '../ipc-main-bus'

/* ───────────────────────── 类型定义 ───────────────────────── */

/** 自动更新状态枚举 */
type UpdateStatus = 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'

/** 更新信息摘要(从 electron-updater UpdateInfo 提取渲染进程所需字段) */
interface UpdateInfoSummary {
  version: string
  releaseDate?: string
  releaseNotes: string | null
}

/** 更新下载进度信息 */
interface UpdateProgress {
  percent: number
  transferred: number
  total: number
  bytesPerSecond: number
}

/** 完整更新状态(供渲染进程查询与监听) */
interface UpdateState {
  status: UpdateStatus
  info: UpdateInfoSummary | null
  progress: UpdateProgress | null
  error: string | null
}

/* ───────────────────────── TODO: 待迁移到 shared 层 ───────────────────────── */

// TODO: 需要在 constants.ts 中添加以下通道与事件常量:
//   IPC_CHANNELS.updateCheck      = 'update:check'
//   IPC_CHANNELS.updateDownload   = 'update:download'
//   IPC_CHANNELS.updateInstall    = 'update:install'
//   IPC_CHANNELS.updateStatus     = 'update:status'
//   IPC_EVENTS.updateProgress     = 'update:progress'
//   IPC_EVENTS.updateDownloaded   = 'update:downloaded'
//   IPC_EVENTS.updateAvailable    = 'update:available'
//   IPC_EVENTS.updateError        = 'update:error'
//   IPC_EVENTS.updateStatusChanged = 'update:status.changed'
//   IPC_PERMISSIONS.updateManage  = 'update:manage'
//
// TODO: 需要在 contracts.ts 中添加对应的 requestContracts 与 eventContracts,
//   使用与下方本地定义一致的 schema,并在 shared/index.ts 中导出。
//
// TODO: 需要在 ipcBus/main/index.ts 的 createMainIpcRuntime 中调用 registerUpdateIpc({ bus })。

/* ───────────────────────── 本地通道与事件常量 ───────────────────────── */

/** 本地通道常量(待迁移到 constants.ts 的 IPC_CHANNELS) */
const UPDATE_CHANNELS = {
  check: 'update:check',
  download: 'update:download',
  install: 'update:install',
  status: 'update:status'
} as const

/** 本地事件常量(待迁移到 constants.ts 的 IPC_EVENTS) */
const UPDATE_EVENTS = {
  progress: 'update:progress',
  downloaded: 'update:downloaded',
  available: 'update:available',
  error: 'update:error',
  statusChanged: 'update:status.changed'
} as const

/* ───────────────────────── Schema 定义 ───────────────────────── */

/** 空对象 schema,用于无参数请求的输入校验 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const emptyObjectSchema = z.object({}) as any

/** 更新信息摘要 schema */
const updateInfoSummarySchema = z.object({
  version: z.string(),
  releaseDate: z.string().optional(),
  releaseNotes: z.string().nullable()
})

/** 更新进度 schema */
const updateProgressSchema = z.object({
  percent: z.number(),
  transferred: z.number(),
  total: z.number(),
  bytesPerSecond: z.number()
})

/** 完整更新状态 schema */
const updateStateSchema = z.object({
  status: z.enum(['idle', 'checking', 'available', 'not-available', 'downloading', 'downloaded', 'error']),
  info: updateInfoSummarySchema.nullable(),
  progress: updateProgressSchema.nullable(),
  error: z.string().nullable()
})

/* ───────────────────────── 本地请求契约(待迁移到 contracts.ts) ───────────────────────── */

/** 检查更新请求契约 */
const checkUpdateContract: RequestContractLike<Record<string, never>, { available: boolean; info: UpdateInfoSummary | null }> = {
  channel: UPDATE_CHANNELS.check,
  description: '检查应用是否有可用更新。',
  permission: 'public',
  inputSchema: emptyObjectSchema,
  outputSchema: z.object({
    available: z.boolean(),
    info: updateInfoSummarySchema.nullable()
  })
}

/** 下载更新请求契约 */
const downloadUpdateContract: RequestContractLike<Record<string, never>, { started: boolean }> = {
  channel: UPDATE_CHANNELS.download,
  description: '下载已检测到的更新包。',
  permission: 'public',
  inputSchema: emptyObjectSchema,
  outputSchema: z.object({
    started: z.boolean()
  })
}

/** 安装更新请求契约 */
const installUpdateContract: RequestContractLike<Record<string, never>, { installing: boolean }> = {
  channel: UPDATE_CHANNELS.install,
  description: '退出应用并安装已下载的更新。',
  permission: 'public',
  inputSchema: emptyObjectSchema,
  outputSchema: z.object({
    installing: z.boolean()
  })
}

/** 查询更新状态请求契约 */
const getUpdateStatusContract: RequestContractLike<Record<string, never>, UpdateState> = {
  channel: UPDATE_CHANNELS.status,
  description: '获取当前自动更新状态。',
  permission: 'public',
  inputSchema: emptyObjectSchema,
  outputSchema: updateStateSchema
}

/* ───────────────────────── 本地事件契约(待迁移到 contracts.ts) ───────────────────────── */

/** 下载进度事件契约 */
const updateProgressEventContract: EventContractLike<UpdateProgress> = {
  event: UPDATE_EVENTS.progress,
  description: '推送更新包下载进度。',
  direction: 'main-to-renderer',
  permission: 'public',
  payloadSchema: updateProgressSchema
}

/** 下载完成事件契约 */
const updateDownloadedEventContract: EventContractLike<{ version: string; releaseDate?: string }> = {
  event: UPDATE_EVENTS.downloaded,
  description: '推送更新包下载完成事件。',
  direction: 'main-to-renderer',
  permission: 'public',
  payloadSchema: z.object({
    version: z.string(),
    releaseDate: z.string().optional()
  })
}

/** 检测到可用更新事件契约 */
const updateAvailableEventContract: EventContractLike<{ version: string; releaseDate?: string }> = {
  event: UPDATE_EVENTS.available,
  description: '推送检测到可用更新事件。',
  direction: 'main-to-renderer',
  permission: 'public',
  payloadSchema: z.object({
    version: z.string(),
    releaseDate: z.string().optional()
  })
}

/** 更新错误事件契约 */
const updateErrorEventContract: EventContractLike<{ message: string }> = {
  event: UPDATE_EVENTS.error,
  description: '推送自动更新过程中的错误。',
  direction: 'main-to-renderer',
  permission: 'public',
  payloadSchema: z.object({
    message: z.string()
  })
}

/** 状态变化事件契约 */
const updateStatusChangedEventContract: EventContractLike<UpdateState> = {
  event: UPDATE_EVENTS.statusChanged,
  description: '推送更新状态变化。',
  direction: 'main-to-renderer',
  permission: 'public',
  payloadSchema: updateStateSchema
}

/* ───────────────────────── 模块实现 ───────────────────────── */

export interface UpdateIpcModuleOptions {
  bus: IpcMainBus
}

/**
 * 注册自动更新 IPC 模块。
 *
 * 行为说明:
 * - autoDownload 设为 false,由用户在渲染进程确认后再下载。
 * - autoInstallOnAppQuit 设为 true,下载完成后退出应用时自动安装。
 * - 所有状态变化通过 bus.broadcast 推送给全部窗口。
 * - 下载进度、完成、错误等事件也通过 bus.broadcast 实时推送。
 *
 * @param options 模块选项。
 */
export function registerUpdateIpc(options: UpdateIpcModuleOptions): void {
  const { bus } = options

  // 当前更新状态(模块内部维护,通过 update:status 通道查询)
  let state: UpdateState = {
    status: 'idle',
    info: null,
    progress: null,
    error: null
  }

  /**
   * 更新内部状态并广播状态变化事件。
   *
   * @param patch 需要合并的状态字段。
   */
  function updateState(patch: Partial<UpdateState>): void {
    state = { ...state, ...patch }
    try {
      bus.broadcast(UPDATE_EVENTS.statusChanged, state)
    } catch (err) {
      console.warn('[update] 广播状态变化失败', err)
    }
  }

  /**
   * 从 electron-updater 的 UpdateInfo 提取渲染进程所需的摘要字段。
   *
   * @param info 原始更新信息。
   * @returns 提取后的摘要,无有效信息时返回 null。
   */
  function toSummary(
    info: { version?: string; releaseDate?: string; releaseNotes?: unknown } | null | undefined
  ): UpdateInfoSummary | null {
    if (!info || !info.version) {
      return null
    }
    // releaseNotes 可能是字符串、数组或 null,统一转为字符串或 null
    const notes = info.releaseNotes
    const releaseNotes = typeof notes === 'string' ? notes : notes ? JSON.stringify(notes) : null
    return {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes
    }
  }

  /* ───────────────────────── 配置 autoUpdater ───────────────────────── */

  // 不自动下载,由用户确认后再下载
  autoUpdater.autoDownload = false
  // 下载完成后退出应用时自动安装
  autoUpdater.autoInstallOnAppQuit = true
  // 生产环境记录日志,开发环境静默(避免无 dev-app-update.yml 时刷屏)
  autoUpdater.logger = process.env.NODE_ENV === 'production' ? console : null

  /* ───────────────────────── 注册事件契约 ───────────────────────── */

  bus.registerEvent(updateProgressEventContract)
  bus.registerEvent(updateDownloadedEventContract)
  bus.registerEvent(updateAvailableEventContract)
  bus.registerEvent(updateErrorEventContract)
  bus.registerEvent(updateStatusChangedEventContract)

  /* ───────────────────────── autoUpdater 事件监听 ───────────────────────── */

  // 开始检查更新
  autoUpdater.on('checking-for-update', () => {
    updateState({ status: 'checking', error: null })
  })

  // 检测到可用更新
  autoUpdater.on('update-available', (info: UpdateInfo) => {
    const summary = toSummary(info)
    updateState({ status: 'available', info: summary, error: null })
    if (summary) {
      try {
        bus.broadcast(UPDATE_EVENTS.available, { version: summary.version, releaseDate: summary.releaseDate })
      } catch (err) {
        console.warn('[update] 广播 available 事件失败', err)
      }
    }
  })

  // 无可用更新
  autoUpdater.on('update-not-available', () => {
    updateState({ status: 'not-available', info: null, error: null })
  })

  // 更新过程发生错误
  autoUpdater.on('error', (err) => {
    const message = err instanceof Error ? err.message : String(err)
    updateState({ status: 'error', error: message })
    try {
      bus.broadcast(UPDATE_EVENTS.error, { message })
    } catch (broadcastErr) {
      console.warn('[update] 广播 error 事件失败', broadcastErr)
    }
  })

  // 下载进度变化
  autoUpdater.on('download-progress', (progress) => {
    const progressInfo: UpdateProgress = {
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond
    }
    updateState({ status: 'downloading', progress: progressInfo })
    try {
      bus.broadcast(UPDATE_EVENTS.progress, progressInfo)
    } catch (err) {
      console.warn('[update] 广播 progress 事件失败', err)
    }
  })

  // 更新包下载完成
  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    const summary = toSummary(info)
    updateState({ status: 'downloaded', info: summary, progress: null, error: null })
    if (summary) {
      try {
        bus.broadcast(UPDATE_EVENTS.downloaded, { version: summary.version, releaseDate: summary.releaseDate })
      } catch (err) {
        console.warn('[update] 广播 downloaded 事件失败', err)
      }
    }
  })

  /* ───────────────────────── 注册请求处理器 ───────────────────────── */

  // 检查更新
  bus.registerHandler(checkUpdateContract, async () => {
    try {
      const result = await autoUpdater.checkForUpdates()
      const info = result?.updateInfo ?? null
      return {
        available: info != null,
        info: toSummary(info)
      }
    } catch (err) {
      // 错误已由 autoUpdater 'error' 事件处理器统一处理,这里返回安全默认值
      console.warn('[update] 检查更新失败', err)
      return { available: false, info: null }
    }
  })

  // 下载更新
  bus.registerHandler(downloadUpdateContract, async () => {
    try {
      // 不等待下载完成,避免 IPC 超时;下载进度与完成通过事件推送
      // 下载失败时 autoUpdater 会触发 'error' 事件,由事件处理器统一处理
      autoUpdater.downloadUpdate().catch((err) => {
        console.warn('[update] 下载更新失败', err)
      })
      return { started: true }
    } catch (err) {
      console.warn('[update] 启动下载失败', err)
      return { started: false }
    }
  })

  // 安装并重启
  bus.registerHandler(installUpdateContract, async () => {
    try {
      // quitAndInstall 会退出应用并启动安装程序,此行之后的代码通常不会执行
      autoUpdater.quitAndInstall()
      return { installing: true }
    } catch (err) {
      console.warn('[update] 安装更新失败', err)
      return { installing: false }
    }
  })

  // 获取当前更新状态
  bus.registerHandler(getUpdateStatusContract, async () => {
    return state
  })
}
