"use strict";
/**
 * @file 全局常量定义，包含路由名称、权限、主题、存储键等。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.APP_INFO = exports.STORAGE_KEYS = exports.PERMISSIONS = exports.AVAILABLE_THEMES = exports.THEMES = exports.LAYOUTS = exports.ROUTE_PATHS = exports.ROUTE_NAMES = void 0;
/* ───────────────────────── 路由名称 ───────────────────────── */
exports.ROUTE_NAMES = {
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
};
/* ───────────────────────── 路由路径 ───────────────────────── */
exports.ROUTE_PATHS = {
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
};
/* ───────────────────────── 布局类型 ───────────────────────── */
exports.LAYOUTS = {
    BASIC: 'basic',
    BLANK: 'blank',
    AUTH: 'auth',
    WINDOW: 'window'
};
/* ───────────────────────── 主题 ───────────────────────── */
exports.THEMES = {
    LIGHT: 'light',
    DARK: 'dark',
    BUSINESS: 'business',
    CORPORATE: 'corporate'
};
exports.AVAILABLE_THEMES = [
    { value: 'light', label: '浅色' },
    { value: 'dark', label: '深色' },
    { value: 'business', label: '商务' },
    { value: 'corporate', label: '企业' }
];
/* ───────────────────────── 权限 ───────────────────────── */
exports.PERMISSIONS = {
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
};
/* ───────────────────────── 存储键 ───────────────────────── */
exports.STORAGE_KEYS = {
    THEME: 'app:theme',
    FOLLOW_SYSTEM: 'app:follow-system',
    SIDEBAR_COLLAPSED: 'app:sidebar-collapsed',
    AUTH_TOKEN: 'app:auth-token',
    AUTH_USER: 'app:auth-user',
    PERMISSIONS: 'app:permissions'
};
/* ───────────────────────── 应用信息 ───────────────────────── */
exports.APP_INFO = {
    NAME: 'All In One',
    VERSION: '1.0.0',
    ENVIRONMENT: (typeof process !== 'undefined' && process.env && process.env.NODE_ENV) || 'development'
};
