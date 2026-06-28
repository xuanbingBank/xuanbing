# 路由与守卫

渲染层 **不使用 vue-router**，自实现了一个基于 `window.location.hash` 的轻量 `HashRouter`，配合 18 条路由记录和多层守卫，覆盖路径参数、查询字符串、catch-all、matchedChain、布局切换、权限校验等场景。本文档描述路由实现、路由清单、守卫执行顺序与类型定义。

源码目录：[src/renderer/router/](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/router/)

## 自实现 HashRouter

源码：[src/renderer/router/index.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/router/index.ts)

`HashRouter` 类（约 290 行）通过 `window.location.hash` 管理路由状态，不依赖 History API，无需服务端配合，适合 Electron `file://` 加载场景。

### 核心能力

| 方法 | 职责 |
| --- | --- |
| `constructor(routeList)` | 读取当前 hash（空则跳 `#/`），绑定 `hashchange` 事件 |
| `parseHash(hash)` | 解析 `#/detail/42?tab=info` 为 `{ path: '/detail/42', query: { tab: 'info' } }` |
| `matchRoute(path)` | 路径匹配，支持 `:param` 参数提取与 `:pathMatch(.*)*` catch-all |
| `buildMatchedChain(record)` | 根据 `meta.parent` 向上回溯，构建从根到当前的链路（用于面包屑） |
| `getCurrentRoute()` | 返回完整 `CurrentRoute`（path / name / params / query / meta / matched / matchedChain） |
| `navigate(path)` | 设置 `window.location.hash`；hash 未变时手动触发一次回调 |
| `onChange(callback)` | 订阅路由变更，返回取消订阅函数 |
| `buildPath(name, params, query)` | 按路由名 + 参数 + 查询构建完整路径字符串 |
| `destroy()` | 移除 `hashchange` 监听与全部 listeners，避免泄漏 |

### 匹配优先级

`matchRoute` 先遍历非通配路由，按段精确匹配或提取参数；若全部未命中，再尝试 `:pathMatch(.*)*` catch-all。匹配失败时 `getCurrentRoute` 返回 `notFound` 兜底路由。

### 与根组件的协作

`bootstrap()` 在挂载前创建 `HashRouter`，但**不在构造时订阅**。订阅在根组件 `onMounted` 中通过 `router.onChange(runGuards)` 完成（见 [src/renderer.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer.ts) 第 198–209 行）。`runGuards` 内部调用 `executeGuards` 执行多层守卫，根据结果更新 `currentRoute` 或重定向。

## 路由类型定义

源码：[src/renderer/router/types.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/router/types.ts)

### PageComponentName

与 [src/renderer/pages/index.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/pages/index.ts) 的 `PAGES` 映射表键一一对应的字符串字面量联合类型：

```typescript
type PageComponentName =
  | 'home' | 'dashboard' | 'settings' | 'settingsProfile' | 'settingsSecurity'
  | 'about' | 'detail' | 'taskCenter' | 'taskDetail' | 'logViewer' | 'modal'
  | 'componentDemo' | 'fluentUiDemo' | 'forbidden' | 'notFound' | 'serverError' | 'login'
```

### RouteMeta

路由元信息字段（节选）：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `title` | `string` | 页面标题，同步到窗口标题与浏览器标签 |
| `windowRole` | `string` | 该路由对应的窗口角色 |
| `requiresAuth` | `boolean` | 是否需要登录认证 |
| `permissions` | `string[]` | 进入该路由所需的权限列表（全部满足） |
| `keepAlive` | `boolean` | 是否启用 keepAlive 缓存 |
| `layout` | `LayoutType \| 'default' \| 'modal'` | 布局类型 |
| `allowDirectOpen` | `boolean` | 是否允许直接打开（跳过窗口角色白名单校验，用于错误页等兜底） |
| `devOnly` | `boolean` | 是否仅在开发环境可用 |
| `menu` | `boolean` | 是否在菜单中显示 |
| `menuOrder` | `number` | 菜单排序权重 |
| `hidden` | `boolean` | 是否隐藏（不在菜单、面包屑中显示） |
| `breadcrumb` | `boolean` | 是否在面包屑中显示 |
| `affixTab` | `boolean` | 是否固定标签页（不可关闭） |
| `closableTab` | `boolean` | 标签页是否可关闭 |
| `parent` | `string` | 父级路由路径（用于构建多级菜单与 matchedChain） |
| `group` | `string` | 菜单分组标识 |
| `badge` / `tag` / `shortcut` / `description` | 多种 | Fluent 菜单扩展字段 |
| `activeMenu` | `string` | 高亮的菜单项路径（用于详情页高亮列表页） |

### RouteRecord 与 CurrentRoute

- `RouteRecord`：单条路由记录，包含 `path` / `name` / `component` / `meta` / `children?`。
- `CurrentRoute`：当前路由的完整状态，包含 `path` / `name` / `params` / `query` / `meta` / `matched` / `matchedChain`。

## 18 路由清单

源码：[src/renderer/router/routes.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/router/routes.ts)

| # | path | name | component | layout | windowRole | requiresAuth | devOnly | 关键 meta |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `/` | `home` | `home` | basic | main | 否 | 否 | menu / affixTab / closableTab=false |
| 2 | `/dashboard` | `dashboard` | `dashboard` | basic | main | 否 | 否 | menu / shortcut=Ctrl+D |
| 3 | `/login` | `login` | `login` | auth | login | 否 | 否 | hidden |
| 4 | `/settings` | `settings` | `settings` | basic | settings | 是 | 否 | menu / permissions=[route:settings] |
| 5 | `/settings/profile` | `settingsProfile` | `settingsProfile` | basic | settings | 是 | 否 | menu / parent=/settings |
| 6 | `/settings/security` | `settingsSecurity` | `settingsSecurity` | basic | settings | 是 | 否 | menu / parent=/settings |
| 7 | `/task-center` | `taskCenter` | `taskCenter` | basic | taskCenter | 是 | 否 | menu / closeBehavior=hide / badge=new |
| 8 | `/task/:id` | `taskDetail` | `taskDetail` | basic | taskCenter | 是 | 否 | hidden / activeMenu=/task-center |
| 9 | `/about` | `about` | `about` | basic | about | 否 | 否 | menu |
| 10 | `/demo/components` | `componentDemo` | `componentDemo` | basic | main | 否 | **是** | menu / tag=Dev |
| 11 | `/demo/fluent-ui` | `fluentUiDemo` | `fluentUiDemo` | basic | main | 否 | **是** | menu / tag=Dev |
| 12 | `/detail/:id` | `detail` | `detail` | basic | detail | 是 | 否 | hidden / permissions=[route:detail] |
| 13 | `/log-viewer` | `logViewer` | `logViewer` | basic | logViewer | 是 | 否 | menu |
| 14 | `/modal/:type` | `modal` | `modal` | modal | modal | 否 | 否 | hidden |
| 15 | `/forbidden` | `forbidden` | `forbidden` | blank | main | 否 | 否 | hidden / allowDirectOpen=true |
| 16 | `/not-found` | `notFound` | `notFound` | blank | main | 否 | 否 | hidden / allowDirectOpen=true |
| 17 | `/server-error` | `serverError` | `serverError` | blank | main | 否 | 否 | hidden / allowDirectOpen=true |
| 18 | `/:pathMatch(.*)*` | `catchAll` | `notFound` | blank | main | 否 | 否 | catch-all 兜底 |

### ROUTE_PATHS 常量

源码：[src/renderer/constants/index.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/constants/index.ts) 第 27–42 行。集中声明全部路由路径字面量，避免在代码中硬编码字符串：

```typescript
export const ROUTE_PATHS = {
  HOME: '/', DASHBOARD: '/dashboard', LOGIN: '/login',
  SETTINGS: '/settings', SETTINGS_PROFILE: '/settings/profile',
  SETTINGS_SECURITY: '/settings/security',
  TASK_CENTER: '/task-center', TASK_DETAIL: '/task/:id',
  ABOUT: '/about', COMPONENT_DEMO: '/demo/components',
  FORBIDDEN: '/forbidden', NOT_FOUND: '/not-found',
  SERVER_ERROR: '/server-error'
} as const
```

### 辅助函数

- `findRouteByName(name)`：按路由名称查找记录。
- `findRouteByPath(path)`：按路径精确匹配查找（不含参数）。

## 多层守卫

源码：[src/renderer/router/guards.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/router/guards.ts)

### 守卫执行顺序

`executeGuards(to, from, context)` 按以下顺序执行，任一守卫失败即返回 `{ allowed: false, redirect: '...' }`，后续守卫不再执行：

1. **`routeExists`** — 路由是否存在
   - `checkRouteExists(to)`：若 `to.name === 'notFound'` 且 `to.path !== '/not-found'`，说明是未匹配到的路径，返回 false。
   - 失败 → 重定向到 `/not-found`。

2. **`devOnly`** — 仅开发环境可访问
   - `checkDevOnly(to, isDev)`：若 `meta.devOnly === true` 且当前非开发环境，返回 false。
   - 失败 → 重定向到 `/not-found`。

3. **`loginRedirect`** — 登录后访问 `/login` 重定向
   - `shouldRedirectFromLogin(to, isAuthenticated)`：若 `to.path === '/login'` 且已认证，重定向到 `/dashboard`。
   - 此守卫在 `routeExists` / `devOnly` 之后、`isRedirectTarget` 短路之前执行。

4. **`isRedirectTarget` 短路** — 防止无限重定向
   - 若 `to.path` 是 `/not-found` / `/forbidden` / `/server-error` / `/login`，直接 `{ allowed: true }` 放行，避免错误页之间互相重定向。

5. **`routeAllowed`** — 窗口角色白名单
   - `checkRouteAllowed(to, windowRole)`：若 `meta.allowDirectOpen === true` 直接放行（用于错误页）；否则调用 `isRouteAllowedForRole(windowRole, path)` 检查窗口角色是否允许加载该路由。
   - 失败 → 重定向到 `/forbidden`。

6. **`auth`** — 认证状态
   - `checkAuth(to, isAuthenticated)`：若 `meta.requiresAuth === false` 直接放行；否则要求已认证。
   - 失败 → 重定向到 `/login`。

7. **`permission`** — 权限检查
   - `checkPermission(to, permissions)`：若 `meta.permissions` 为空直接放行；否则要求 `permissions` 数组包含 `meta.permissions` 的全部元素（`every`）。
   - 失败 → 重定向到 `/forbidden`。

### GuardContext 与 GuardResult

```typescript
interface GuardContext {
  windowRole: string       // 当前窗口角色
  permissions: string[]    // 当前窗口拥有的权限列表
  isAuthenticated: boolean // 是否已认证
}

interface GuardResult {
  allowed: boolean         // 是否允许通过
  redirect?: string        // 需要重定向的路径
}
```

### 守卫与根组件的集成

`runGuards(route)` 在 [src/renderer.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer.ts) 第 146–196 行实现，每次路由变更时：

1. 同步窗口角色与权限到 `permissionStore` 与 `tabStore`（若 `currentWindow.role` 已就绪）。
2. 同步窗口信息到 `windowStore`，标记 `setInitialized()`。
3. 调用 `executeGuards(route, currentRoute.value, context)` 执行守卫。
4. 若 `result.redirect` 存在 → `router.navigate(result.redirect)`。
5. 否则更新 `currentRoute.value`，同步 `document.title`，并向 `tabStore` 添加标签页（`meta.hidden === false` 时）。

### 窗口角色到达后重跑守卫

`watch(currentWindow.role)` 在窗口角色首次到达时（非空字符串）重跑 `runGuards(router.getCurrentRoute())`。守卫内的导航只改变 hash/路由，不会改变 role，因此不会触发死循环。

## 布局选择

[src/renderer.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer.ts) 中的 `resolveLayout(route)` 根据 `route.meta.layout` 选择布局组件：

| meta.layout | 布局组件 |
| --- | --- |
| `basic` / `default` | `BasicLayout` |
| `blank` | `BlankLayout` |
| `auth` | `AuthLayout` |
| `window` | `WindowLayout` |
| `modal` | `BlankLayout` |
| 其他 | `BasicLayout`（兜底） |

布局组件位于 [src/renderer/layouts/](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/layouts/)：

- `BasicLayout`：后台主布局（固定侧栏 + 内容区，移动端 drawer）。
- `BlankLayout`：空白布局（仅渲染页面内容，用于错误页）。
- `AuthLayout`：认证布局（用于登录页）。
- `WindowLayout`：独立窗口布局（用于子窗口）。

## 相关文档

- [渲染层概览](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/docs/renderer/overview.md)
- [Stores 状态管理](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/docs/renderer/stores.md)
- [Composables](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/docs/renderer/composables.md)
