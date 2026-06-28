# Stores 状态管理

渲染层 **不使用 pinia**，自实现了一个基于 `Vue.reactive + computed` 的轻量 Store 基类，API 与 Pinia 高度兼容，便于未来迁移。本文档描述 Store 基类实现、11 个 Store 的职责与关键 API、Store 间依赖关系。

源码目录：[src/renderer/stores/](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/stores/)

## base.ts 模拟 Pinia 实现

源码：[src/renderer/stores/base.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/stores/base.ts)（约 125 行）

### 三段式结构

每个 Store 都遵循 Pinia 的三段式结构：

| 段 | 实现方式 | 说明 |
| --- | --- | --- |
| **state** | `defineState(initialState)` → `Vue.reactive(initialState)` | 响应式状态对象，直接读写 |
| **getters** | `computedRef(() => ...)` → `Vue.computed(() => ...)` | 派生状态，只读 Ref |
| **actions** | 普通 function，内部直接 mutate state | 修改状态的方法 |

### 核心 API

| API | 职责 |
| --- | --- |
| `defineState<T>(initialState)` | 创建响应式 state（语法糖，等价 `Vue.reactive`） |
| `computedRef<T>(getter)` | 创建只读计算属性（语法糖，等价 `Vue.computed`） |
| `writableComputed<T>(getter, setter)` | 创建可写计算属性 |
| `storage.get<T>(key, fallback)` | 从 `localStorage` 读取并 JSON 解析（带异常保护） |
| `storage.set<T>(key, value)` | 写入 `localStorage`（带 JSON 序列化） |
| `storage.remove(key)` | 移除 `localStorage` 键 |
| `registerStore(store)` | 注册 Store 到全局表 `storeRegistry` |
| `getStore(id)` | 按 `$id` 获取 Store 实例（调试与 SSR 预留） |

### StoreBase 接口

```typescript
interface StoreBase {
  $id: string        // Store 唯一标识
  $reset?: () => void // 重置为初始状态（可选）
}
```

### 单例模式

每个 Store 模块都维护一个 `xxxStoreInstance` 变量：

- `createXxxStore()`：若实例已存在则直接返回，否则创建、`registerStore`、缓存到模块变量。
- `useXxxStore()`：若实例不存在则调用 `createXxxStore()`，否则返回缓存实例。

`initStores()` 在 [src/renderer/stores/index.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/stores/index.ts) 中按依赖顺序调用全部 `createXxxStore()`：

```
app → auth → permission → theme → layout → window → tab → notification → menu → ui → command
```

依赖原因：`menu.store` 依赖 `permission.store` 与 `app.store`；`command.store` 依赖 `menu.store`。

## 11 个 Store 清单

| Store | $id | 职责 | 关键 state | 关键 actions |
| --- | --- | --- | --- | --- |
| [app.store.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/stores/app.store.ts) | `app` | 应用全局状态（名称/版本/环境/就绪） | `appName` / `version` / `environment` / `isReady` / `platform` / `isElectron` | `initApp()` / `setReady(ready)` / `setPlatform(platform)` |
| [auth.store.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/stores/auth.store.ts) | `auth` | 登录态与用户信息 | `token` / `user` / `loginLoading` / `loginError` / `restored` | `login(user, pwd)` / `logout()` / `restoreSession()` / `setToken()` / `setUser()` |
| [permission.store.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/stores/permission.store.ts) | `permission` | 用户与窗口权限/角色 | `permissions` / `roles` / `windowRole` / `windowPermissions` / `initialized` | `setPermissions()` / `setRoles()` / `setWindowContext(role, perms)` / `hasPermission(p)` / `hasAnyPermission(ps)` / `hasAllPermissions(ps)` / `hasRole(r)` / `isWindowRole(r)` / `clear()` |
| [theme.store.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/stores/theme.store.ts) | `theme` | 主题切换/跟随系统/持久化 | `theme` / `followSystem` / `systemPreference` / `initialized` | `initTheme()` / `setTheme(theme)` / `toggleDark()` / `setFollowSystem(follow)` / `applyTheme()` |
| [layout.store.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/stores/layout.store.ts) | `layout` | 侧栏折叠/移动端 drawer/布局模式 | `sidebarCollapsed` / `mobileDrawerOpen` / `layoutMode` / `isMobile` | `toggleSidebar()` / `setSidebarCollapsed(c)` / `toggleMobileDrawer()` / `closeMobileDrawer()` / `setLayoutMode(mode)` / `setIsMobile(m)` |
| [window.store.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/stores/window.store.ts) | `window` | 当前 Electron 窗口上下文 | `windowId` / `windowRole` / `instanceKey` / `isMaximized` / `isFocused` / `isVisible` / `isFullScreen` / `isAlwaysOnTop` / `initialized` | `setWindowInfo(info)` / `updateState(state)` / `setInitialized()` / `reset()` |
| [tab.store.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/stores/tab.store.ts) | `tab` | 多标签页与 keep-alive 缓存（按 windowRole 隔离） | `tabs` / `activePath` / `cachedNames` / `windowRole` | `addTab(tab)` / `removeTab(path)` / `removeOthers(path)` / `removeAll()` / `setActive(path)` / `setWindowRole(role)` / `addCache(name)` / `removeCache(name)` / `clearAll()` |
| [notification.store.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/stores/notification.store.ts) | `notification` | 全局 Toast 队列 | `toasts` / `unreadCount` | `addToast(toast)` / `updateToast(id, update)` / `removeToast(id)` / `clearToasts()` / `success/error/warning/info/loading(title, desc?, duration?)` |
| [menu.store.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/stores/menu.store.ts) | `menu` | 菜单树/展开状态/手风琴模式 | `expandedIds` / `accordion` / `expandOnlyActive` / `_activePath` | `toggleExpand(id)` / `setExpanded(id, expanded)` / `expandActiveChain(path)` / `setAccordion(a)` / `setExpandOnlyActive(only)` / `isExpanded(id)` |
| [ui.store.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/stores/ui.store.ts) | `ui` | 全局 UI 状态（Command Palette/Context Menu/全局 loading） | `commandPaletteOpen` / `contextMenu` / `globalLoading` / `globalLoadingText` | `openCommandPalette()` / `closeCommandPalette()` / `toggleCommandPalette()` / `showContextMenu(x, y, items)` / `hideContextMenu()` / `setGlobalLoading(loading, text?)` |
| [command.store.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/stores/command.store.ts) | `command` | Command Palette 命令注册/搜索/最近使用 | `commands` / `recentIds` / `keyword` / `selectedIndex` | `registerCommand(cmd)` / `registerCommands(cmds)` / `unregisterCommand(id)` / `executeCommand(cmd)` / `setKeyword(kw)` / `moveSelection(delta)` / `recordRecent(id)` / `clearRecent()` |

## 各 Store 详解

### app.store — 应用全局状态

- 持有 `APP_INFO`（名称/版本/环境），环境来自 `process.env.NODE_ENV`。
- `isDev` / `isProd` 两个 computed 供其他 Store 与组件判断环境。
- `isElectron` 通过检测 `window.desktop` 是否存在判定。
- `initApp()` 从 `navigator.platform` 读取平台信息。

### auth.store — 登录态与用户信息

- token 与 user 通过 `storage` 持久化到 `localStorage`（键 `app:auth-token` / `app:auth-user`）。
- **注意**：Electron 生产环境应使用 safeStorage / keytar 替代 localStorage，当前为占位。
- `login(username, password)` 当前为占位实现，抛出 `Login not implemented`，真实鉴权待接入。
- `restoreSession()` 从 localStorage 回填 token / user，标记 `restored = true`。
- `isLoggedIn` = `!!token && !!user`；`userRoles` = `user?.roles ?? []`。

### permission.store — 权限与角色

权限来源有两类：

1. **用户权限**：登录后从后端/IPC 获取，通过 `setPermissions()` 写入并持久化。
2. **窗口权限**：来自主进程的窗口角色对应权限，通过 `setWindowContext(role, permissions)` 写入。

`allPermissions` computed 将两者合并去重。`hasPermission` / `hasAnyPermission` / `hasAllPermissions` 基于 `allPermissions` 判断。

**重要约束**：权限 Store 仅用于 UI 体验控制（隐藏/禁用按钮），真实安全边界在 main 进程 IPC 守卫与路由守卫中强制校验。

### theme.store — 主题切换

- 支持 4 个主题：`light` / `dark` / `business` / `corporate`（见 [constants](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/constants/index.ts)）。
- `currentTheme` computed：`followSystem ? systemPreference : theme`。
- `initTheme()` 监听 `matchMedia('(prefers-color-scheme: dark)')` 的 `change` 事件，跟随系统主题。
- `applyTheme()` 将 `currentTheme` 写入 `document.documentElement.setAttribute('data-theme', ...)`。
- `destroyThemeStore()`：移除 mediaQuery change 监听并清空单例，在根组件 `onBeforeUnmount` 中调用，避免内存泄漏。

### layout.store — 布局状态

- `sidebarCollapsed` 持久化到 `localStorage`（键 `app:sidebar-collapsed`）。
- `sidebarWidthClass` computed：`w-16`（折叠）/ `w-60`（展开）。
- 移动端断点 `MOBILE_BREAKPOINT = 768`，`isMobile` 初始值由 `window.innerWidth` 判定。
- `initLayoutResizeListener()`：绑定 `window.resize`，按断点更新 `isMobile`，并在切回桌面端时自动关闭 drawer。返回 cleanup 函数。

### window.store — 窗口上下文

- 与 [useCurrentWindow](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/composables/useCurrentWindow.ts) composable 配合：composable 订阅 IPC 事件并更新 store，其他组件通过 `useWindowStore()` 读取响应式状态。
- `isElectron` computed 检测 `window.desktop`。
- `setWindowInfo(info)` 接受 `Partial`，只更新传入的字段。
- `updateState(update)` 用 `Object.assign` 批量更新窗口状态字段。

### tab.store — 多标签页

- 标签按 `windowRole` 隔离：`setWindowRole(role)` 在角色变化时清空全部标签与缓存，避免多窗口状态污染。
- `addTab(tab)`：若已存在同 path 标签则更新 query，否则 push；同步加入 `cachedNames`。
- `removeTab(path)`：固定标签（`affix`）不可关闭；若关闭的是当前激活标签，跳转到相邻标签。
- `removeOthers(path)` / `removeAll()`：保留 `affix` 标签，重建 `cachedNames`。

### notification.store — Toast 队列

- Toast 类型：`success` / `error` / `warning` / `info` / `loading`。
- 最大队列长度 `MAX_TOASTS = 5`，超出时移除最早并清理其定时器。
- 自动关闭：`duration > 0` 按指定时间；`loading` 类型 duration=0，但兜底最大常驻 `LOADING_MAX_DURATION = 30s`，避免永久残留。
- 每个 Toast 持有 `timerId`，`removeToast` / `clearToasts` 时 `clearTimeout`，避免定时器残留触发。
- 便捷方法 `success/error/warning/info/loading(title, desc?, duration?)` 返回 Toast ID。

### menu.store — 菜单树

- 菜单树从路由表自动生成（通过 `generateMenuTree`），响应 `permissionStore.allPermissions` 与 `windowRole` 变化。
- 展开状态 `expandedIds` 持久化到 `localStorage`（键 `app:menu-expanded`）。
- 手风琴模式 `accordion`：展开某项时清空其他，只保留当前（简化实现）。
- `expandOnlyActive` 模式：切换路由时只保留当前路径祖先链。
- `expandActiveChain(path)`：根据 `findActiveMenuChain` 计算祖先链并展开。

### ui.store — 全局 UI 状态

- `commandPaletteOpen`：Command Palette 开关。
- `contextMenu`：`{ visible, x, y, items }`，由 `useContextMenu` composable 读写。
- `globalLoading` / `globalLoadingText`：覆盖整页的 loading 浮层。

### command.store — Command Palette 命令

- 命令来源：(1) 菜单项派生（`commandsFromMenu` 通过 `flattenMenu` 拍平菜单树）；(2) 手动 `registerCommand` 注册。
- `allCommands` computed 合并两者。
- `filteredCommands`：无关键词时优先显示 `recentCommands` + 其他（限 20 条）；有关键词时按 title / description / keywords 模糊匹配（限 20 条）。
- `recentIds` 持久化到 `localStorage`（键 `app:command-recent`），最多 8 个。
- `executeCommand(cmd)`：执行后 `recordRecent(id)`，失败 `console.error` 不抛出。

## Store 间依赖关系

```
app.store ─────────────┐
                       ├──► menu.store ──► command.store
permission.store ──────┘                      ▲
                                              │
                                        ui.store（Command Palette 开关）
```

- `menu.store` 在构造时调用 `usePermissionStore()` 与 `useAppStore()`，`menu` computed 依赖 `permissionStore.allPermissions` / `state.windowRole` / `appStore.isDev`。
- `command.store` 在构造时调用 `useMenuStore()`，`allCommands` computed 依赖 `menuStore.menu`。
- 其他 Store 之间无强依赖，可通过 composable 间接协作（如 `useCurrentWindow` 更新 `windowStore` 与 `permissionStore`）。

## 持久化策略

| Store | 持久化字段 | localStorage 键 |
| --- | --- | --- |
| auth | `token` / `user` | `app:auth-token` / `app:auth-user` |
| permission | `permissions` | `app:permissions` |
| theme | `theme` / `followSystem` | `app:theme` / `app:follow-system` |
| layout | `sidebarCollapsed` | `app:sidebar-collapsed` |
| menu | `expandedIds` / `accordion` | `app:menu-expanded` / `app:menu-accordion` |
| command | `recentIds` | `app:command-recent` |

`$reset()` 方法在 app / auth / permission / theme / layout / tab / ui Store 中实现，用于恢复初始状态。`window` / `menu` / `notification` / `command` Store 的 `$reset` 仅清空运行时状态，不涉及持久化。

## 相关文档

- [渲染层概览](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/docs/renderer/overview.md)
- [路由与守卫](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/docs/renderer/router.md)
- [Composables](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/docs/renderer/composables.md)
