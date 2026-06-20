"use strict";
/**
 * @file 窗口管理系统全部 TypeScript 类型定义，是 main / preload / renderer 三端的唯一类型契约。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WINDOW_PERMISSIONS = exports.WINDOW_ROUTES = exports.WINDOW_ROLES = void 0;
/* ───────────────────────── 窗口角色 ───────────────────────── */
/**
 * 系统支持的全部窗口角色枚举。
 *
 * 每个角色对应一种用途的窗口，配置集中声明在 window-config.ts。
 */
exports.WINDOW_ROLES = [
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
];
/* ───────────────────────── 路由定义 ───────────────────────── */
/**
 * 系统支持的全部页面路由名称。
 */
exports.WINDOW_ROUTES = [
    '/',
    '/login',
    '/settings',
    '/about',
    '/detail/:id',
    '/task-center',
    '/log-viewer',
    '/modal/:type',
    '/forbidden',
    '/not-found'
];
/* ───────────────────────── 窗口权限 ───────────────────────── */
exports.WINDOW_PERMISSIONS = [
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
];
