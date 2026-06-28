# 启动流程时序

本文档描述从主进程获取单例锁到渲染进程 `app.mount('#app')` 的完整启动时序，以及退出时 `before-quit` 的清理顺序。主进程入口为 [electron/main.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/main.ts)，IPC 运行时装配在 [electron/ipcBus/main/index.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/index.ts)，渲染层入口为 [src/renderer.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer.ts)。

## 总体阶段

```
[进程启动]
   │
   ├─ a) 单例锁 + 异常处理注册
   │
   ▼
[app.whenReady]
   │
   ├─ b) 安全策略：web-contents-created / 权限拒绝 / CSP 注入
   │
   ▼
[bootstrapApplication]
   │
   ├─ c) createMainIpcRuntime → bridgeWindowManagers → createWindow
   │      │
   │      ├─ d) createMainIpcRuntime 内部装配
   │      ├─ e) bridgeWindowManagers 桥接双 WM
   │      └─ f) createWindow 创建主窗口
   │
   ▼
[渲染层 bootstrap]
   │
   └─ g) initStores → initTheme → initApp → restoreSession
        → initLayoutResizeListener → createHashRouter → createApp.mount
```

## a) 进程启动

[main.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/main.ts) 顶层：

1. 定义常量：
   - `APP_NAME = 'All In One'`
   - `MAIN_WINDOW_ROLE = 'main'`
   - `DEV_SERVER_URL = process.env.ELECTRON_RENDERER_URL`
2. 声明模块级状态：`mainWindow: BrowserWindow | null`、`ipcRuntime`。
3. 调用 `app.requestSingleInstanceLock()`：
   - 未拿到锁时调用 `app.quit()`。**TODO**：因 ES 模块顶层不支持 `return`，`app.quit()` 后模块顶层逻辑仍会继续执行，无法真正提前退出。后续可考虑改为 `app.quit() + process.exit(0)` 或将启动流程包裹进函数。
4. 注册 `process.on('uncaughtException')`：打印错误、`dialog.showErrorBox`、延迟 1 秒后 `app.quit()` 以允许日志落盘。
5. 注册 `process.on('unhandledRejection')`：打印 reason（不退出）。

## b) app.whenReady 与安全策略

`app.whenReady().then(...)` 内执行：

1. **`web-contents-created` 钩子**：对每个 `contents` 注册 `will-attach-webview` 并 `preventDefault()`，阻止任何 `<webview>` 标签附着，强制使用 `BrowserWindow + preload` 模型。**TODO**：缺全局 `will-navigate` 兜底（main.ts 层），新 WM 层已对 `will-navigate`/`will-redirect` 做校验。
2. **生产环境判定**：`isProduction = process.env.NODE_ENV === 'production' || !DEV_SERVER_URL`。生产环境调用 `Menu.setApplicationMenu(null)` 移除应用菜单。**TODO**：此处用 `NODE_ENV`/`DEV_SERVER_URL`，而 `createWindow` 中用 `app.isPackaged` 判断是否打开 DevTools，判定不一致，建议统一使用 `app.isPackaged`。
3. **权限默认拒绝**：
   - `session.defaultSession.setPermissionRequestHandler((_wc, _perm, cb) => cb(false))`：摄像头/麦克风/通知等权限默认拒绝。
   - `session.defaultSession.setPermissionCheckHandler(() => false)`：覆盖 `navigator.permissions.query` 等同步路径。
4. **CSP 注入**：`session.defaultSession.webRequest.onHeadersReceived` 在响应头注入 `Content-Security-Policy`，与 [index.html](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/index.html) 的 `<meta>` 形成双层防御：
   ```
   default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
   img-src 'self' data:; font-src 'self' data:; connect-src 'self';
   base-uri 'self'; form-action 'self'; object-src 'none'
   ```
5. 调用 `void bootstrapApplication().catch(...)`，失败时 `dialog.showErrorBox('Startup Failed', ...)`。

## c) bootstrapApplication

```ts
async function bootstrapApplication(): Promise<void> {
  ipcRuntime = await createMainIpcRuntime({ appName: APP_NAME })
  bridgeWindowManagers()
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
}
```

三个步骤依次执行：装配 IPC 运行时 → 桥接双 WindowManager → 创建主窗口。

## d) createMainIpcRuntime 内部

[ipcBus/main/index.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/index.ts) 的 `createMainIpcRuntime`：

### d.1 双 WindowManager 创建

1. 旧 `WindowManager`（`electron/ipcBus/main/window-manager.ts`）：供 `IpcMainBus` 解析 sender、分发事件。
2. 新 `WindowManager`（`electron/windows/main/window-manager.ts`）：通过 `browserWindowFactory` 注入创建 `BrowserWindow`，配置 `screen`、`preloadPath`、`isPackaged`、`devServerUrl`、`indexHtmlPath`、`stateFilePath`、`environment`、`shellOpenExternal`（协议白名单：`http`/`https`/`mailto`）。

### d.2 渲染目标解析

- `resolveRendererTarget({ appRoot, devServerUrl, isPackaged })`：非打包且 dev server URL 通过 `isSafeLocalDevServerUrl` 校验（仅允许 `http`/`https` 且主机为 `localhost`/`127.0.0.1`/`::1`）时返回 `{ kind: 'url' }`，否则返回 `{ kind: 'file', filePath: <appRoot>/index.html }`。
- `resolvePreloadPath(appRoot)`：返回 `<appRoot>/dist/electron/preload.bundle.js`。

### d.3 rolePermissions 派生

1. 从 `DEFAULT_WINDOW_ROLE_PERMISSIONS`（[window-permissions.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/windows/shared/window-permissions.ts)）派生，每个角色补充 `'public'`。
2. `main` 角色额外补全：`setting:*`、`database:*`、`taskData:*`、`xuanbingFile:*`、`window:control:any`、`window:close:any`。
3. `settings` 角色补全 `setting:read/write`。
4. `taskCenter` 角色补全 `taskData:read/write`。

### d.4 IpcMainBus 实例化

- 创建 `IpcLogger`（环境 + 慢请求阈值 500ms）。
- 实例化 `AuditRepository`（仅 `create()` 时访问数据库连接，`dispatchInvoke` 在 `bus.start()` 后才被调用，故可提前实例化）。
- `new IpcMainBus({ ipcMain, logger, windowManager, environment, rolePermissions, auditRepository })`。
- 订阅新 WM 的 `window:closed` 事件，联动 `bus.cleanupWindow` 与 `taskRegistry.cleanupWindow`，与 `main.ts` 的窗口关闭清理形成兜底。

### d.5 数据库初始化

顺序：

1. `resolveDbPaths({ userDataDir, workspaceId: 'default', testMode })`：解析数据库路径。
2. `openConnection(dbPaths)`：打开 better-sqlite3 连接（WAL / foreign_keys / busy_timeout）。
3. `runMigrations(dbPaths)`：执行 pending migrations（迁移前自动备份）。

### d.6 5 个 Service 创建

| Service | 来源 |
| --- | --- |
| `DatabaseService` | `new DatabaseService(dbPaths)` |
| `TaskService` | `new TaskService()` |
| `SettingService` | `new SettingService()` |
| `XuanbingFileService` | `new XuanbingFileService({ dbFile, appVersion })` |
| `ToastWindowManager` | `new ToastWindowManager()` + `init()`（在注册 system IPC 前） |

### d.7 9 个 IPC 模块注册

| 模块 | 注册调用 |
| --- | --- |
| app | `registerAppIpc(bus, { appName, appVersion, electronVersion, chromeVersion, platform, isPackaged })` |
| file | `registerFileIpc(bus, dialog)` |
| window | `registerWindowIpc(bus, newWindowManager, rolePermissions)` |
| task | `registerTaskIpc({ bus, taskRegistry })` |
| database | `registerDatabaseIpc({ bus, databaseService, auditRepository })` |
| task-data | `registerTaskDataIpc({ bus, taskService })` |
| setting | `registerSettingIpc({ bus, settingService })` |
| xuanbing-file | `registerXuanbingFileIpc({ bus, xuanbingFileService })` |
| system | `registerSystemIpc(bus, dialog, toastManager)` |

### d.8 启动总线

- `toastManager.init()` 在注册 system IPC 前完成。
- `await bus.start()`：`IpcMainBus.start` 为所有 `requestContracts` 通道调用 `ipcMain.handle(channel, dispatchInvoke)`，标记 `started = true`。
- 返回运行时对象（含 `closeDatabase` 闭包，调用 `closeConnection()`）。

## e) bridgeWindowManagers

```ts
function bridgeWindowManagers(): void {
  const eventBus = ipcRuntime.newWindowManager.getEventBus()
  eventBus.on('window:created', (payload) => {
    const windowInstance = BrowserWindow.fromId(payload.windowId)
    if (!windowInstance || windowInstance.isDestroyed()) return
    if (ipcRuntime.windowManager.getWindowRole(windowInstance.id) !== undefined) return
    registerWindowWithRuntime(windowInstance, payload.role)
  })
}
```

- 订阅新 WM 的 `window:created` 事件。
- 通过 `BrowserWindow.fromId` 取回窗口实例。
- 若旧 WM 已有该窗口角色则跳过（避免重复注册，主窗口已在 `createWindow` 中注册）。
- 调用 `registerWindowWithRuntime` 完成注册。

`registerWindowWithRuntime` 做三件事：

1. `windowManager.registerWindow(windowInstance, { windowId, role })`。
2. 绑定 `focus` / `blur`：更新焦点窗口并 `bus.broadcast(IPC_EVENTS.windowFocusChanged, ...)`。
3. 绑定 `closed`：`bus.cleanupWindow` + `taskRegistry.cleanupWindow` + `windowManager.unregisterWindow`。

## f) createWindow

```ts
function createWindow(): void
```

1. 若 `mainWindow` 存在且未销毁，`focus()` 后返回。
2. `ipcRuntime.newWindowManager.openWindow(MAIN_WINDOW_ROLE)`：由新 WM 创建 `BrowserWindow`、加载 URL、绑定生命周期。
3. `BrowserWindow.fromId(openResult.windowId)` 取回窗口实例，赋值给 `mainWindow`。
4. `registerWindowWithRuntime(mainWindow, MAIN_WINDOW_ROLE)`：注册到旧 WM 并绑定 focus/blur/closed。
5. 绑定 `webContents.on('did-fail-load')`：`dialog.showErrorBox('Page Load Failed', ...)`。
6. 绑定 `webContents.on('render-process-gone')`：弹 `showMessageBox`，选 `Reload` 则 `reload()`，否则 `close()`。
7. 绑定 `mainWindow.on('closed')`：`mainWindow = null`。
8. 非打包环境 `mainWindow.webContents.openDevTools({ mode: 'detach' })`。

### 第二实例处理

`app.on('second-instance')`：若 `mainWindow` 最小化则 `restore()`，`focus()`。

### window-all-closed

`app.on('window-all-closed')`：非 macOS 调用 `app.quit()`（macOS 保留活动状态等待 `activate`）。

## g) 渲染层 bootstrap

[src/renderer.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer.ts) 的 `bootstrap()`：

1. **`initStores()`**：初始化全部 stores（theme/auth/permission/layout/window/tab/notification/app/menu/command/ui）。
2. **`initTheme()`**：`useThemeStore().initTheme()`，应用 `data-theme` 到 `<html>`。
3. **`initApp()`**：`useAppStore().initApp()`，初始化应用信息。
4. **`restoreSession()`**：`useAuthStore().restoreSession()`，恢复认证状态。
5. **`initLayoutResizeListener()`**：初始化布局响应式监听，返回 cleanup。
6. 获取 `windowStore` / `permissionStore` / `tabStore`。
7. **`createHashRouter()`**：创建哈希路由。
8. 构造根组件 `rootComponent`：
   - `setup()` 中获取 `useCurrentWindow()`、`useWindowTitle(router)`。
   - `router.onChange(runGuards)` 订阅路由变更。
   - `Vue.watch(currentWindow.role)` 监听窗口角色变化，权限到达后重跑守卫。
   - `Vue.onMounted`：标记 `appStore.setReady(true)` + `startCacheCleaner()`。
   - `Vue.onBeforeUnmount`：清理订阅、`router.destroy()`、`stopCacheCleaner()`、`destroyThemeStore()`。
9. **`Vue.createApp(rootComponent)`**：
   - 注册全局组件 `BaseToast`。
   - `app.provide('router', router)`。
10. **`app.mount('#app')`**：挂载到 [index.html](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/index.html) 的 `<div id="app">`。

`runGuards` 内部：同步窗口角色到 `permissionStore` / `tabStore`，同步窗口信息到 `windowStore`，执行 `executeGuards`，根据结果更新 `currentRoute` 或重定向，更新 `document.title`，添加标签页。

## before-quit 清理顺序

`app.on('before-quit')` 按 try/catch 兜底依次执行（每步失败仅打印错误，不阻断后续）：

| 顺序 | 调用 | 作用 |
| --- | --- | --- |
| 1 | `ipcRuntime.taskRegistry.cancelAll()` | 取消所有运行中的任务 |
| 2 | `ipcRuntime.bus.dispose()` | 移除所有 `ipcMain.handle` 处理器、清理订阅、清空速率限制状态 |
| 3 | `ipcRuntime.newWindowManager.saveAllState()` | 保存全部窗口边界与状态到 `window-state.json` |
| 4 | `ipcRuntime.closeDatabase()` | `closeConnection()` 关闭 SQLite 连接 |
| 5 | `ipcRuntime.xuanbingFileService.dispose()` | 释放 `.xuanbing` 文件服务资源 |

清理顺序的设计原则：先停止产生新工作（任务/IPC），再持久化状态（窗口），最后关闭底层资源（数据库/文件服务）。

## 关键文件引用

- 主进程入口：[electron/main.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/main.ts)
- IPC 运行时装配：[electron/ipcBus/main/index.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/index.ts)
- IPC 总线实现：[electron/ipcBus/main/ipc-main-bus.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/ipc-main-bus.ts)
- 新 WindowManager：[electron/windows/main/window-manager.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/windows/main/window-manager.ts)
- 渲染目标解析：[electron/renderer-target.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/renderer-target.ts)
- 渲染层入口：[src/renderer.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer.ts)
- HTML 宿主：[index.html](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/index.html)

## 相关文档

- [架构总览](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/docs/architecture/overview.md)
- [主进程入口与生命周期](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/docs/main-process/entry.md)
