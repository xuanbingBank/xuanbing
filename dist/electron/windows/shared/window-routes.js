"use strict";
/**
 * @file 窗口-路由映射表，定义每个窗口角色允许打开的路由白名单。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WINDOW_ROUTE_MAP = void 0;
exports.matchRoutePattern = matchRoutePattern;
exports.isRouteAllowedForRole = isRouteAllowedForRole;
exports.getDefaultRoute = getDefaultRoute;
/**
 * 窗口路由映射表。
 *
 * 每个角色只能打开 allowedRoutes 中的路由，双端校验（main + renderer）。
 */
exports.WINDOW_ROUTE_MAP = {
    main: {
        role: 'main',
        allowedRoutes: ['/', '/task-center', '/log-viewer', '/about', '/forbidden', '/not-found'],
        defaultRoute: '/'
    },
    login: {
        role: 'login',
        allowedRoutes: ['/login', '/forbidden', '/not-found'],
        defaultRoute: '/login'
    },
    settings: {
        role: 'settings',
        allowedRoutes: ['/settings', '/forbidden', '/not-found'],
        defaultRoute: '/settings'
    },
    about: {
        role: 'about',
        allowedRoutes: ['/about', '/not-found'],
        defaultRoute: '/about'
    },
    detail: {
        role: 'detail',
        allowedRoutes: ['/detail/:id', '/not-found'],
        defaultRoute: '/detail/:id'
    },
    editor: {
        role: 'editor',
        allowedRoutes: ['/not-found'],
        defaultRoute: '/not-found'
    },
    taskCenter: {
        role: 'taskCenter',
        allowedRoutes: ['/task-center', '/not-found'],
        defaultRoute: '/task-center'
    },
    logViewer: {
        role: 'logViewer',
        allowedRoutes: ['/log-viewer', '/not-found'],
        defaultRoute: '/log-viewer'
    },
    devtoolsPanel: {
        role: 'devtoolsPanel',
        allowedRoutes: ['/not-found'],
        defaultRoute: '/not-found'
    },
    floatingToolbox: {
        role: 'floatingToolbox',
        allowedRoutes: ['/not-found'],
        defaultRoute: '/not-found'
    },
    trayPanel: {
        role: 'trayPanel',
        allowedRoutes: ['/not-found'],
        defaultRoute: '/not-found'
    },
    modal: {
        role: 'modal',
        allowedRoutes: ['/modal/:type', '/not-found'],
        defaultRoute: '/modal/:type'
    },
    child: {
        role: 'child',
        allowedRoutes: ['/not-found'],
        defaultRoute: '/not-found'
    },
    hiddenWorker: {
        role: 'hiddenWorker',
        allowedRoutes: ['/not-found'],
        defaultRoute: '/not-found'
    }
};
/**
 * 将带参数的路由模式（如 /detail/:id）匹配为具体路由（如 /detail/42）。
 *
 * @param pattern 路由模式。
 * @param actualPath 实际路径。
 * @returns 是否匹配。
 */
function matchRoutePattern(pattern, actualPath) {
    const patternParts = pattern.split('/').filter(Boolean);
    const pathParts = actualPath.split('/').filter(Boolean);
    if (patternParts.length !== pathParts.length) {
        return false;
    }
    for (let i = 0; i < patternParts.length; i++) {
        if (patternParts[i].startsWith(':')) {
            continue;
        }
        if (patternParts[i] !== pathParts[i]) {
            return false;
        }
    }
    return true;
}
/**
 * 判断指定路由是否允许在指定窗口角色中打开。
 *
 * @param role 窗口角色。
 * @param route 路由路径。
 * @returns 是否允许。
 */
function isRouteAllowedForRole(role, route) {
    const entry = exports.WINDOW_ROUTE_MAP[role];
    if (!entry) {
        return false;
    }
    const normalizedRoute = route.split('?')[0] || '/';
    return entry.allowedRoutes.some((pattern) => matchRoutePattern(pattern, normalizedRoute));
}
/**
 * 获取角色的默认路由。
 *
 * @param role 窗口角色。
 * @returns 默认路由路径。
 */
function getDefaultRoute(role) {
    return exports.WINDOW_ROUTE_MAP[role]?.defaultRoute ?? '/not-found';
}
