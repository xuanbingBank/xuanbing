/**
 * @file 窗口管理系统全部 TypeScript 类型定义，是 main / preload / renderer 三端的唯一类型契约。
 */

/* ───────────────────────── 窗口角色 ───────────────────────── */

/**
 * 系统支持的全部窗口角色枚举。
 *
 * 每个角色对应一种用途的窗口，配置集中声明在 window-config.ts。
 */
export const WINDOW_ROLES = [
  'main',
  'login',
  'settings',
  'about',
  'detail',
  'editor',
  'taskCenter',
  'logViewer',
  'devtoolsPanel',
  'floatingToolbox',
  'trayPanel',
  'modal',
  'child',
  'hiddenWorker'
] as const

export type WindowRole = (typeof WINDOW_ROLES)[number]

/* ───────────────────────── 路由定义 ───────────────────────── */

/**
 * 系统支持的全部页面路由名称。
 */
export const WINDOW_ROUTES = [
  '/',
  '/dashboard',
  '/login',
  '/settings',
  '/settings/profile',
  '/settings/security',
  '/about',
  '/detail/:id',
  '/task-center',
  '/task/:id',
  '/log-viewer',
  '/modal/:type',
  '/demo/components',
  '/demo/fluent-ui',
  '/forbidden',
  '/not-found',
  '/server-error'
] as const

export type WindowRoutePath = (typeof WINDOW_ROUTES)[number]

/* ───────────────────────── 关闭行为 ───────────────────────── */

export type CloseBehavior = 'close' | 'hide' | 'minimize' | 'ask' | 'prevent' | 'custom'

/* ───────────────────────── 二次打开策略 ───────────────────────── */

export type SecondOpenBehavior = 'focus' | 'recreate' | 'newInstance' | 'ignore'

/* ───────────────────────── 环境限制 ───────────────────────── */

export type EnvironmentScope = 'devOnly' | 'prodOnly' | 'all'

/* ───────────────────────── 显示器定位策略 ───────────────────────── */

export type DisplayTarget =
  | 'primary'
  | 'cursor'
  | 'parent'
  | 'last'
  | 'explicit'

/* ───────────────────────── 窗口权限 ───────────────────────── */

export const WINDOW_PERMISSIONS = [
  'window:open',
  'window:close:self',
  'window:close:any',
  'window:focus',
  'window:list',
  'window:control:self',
  'window:control:any',
  'window:devtools',
  'route:settings',
  'route:admin',
  'route:detail',
  'route:task-center',
  'app:quit',
  'app:read',
  'file:read',
  'file:write',
  'task:run',
  'task:cancel'
] as const

export type WindowPermission = (typeof WINDOW_PERMISSIONS)[number]

/* ───────────────────────── 窗口配置 ───────────────────────── */

/**
 * 单个窗口角色的完整配置。
 *
 * 所有字段集中声明，启动时经 zod 校验，不合法时开发环境直接报错。
 */
export interface WindowConfig {
  role: WindowRole
  title: string
  route: string
  entry?: string
  singleton: boolean
  parentRole?: WindowRole
  modal: boolean
  width: number
  height: number
  minWidth: number
  minHeight: number
  maxWidth?: number
  maxHeight?: number
  resizable: boolean
  minimizable: boolean
  maximizable: boolean
  closable: boolean
  fullscreenable: boolean
  alwaysOnTop: boolean
  frame: boolean
  transparent: boolean
  backgroundColor?: string
  showOnReady: boolean
  rememberBounds: boolean
  rememberLastRoute: boolean
  center: boolean
  skipTaskbar: boolean
  trafficLightPosition?: { x: number; y: number }
  titleBarStyle?: 'default' | 'hidden' | 'hiddenInset' | 'customButtonsOnHover'
  devTools: boolean
  permissions: WindowPermission[]
  preload: string
  routeParamsSchema?: unknown
  querySchema?: unknown
  allowMultiple: boolean
  maxInstances: number
  closeBehavior: CloseBehavior
  onSecondOpen: SecondOpenBehavior
  environment: EnvironmentScope
  displayTarget?: DisplayTarget
  closeWithParent?: boolean
  centerToParent?: boolean
  singletonPerParent?: boolean
}

/**
 * 全部窗口配置的映射表。
 */
export type WindowConfigMap = Record<WindowRole, WindowConfig>

/* ───────────────────────── 窗口引用（安全对外） ───────────────────────── */

/**
 * 对外暴露的安全窗口引用，不包含 BrowserWindow 实例。
 */
export interface WindowRef {
  id: number
  role: WindowRole
  instanceKey: string
  title: string
  route: string
  createdAt: number
  focusedAt: number
  isFocused: boolean
  isVisible: boolean
  isDestroyed: boolean
  isMaximized: boolean
  isMinimized: boolean
  isFullScreen: boolean
  isAlwaysOnTop: boolean
  bounds: { x: number; y: number; width: number; height: number }
  parentId?: number
}

/* ───────────────────────── 窗口状态持久化 ───────────────────────── */

export interface WindowStateRecord {
  bounds: { x: number; y: number; width: number; height: number }
  isMaximized: boolean
  isFullScreen: boolean
  displayId: number
  lastRoute: string
  lastFocusedAt: number
  customState?: Record<string, unknown>
}

export type WindowStateMap = Record<string, WindowStateRecord>

/* ───────────────────────── 打开窗口请求 ───────────────────────── */

export interface OpenWindowOptions {
  role: WindowRole
  routeName?: string
  params?: Record<string, string>
  query?: Record<string, string>
  payload?: unknown
  displayTarget?: DisplayTarget
  parentWindowId?: number
  title?: string
}

export interface OpenWindowResult {
  windowId: number
  role: WindowRole
  instanceKey: string
  created: boolean
  route: string
}

/* ───────────────────────── 初始化数据 ───────────────────────── */

export interface InitPayloadEntry {
  token: string
  windowId: number
  role: WindowRole
  payload: unknown
  createdAt: number
  expiresAt: number
  consumed: boolean
}

/* ───────────────────────── 窗口事件 ───────────────────────── */

export type WindowEventType =
  | 'window:created'
  | 'window:ready'
  | 'window:shown'
  | 'window:hidden'
  | 'window:focused'
  | 'window:blurred'
  | 'window:moved'
  | 'window:resized'
  | 'window:maximized'
  | 'window:unmaximized'
  | 'window:minimized'
  | 'window:restored'
  | 'window:closed'
  | 'window:destroyed'
  | 'window:route-changed'
  | 'window:title-changed'
  | 'window:crashed'
  | 'window:unresponsive'
  | 'window:responsive'
  | 'window:load-failed'

export interface WindowEventPayload {
  type: WindowEventType
  windowId: number
  role: WindowRole
  timestamp: number
  data?: Record<string, unknown>
}

/* ───────────────────────── 窗口-路由映射 ───────────────────────── */

export interface RouteMetaInfo {
  title: string
  windowRole: WindowRole
  requiresAuth: boolean
  permissions: WindowPermission[]
  keepAlive: boolean
  layout: 'default' | 'blank' | 'modal'
  minWindowSize?: { width: number; height: number }
  allowDirectOpen: boolean
  closeBehavior: CloseBehavior
  devOnly: boolean
}

export interface WindowRouteMapEntry {
  role: WindowRole
  allowedRoutes: string[]
  defaultRoute: string
}

export type WindowRouteMap = Record<WindowRole, WindowRouteMapEntry>
