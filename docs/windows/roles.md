# 窗口角色与配置

本文档列出 xuanbing(All In One)多窗口子系统的 14 种窗口角色、`DEFAULT_WINDOW_ROLE_PERMISSIONS` 权限映射、`window-config.ts` 的全部字段、`WINDOW_ROUTE_MAP` 路由白名单与 `window-schemas.ts` 的 zod schema。

---

## 一、14 种窗口角色总览

`WINDOW_ROLES`(定义于 `window-types.ts`)枚举全部合法角色。每个角色在 `windowConfigs`(window-config.ts)中必须完整声明所有字段,启动时经 zod 校验。

| role | 默认尺寸 (w×h) | min (w×h) | singleton | modal | 用途 |
|---|---|---|---|---|---|
| `main` | 1280×800 | 1024×640 | ✅ | ❌ | 应用主窗口,承载 dashboard/task-center/log-viewer/about/demo 等子路由 |
| `login` | 480×640 | 360×480 | ✅ | ❌ | 登录窗口,不可缩放/最大化 |
| `settings` | 900×680 | 720×520 | ✅ | ❌ | 设置主窗口,含 `/settings/profile`、`/settings/security` 子路由 |
| `about` | 420×360 | 360×300 | ✅ | ✅ | 关于对话框,alwaysOnTop,居中到父窗口 |
| `detail` | 1000×720 | 800×560 | ❌ | ❌ | 详情窗口,多实例(最多 10),按 `:id` 区分,二次打开 newInstance |
| `editor` | 1200×800 | 960×600 | ❌ | ❌ | 编辑器窗口,多实例(最多 5),closeBehavior 为 `ask` |
| `taskCenter` | 960×700 | 760×520 | ✅ | ❌ | 任务中心,关闭时隐藏(`closeBehavior: 'hide'`) |
| `logViewer` | 880×620 | 680×460 | ✅ | ❌ | 日志查看器 |
| `devtoolsPanel` | 600×400 | 400×300 | ❌ | ❌ | DevTools 面板,`environment: 'devOnly'`,skipTaskbar,alwaysOnTop |
| `floatingToolbox` | 320×480 | 240×360 | ✅ | ❌ | 浮动工具箱,无边框透明,alwaysOnTop,skipTaskbar |
| `trayPanel` | 360×500 | 300×400 | ✅ | ❌ | 托盘面板,无边框透明,不可缩放 |
| `modal` | 480×360 | 360×280 | ❌ | ✅ | 通用模态窗口,按 `:type` 区分,居中到父窗口 |
| `child` | 800×600 | 600×400 | ❌ | ❌ | 通用子窗口,多实例(最多 8),随父窗口关闭 |
| `hiddenWorker` | 1×1 | 1×1 | ✅ | ❌ | 隐藏后台工作窗口,不显示,`closeBehavior: 'prevent'` |

> 任务描述中提及的 `forbidden`/`notFound`/`serverError`/`componentDemo`/`fluentUIDemo`/`dashboard`/`taskDetail`/`settingsProfile`/`settingsSecurity` 是 **路由路径**(见 `WINDOW_ROUTES`),不是窗口角色。它们由对应的窗口角色(main/settings/taskCenter/detail)加载。

参考:[electron/windows/shared/window-types.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/windows/shared/window-types.ts)、[electron/windows/shared/window-config.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/windows/shared/window-config.ts)、[electron/windows/shared/window-roles.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/windows/shared/window-roles.ts)

---

## 二、DEFAULT_WINDOW_ROLE_PERMISSIONS 完整映射

定义于 [electron/windows/shared/window-permissions.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/windows/shared/window-permissions.ts)。权限**默认 deny**,只有在此表中显式声明的 role-permission 组合才被允许。

权限常量 `WINDOW_PERMISSIONS`(共 19 项):
```
window:open | window:close:self | window:close:any | window:focus | window:list
window:control:self | window:control:any | window:devtools
route:settings | route:admin | route:detail | route:task-center
app:quit | app:read | file:read | file:write | task:run | task:cancel | system:notify
```

| role | 权限集 |
|---|---|
| `main` | `window:open`, `window:close:self`, `window:focus`, `window:list`, `window:control:self`, `window:control:any`, `window:close:any`, `app:read`, `app:quit`, `file:read`, `file:write`, `task:run`, `task:cancel`, `system:notify`, `route:task-center`, `route:detail` |
| `login` | `window:close:self`, `window:control:self`, `app:read` |
| `settings` | `window:close:self`, `window:control:self`, `window:focus`, `app:read`, `file:read`, `route:settings` |
| `about` | `window:close:self`, `window:control:self`, `app:read` |
| `detail` | `window:close:self`, `window:control:self`, `app:read`, `route:detail` |
| `editor` | `window:close:self`, `window:control:self`, `app:read` |
| `taskCenter` | `window:close:self`, `window:control:self`, `app:read`, `task:run`, `task:cancel`, `route:task-center` |
| `logViewer` | `window:close:self`, `window:control:self`, `app:read` |
| `devtoolsPanel` | `window:close:self`, `window:control:self`, `window:devtools` |
| `floatingToolbox` | `window:close:self`, `window:control:self`, `app:read` |
| `trayPanel` | `window:close:self`, `window:control:self`, `app:read` |
| `modal` | `window:close:self`, `window:control:self`, `app:read` |
| `child` | `window:close:self`, `window:control:self`, `app:read` |
| `hiddenWorker` | `app:read` |

辅助 API:
- `hasPermission(role, permission): boolean` — 检查角色是否拥有指定权限
- `isWindowPermission(value): boolean` — 类型守卫

权限校验规则(见 `window-guards.ts` 的 `checkPermission`):
- `:any` 权限:必须提供 `senderRole`,且 sender 必须拥有该 `:any` 权限
- `:self` 权限:sender 与目标同角色时校验 `:self`;不同角色时回退到 `:any` 变体
- 其他权限:sender 必须显式拥有

参考:[electron/windows/shared/window-permissions.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/windows/shared/window-permissions.ts)、[electron/windows/main/window-guards.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/windows/main/window-guards.ts)

---

## 三、window-config.ts 字段表(36 字段)

`WindowConfig` 接口定义于 [electron/windows/shared/window-types.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/windows/shared/window-types.ts),配置实现于 [electron/windows/shared/window-config.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/windows/shared/window-config.ts)。所有字段在 `windowConfigSchema` 中以 zod 校验。

| # | 字段 | 类型 | 默认值/必填 | 说明 |
|---|---|---|---|---|
| 1 | `role` | `WindowRole` | 必填 | 角色标识,枚举值之一 |
| 2 | `title` | `string` | 必填 | 窗口标题(minLength 1) |
| 3 | `route` | `string` | 必填 | 默认路由,必须在 `WINDOW_ROUTES` 中或含 `:` 参数 |
| 4 | `entry` | `string?` | 可选 | 自定义入口(预留) |
| 5 | `singleton` | `boolean` | 必填 | 是否单例 |
| 6 | `parentRole` | `WindowRole?` | 可选 | 父角色 |
| 7 | `modal` | `boolean` | 必填 | 是否模态 |
| 8 | `width` | `number` | 必填 | 初始宽度(整数 ≥1) |
| 9 | `height` | `number` | 必填 | 初始高度(整数 ≥1) |
| 10 | `minWidth` | `number` | 必填 | 最小宽度 |
| 11 | `minHeight` | `number` | 必填 | 最小高度 |
| 12 | `maxWidth` | `number?` | 可选 | 最大宽度 |
| 13 | `maxHeight` | `number?` | 可选 | 最大高度 |
| 14 | `resizable` | `boolean` | 必填 | 可缩放 |
| 15 | `minimizable` | `boolean` | 必填 | 可最小化 |
| 16 | `maximizable` | `boolean` | 必填 | 可最大化 |
| 17 | `closable` | `boolean` | 必填 | 可关闭 |
| 18 | `fullscreenable` | `boolean` | 必填 | 可全屏 |
| 19 | `alwaysOnTop` | `boolean` | 必填 | 始终置顶 |
| 20 | `frame` | `boolean` | 必填 | 是否有边框 |
| 21 | `transparent` | `boolean` | 必填 | 是否透明 |
| 22 | `backgroundColor` | `string?` | 可选 | 背景色 |
| 23 | `showOnReady` | `boolean` | 必填 | `ready-to-show` 时显示 |
| 24 | `rememberBounds` | `boolean` | 必填 | 持久化边界 |
| 25 | `rememberLastRoute` | `boolean` | 必填 | 持久化最后路由 |
| 26 | `center` | `boolean` | 必填 | 居中到显示器 |
| 27 | `skipTaskbar` | `boolean` | 必填 | 跳过任务栏 |
| 28 | `trafficLightPosition` | `{x,y}?` | 可选 | macOS 红绿灯按钮位置 |
| 29 | `titleBarStyle` | `'default'|'hidden'|'hiddenInset'|'customButtonsOnHover'?` | 可选 | 标题栏样式 |
| 30 | `devTools` | `boolean` | 必填 | 是否允许 DevTools |
| 31 | `permissions` | `WindowPermission[]` | 必填 | 该角色权限集合 |
| 32 | `preload` | `string` | 必填 | preload 脚本路径(占位符 `__PRELOAD__`,运行时替换) |
| 33 | `routeParamsSchema` | `unknown?` | 可选 | 路由参数 zod schema |
| 34 | `querySchema` | `unknown?` | 可选 | 查询串 zod schema |
| 35 | `allowMultiple` | `boolean` | 必填 | 允许多实例(非单例时必为 true 当 maxInstances>1) |
| 36 | `maxInstances` | `number` | 必填 | 最大实例数(整数 ≥1;singleton 必为 1) |
| — | `closeBehavior` | `'close'|'hide'|'minimize'|'ask'|'prevent'|'custom'` | 必填 | 关闭行为 |
| — | `onSecondOpen` | `'focus'|'recreate'|'newInstance'|'ignore'` | 必填 | 二次打开策略 |
| — | `environment` | `'devOnly'|'prodOnly'|'all'` | 必填 | 环境限制 |
| — | `displayTarget` | `'primary'|'cursor'|'parent'|'last'|'explicit'?` | 可选 | 显示器选择策略 |
| — | `closeWithParent` | `boolean?` | 可选 | 随父关闭 |
| — | `centerToParent` | `boolean?` | 可选 | 居中到父窗口 |
| — | `singletonPerParent` | `boolean?` | 可选 | 按父窗口单例 |

> 字段总数 36 项核心字段(role/title/route/...)+ 7 项行为/环境/显示器扩展字段(closeBehavior/onSecondOpen/environment/displayTarget/closeWithParent/centerToParent/singletonPerParent)。`windowConfigSchema` 在 `validateWindowConfigs()` 启动时逐条校验,不合法直接抛错。

辅助函数:
- `getWindowConfig(role)` — 取原始配置
- `resolveWindowConfig(role, preloadPath)` — 返回 preload 已替换的配置副本
- `validateWindowConfigs()` — 启动时批量校验

参考:[electron/windows/shared/window-config.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/windows/shared/window-config.ts)

---

## 四、WINDOW_ROUTE_MAP 路由白名单

定义于 [electron/windows/shared/window-routes.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/windows/shared/window-routes.ts)。每个角色的 `allowedRoutes` 在主进程 URL 解析与渲染层路由守卫**双端校验**。

| role | allowedRoutes | defaultRoute |
|---|---|---|
| `main` | `/`, `/dashboard`, `/task-center`, `/log-viewer`, `/about`, `/demo/components`, `/demo/fluent-ui`, `/forbidden`, `/not-found`, `/server-error` | `/` |
| `login` | `/login`, `/forbidden`, `/not-found`, `/server-error` | `/login` |
| `settings` | `/settings`, `/settings/profile`, `/settings/security`, `/forbidden`, `/not-found`, `/server-error` | `/settings` |
| `about` | `/about`, `/not-found` | `/about` |
| `detail` | `/detail/:id`, `/not-found` | `/detail/:id` |
| `editor` | `/not-found` | `/not-found` |
| `taskCenter` | `/task-center`, `/task/:id`, `/not-found`, `/server-error` | `/task-center` |
| `logViewer` | `/log-viewer`, `/not-found` | `/log-viewer` |
| `devtoolsPanel` | `/not-found` | `/not-found` |
| `floatingToolbox` | `/not-found` | `/not-found` |
| `trayPanel` | `/not-found` | `/not-found` |
| `modal` | `/modal/:type`, `/not-found` | `/modal/:type` |
| `child` | `/not-found` | `/not-found` |
| `hiddenWorker` | `/not-found` | `/not-found` |

`WINDOW_ROUTES`(系统支持的 17 条路由):
```
/ , /dashboard , /login , /settings , /settings/profile , /settings/security
/about , /detail/:id , /task-center , /task/:id , /log-viewer , /modal/:type
/demo/components , /demo/fluent-ui , /forbidden , /not-found , /server-error
```

辅助 API:
- `matchRoutePattern(pattern, actualPath)` — 将 `/detail/:id` 匹配 `/detail/42`
- `isRouteAllowedForRole(role, route)` — 校验路由是否允许(role + 白名单,自动剥离 query)
- `getDefaultRoute(role)` — 取默认路由,缺失回退 `/not-found`

参考:[electron/windows/shared/window-routes.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/windows/shared/window-routes.ts)

---

## 五、window-schemas.ts 的 zod schema

定义于 [electron/windows/shared/window-schemas.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/windows/shared/window-schemas.ts),用于 IPC 请求/响应/事件校验,共 **11 个 schema**。

| # | schema | 用途 |
|---|---|---|
| 1 | `openWindowRequestSchema` | 打开窗口请求:`{ role, routeName?, params?, query?, payload?, displayTarget?, parentWindowId?, title? }` |
| 2 | `openWindowResponseSchema` | 打开窗口响应:`{ windowId, role, instanceKey, created, route }` |
| 3 | `windowControlRequestSchema` | 窗口操作请求:`{ windowId?, role? }` |
| 4 | `windowControlResponseSchema` | 窗口操作响应:`{ windowId, state }`,state ∈ `minimized/maximized/unmaximized/normal/closed/hidden/shown/focused/restored` |
| 5 | `windowRefSchema` | 安全窗口引用,对应 `WindowRef` 接口 |
| 6 | `windowListResponseSchema` | 窗口列表响应:`{ windows: WindowRef[] }` |
| 7 | `setWindowTitleRequestSchema` | 设置标题请求:`{ title }`(1–256 字符) |
| 8 | `windowStateChangedEventSchema` | 状态变化事件:`{ windowId, role, state }`,state ∈ `focused/blurred/minimized/maximized/unmaximized/restored/shown/hidden/closed` |
| 9 | `windowRouteChangedEventSchema` | 路由变化事件:`{ windowId, role, route }` |
| 10 | `getInitPayloadResponseSchema` | 初始化数据响应:`{ token, payload, role }` |
| 11 | `getCurrentWindowResponseSchema` | 当前窗口信息响应:`{ windowId, role, instanceKey, permissions, permissionsSummary? }` |

附带一个 `permissionsSummarySchema`(用于 `getCurrentWindowResponseSchema`),提供渲染层按能力判断的布尔摘要:
```
canOpenWindow | canControlWindow | canReadDatabase | canBackupDatabase
canManageSettings | canManageTasks | canManageFiles
```

参考:[electron/windows/shared/window-schemas.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/windows/shared/window-schemas.ts)

---

## 六、相关文档

- [overview.md](./overview.md) — 双 WindowManager 架构总览
- [lifecycle.md](./lifecycle.md) — 生命周期事件与状态持久化
- [toast.md](./toast.md) — `ToastWindowManager` 系统级桌面 Toast
