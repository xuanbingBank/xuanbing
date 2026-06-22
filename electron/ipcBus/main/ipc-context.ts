/**
 * @file 构建 IPC 处理器使用的标准请求上下文。
 */

import type { IpcLogger } from './ipc-logger'
import type { WindowManager } from './window-manager'

export interface IpcInvokeEventLike {
  sender?: {
    id?: number
  }
  senderFrame?: {
    url?: string
  } | null
}

export interface IpcRequestContext {
  requestId: string
  channel: string
  senderWindowId?: number
  senderFrameUrl?: string
  startedAt: number
  logger: IpcLogger
  signal: AbortSignal
  permissions: {
    role?: string
  }
}

/**
 * 基于 Electron invoke 事件创建处理器上下文。
 *
 * @param options 上下文构建参数。
 * @returns 标准化后的处理器上下文。
 */
export function createIpcContext(options: {
  channel: string
  event: IpcInvokeEventLike
  logger: IpcLogger
  requestId: string
  signal: AbortSignal
  startedAt: number
  windowManager: WindowManager
}): IpcRequestContext {
  const senderWindowId = options.windowManager.getWindowIdBySenderId(options.event.sender?.id)

  return {
    requestId: options.requestId,
    channel: options.channel,
    senderWindowId,
    senderFrameUrl: options.event.senderFrame?.url,
    startedAt: options.startedAt,
    logger: options.logger,
    signal: options.signal,
    permissions: {
      role: options.windowManager.getWindowRole(senderWindowId)
    }
  }
}
