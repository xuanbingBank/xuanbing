/**
 * @file 窗口控制组合式函数，封装 window.desktop.window 的全部控制方法。
 */

import type {
  DesktopUnsubscribe,
  WindowActionOutput,
  WindowCloseCountOutput,
  WindowFocusTarget,
  WindowOpenInput,
  WindowOpenOutput,
  WindowSetTitleOutput
} from '../../../electron/ipcBus/renderer'

/**
 * 打开窗口时的可选参数（不含 role，全部属性可选）。
 */
export type OpenWindowOptions = Partial<Omit<WindowOpenInput, 'role'>>

/**
 * 窗口控制组合式函数返回值。
 */
export interface WindowControls {
  minimize: (windowId?: number) => Promise<WindowActionOutput>
  maximize: (windowId?: number) => Promise<WindowActionOutput>
  restore: (windowId?: number) => Promise<WindowActionOutput>
  close: (windowId?: number) => Promise<WindowActionOutput>
  hide: (windowId?: number) => Promise<WindowActionOutput>
  show: (windowId?: number) => Promise<WindowActionOutput>
  focus: (target?: WindowFocusTarget) => Promise<WindowActionOutput>
  reload: (windowId?: number) => Promise<WindowActionOutput>
  setTitle: (title: string, windowId?: number) => Promise<WindowSetTitleOutput>
  open: (role: string, options?: OpenWindowOptions) => Promise<WindowOpenOutput>
  closeAll: () => Promise<WindowCloseCountOutput>
  closeByRole: (role: string) => Promise<WindowCloseCountOutput>
}

/**
 * 窗口控制组合式函数，提供对 window.desktop.window API 的类型安全封装。
 *
 * 该函数不使用生命周期钩子，可在任意位置调用。
 *
 * @returns 窗口控制方法集合。
 */
export function useWindowControls(): WindowControls {
  return {
    minimize: (windowId?: number) => window.desktop.window.minimize(windowId),
    maximize: (windowId?: number) => window.desktop.window.maximize(windowId),
    restore: (windowId?: number) => window.desktop.window.restore(windowId),
    close: (windowId?: number) => window.desktop.window.close(windowId),
    hide: (windowId?: number) => window.desktop.window.hide(windowId),
    show: (windowId?: number) => window.desktop.window.show(windowId),
    focus: (target?: WindowFocusTarget) => window.desktop.window.focus(target),
    reload: (windowId?: number) => window.desktop.window.reload(windowId),
    setTitle: (title: string, windowId?: number) =>
      window.desktop.window.setTitle(title, windowId),
    open: (role: string, options?: OpenWindowOptions) =>
      window.desktop.window.open(
        role,
        options as Omit<WindowOpenInput, 'role'> | undefined
      ),
    closeAll: () => window.desktop.window.closeAll(),
    closeByRole: (role: string) => window.desktop.window.closeByRole(role)
  }
}

/**
 * 仅用于类型导出，确保 DesktopUnsubscribe 在使用方可见。
 */
export type { DesktopUnsubscribe }
