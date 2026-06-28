# Composables

渲染层提供 25 个组合式函数（Composables），封装 IPC 调用、窗口管理、权限判断、缓存查询、UI 反馈、菜单、主题等场景。本文档列出全部 Composables 并详解关键实现。

源码目录：[src/renderer/composables/](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/composables/)

## 25 个 Composables 完整清单

| # | name | 职责 | 关键 API |
| --- | --- | --- | --- |
| 1 | [useIpcRequest](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/composables/useIpcRequest.ts) | IPC 请求状态管理（loading/error/data），请求序号防竞态 | `execute(input)` / `reset()` / `data` / `loading` / `error` |
| 2 | [useCurrentWindow](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/composables/useCurrentWindow.ts) | 获取当前窗口信息并订阅状态变化，失败重试跳 `/server-error` | `windowId` / `role` / `permissions` / `isMaximized` / `isFocused` / `isVisible` / `loadError` |
| 3 | [usePermission](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/composables/usePermission.ts) | 封装 permission store 的权限判断（UI 体验控制） | `hasPermission(p)` / `hasAnyPermission(ps)` / `hasAllPermissions(ps)` / `hasRole(r)` / `isWindowRole(r)` |
| 4 | [useOpenWindow](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/composables/useOpenWindow.ts) | 按角色打开各类窗口的便捷方法 | `open(role, options?)` / `openSettings()` / `openDetail(id)` / `openAbout()` / `openTaskCenter()` / `openLogViewer()` / `openModal(type)` |
| 5 | [useWindowEvents](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/composables/useWindowEvents.ts) | 统一订阅窗口事件（state/route/focus） | `subscribe({ onStateChanged?, onRouteChanged?, onFocusChanged? })` → 取消订阅函数 |
| 6 | [useWindowControls](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/composables/useWindowControls.ts) | 封装 `window.desktop.window` 的全部控制方法 | `minimize/maximize/restore/close/hide/show/focus/reload/setTitle/open/closeAll/closeByRole` |
| 7 | [useWindowRole](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/composables/useWindowRole.ts) | 封装 window store 的窗口角色判断 | `windowRole` / `windowId` / `isElectron` / `isMaximized` / `isRole(role)` / `isRoleIn(roles)` |
| 8 | [useWindowTitle](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/composables/useWindowTitle.ts) | 路由变更时自动同步页面标题到窗口标题 | `setTitle(title)` |
| 9 | [useCachedQuery](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/composables/useCachedQuery.ts) | 三策略缓存查询（cacheFirst/networkFirst/staleWhileRevalidate） | `execute()` / `refresh()` / `data` / `loading` / `refreshing` / `error` |
| 10 | [useCache](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/composables/useCache.ts) | 通用缓存读写（封装 cache-store） | `read()` / `write(value, policy?)` / `remove()` / `data` / `loading` / `error` |
| 11 | [useSystemNotification](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/composables/useSystem.ts) | 系统桌面通知（Electron Notification） | `show(title, body?, options?)` |
| 12 | [useSystemMessageBox](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/composables/useSystem.ts) | 系统消息框（dialog.showMessageBox） | `show({ title, message, type?, buttons?, ... })` → 按钮索引 |
| 13 | [useSystemToast](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/composables/useSystem.ts) | 桌面 Toast 浮层（独立置顶窗口，8 个方向） | `show(title, message?, options?)` |
| 14 | [useFluentTheme](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/composables/useFluentTheme.ts) | Fluent 风格主题切换（委托 theme store） | `currentTheme` / `isDark` / `availableThemes` / `setTheme(theme)` / `toggleDark()` |
| 15 | [useTheme](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/composables/useTheme.ts) | 主题切换（完整接口，含 followSystem） | `currentTheme` / `isDark` / `followSystem` / `setTheme(theme)` / `setFollowSystem(follow)` / `initTheme()` |
| 16 | [useSidebar](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/composables/useSidebar.ts) | 侧栏折叠/移动端 drawer/宽度计算 | `collapsed` / `isMobile` / `mobileDrawerOpen` / `sidebarWidth` / `toggle()` / `setCollapsed(c)` |
| 17 | [useMenu](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/composables/useMenu.ts) | 从路由表生成菜单（旧版，扁平） | `menu` / `activeMenuPath(currentPath)` |
| 18 | [useMenuTree](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/composables/useMenuTree.ts) | 多级菜单树（替代 useMenu，含展开/手风琴） | `menu` / `activePath` / `activeChain(path)` / `toggleExpand(id)` / `expandActiveChain(path)` / `accordion` / `expandOnlyActive` |
| 19 | [useBreadcrumb](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/composables/useBreadcrumb.ts) | 从 matchedChain 自动生成面包屑 | `breadcrumbs` |
| 20 | [useCommandPalette](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/composables/useCommandPalette.ts) | Command Palette 开关/搜索/键盘导航 | `isOpen` / `keyword` / `filteredCommands` / `open()` / `close()` / `toggle()` / `executeSelected()` / `registerShortcut()` |
| 21 | [useToast](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/composables/useToast.ts) | Toast 队列便捷方法（封装 notification store） | `toasts` / `success/error/warning/info/loading(title, desc?, duration?)` / `update(id, update)` / `close(id)` / `closeAll()` |
| 22 | [useConfirm](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/composables/useConfirm.ts) | Promise 风格确认对话框（全局单例） | `confirm(options)` → `Promise<boolean>` / `resolve(value)` |
| 23 | [useContextMenu](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/composables/useContextMenu.ts) | 右键菜单显示/隐藏/点击外部关闭 | `visible` / `x` / `y` / `items` / `show(event, items)` / `showAt(x, y, items)` / `hide()` / `registerAutoHide()` |
| 24 | [useTable](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/composables/useTable.ts) | 表格分页/排序/选择（本地或服务端模式） | `columns` / `data` / `loading` / `sort` / `pagination` / `selectedKeys` / `toggleSort(field)` / `goToPage(n)` / `refresh()` |
| 25 | [useReducedMotion](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/composables/useReducedMotion.ts) | 响应系统动效偏好变化 | `reduced` |

另有 [useDatabaseHealth](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/composables/useDatabaseHealth.ts) 与 [useXuanbingFile](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/composables/useXuanbingFile.ts) 两个业务专用 composable，分别封装数据库健康检查与 `.xuanbing` 文件导入导出流程。

## 重点详解

### useIpcRequest — 请求序号防竞态

源码：[src/renderer/composables/useIpcRequest.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/composables/useIpcRequest.ts)

封装 IPC 调用的 `loading` / `error` / `data` 状态管理。核心防竞态机制：

- `executeSeq`：模块级闭包变量，每次 `execute` 递增。
- `isUnmounted`：`onBeforeUnmount` 时置 true。
- 每次调用 `execute(input)` 时 `const seq = ++executeSeq`。
- await 返回后检查 `if (isUnmounted || seq !== executeSeq) return result`：若期间已有更新请求或组件已卸载，不写入 state，避免竞态覆盖与卸载后写入。
- catch 分支同样检查，避免过期错误覆盖最新请求的状态。

返回 `data` / `error` / `status` / `loading` / `isSuccess` / `isError` / `execute` / `reset`。

### useCurrentWindow — 失败重试跳 /server-error

源码：[src/renderer/composables/useCurrentWindow.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/composables/useCurrentWindow.ts)

在根组件 `setup` 中调用，获取当前窗口信息并订阅状态变化。关键逻辑：

- `onMounted` 中调用 `window.desktop.window.getCurrent()` 获取 `windowId` / `role` / `instanceKey` / `permissions`。
- **失败重试**：首次失败后 1s 重试一次；重试仍失败则 `window.location.hash = '#/server-error'`，避免静默卡在 `/403`。
- **防 async 竞态**：`isUnmounted` 标志，await 返回后检查，卸载后不写入响应式状态、不注册订阅。
- 订阅 `onStateChanged`：根据 `payload.state`（maximized/unmaximized/focused/blurred/shown/hidden/minimized/restored）更新 `isMaximized` / `isFocused` / `isVisible`。
- 订阅 `onFocusChanged`：更新 `isFocused`。
- `onBeforeUnmount` 中 `isUnmounted = true` 并取消全部订阅。

### usePermission — UI 体验控制

源码：[src/renderer/composables/usePermission.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/composables/usePermission.ts)

薄封装 [permission.store](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/stores/permission.store.ts)，返回 `permissions` / `windowRole` / `hasPermission` / `hasAnyPermission` / `hasAllPermissions` / `hasRole` / `isWindowRole`。

**重要约束**：权限判断仅用于 UI 体验控制（隐藏/禁用按钮），真实安全边界在 main 进程 IPC 守卫与路由守卫中强制校验。

### useOpenWindow — 打开新窗口

源码：[src/renderer/composables/useOpenWindow.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/composables/useOpenWindow.ts)

封装 `window.desktop.window.open(role, options)` 的便捷方法。不使用生命周期钩子，可在任意位置调用：

- `open(role, options?)`：通用打开方法。
- `openSettings()` / `openAbout()` / `openTaskCenter()` / `openLogViewer()`：按角色打开对应窗口。
- `openDetail(id)`：`open('detail', { params: { id } })`。
- `openModal(type)`：`open('modal', { params: { type } })`。

### useWindowEvents — 监听窗口事件

源码：[src/renderer/composables/useWindowEvents.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/composables/useWindowEvents.ts)

统一订阅窗口事件，返回复合取消订阅函数。不使用生命周期钩子，调用方需自行在 `beforeUnmount` 调用返回的取消函数：

```typescript
const { subscribe } = useWindowEvents()
const unsubscribe = subscribe({
  onStateChanged: (payload) => { ... },
  onRouteChanged: (payload) => { ... },
  onFocusChanged: (payload) => { ... }
})
// beforeUnmount: unsubscribe()
```

`subscribe` 内部按需注册每个事件，`disposed` 标志防止重复取消订阅。

### useCachedQuery — 三策略缓存查询

源码：[src/renderer/composables/useCachedQuery.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/composables/useCachedQuery.ts)

实现 `cacheFirst` / `networkFirst` / `staleWhileRevalidate` 三种策略。默认 `DEFAULT_QUERY_STRATEGY = 'staleWhileRevalidate'`。

| 策略 | execute 行为 |
| --- | --- |
| `cacheFirst` | 先读缓存，命中返回；未命中走网络并写缓存 |
| `networkFirst` | 先走网络；失败回退缓存（无缓存则抛错） |
| `staleWhileRevalidate` | 缓存未过期直接返回 + 后台刷新；过期但有 stale 时回退 stale；无缓存走网络 |

- `fetchFromNetwork()`：调用 `fetcher()` 获取数据，`setCache` 写缓存，更新 `state.data`。
- `backgroundRefresh()`：设置 `refreshing = true`，调用 `fetchFromNetwork`，触发 `onRefresh` 回调。
- `refresh()`：强制走网络（跳过缓存读取）。
- staleWhileRevalidate 网络失败时，若有过期 stale 缓存，回退 stale 避免无数据可用。

### useSystemToast / useSystemNotification / useSystemMessageBox — 桌面反馈

源码：[src/renderer/composables/useSystem.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/composables/useSystem.ts)

三者均通过 IPC 调用主进程的 Electron API：

- `useSystemNotification`：调用 `window.desktop.system.showNotification`，触发操作系统原生通知（进入通知中心）。
- `useSystemMessageBox`：调用 `window.desktop.system.showMessageBox`，返回用户点击的按钮索引。
- `useSystemToast`：调用 `window.desktop.system.showToast`，在桌面显示独立置顶的 Toast 浮层（不进入通知中心，样式完全自定义），支持 8 个出现方向（top-left / top-center / top-right / center-left / center-right / bottom-left / bottom-center / bottom-right）。

### useFluentTheme — 主题切换

源码：[src/renderer/composables/useFluentTheme.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/composables/useFluentTheme.ts)

委托 [theme.store](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/stores/theme.store.ts)，提供 Fluent 风格的便捷接口。返回 `currentTheme` / `isDark` / `availableThemes` / `setTheme(theme)` / `toggleDark()`。

与 [useTheme](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/composables/useTheme.ts) 的区别：`useTheme` 是完整接口（含 `followSystem` / `initTheme`），`useFluentTheme` 是简化接口，仅暴露切换相关方法。

### useSidebar — 侧栏状态

源码：[src/renderer/composables/useSidebar.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/composables/useSidebar.ts)

委托 [layout.store](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/stores/layout.store.ts)，提供侧栏折叠、移动端 drawer、宽度计算：

- `sidebarWidth` computed：移动端 280px / 桌面端折叠 64px / 桌面端展开 260px。

### useMenu / useMenuTree — 菜单

- [useMenu](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/composables/useMenu.ts)：旧版，从路由表生成扁平菜单，响应权限与窗口角色变化。`menu` computed 调用 `generateMenu`。
- [useMenuTree](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/composables/useMenuTree.ts)：替代 useMenu，委托 [menu.store](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/stores/menu.store.ts)，提供多级菜单树、展开/收起、手风琴、activeMenu 高亮等能力。

### useToast / useConfirm / useContextMenu — UI 反馈

- [useToast](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/composables/useToast.ts)：封装 [notification.store](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/stores/notification.store.ts)，提供 `success/error/warning/info/loading` 便捷方法。
- [useConfirm](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/composables/useConfirm.ts)：Promise 风格确认对话框，**全局单例状态**（`confirmState` 模块级）。新调用覆盖旧 resolver 前先 `resolver(false)` 拒绝旧 Promise，避免旧 Promise 永不 resolve。
- [useContextMenu](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/composables/useContextMenu.ts)：右键菜单，委托 [ui.store](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/stores/ui.store.ts)。`registerAutoHide()` 延迟绑定全局 click 与 ESC 关闭，避免触发当前右键事件的 click。

### useTable — 表格逻辑

源码：[src/renderer/composables/useTable.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/composables/useTable.ts)

封装分页、排序、选择等逻辑，支持本地模式与服务端模式：

- 本地模式：`applyLocalSort` 原地排序，`getLocalPageData` 切片分页。
- 服务端模式：`fetchData({ current, pageSize, sort })` 由调用方实现，返回 `{ data, total }`。
- **防竞态**：`refreshSeq` 模块级闭包变量，`refresh` 时递增；await 返回后检查 `if (seq !== refreshSeq) return`，丢弃过期响应。
- 选择：`toggleSelect(key)` / `toggleSelectAll()` / `clearSelected()`。

## 通用模式

### 防竞态与卸载保护

多个 composable 采用相同模式防止 async 竞态与卸载后写入：

- `useIpcRequest`：`executeSeq` + `isUnmounted`。
- `useCurrentWindow`：`isUnmounted`，await 返回后检查。
- `useTable`：`refreshSeq`。

### 不使用生命周期钩子的 composable

部分 composable 不使用 `onMounted` / `onBeforeUnmount`，可在任意位置调用，调用方自行管理订阅生命周期：

- `useOpenWindow` / `useWindowControls` / `useWindowEvents` / `usePermission` / `useWindowRole` / `useFluentTheme` / `useTheme` / `useSidebar` / `useToast` / `useConfirm` / `useContextMenu` / `useMenu` / `useMenuTree` / `useBreadcrumb` / `useCommandPalette` / `useTable` / `useCache` / `useCachedQuery` / `useDatabaseHealth` / `useXuanbingFile`

使用生命周期钩子的 composable：

- `useCurrentWindow`（`onMounted` / `onBeforeUnmount`）
- `useWindowTitle`（`onMounted` / `onBeforeUnmount`）
- `useReducedMotion`（`onMounted` / `onBeforeUnmount`）

## 相关文档

- [渲染层概览](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/docs/renderer/overview.md)
- [Stores 状态管理](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/docs/renderer/stores.md)
- [三层缓存系统](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/docs/renderer/cache.md)
