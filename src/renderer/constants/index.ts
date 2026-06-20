/**
 * @file 全局常量定义，包含路由名称、权限、主题、存储键等。
 */

/* ───────────────────────── 路由名称 ───────────────────────── */

export const ROUTE_NAMES = {
  HOME: 'home',
  DASHBOARD: 'dashboard',
  LOGIN: 'login',
  SETTINGS: 'settings',
  SETTINGS_PROFILE: 'settingsProfile',
  SETTINGS_SECURITY: 'settingsSecurity',
  TASK_CENTER: 'taskCenter',
  TASK_DETAIL: 'taskDetail',
  ABOUT: 'about',
  COMPONENT_DEMO: 'componentDemo',
  FORBIDDEN: 'forbidden',
  NOT_FOUND: 'notFound',
  SERVER_ERROR: 'serverError'
} as const

export type RouteName = (typeof ROUTE_NAMES)[keyof typeof ROUTE_NAMES]

/* ───────────────────────── 路由路径 ───────────────────────── */

export const ROUTE_PATHS = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  LOGIN: '/login',
  SETTINGS: '/settings',
  SETTINGS_PROFILE: '/settings/profile',
  SETTINGS_SECURITY: '/settings/security',
  TASK_CENTER: '/task-center',
  TASK_DETAIL: '/task/:id',
  ABOUT: '/about',
  COMPONENT_DEMO: '/demo/components',
  FORBIDDEN: '/403',
  NOT_FOUND: '/404',
  SERVER_ERROR: '/500'
} as const

/* ───────────────────────── 布局类型 ───────────────────────── */

export const LAYOUTS = {
  BASIC: 'basic',
  BLANK: 'blank',
  AUTH: 'auth',
  WINDOW: 'window'
} as const

export type LayoutType = (typeof LAYOUTS)[keyof typeof LAYOUTS]

/* ───────────────────────── 主题 ───────────────────────── */

export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  BUSINESS: 'business',
  CORPORATE: 'corporate'
} as const

export type ThemeName = (typeof THEMES)[keyof typeof THEMES]

export const AVAILABLE_THEMES: { value: ThemeName; label: string }[] = [
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
  { value: 'business', label: '商务' },
  { value: 'corporate', label: '企业' }
]

/* ───────────────────────── 权限 ───────────────────────── */

export const PERMISSIONS = {
  // 窗口权限
  WINDOW_OPEN: 'window:open',
  WINDOW_CLOSE_SELF: 'window:close:self',
  WINDOW_CLOSE_ANY: 'window:close:any',
  WINDOW_FOCUS: 'window:focus',
  WINDOW_LIST: 'window:list',
  WINDOW_CONTROL_SELF: 'window:control:self',
  WINDOW_CONTROL_ANY: 'window:control:any',
  WINDOW_DEVTOOLS: 'window:devtools',
  // 路由权限
  ROUTE_SETTINGS: 'route:settings',
  ROUTE_DETAIL: 'route:detail',
  ROUTE_TASK_CENTER: 'route:task-center',
  ROUTE_LOG_VIEWER: 'route:log-viewer',
  ROUTE_ADMIN: 'route:admin',
  // 应用权限
  APP_READ: 'app:read',
  APP_QUIT: 'app:quit',
  // 业务权限（示例）
  USER_CREATE: 'user:create',
  USER_READ: 'user:read',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete'
} as const

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

/* ───────────────────────── 存储键 ───────────────────────── */

export const STORAGE_KEYS = {
  THEME: 'app:theme',
  FOLLOW_SYSTEM: 'app:follow-system',
  SIDEBAR_COLLAPSED: 'app:sidebar-collapsed',
  AUTH_TOKEN: 'app:auth-token',
  AUTH_USER: 'app:auth-user',
  PERMISSIONS: 'app:permissions'
} as const

/* ───────────────────────── 应用信息 ───────────────────────── */

export const APP_INFO = {
  NAME: 'All In One',
  VERSION: '1.0.0',
  ENVIRONMENT: (typeof process !== 'undefined' && process.env && process.env.NODE_ENV) || 'development'
} as const
