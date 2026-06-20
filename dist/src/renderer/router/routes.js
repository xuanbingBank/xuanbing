"use strict";
/**
 * @file 全部路由记录的集中声明，每条路由包含路径、名称、组件标识与元信息。
 *
 * 菜单、面包屑、标签页均从此路由表自动生成，禁止手写第二套菜单。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.routes = void 0;
exports.findRouteByName = findRouteByName;
exports.findRouteByPath = findRouteByPath;
const constants_1 = require("../constants");
/**
 * 全部路由记录列表。
 *
 * 顺序不影响匹配结果，匹配时按精确路径优先（无参数的路由自然优先匹配）。
 */
exports.routes = [
    /* ── 首页 / 仪表盘 ── */
    {
        path: constants_1.ROUTE_PATHS.HOME,
        name: constants_1.ROUTE_NAMES.HOME,
        component: 'home',
        meta: {
            title: '首页',
            windowRole: 'main',
            requiresAuth: false,
            permissions: [],
            keepAlive: true,
            layout: constants_1.LAYOUTS.BASIC,
            allowDirectOpen: true,
            closeBehavior: 'close',
            devOnly: false,
            icon: '🏠',
            menu: true,
            menuOrder: 1,
            breadcrumb: true,
            affixTab: true,
            closableTab: false
        }
    },
    {
        path: constants_1.ROUTE_PATHS.DASHBOARD,
        name: constants_1.ROUTE_NAMES.DASHBOARD,
        component: 'dashboard',
        meta: {
            title: '仪表盘',
            windowRole: 'main',
            requiresAuth: false,
            permissions: [],
            keepAlive: true,
            layout: constants_1.LAYOUTS.BASIC,
            allowDirectOpen: true,
            closeBehavior: 'close',
            devOnly: false,
            icon: '📊',
            menu: true,
            menuOrder: 2,
            breadcrumb: true,
            affixTab: false,
            closableTab: true
        }
    },
    /* ── 登录 ── */
    {
        path: constants_1.ROUTE_PATHS.LOGIN,
        name: constants_1.ROUTE_NAMES.LOGIN,
        component: 'login',
        meta: {
            title: '登录',
            windowRole: 'login',
            requiresAuth: false,
            permissions: [],
            keepAlive: false,
            layout: constants_1.LAYOUTS.AUTH,
            allowDirectOpen: true,
            closeBehavior: 'close',
            devOnly: false,
            hidden: true
        }
    },
    /* ── 设置（含子页） ── */
    {
        path: constants_1.ROUTE_PATHS.SETTINGS,
        name: constants_1.ROUTE_NAMES.SETTINGS,
        component: 'settings',
        meta: {
            title: '设置',
            windowRole: 'settings',
            requiresAuth: true,
            permissions: [constants_1.PERMISSIONS.ROUTE_SETTINGS],
            keepAlive: false,
            layout: constants_1.LAYOUTS.BASIC,
            allowDirectOpen: false,
            closeBehavior: 'close',
            devOnly: false,
            icon: '⚙️',
            menu: true,
            menuOrder: 90,
            breadcrumb: true,
            closableTab: true
        }
    },
    {
        path: constants_1.ROUTE_PATHS.SETTINGS_PROFILE,
        name: constants_1.ROUTE_NAMES.SETTINGS_PROFILE,
        component: 'settingsProfile',
        meta: {
            title: '个人资料',
            windowRole: 'settings',
            requiresAuth: true,
            permissions: [constants_1.PERMISSIONS.ROUTE_SETTINGS],
            keepAlive: false,
            layout: constants_1.LAYOUTS.BASIC,
            allowDirectOpen: false,
            closeBehavior: 'close',
            devOnly: false,
            icon: '👤',
            menu: true,
            menuOrder: 91,
            breadcrumb: true,
            parent: constants_1.ROUTE_PATHS.SETTINGS,
            closableTab: true
        }
    },
    {
        path: constants_1.ROUTE_PATHS.SETTINGS_SECURITY,
        name: constants_1.ROUTE_NAMES.SETTINGS_SECURITY,
        component: 'settingsSecurity',
        meta: {
            title: '安全设置',
            windowRole: 'settings',
            requiresAuth: true,
            permissions: [constants_1.PERMISSIONS.ROUTE_SETTINGS],
            keepAlive: false,
            layout: constants_1.LAYOUTS.BASIC,
            allowDirectOpen: false,
            closeBehavior: 'close',
            devOnly: false,
            icon: '🔒',
            menu: true,
            menuOrder: 92,
            breadcrumb: true,
            parent: constants_1.ROUTE_PATHS.SETTINGS,
            closableTab: true
        }
    },
    /* ── 任务中心 ── */
    {
        path: constants_1.ROUTE_PATHS.TASK_CENTER,
        name: constants_1.ROUTE_NAMES.TASK_CENTER,
        component: 'taskCenter',
        meta: {
            title: '任务中心',
            windowRole: 'taskCenter',
            requiresAuth: true,
            permissions: [constants_1.PERMISSIONS.ROUTE_TASK_CENTER],
            keepAlive: false,
            layout: constants_1.LAYOUTS.BASIC,
            allowDirectOpen: false,
            closeBehavior: 'hide',
            devOnly: false,
            icon: '📋',
            menu: true,
            menuOrder: 50,
            breadcrumb: true,
            closableTab: true
        }
    },
    {
        path: constants_1.ROUTE_PATHS.TASK_DETAIL,
        name: constants_1.ROUTE_NAMES.TASK_DETAIL,
        component: 'taskDetail',
        meta: {
            title: '任务详情',
            windowRole: 'taskCenter',
            requiresAuth: true,
            permissions: [constants_1.PERMISSIONS.ROUTE_TASK_CENTER],
            keepAlive: false,
            layout: constants_1.LAYOUTS.BASIC,
            allowDirectOpen: false,
            closeBehavior: 'close',
            devOnly: false,
            hidden: true,
            breadcrumb: true,
            activeMenu: constants_1.ROUTE_PATHS.TASK_CENTER,
            closableTab: true
        }
    },
    /* ── 关于 ── */
    {
        path: constants_1.ROUTE_PATHS.ABOUT,
        name: constants_1.ROUTE_NAMES.ABOUT,
        component: 'about',
        meta: {
            title: '关于',
            windowRole: 'about',
            requiresAuth: false,
            permissions: [],
            keepAlive: false,
            layout: constants_1.LAYOUTS.BASIC,
            allowDirectOpen: false,
            closeBehavior: 'close',
            devOnly: false,
            icon: 'ℹ️',
            menu: true,
            menuOrder: 100,
            breadcrumb: true,
            closableTab: true
        }
    },
    /* ── 组件演示（仅开发环境） ── */
    {
        path: constants_1.ROUTE_PATHS.COMPONENT_DEMO,
        name: constants_1.ROUTE_NAMES.COMPONENT_DEMO,
        component: 'componentDemo',
        meta: {
            title: '组件演示',
            windowRole: 'main',
            requiresAuth: false,
            permissions: [],
            keepAlive: false,
            layout: constants_1.LAYOUTS.BASIC,
            allowDirectOpen: true,
            closeBehavior: 'close',
            devOnly: true,
            icon: '🧪',
            menu: true,
            menuOrder: 999,
            breadcrumb: true,
            closableTab: true
        }
    },
    /* ── 详情页（独立窗口） ── */
    {
        path: '/detail/:id',
        name: 'detail',
        component: 'detail',
        meta: {
            title: '详情',
            windowRole: 'detail',
            requiresAuth: true,
            permissions: [constants_1.PERMISSIONS.ROUTE_DETAIL],
            keepAlive: false,
            layout: constants_1.LAYOUTS.BASIC,
            allowDirectOpen: false,
            closeBehavior: 'close',
            devOnly: false,
            hidden: true,
            breadcrumb: true
        }
    },
    /* ── 日志查看器 ── */
    {
        path: '/log-viewer',
        name: 'logViewer',
        component: 'logViewer',
        meta: {
            title: '日志查看器',
            windowRole: 'logViewer',
            requiresAuth: true,
            permissions: [],
            keepAlive: false,
            layout: constants_1.LAYOUTS.BASIC,
            allowDirectOpen: false,
            closeBehavior: 'close',
            devOnly: false,
            icon: '📜',
            menu: true,
            menuOrder: 60,
            breadcrumb: true,
            closableTab: true
        }
    },
    /* ── 弹窗页 ── */
    {
        path: '/modal/:type',
        name: 'modal',
        component: 'modal',
        meta: {
            title: '弹窗',
            windowRole: 'modal',
            requiresAuth: false,
            permissions: [],
            keepAlive: false,
            layout: 'modal',
            allowDirectOpen: false,
            closeBehavior: 'close',
            devOnly: false,
            hidden: true
        }
    },
    /* ── 错误页 ── */
    {
        path: constants_1.ROUTE_PATHS.FORBIDDEN,
        name: constants_1.ROUTE_NAMES.FORBIDDEN,
        component: 'forbidden',
        meta: {
            title: '无权访问',
            windowRole: 'main',
            requiresAuth: false,
            permissions: [],
            keepAlive: false,
            layout: constants_1.LAYOUTS.BLANK,
            allowDirectOpen: true,
            closeBehavior: 'close',
            devOnly: false,
            hidden: true
        }
    },
    {
        path: constants_1.ROUTE_PATHS.NOT_FOUND,
        name: constants_1.ROUTE_NAMES.NOT_FOUND,
        component: 'notFound',
        meta: {
            title: '页面不存在',
            windowRole: 'main',
            requiresAuth: false,
            permissions: [],
            keepAlive: false,
            layout: constants_1.LAYOUTS.BLANK,
            allowDirectOpen: true,
            closeBehavior: 'close',
            devOnly: false,
            hidden: true
        }
    },
    {
        path: constants_1.ROUTE_PATHS.SERVER_ERROR,
        name: constants_1.ROUTE_NAMES.SERVER_ERROR,
        component: 'serverError',
        meta: {
            title: '服务器错误',
            windowRole: 'main',
            requiresAuth: false,
            permissions: [],
            keepAlive: false,
            layout: constants_1.LAYOUTS.BLANK,
            allowDirectOpen: true,
            closeBehavior: 'close',
            devOnly: false,
            hidden: true
        }
    },
    /* ── catch-all 404 ── */
    {
        path: '/:pathMatch(.*)*',
        name: 'catchAll',
        component: 'notFound',
        meta: {
            title: '页面不存在',
            windowRole: 'main',
            requiresAuth: false,
            permissions: [],
            keepAlive: false,
            layout: constants_1.LAYOUTS.BLANK,
            allowDirectOpen: true,
            closeBehavior: 'close',
            devOnly: false,
            hidden: true
        }
    }
];
/**
 * 按路由名称查找路由记录。
 *
 * @param name 路由名称。
 * @returns 路由记录，未找到时返回 undefined。
 */
function findRouteByName(name) {
    return exports.routes.find((route) => route.name === name);
}
/**
 * 按路由路径查找路由记录（精确匹配，不含参数）。
 *
 * @param path 路由路径。
 * @returns 路由记录，未找到时返回 undefined。
 */
function findRouteByPath(path) {
    return exports.routes.find((route) => route.path === path);
}
