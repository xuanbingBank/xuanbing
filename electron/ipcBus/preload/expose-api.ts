/**
 * @file 通过 contextBridge 将业务化桌面 API 暴露到渲染进程。
 */

import type { DesktopApi } from '../renderer/desktop-api'
import { createPreloadClient, type IpcRendererLike, type PreloadClient, type PreloadWindowLike } from './client'
import { createDesktopApi } from './desktop-api'

/**
 * 定义最小 contextBridge 接口。
 */
export interface ContextBridgeLike {
  exposeInMainWorld(name: 'desktop', api: DesktopApi): void
}

/**
 * 定义 preload 需要的最小 Electron 模块接口。
 */
export interface ElectronModuleLike {
  contextBridge: ContextBridgeLike
  ipcRenderer: IpcRendererLike
}

/**
 * 定义暴露桌面 API 时可覆写的选项。
 */
export interface ExposeDesktopApiOptions {
  bridge?: ContextBridgeLike
  client?: PreloadClient
  windowTarget?: PreloadWindowLike
}

/**
 * 读取 Electron 运行时模块。
 *
 * @returns Electron 模块适配器。
 */
export function getElectronModule(): ElectronModuleLike {
  return require('electron') as ElectronModuleLike
}

/**
 * 获取 preload 可见的窗口对象。
 *
 * @returns 窗口对象。
 */
export function getWindowTarget(): PreloadWindowLike | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }

  return window as PreloadWindowLike
}

/**
 * 暴露业务化桌面 API 到 `window.desktop`。
 *
 * @param options 可选测试与运行时覆写项。
 * @returns 暴露出的桌面 API。
 */
export function exposeDesktopApi(options: ExposeDesktopApiOptions = {}): DesktopApi {
  const electronModule = options.bridge || options.client ? undefined : getElectronModule()
  const bridge = options.bridge ?? electronModule?.contextBridge ?? getElectronModule().contextBridge
  const client = options.client ?? createPreloadClient({
    ipcRenderer: electronModule?.ipcRenderer ?? getElectronModule().ipcRenderer,
    windowTarget: options.windowTarget ?? getWindowTarget()
  })
  const desktopApi = createDesktopApi(client)

  bridge.exposeInMainWorld('desktop', desktopApi)

  return desktopApi
}
