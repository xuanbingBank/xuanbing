/**
 * @file 系统级操作 IPC 模块：桌面通知、消息框、桌面 Toast。
 *
 * - 通过 Electron Notification API 调用 Windows Toast / macOS Notification Center
 * - 通过 dialog.showMessageBox 调用系统原生消息框
 * - 通过 ToastWindowManager 在桌面显示独立置顶 Toast 浮层窗口
 */

import { Notification } from 'electron'
import { IPC_CHANNELS, requestContracts } from '../../shared'
import { createIpcError } from '../ipc-errors'
import type { IpcMainBus } from '../ipc-main-bus'
import type { ToastWindowManager } from '../../../desktop-toast/ToastWindowManager'

/** 通知请求输入 */
interface NotificationInput {
  title: string
  body?: string
  subtitle?: string
  silent?: boolean
}

/** 消息框请求输入 */
interface MessageBoxInput {
  title: string
  message: string
  type?: 'none' | 'info' | 'warning' | 'error' | 'question'
  buttons?: string[]
  defaultId?: number
  cancelId?: number
}

/** Toast 请求输入 */
interface ToastInput {
  type?: 'info' | 'success' | 'warning' | 'error'
  title: string
  message?: string
  duration?: number
  position?: 'top-left' | 'top-center' | 'top-right' | 'center-left' | 'center-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
}

/** 消息框接口（便于测试时注入 mock） */
export interface MessageBoxLike {
  showMessageBox(options: {
    type?: string
    title?: string
    message: string
    buttons?: string[]
    defaultId?: number
    cancelId?: number
  }): Promise<{ response: number; checkboxChecked?: boolean }>
}

/**
 * 注册系统级 IPC handler。
 *
 * @param bus 主进程 IPC 总线。
 * @param messageBox 消息框实现（默认使用 electron.dialog）。
 * @param toastManager 桌面 Toast 窗口管理器。
 */
export function registerSystemIpc(
  bus: IpcMainBus,
  messageBox: MessageBoxLike,
  toastManager: ToastWindowManager
): void {
  /* ── 系统桌面通知 ── */
  bus.registerHandler(requestContracts[IPC_CHANNELS.systemNotificationShow], async ({ input }) => {
    const req = input as NotificationInput

    // 检查系统是否支持通知
    if (!Notification.isSupported()) {
      throw createIpcError('IPC_UNSUPPORTED', '系统通知在当前平台不受支持。')
    }

    const notification = new Notification({
      title: req.title,
      body: req.body || '',
      subtitle: req.subtitle,
      silent: req.silent
    })

    notification.show()

    return { shown: true }
  })

  /* ── 系统消息框 ── */
  bus.registerHandler(requestContracts[IPC_CHANNELS.systemMessageBoxShow], async ({ input }) => {
    const req = input as MessageBoxInput

    const result = await messageBox.showMessageBox({
      type: req.type || 'info',
      title: req.title,
      message: req.message,
      buttons: req.buttons || ['确定'],
      defaultId: req.defaultId,
      cancelId: req.cancelId
    })

    return {
      response: result.response,
      checkboxChecked: result.checkboxChecked
    }
  })

  /* ── 桌面 Toast 浮层 ── */
  bus.registerHandler(requestContracts[IPC_CHANNELS.systemToastShow], async ({ input }) => {
    const req = input as ToastInput

    const shown = toastManager.show({
      type: req.type || 'info',
      title: req.title,
      message: req.message,
      duration: req.duration !== undefined ? req.duration : 4000,
      position: req.position
    })

    return { shown }
  })
}
