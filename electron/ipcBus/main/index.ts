/**
 * @file 组装主进程 IPC 总线、窗口管理、数据库基础层和业务模块。
 */

import path from 'node:path'
import { app, BrowserWindow, dialog, ipcMain, screen, shell } from 'electron'
import { IpcLogger } from './ipc-logger'
import { IpcMainBus } from './ipc-main-bus'
import { registerAppIpc } from './modules/app.ipc'
import { registerDatabaseIpc } from './modules/database.ipc'
import { registerFileIpc } from './modules/file.ipc'
import { registerSettingIpc } from './modules/setting.ipc'
import { registerTaskIpc } from './modules/task.ipc'
import { registerTaskDataIpc } from './modules/task-data.ipc'
import { registerWindowIpc } from './modules/window.ipc'
import { registerXuanbingFileIpc } from './modules/xuanbing-file.ipc'
import { TaskRegistry } from './task-registry'
import { WindowManager } from './window-manager'
import { WindowManager as NewWindowManager } from '../../windows/main/window-manager'
import type { BrowserWindowLike as NewBrowserWindowLike } from '../../windows/main/window-manager'
import { DEFAULT_WINDOW_ROLE_PERMISSIONS } from '../../windows/shared/window-permissions'
import { resolvePreloadPath, resolveRendererTarget } from '../../renderer-target'
import { closeConnection, openConnection, resolveDbPaths, runMigrations, type DbPaths } from '../../database'
import { AuditRepository } from '../../repositories/audit.repository'
import { DatabaseService, SettingService, TaskService, XuanbingFileService } from '../../services'

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
 * 数据库初始化顺序：
 * 1. 解析数据库路径（userData/app-data/db/app.sqlite）。
 * 2. 打开 SQLite 连接（WAL / foreign_keys / busy_timeout）。
 * 3. 执行 pending migrations（migration 前自动备份）。
 * 4. 创建 services（database / task / setting / xuanbing-file）。
 * 5. 注册 IPC 模块。
 *
 * @param options 运行时配置。
 * @returns 运行时对象。
 */
export async function createMainIpcRuntime(options: CreateMainIpcRuntimeOptions): Promise<{
  bus: IpcMainBus
  taskRegistry: TaskRegistry
  windowManager: WindowManager
  newWindowManager: NewWindowManager
  dbPaths: DbPaths
  databaseService: DatabaseService
  taskService: TaskService
  settingService: SettingService
  xuanbingFileService: XuanbingFileService
  closeDatabase: () => void
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
      try {
        const protocol = new URL(url).protocol
        if (protocol !== 'http:' && protocol !== 'https:' && protocol !== 'mailto:') {
          console.warn(`[ipc] Blocked openExternal for unsupported protocol: ${protocol}`)
          return
        }
      } catch (err) {
        console.error('[ipc] Failed to parse URL for openExternal', err)
        return
      }
      void shell.openExternal(url).catch((err) => console.error('openExternal failed', err))
    }
  })

  const logger = new IpcLogger({
    environment: app.isPackaged ? 'production' : 'development',
    slowRequestThresholdMs: 500
  })

  // 从窗口角色权限派生 IPC 权限映射，补充 public 与各角色必要的 IPC 权限。
  const rolePermissions: Record<string, string[]> = {}
  for (const [role, perms] of Object.entries(DEFAULT_WINDOW_ROLE_PERMISSIONS)) {
    rolePermissions[role] = [...new Set(['public', ...perms])]
  }
  // 主窗口需要全部 IPC 权限（设置、数据库、任务数据、.xuanbing 文件、跨窗口控制等）。
  rolePermissions.main = [...new Set([
    ...rolePermissions.main,
    'setting:read', 'setting:write',
    'database:read', 'database:write', 'database:backup', 'database:restore',
    'taskData:read', 'taskData:write',
    'xuanbingFile:read', 'xuanbingFile:write', 'xuanbingFile:import', 'xuanbingFile:export',
    'window:control:any', 'window:close:any'
  ])]
  // 设置窗口需要设置项读写权限。
  rolePermissions.settings = [...new Set([
    ...rolePermissions.settings,
    'setting:read', 'setting:write'
  ])]
  // 任务中心窗口需要任务数据读写权限。
  rolePermissions.taskCenter = [...new Set([
    ...rolePermissions.taskCenter,
    'taskData:read', 'taskData:write'
  ])]

  // AuditRepository 仅在 create() 时访问数据库连接，而 dispatchInvoke 只在 bus.start()
  // （数据库已打开）之后被调用，故此处可在数据库初始化前安全实例化并注入。
  const auditRepository = new AuditRepository()

  const bus = new IpcMainBus({
    ipcMain,
    logger,
    windowManager,
    environment: app.isPackaged ? 'production' : 'development',
    rolePermissions,
    auditRepository
  })

  // 订阅新窗口管理器的 window:closed 事件，联动清理任务注册表与 IPC 总线状态，
  // 避免窗口关闭后残留任务或订阅造成资源泄漏（与 main.ts 的窗口关闭清理形成兜底）。
  newWindowManager.getEventBus().on('window:closed', (payload) => {
    bus.cleanupWindow(payload.windowId)
    taskRegistry.cleanupWindow(payload.windowId)
  })

  /* ───────────────────────── 数据库初始化 ───────────────────────── */

  const isTestEnv = process.env.NODE_ENV === 'test' || process.env.DB_TEST_MODE === '1'
  const dbPaths = resolveDbPaths({
    userDataDir: app.getPath('userData'),
    workspaceId: 'default',
    testMode: isTestEnv
  })

  openConnection(dbPaths)
  runMigrations(dbPaths)

  /* ───────────────────────── 服务创建 ───────────────────────── */

  const databaseService = new DatabaseService(dbPaths)
  const taskService = new TaskService()
  const settingService = new SettingService()
  const xuanbingFileService = new XuanbingFileService({
    dbFile: dbPaths.dbFile,
    appVersion: app.getVersion()
  })

  /* ───────────────────────── IPC 模块注册 ───────────────────────── */

  registerAppIpc(bus, {
    appName: options.appName,
    appVersion: app.getVersion(),
    electronVersion: process.versions?.electron ?? 'unknown',
    chromeVersion: process.versions?.chrome ?? 'unknown',
    platform: process.platform,
    isPackaged: app.isPackaged
  })
  registerFileIpc(bus, dialog)
  registerWindowIpc(bus, newWindowManager, rolePermissions)
  registerTaskIpc({
    bus,
    taskRegistry
  })

  registerDatabaseIpc({ bus, databaseService, auditRepository })
  registerTaskDataIpc({ bus, taskService })
  registerSettingIpc({ bus, settingService })
  registerXuanbingFileIpc({ bus, xuanbingFileService })

  await bus.start()

  const closeDatabase = (): void => {
    closeConnection()
  }

  return {
    bus,
    taskRegistry,
    windowManager,
    newWindowManager,
    dbPaths,
    databaseService,
    taskService,
    settingService,
    xuanbingFileService,
    closeDatabase
  }
}
