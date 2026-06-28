# 多窗口子系统概览

xuanbing(All In One)Electron 桌面应用采用**双 WindowManager 架构**管理多窗口。新 WindowManager 负责窗口的创建、显示、生命周期与状态持久化；旧 WindowManager 供 IpcMainBus 解析 IPC 调用方的 sender、广播事件。两者通过 `bridgeWindowManagers()` 桥接，确保任何通过新 WM 创建的窗口都能被 IPC 总线识别。

---

## 一、架构总览

### 1.1 双 WindowManager 架构图

```
┌────────────────────────────────────────────────────────────────────────┐
│                            主进程 (electron/main.ts)                    │
│                                                                        │
│   ┌─────────────────────────┐         ┌──────────────────────────┐    │
│   │  新 WindowManager       │         │  旧 WindowManager         │    │
│   │  (windows/main/)        │         │  (ipcBus/main/)          │    │
│   │                         │         │                          │    │
│   │  • openWindow()         │ window  │  • registerWindow()      │    │
│   │  • createWindow()       │ :created│  • getWindowRole()       │    │
│   │  • focus/close/hide     │ ───────▶│  • getWindowIdBySenderId │    │
│   │  • 状态持久化            │  event  │  • broadcast()           │    │
│   │  • 生命周期绑定          │         │  • sendToFocusedWindow() │    │
│   │  • URL 解析/守卫         │         │                          │    │
│   └──────────┬──────────────┘         └───────────┬──────────────┘    │
│              │                                    │                   │
│              │  bridgeWindowManagers()            │                   │
│              │  (订阅 window:created,避免重复)     │                   │
│              └────────────────────────────────────┘                   │
│                                                  │                     │
│                                                  ▼                     │
│                                       ┌──────────────────────┐       │
│                                       │  IpcMainBus          │       │
│                                       │  • 解析 sender 角色   │       │
│                                       │  • 权限校验          │       │
│                                       │  • 事件分发          │       │
│                                       └──────────────────────┘       │
└────────────────────────────────────────────────────────────────────────┘
```

### 1.2 桥接流程

1. 新 WM 的 `createWindow()` 通过 `browserWindowFactory` 创建 `BrowserWindow`,注册到自身 `WindowRegistry`,绑定生命周期,加载 URL,最后 `emit('window:created')`。
2. `bridgeWindowManagers()` 在 `bootstrapApplication()` 中调用,订阅 `window:created` 事件。
3. 收到事件后用 `BrowserWindow.fromId(windowId)` 取回底层窗口,若旧 WM 尚未注册该窗口则调用 `registerWindowWithRuntime()` 注册。
4. 注册时同时绑定 `focus`/`blur`/`closed` 事件,广播 `windowFocusChanged`,关闭时清理 IPC bus、taskRegistry 与注册条目。

> 主窗口的特殊路径:`createWindow()`(main.ts)在 `openWindow()` 返回后**主动**调用 `registerWindowWithRuntime()` 注册到旧 WM,因此 `bridgeWindowManagers()` 中的重复注册保护(`getWindowRole(windowId) !== undefined`)会跳过主窗口,避免重复。

参考实现:
- [electron/main.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/main.ts) — `bridgeWindowManagers()` 与 `registerWindowWithRuntime()`
- [electron/windows/main/window-manager.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/windows/main/window-manager.ts) — 新 WM `createWindow()` 与 `emitCreated()`
- [electron/ipcBus/main/window-manager.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/window-manager.ts) — 旧 WM

---

## 二、新 WindowManager 职责

新 WindowManager 是多窗口系统的核心,组合了 6 个内部子模块,对外暴露安全的 `WindowRef`,从不直接返回 `BrowserWindow` 实例。

### 2.1 模块组成

| 子模块 | 职责 |
|---|---|
| `WindowRegistry` | 5 套索引维护窗口注册条目 |
| `WindowStateStore` | 去抖 300ms 持久化窗口边界/最大化/全屏到 `window-state.json` |
| `WindowUrlResolver` | 解析 dev server URL 或 `file://` 协议,执行路由白名单校验 |
| `WindowEventBus` | 事件订阅/发布,高频事件(move/resize)去抖 150ms |
| `WindowInitPayloadStore` | 一次性 token 传递 payload(60s 过期,防重放) |
| `WindowLifecycle` | 绑定 BrowserWindow/webContents 的 17 项生命周期事件 |

### 2.2 公开 API 摘要

| 方法 | 说明 |
|---|---|
| `openWindow(role, options?)` | 校验后根据 `onSecondOpen` 策略创建或聚焦窗口 |
| `openOrFocus(role, options?)` | 已存在则聚焦,否则创建 |
| `closeWindow(windowId)` | 按 `closeBehavior` 执行 close/hide/minimize/prevent |
| `closeByRole(role)` / `closeAll()` | 批量关闭 |
| `hideWindow` / `showWindow` / `focusWindow` | 显示控制 |
| `minimizeWindow` / `maximizeWindow` / `unmaximizeWindow` / `toggleMaximize` | 窗口状态控制 |
| `restoreWindow` / `reloadWindow` / `destroyWindow` | 恢复/重载/强制销毁 |
| `getWindow(windowId)` / `getWindowByRole(role)` / `getWindowsByRole(role)` | 返回安全 `WindowRef` |
| `getFocusedWindow()` / `getMainWindow()` | 焦点/主窗口引用 |
| `hasWindow(role)` / `isWindowAlive(windowId)` | 存活判断 |
| `sendToWindow` / `sendToRole` / `broadcast` | IPC 消息投递 |
| `consumeInitPayload(windowId)` | 一次性消费初始化 payload |
| `updateWindowTitle` / `updateWindowBadge` | 标题/角标 |
| `listWindows()` / `getRegistry()` / `getEventBus()` | 调试入口 |
| `cleanupWindow(windowId)` / `dispose()` | 资源释放 |
| `saveAllState()` | 退出前强制持久化全部状态 |

### 2.3 创建窗口的内部流程

`createWindow()`(私有)按以下顺序执行:

1. `urlResolver.resolveUrl()` 解析 URL(dev server 或 `file://`),校验路由白名单
2. `resolveInitialBounds()` 决定初始边界:优先恢复持久化状态 → `centerToParent` → `displayTarget` 策略选择显示器 → `autoCorrectBounds` 校正
3. `buildSafeWebPreferences()` 构建安全 `webPreferences`(`contextIsolation:true`、`sandbox:true`、`nodeIntegration:false`)
4. `browserWindowFactory(options)` 创建 `BrowserWindow`(本模块不直接依赖 electron)
5. `registry.register()` 注册到 5 套索引
6. `lifecycle.bind()` 绑定 17 项事件,返回清理函数
7. `initPayloadStore.create()` 生成一次性 token(若 `options.payload` 存在)
8. `setupSecurityHandlers()` 设置 `setWindowOpenHandler` 拒绝 `window.open`、`will-navigate`/`will-redirect` 拦截外部导航
9. `emitCreated()` 发出 `window:created` 事件(供 `bridgeWindowManagers()` 桥接)
10. `webContents.loadURL(url)` 加载页面
11. 按 `showOnReady` 决定在 `ready-to-show` 还是 `did-finish-load` 时发送 `window:init-token`

参考:[electron/windows/main/window-manager.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/windows/main/window-manager.ts) 第 934–1053 行

---

## 三、旧 WindowManager 职责

旧 WindowManager 位于 `electron/ipcBus/main/window-manager.ts`,是 IpcMainBus 的伴随组件,接口极简,仅维护 `windowId → { role, window }` 映射。

| 方法 | 说明 |
|---|---|
| `registerWindow(window, { windowId, role })` | 注册窗口与角色,首个注册的成为默认焦点 |
| `unregisterWindow(windowId)` | 注销并清空焦点 |
| `setFocusedWindow(windowId)` | 设置当前焦点窗口 |
| `getWindow(windowId)` | 取窗口对象 |
| `getFocusedWindowId()` | 取焦点窗口 ID |
| `getWindowRole(windowId)` | **核心:解析 sender 角色** |
| `getWindowIdBySenderId(senderId)` | 通过 webContents.id 反查 windowId |
| `sendToWindow` / `broadcast` / `sendToFocusedWindow` | 事件分发 |

它不负责窗口创建,仅作为 IPC 总线解析 sender 的查询表。所有创建逻辑必须通过新 WM,然后桥接过来。

参考:[electron/ipcBus/main/window-manager.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/window-manager.ts)

---

## 四、bridgeWindowManagers 桥接(硬约束)

### 4.1 实现要点

`bridgeWindowManagers()`(main.ts)订阅新 WM 的事件总线,把新窗口同步到旧 WM:

```ts
const eventBus = ipcRuntime.newWindowManager.getEventBus()
eventBus.on('window:created', (payload) => {
  const windowInstance = BrowserWindow.fromId(payload.windowId)
  if (!windowInstance || windowInstance.isDestroyed()) return
  // 避免重复注册(主窗口已在 createWindow 中注册)
  if (ipcRuntime.windowManager.getWindowRole(windowInstance.id) !== undefined) return
  registerWindowWithRuntime(windowInstance, payload.role)
})
```

`registerWindowWithRuntime()` 同时:
- 调用旧 WM 的 `registerWindow()`
- 绑定 `focus`/`blur` 广播 `windowFocusChanged`
- 绑定 `closed` 清理 bus、taskRegistry、注销窗口

### 4.2 硬约束

> **任何持有 `WindowManager` 实例的代码路径,必须通过 `bridgeWindowManagers()` 桥接,否则通过 IPC 创建的子窗口将无法被 IpcMainBus 解析 sender,导致权限校验失败、事件分发丢失。**

主进程在 `bootstrapApplication()` 中按以下顺序装配:

```
createMainIpcRuntime() ──▶ bridgeWindowManagers() ──▶ createWindow() (主窗口)
```

参考:[electron/main.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/main.ts) 第 78–98 行、第 170–183 行

---

## 五、5 套索引

`WindowRegistry`(electron/windows/main/window-registry.ts)维护 5 套索引,所有查询 O(1) 或 O(n) 但 n 通常很小。窗口销毁时自动反注册,避免持有过期引用。

| 索引 | 内部字段 | 键 | 值 | 用途 |
|---|---|---|---|---|
| `byId` | `Map<number, WindowRegistryEntry>` | `windowId` | 注册条目 | 主索引,所有 `get/window` 查询入口 |
| `byRole` | `Map<WindowRole, number[]>` | `role` | windowId 数组 | `getByRole`/`getFirstByRole`/`countByRole` |
| `byInstanceKey` | `Map<string, number>` | `instanceKey` | windowId | 单例/同实例复用判断 |
| `byRoute` | `Map<string, number[]>` | `route` | windowId 数组 | `getByRoute` |
| `byEntityId` | `Map<string, number[]>` | `entityId` | windowId 数组 | `getByEntityId`(params.id) |

> 任务描述中提到的 `byWindowName` / `byWebContentsId` / `byBrowserWindow` 在当前实现中等价为 `byInstanceKey` / 旧 WM 的 `getWindowIdBySenderId` / `byId`。注册表通过 `BrowserWindowLike` 抽象与外部注入的窗口对象交互,不直接依赖 electron。

注册条目结构(`WindowRegistryEntry`):

```ts
{
  window: BrowserWindowLike
  role: WindowRole
  instanceKey: string
  parentId?: number
  route: string
  entityId?: string
  createdAt: number
  focusedAt: number
}
```

辅助方法:
- `markFocused(windowId)` — 更新 `focusedAt`
- `updateRoute(windowId, route)` — 切换 `byRoute` 索引
- `updateEntityId(windowId, entityId)` — 切换 `byEntityId` 索引
- `dumpTree()` — 输出父子树状结构用于调试

参考:[electron/windows/main/window-registry.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/windows/main/window-registry.ts)

---

## 六、相关文档

- [roles.md](./roles.md) — 14 种窗口角色与 `window-config.ts` 字段表
- [lifecycle.md](./lifecycle.md) — 生命周期事件、状态持久化、URL 解析与守卫
- [toast.md](./toast.md) — `ToastWindowManager` 系统级桌面 Toast
