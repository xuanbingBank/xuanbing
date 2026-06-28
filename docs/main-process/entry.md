# 主进程入口与生命周期

本文档详解主进程入口三件套：[electron/main.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/main.ts)、[electron/preload.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/preload.ts)、[electron/renderer-target.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/renderer-target.ts)，覆盖常量定义、单例锁、异常处理、窗口桥接、创建与退出清理。

## electron/main.ts 详解

### 常量定义

| 常量 | 值 | 说明 |
| --- | --- | --- |
| `APP_NAME` | `'All In One'` | 应用名，传入 `createMainIpcRuntime` 与 app IPC 模块。 |
| `MAIN_WINDOW_ROLE` | `'main'` | 主窗口角色，用于新 WM `openWindow` 与旧 WM 注册。 |
| `DEV_SERVER_URL` | `process.env.ELECTRON_RENDERER_URL` | 开发服务器 URL，用于生产环境判定与渲染目标解析。 |

模块级状态：

- `mainWindow: BrowserWindow | null`：主窗口引用，`closed` 时置 `null`。
- `ipcRuntime: Awaited<ReturnType<typeof createMainIpcRuntime>> | null`：IPC 运行时，由 `bootstrapApplication` 赋值，供 `registerWindowWithRuntime` / `bridgeWindowManagers` / `before-quit` 使用。

### 单例锁与 TODO

```ts
const gotInstanceLock = app.requestSingleInstanceLock()
if (!gotInstanceLock) {
  app.quit()
}
```

- 拿到锁的实例继续启动；未拿到锁的实例调用 `app.quit()`。
- **TODO（源码注释）**：`app.quit()` 后未提前退出，模块顶层逻辑仍会继续执行，因 ES 模块顶层不支持 `return`。后续可考虑改为 `app.quit() + process.exit(0)`，或将启动流程包裹进函数以实现真正提前退出。
- 第二实例由 `app.on('second-instance')` 处理：若 `mainWindow` 最小化则 `restore()`，再 `focus()`。

### 异常处理

| 钩子 | 行为 |
| --- | --- |
| `process.on('uncaughtException')` | 打印错误 → `dialog.showErrorBox('Application Error', ...)` → `setTimeout(() => app.quit(), 1000)` 延迟退出以允许日志落盘。 |
| `process.on('unhandledRejection')` | 打印 reason，不退出。 |

### registerWindowWithRuntime

```ts
function registerWindowWithRuntime(windowInstance: BrowserWindow, role: string): void
```

将新 WindowManager 创建的窗口注册到旧 WindowManager，使 `IpcMainBus` 能解析 sender 与分发事件。步骤：

1. 若 `ipcRuntime` 为空则返回。
2. `ipcRuntime.windowManager.registerWindow(windowInstance, { windowId: windowInstance.id, role })`。
3. 绑定 `focus`：`setFocusedWindow` + `bus.broadcast(IPC_EVENTS.windowFocusChanged, { windowId, focused: true })`。
4. 绑定 `blur`：`bus.broadcast(IPC_EVENTS.windowFocusChanged, { windowId, focused: false })`。
5. 绑定 `closed`：`bus.cleanupWindow` + `taskRegistry.cleanupWindow` + `windowManager.unregisterWindow`。

### bridgeWindowManagers

```ts
function bridgeWindowManagers(): void
```

监听新 WindowManager 的 `window:created` 事件，自动将所有窗口桥接到旧 WindowManager。逻辑：

1. 取 `ipcRuntime.newWindowManager.getEventBus()`。
2. `eventBus.on('window:created', (payload) => ...)`：
   - `BrowserWindow.fromId(payload.windowId)` 取回窗口。
   - 已销毁则跳过。
   - 若旧 WM 已有该窗口角色（`getWindowRole(windowInstance.id) !== undefined`）则跳过，避免重复注册（主窗口已在 `createWindow` 中注册）。
   - 调用 `registerWindowWithRuntime(windowInstance, payload.role)`。

### createWindow

```ts
function createWindow(): void
```

创建主窗口。使用新 WindowManager 的 `openWindow` 创建窗口，再将底层 `BrowserWindow` 注册到旧 WindowManager。

1. 若 `ipcRuntime` 为空则返回。
2. 若 `mainWindow` 存在且未销毁，`focus()` 后返回。
3. `ipcRuntime.newWindowManager.openWindow(MAIN_WINDOW_ROLE)`：由新 WM 负责 `BrowserWindow` 创建、URL 加载、生命周期绑定。
4. `BrowserWindow.fromId(openResult.windowId)` 解析窗口实例。失败时 `console.error` 并返回。
5. 赋值给 `mainWindow`，调用 `registerWindowWithRuntime(mainWindow, MAIN_WINDOW_ROLE)`。
6. 绑定 `webContents.on('did-fail-load')`：`console.error` + `dialog.showErrorBox('Page Load Failed', ...)`。
7. 绑定 `webContents.on('render-process-gone')`：
   - `console.error` 打印 `details.reason`。
   - 若窗口已销毁则返回。
   - `dialog.showMessageBox(win, { type: 'error', title: 'Renderer Crashed', buttons: ['Reload', 'Close'] })`。
   - 选 `Reload`：`win.webContents.reload()`；否则 `win.close()`。
   - `.catch` 捕获 `showMessageBox` 失败。
8. 绑定 `mainWindow.on('closed')`：`mainWindow = null`。
9. `if (!app.isPackaged) mainWindow.webContents.openDevTools({ mode: 'detach' })`。

### bootstrapApplication

```ts
async function bootstrapApplication(): Promise<void> {
  ipcRuntime = await createMainIpcRuntime({ appName: APP_NAME })
  bridgeWindowManagers()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
}
```

- 装配 IPC 运行时（详见 [启动流程时序](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/docs/architecture/bootstrap-flow.md) 的 `createMainIpcRuntime` 内部）。
- 桥接双 WM。
- 创建主窗口。
- 注册 `activate` 钩子：macOS 无窗口时重建主窗口。

### app.whenReady 内的安全策略

详见 [启动流程时序](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/docs/architecture/bootstrap-flow.md) 的 b) 阶段。要点：

- `web-contents-created` 阻止 `<webview>`。
- `setPermissionRequestHandler` / `setPermissionCheckHandler` 默认拒绝。
- `onHeadersReceived` 注入 CSP。
- 生产环境 `Menu.setApplicationMenu(null)`。

## electron/preload.ts 详解

完整内容仅 7 行：

```ts
import { exposeDesktopApi } from './ipcBus/preload/expose-api'
exposeDesktopApi()
export { exposeDesktopApi }
```

- 调用 [exposeDesktopApi()](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/preload/expose-api.ts)，通过 `contextBridge.exposeInMainWorld('desktop', api)` 暴露受限的 `window.desktop` API。
- 渲染进程无法直接访问 `ipcRenderer` 或 Node API，所有跨进程调用必须经过契约校验的 `desktop.invoke` / `desktop.subscribe`。
- preload bundle 路径由 [renderer-target.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/renderer-target.ts) 的 `resolvePreloadPath` 解析为 `<appRoot>/dist/electron/preload.bundle.js`，由新 WM 写入 `webPreferences.preload`。
- preload 的 `SafeWebPreferences` 强制 `contextIsolation: true`、`nodeIntegration: false`、`sandbox: true`，确保 preload 与渲染层运行在隔离上下文。

## electron/renderer-target.ts 详解

### resolveRendererTarget

```ts
export function resolveRendererTarget(options: RendererTargetOptions): RendererTarget
```

根据运行环境解析窗口应加载的渲染目标。

- 入参 `RendererTargetOptions`：`{ appRoot, devServerUrl?, isPackaged }`。
- 返回 `RendererTarget`：`{ kind: 'url', url }` 或 `{ kind: 'file', filePath }`。
- 逻辑：
  1. `devServerUrl = options.devServerUrl?.trim()`。
  2. 非打包且 `devServerUrl` 非空时，调用 `isSafeLocalDevServerUrl` 校验：
     - 通过：返回 `{ kind: 'url', url: devServerUrl }`。
     - 不通过：`console.warn` 后回退到 file 模式。
  3. 否则返回 `{ kind: 'file', filePath: path.join(options.appRoot, 'index.html') }`。

### isSafeLocalDevServerUrl

```ts
function isSafeLocalDevServerUrl(url: string): boolean
```

校验 dev server URL 是否为安全的本地地址，防止环境变量被污染后加载任意远程页面：

1. `new URL(url)` 解析失败返回 `false`。
2. 协议必须是 `http:` 或 `https:`，否则 `false`。
3. 主机名必须是 `localhost` / `127.0.0.1` / `::1`。

### resolvePreloadPath

```ts
export function resolvePreloadPath(appRoot: string): string
```

返回 `path.join(appRoot, 'dist', 'electron', 'preload.bundle.js')`，即编译后的 preload bundle 绝对路径。该路径由 [createMainIpcRuntime](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/index.ts) 解析后注入新 WindowManager 的 `preloadPath` 选项。

## 单例锁的 TODO

源码注释（[main.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/main.ts) 第 18-21 行）：

> 此处 `app.quit()` 后未提前退出，模块顶层逻辑仍会继续执行，因 ES 模块顶层不支持 `return`，后续可考虑改为 `app.quit() + process.exit(0)` 或将启动流程包裹进函数以实现真正提前退出。

影响：未拿到锁的实例仍会执行后续 `app.whenReady` 注册与 `bootstrapApplication` 调用，可能在 `app.quit()` 生效前装配部分运行时资源。当前依赖 `app.quit()` 最终生效终止进程，但中间产生的副作用（如日志、短暂的 IPC 注册）无法完全避免。

## before-quit 清理顺序及 try/catch 兜底

`app.on('before-quit')` 按顺序执行，每步独立 `try/catch`，失败仅 `console.error`，不阻断后续：

| 顺序 | 调用 | 失败日志标签 |
| --- | --- | --- |
| 1 | `ipcRuntime?.taskRegistry.cancelAll()` | `cancelAll failed during before-quit` |
| 2 | `ipcRuntime?.bus.dispose()` | `bus.dispose failed during before-quit` |
| 3 | `ipcRuntime?.newWindowManager.saveAllState()` | `saveAllState failed during before-quit` |
| 4 | `ipcRuntime?.closeDatabase()` | `closeDatabase failed during before-quit` |
| 5 | `ipcRuntime?.xuanbingFileService.dispose()` | `xuanbingFileService.dispose failed during before-quit` |

设计意图：

- 先停止产生新工作（取消任务、移除 IPC 处理器）。
- 再持久化状态（窗口边界写入 `window-state.json`）。
- 最后关闭底层资源（SQLite 连接、`.xuanbing` 文件服务）。
- `try/catch` 兜底保证任一步失败不阻塞其余清理，最大化资源释放。
- 全程使用可选链 `?.`，兼容 `ipcRuntime` 为 `null`（启动早期失败）的场景。

## 生产环境判定不一致的 TODO

源码注释（[main.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/main.ts) 第 207-209 行）：

> 生产环境检测逻辑不一致：此处用 `NODE_ENV`/`DEV_SERVER_URL`，而 `createWindow` 中用 `app.isPackaged` 判断是否打开 DevTools。建议统一使用 `app.isPackaged` 作为生产环境判定，避免环境变量未设置时误判。

两处判定对比：

| 位置 | 判定 | 用途 |
| --- | --- | --- |
| `app.whenReady` 内 | `process.env.NODE_ENV === 'production' \|\| !DEV_SERVER_URL` | 是否 `Menu.setApplicationMenu(null)` |
| `createWindow` 内 | `!app.isPackaged` | 是否 `openDevTools({ mode: 'detach' })` |
| `createMainIpcRuntime` 内 | `app.isPackaged ? 'production' : 'development'` | `environment` 传入 IpcMainBus / IpcLogger / 新 WM |
| `renderer-target.ts` | `options.isPackaged`（来自 `app.isPackaged`） | 选择 dev server URL 还是 file 模式 |

风险：若 `NODE_ENV` 未设置为 `'production'` 且 `ELECTRON_RENDERER_URL` 未设置，`isProduction` 为 `true`（因 `!DEV_SERVER_URL`），与 `app.isPackaged` 判定方向一致；但若 `NODE_ENV='production'` 而 `app.isPackaged === false`（如开发时手动设置环境变量），则菜单与 DevTools 行为会出现分歧。统一使用 `app.isPackaged` 可消除歧义。

## 关键文件引用

- 主进程入口：[electron/main.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/main.ts)
- preload 入口：[electron/preload.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/preload.ts)
- 渲染目标解析：[electron/renderer-target.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/renderer-target.ts)
- preload 暴露 API：[electron/ipcBus/preload/expose-api.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/preload/expose-api.ts)
- IPC 运行时装配：[electron/ipcBus/main/index.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/index.ts)
- 新 WindowManager：[electron/windows/main/window-manager.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/windows/main/window-manager.ts)

## 相关文档

- [架构总览](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/docs/architecture/overview.md)
- [启动流程时序](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/docs/architecture/bootstrap-flow.md)
- [目录结构详解](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/docs/architecture/directory-structure.md)
