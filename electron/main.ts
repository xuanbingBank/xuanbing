/**
 * @file 应用主进程入口，负责窗口创建、安全策略与 IPC Runtime 装配。
 */

import { app, BrowserWindow, dialog, Menu, session } from 'electron'
import { createMainIpcRuntime } from './ipcBus/main'
import { IPC_EVENTS } from './ipcBus/shared'

const APP_NAME = 'All In One'
const MAIN_WINDOW_ROLE = 'main'
const DEV_SERVER_URL = process.env.ELECTRON_RENDERER_URL

let mainWindow: BrowserWindow | null = null
let ipcRuntime: Awaited<ReturnType<typeof createMainIpcRuntime>> | null = null

const gotInstanceLock = app.requestSingleInstanceLock()
if (!gotInstanceLock) {
  // TODO: 此处 app.quit() 后未提前退出，模块顶层逻辑仍会继续执行，
  // 因 ES 模块顶层不支持 return，后续可考虑改为 app.quit() + process.exit(0)
  // 或将启动流程包裹进函数以实现真正提前退出。
  app.quit()
}

process.on('uncaughtException', (error: unknown) => {
  console.error('[main] Uncaught exception', error)
  dialog.showErrorBox('Application Error', `${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease restart the app.`)
  // 延迟退出以允许日志落盘。
  setTimeout(() => app.quit(), 1000)
})

process.on('unhandledRejection', (reason: unknown) => {
  console.error('[main] Unhandled promise rejection', reason)
})

/**
 * 将新 WindowManager 创建的窗口注册到旧 WindowManager，使 IpcMainBus 能解析 sender 与分发事件。
 *
 * @param windowInstance 由新 WindowManager 工厂创建的 BrowserWindow。
 * @param role 窗口角色。
 */
function registerWindowWithRuntime(windowInstance: BrowserWindow, role: string): void {
  if (!ipcRuntime) {
    return
  }

  ipcRuntime.windowManager.registerWindow(windowInstance, {
    windowId: windowInstance.id,
    role
  })

  windowInstance.on('focus', () => {
    ipcRuntime?.windowManager.setFocusedWindow(windowInstance.id)
    ipcRuntime?.bus.broadcast(IPC_EVENTS.windowFocusChanged, {
      windowId: windowInstance.id,
      focused: true
    })
  })

  windowInstance.on('blur', () => {
    ipcRuntime?.bus.broadcast(IPC_EVENTS.windowFocusChanged, {
      windowId: windowInstance.id,
      focused: false
    })
  })

  windowInstance.on('closed', () => {
    ipcRuntime?.bus.cleanupWindow(windowInstance.id)
    ipcRuntime?.taskRegistry.cleanupWindow(windowInstance.id)
    ipcRuntime?.windowManager.unregisterWindow(windowInstance.id)
  })
}

/**
 * 监听新 WindowManager 的窗口创建事件，自动将所有窗口桥接到旧 WindowManager。
 *
 * 这样通过 IPC windowOpen 创建的非主窗口也能被 IpcMainBus 解析 sender 与通过权限校验。
 */
function bridgeWindowManagers(): void {
  if (!ipcRuntime) {
    return
  }

  const eventBus = ipcRuntime.newWindowManager.getEventBus()
  eventBus.on('window:created', (payload) => {
    if (!ipcRuntime) {
      return
    }
    const windowInstance = BrowserWindow.fromId(payload.windowId)
    if (!windowInstance || windowInstance.isDestroyed()) {
      return
    }
    // 避免重复注册（主窗口已在 createWindow 中注册）。
    if (ipcRuntime.windowManager.getWindowRole(windowInstance.id) !== undefined) {
      return
    }
    registerWindowWithRuntime(windowInstance, payload.role)
  })
}

/**
 * 创建主窗口。
 *
 * 使用新 WindowManager 的 openWindow 创建窗口，再将底层 BrowserWindow 注册到旧 WindowManager。
 */
function createWindow(): void {
  if (!ipcRuntime) {
    return
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.focus()
    return
  }

  // 通过新 WindowManager 打开主窗口，由其负责创建 BrowserWindow、加载 URL、绑定生命周期。
  const openResult = ipcRuntime.newWindowManager.openWindow(MAIN_WINDOW_ROLE)
  const windowInstance = BrowserWindow.fromId(openResult.windowId)

  if (!windowInstance) {
    console.error('[main] Failed to resolve BrowserWindow from new WindowManager.')
    return
  }

  mainWindow = windowInstance
  registerWindowWithRuntime(mainWindow, MAIN_WINDOW_ROLE)

  mainWindow.webContents.on('did-fail-load', (_event, code, description) => {
    console.error('[renderer] Failed to load page', code, description)
    dialog.showErrorBox('Page Load Failed', `Error code: ${code}\n${description}`)
  })

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('[renderer] Render process exited', details.reason)

    const win = mainWindow
    if (!win || win.isDestroyed()) {
      return
    }

    void dialog.showMessageBox(win, {
      type: 'error',
      title: 'Renderer Crashed',
      message: 'The renderer process exited unexpectedly.',
      detail: `Reason: ${details.reason}`,
      buttons: ['Reload', 'Close']
    }).then(({ response }) => {
      if (response === 0 && win && !win.isDestroyed()) {
        win.webContents.reload()
        return
      }

      win?.close()
    }).catch((err: unknown) => {
      console.error('[main] showMessageBox failed', err)
    })
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  }
}

/**
 * 初始化应用运行时。
 */
async function bootstrapApplication(): Promise<void> {
  ipcRuntime = await createMainIpcRuntime({
    appName: APP_NAME
  })

  bridgeWindowManagers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
}

app.on('second-instance', () => {
  if (!mainWindow) {
    return
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore()
  }

  mainWindow.focus()
})

app.whenReady().then(() => {
  // 阻止任何 <webview> 标签附着，强制使用 BrowserWindow + preload 模型。
  // TODO: 缺全局 will-navigate 兜底，当前未阻止渲染层导航到 file:// 或外部 http(s)。
  // 后续建议在此对 contents.on('will-navigate') 做校验，仅允许同源 hash 路由跳转，
  // 防止页面被导航到非预期来源。
  app.on('web-contents-created', (_event, contents) => {
    contents.on('will-attach-webview', (e) => e.preventDefault())
  })

  // 生产环境移除应用菜单，减少默认菜单带来的快捷键与暴露面。
  // TODO: 生产环境检测逻辑不一致：此处用 NODE_ENV/DEV_SERVER_URL，
  // 而 createWindow 中用 app.isPackaged 判断是否打开 DevTools。
  // 建议统一使用 app.isPackaged 作为生产环境判定，避免环境变量未设置时误判。
  const isProduction = process.env.NODE_ENV === 'production' || !DEV_SERVER_URL
  if (isProduction) {
    Menu.setApplicationMenu(null)
  }

  // 默认拒绝所有权限请求(摄像头/麦克风/通知等),本地应用不需要。
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false)
  })
  // 同步权限校验同样默认拒绝,覆盖 navigator.permissions.query 等路径。
  session.defaultSession.setPermissionCheckHandler(() => false)

  // 网络层 CSP:在响应头注入统一策略,补充 base-uri/form-action/object-src。
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; base-uri 'self'; form-action 'self'; object-src 'none'"
        ]
      }
    })
  })

  void bootstrapApplication().catch((error: unknown) => {
    console.error('[main] Failed to bootstrap application', error)
    dialog.showErrorBox('Startup Failed', error instanceof Error ? error.message : 'Unknown bootstrap error')
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  try {
    ipcRuntime?.taskRegistry.cancelAll()
  } catch (err) {
    console.error('[main] cancelAll failed during before-quit', err)
  }
  try {
    ipcRuntime?.bus.dispose()
  } catch (err) {
    console.error('[main] bus.dispose failed during before-quit', err)
  }
  try {
    ipcRuntime?.newWindowManager.saveAllState()
  } catch (err) {
    console.error('[main] saveAllState failed during before-quit', err)
  }
  try {
    ipcRuntime?.closeDatabase()
  } catch (err) {
    console.error('[main] closeDatabase failed during before-quit', err)
  }
  try {
    ipcRuntime?.xuanbingFileService.dispose()
  } catch (err) {
    console.error('[main] xuanbingFileService.dispose failed during before-quit', err)
  }
})
