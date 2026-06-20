/**
 * @file 组装主进程 IPC 总线、窗口管理和示例业务模块。
 */

import path from 'node:path'
import { app, BrowserWindow, dialog, ipcMain, screen, shell } from 'electron'
import { IpcLogger } from './ipc-logger'
import { IpcMainBus } from './ipc-main-bus'
import { registerAppIpc } from './modules/app.ipc'
import { registerFileIpc } from './modules/file.ipc'
import { registerTaskIpc } from './modules/task.ipc'
import { registerWindowIpc } from './modules/window.ipc'
import { TaskRegistry } from './task-registry'
import { WindowManager } from './window-manager'
import { WindowManager as NewWindowManager } from '../../windows/main/window-manager'
import type { BrowserWindowLike as NewBrowserWindowLike } from '../../windows/main/window-manager'
import { resolvePreloadPath, resolveRendererTarget } from '../../renderer-target'

export interface CreateMainIpcRuntimeOptions {
  appName: string
}

/**
 * 创建并注册主进程 IPC 运行时。
 *
 * 同时创建两个窗口管理器：
 * - 旧 WindowManager（electron/ipcBus/main/window-manager）：供 IpcMainBus 解析 sender、分发事件。
 * - 新 WindowManager（electron/windows/main/window-manager）：供窗口 IPC 处理器执行窗口操作。
 *
 * @param options 运行时配置。
 * @returns 运行时对象。
 */
export async function createMainIpcRuntime(options: CreateMainIpcRuntimeOptions): Promise<{
  bus: IpcMainBus
  taskRegistry: TaskRegistry
  windowManager: WindowManager
  newWindowManager: NewWindowManager
}> {
  const windowManager = new WindowManager()
  const taskRegistry = new TaskRegistry()

  const appRoot = app.getAppPath()
  const rendererTarget = resolveRendererTarget({
    appRoot,
    devServerUrl: process.env.ELECTRON_RENDERER_URL,
    isPackaged: app.isPackaged
  })
  const preloadPath = resolvePreloadPath(appRoot)
  const indexHtmlPath = rendererTarget.kind === 'file'
    ? rendererTarget.filePath
    : path.join(appRoot, 'index.html')
  const stateFilePath = path.join(app.getPath('userData'), 'window-state.json')

  const newWindowManager = new NewWindowManager({
    browserWindowFactory: (constructorOptions) => {
      return new BrowserWindow(constructorOptions as unknown as Electron.BrowserWindowConstructorOptions) as unknown as NewBrowserWindowLike
    },
    screen,
    preloadPath,
    isPackaged: app.isPackaged,
    devServerUrl: process.env.ELECTRON_RENDERER_URL,
    indexHtmlPath,
    stateFilePath,
    environment: app.isPackaged ? 'production' : 'development',
    shellOpenExternal: (url: string) => {
      void shell.openExternal(url)
    }
  })

  const logger = new IpcLogger({
    environment: app.isPackaged ? 'production' : 'development',
    slowRequestThresholdMs: 500
  })
  const bus = new IpcMainBus({
    ipcMain,
    logger,
    windowManager,
    environment: app.isPackaged ? 'production' : 'development'
  })

  registerAppIpc(bus, {
    appName: options.appName,
    appVersion: app.getVersion(),
    electronVersion: process.versions?.electron ?? 'unknown',
    chromeVersion: process.versions?.chrome ?? 'unknown',
    platform: process.platform,
    isPackaged: app.isPackaged
  })
  registerFileIpc(bus, dialog)
  registerWindowIpc(bus, newWindowManager)
  registerTaskIpc({
    bus,
    taskRegistry
  })

  await bus.start()

  return {
    bus,
    taskRegistry,
    windowManager,
    newWindowManager
  }
}
