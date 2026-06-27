/**
 * @file 系统桌面通知与消息框组合式函数。
 *
 * 通过 IPC 调用主进程的 Electron Notification API 和 dialog.showMessageBox，
 * 调用操作系统原生的桌面通知和消息框。
 */

import type {
  SystemNotificationInput,
  SystemNotificationOutput,
  SystemMessageBoxInput,
  SystemMessageBoxOutput,
  SystemMessageBoxType,
  SystemToastInput,
  SystemToastOutput,
  SystemToastType,
  SystemToastPosition
} from '../../../electron/ipcBus/renderer/desktop-api'

/** useSystemNotification 返回值 */
export interface UseSystemNotificationReturn {
  /**
   * 显示系统桌面通知。
   *
   * @param title 通知标题。
   * @param body 通知正文（可选）。
   * @param options 其他选项（subtitle / silent）。
   * @returns 通知是否成功显示。
   */
  show: (title: string, body?: string, options?: { subtitle?: string; silent?: boolean }) => Promise<boolean>
}

/**
 * 系统桌面通知组合式函数。
 *
 * 封装 `window.desktop.system.showNotification`，简化调用方式。
 *
 * @returns 通知操作方法。
 */
export function useSystemNotification(): UseSystemNotificationReturn {
  function show(
    title: string,
    body?: string,
    options?: { subtitle?: string; silent?: boolean }
  ): Promise<boolean> {
    const input: SystemNotificationInput = {
      title,
      body,
      subtitle: options?.subtitle,
      silent: options?.silent
    }
    return window.desktop.system.showNotification(input).then((res: SystemNotificationOutput) => res.shown)
  }

  return { show }
}

/** useSystemMessageBox 返回值 */
export interface UseSystemMessageBoxReturn {
  /**
   * 显示系统消息框。
   *
   * @param options 消息框选项。
   * @returns 用户点击的按钮索引。
   */
  show: (options: {
    title: string
    message: string
    type?: SystemMessageBoxType
    buttons?: string[]
    defaultId?: number
    cancelId?: number
  }) => Promise<number>
}

/**
 * 系统消息框组合式函数。
 *
 * 封装 `window.desktop.system.showMessageBox`，返回用户点击的按钮索引。
 *
 * @returns 消息框操作方法。
 */
export function useSystemMessageBox(): UseSystemMessageBoxReturn {
  function show(options: {
    title: string
    message: string
    type?: SystemMessageBoxType
    buttons?: string[]
    defaultId?: number
    cancelId?: number
  }): Promise<number> {
    const input: SystemMessageBoxInput = {
      title: options.title,
      message: options.message,
      type: options.type,
      buttons: options.buttons,
      defaultId: options.defaultId,
      cancelId: options.cancelId
    }
    return window.desktop.system.showMessageBox(input).then((res: SystemMessageBoxOutput) => res.response)
  }

  return { show }
}

/** useSystemToast 返回值 */
export interface UseSystemToastReturn {
  /**
   * 在桌面显示一个独立置顶的 Toast 浮层（在应用窗口外）。
   *
   * @param title Toast 标题。
   * @param message Toast 正文（可选）。
   * @param options 其他选项（type / duration / position）。
   * @returns Toast 是否成功显示。
   */
  show: (
    title: string,
    message?: string,
    options?: { type?: SystemToastType; duration?: number; position?: SystemToastPosition }
  ) => Promise<boolean>
}

/**
 * 系统桌面 Toast 组合式函数。
 *
 * 在桌面显示一个独立于应用窗口的透明置顶 Toast 浮层，自动消失。
 * 与系统通知不同，Toast 不进入 Windows 通知中心，样式完全自定义。
 * 支持 8 个出现方向：top-left / top-center / top-right / center-left / center-right / bottom-left / bottom-center / bottom-right
 *
 * @returns Toast 操作方法。
 */
export function useSystemToast(): UseSystemToastReturn {
  function show(
    title: string,
    message?: string,
    options?: { type?: SystemToastType; duration?: number; position?: SystemToastPosition }
  ): Promise<boolean> {
    const input: SystemToastInput = {
      title,
      message,
      type: options?.type,
      duration: options?.duration,
      position: options?.position
    }
    return window.desktop.system.showToast(input).then((res: SystemToastOutput) => res.shown)
  }

  return { show }
}
