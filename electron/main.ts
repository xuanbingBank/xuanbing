import fs from 'node:fs'
import path from 'node:path'
import { app, BrowserWindow, dialog, nativeTheme } from 'electron'
import type { BrowserWindowConstructorOptions } from 'electron'
import { resolveRendererTarget } from './renderer-target'

const APP_NAME = 'All In One'
const DEFAULT_WINDOW_WIDTH = 960
const DEFAULT_WINDOW_HEIGHT = 640
const WINDOW_STATE_FILE = 'window-state.json'
const DEV_SERVER_URL = process.env.ELECTRON_RENDERER_URL

interface WindowState {
  x?: number
  y?: number
  width: number
  height: number
  isMaximized?: boolean
}

let mainWindow: BrowserWindow | null = null

const gotInstanceLock = app.requestSingleInstanceLock()
if (!gotInstanceLock) {
  app.quit()
}

process.on('uncaughtException', (error) => {
  console.error('[main] Uncaught exception', error)
  dialog.showErrorBox('Application Error', `${error.message}\n\nPlease restart the app.`)
})

process.on('unhandledRejection', (reason) => {
  console.error('[main] Unhandled promise rejection', reason)
})

function getStateFilePath(): string {
  return path.join(app.getPath('userData'), WINDOW_STATE_FILE)
}

function loadWindowState(): WindowState {
  try {
    const filePath = getStateFilePath()
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as WindowState
    }
  } catch (error) {
    console.warn('[window] Failed to read window state', error)
  }

  return {
    width: DEFAULT_WINDOW_WIDTH,
    height: DEFAULT_WINDOW_HEIGHT
  }
}

function saveWindowState(win: BrowserWindow): void {
  try {
    const bounds = win.getBounds()
    const state: WindowState = {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      isMaximized: win.isMaximized()
    }

    fs.writeFileSync(getStateFilePath(), JSON.stringify(state, null, 2))
  } catch (error) {
    console.warn('[window] Failed to save window state', error)
  }
}

function getWindowOptions(): BrowserWindowConstructorOptions {
  const savedState = loadWindowState()

  return {
    x: savedState.x,
    y: savedState.y,
    width: savedState.width,
    height: savedState.height,
    minWidth: 720,
    minHeight: 480,
    title: APP_NAME,
    show: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#1e1e1e' : '#ffffff',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: false,
      allowRunningInsecureContent: false,
      javascript: true,
      images: true
    }
  }
}

async function loadPageContent(win: BrowserWindow): Promise<void> {
  const target = resolveRendererTarget({
    appRoot: path.join(__dirname, '..', '..'),
    devServerUrl: DEV_SERVER_URL,
    isPackaged: app.isPackaged
  })

  if (target.kind === 'url') {
    await win.loadURL(target.url)
    return
  }

  await win.loadFile(target.filePath)
}

function createWindow(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.focus()
    return
  }

  mainWindow = new BrowserWindow(getWindowOptions())

  mainWindow.once('ready-to-show', () => {
    if (!mainWindow) {
      return
    }

    if (loadWindowState().isMaximized) {
      mainWindow.maximize()
    }

    mainWindow.show()
    mainWindow.focus()
  })

  mainWindow.on('close', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      saveWindowState(mainWindow)
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.on('did-fail-load', (_event, code, description) => {
    console.error('[renderer] Failed to load page', code, description)
    dialog.showErrorBox('Page Load Failed', `Error code: ${code}\n${description}`)
  })

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('[renderer] Render process exited', details.reason)

    void dialog.showMessageBox(mainWindow!, {
      type: 'error',
      title: 'Renderer Crashed',
      message: 'The renderer process exited unexpectedly.',
      detail: `Reason: ${details.reason}`,
      buttons: ['Reload', 'Close']
    }).then(({ response }) => {
      if (response === 0 && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.reload()
        return
      }

      mainWindow?.close()
    })
  })

  void loadPageContent(mainWindow).catch((error: Error) => {
    console.error('[renderer] Failed to initialize page', error)
    dialog.showErrorBox('Startup Failed', error.message)
  })

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  }
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
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    saveWindowState(mainWindow)
  }
})
