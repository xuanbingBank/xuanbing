/**
 * @file 打开窗口组合式函数，提供按角色打开各类窗口的便捷方法。
 */

import type { WindowOpenInput, WindowOpenOutput } from '../../../electron/ipcBus/renderer'
import type { OpenWindowOptions } from './useWindowControls'

/**
 * 打开窗口组合式函数返回值。
 */
export interface OpenWindowApi {
  /** 通用打开方法，按角色与选项打开窗口 */
  open: (role: string, options?: OpenWindowOptions) => Promise<WindowOpenOutput>
  /** 打开设置窗口 */
  openSettings: () => Promise<WindowOpenOutput>
  /** 打开详情窗口，传入 id 参数 */
  openDetail: (id: string) => Promise<WindowOpenOutput>
  /** 打开关于窗口 */
  openAbout: () => Promise<WindowOpenOutput>
  /** 打开任务中心窗口 */
  openTaskCenter: () => Promise<WindowOpenOutput>
  /** 打开日志查看器窗口 */
  openLogViewer: () => Promise<WindowOpenOutput>
  /** 打开弹窗窗口，传入 type 参数 */
  openModal: (type: string) => Promise<WindowOpenOutput>
}

/**
 * 打开窗口组合式函数，封装常用的窗口打开操作。
 *
 * 该函数不使用生命周期钩子，可在任意位置调用。
 *
 * @returns 窗口打开方法集合。
 */
export function useOpenWindow(): OpenWindowApi {
  const open = async (
    role: string,
    options?: OpenWindowOptions
  ): Promise<WindowOpenOutput> => {
    return window.desktop.window.open(
      role,
      options as Omit<WindowOpenInput, 'role'> | undefined
    )
  }

  const openSettings = (): Promise<WindowOpenOutput> => open('settings')

  const openDetail = (id: string): Promise<WindowOpenOutput> =>
    open('detail', { params: { id } })

  const openAbout = (): Promise<WindowOpenOutput> => open('about')

  const openTaskCenter = (): Promise<WindowOpenOutput> => open('taskCenter')

  const openLogViewer = (): Promise<WindowOpenOutput> => open('logViewer')

  const openModal = (type: string): Promise<WindowOpenOutput> =>
    open('modal', { params: { type } })

  return { open, openSettings, openDetail, openAbout, openTaskCenter, openLogViewer, openModal }
}
