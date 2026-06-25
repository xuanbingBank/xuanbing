/**
 * @file 窗口-路由映射表，定义每个窗口角色允许打开的路由白名单。
 */

import type { WindowRole, WindowRouteMap } from './window-types'

/**
 * 窗口路由映射表。
 *
 * 每个角色只能打开 allowedRoutes 中的路由，双端校验（main + renderer）。
 */
export const WINDOW_ROUTE_MAP: WindowRouteMap = {
  main: {
    role: 'main',
    allowedRoutes: ['/', '/dashboard', '/task-center', '/log-viewer', '/about', '/demo/components', '/demo/fluent-ui', '/forbidden', '/not-found', '/server-error'],
    defaultRoute: '/'
  },
  login: {
    role: 'login',
    allowedRoutes: ['/login', '/forbidden', '/not-found', '/server-error'],
    defaultRoute: '/login'
  },
  settings: {
    role: 'settings',
    allowedRoutes: ['/settings', '/settings/profile', '/settings/security', '/forbidden', '/not-found', '/server-error'],
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
    allowedRoutes: ['/task-center', '/task/:id', '/not-found', '/server-error'],
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
}

/**
 * 将带参数的路由模式（如 /detail/:id）匹配为具体路由（如 /detail/42）。
 *
 * @param pattern 路由模式。
 * @param actualPath 实际路径。
 * @returns 是否匹配。
 */
export function matchRoutePattern(pattern: string, actualPath: string): boolean {
  const patternParts = pattern.split('/').filter(Boolean)
  const pathParts = actualPath.split('/').filter(Boolean)

  if (patternParts.length !== pathParts.length) {
    return false
  }

  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      continue
    }
    if (patternParts[i] !== pathParts[i]) {
      return false
    }
  }

  return true
}

/**
 * 判断指定路由是否允许在指定窗口角色中打开。
 *
 * @param role 窗口角色。
 * @param route 路由路径。
 * @returns 是否允许。
 */
export function isRouteAllowedForRole(role: WindowRole, route: string): boolean {
  const entry = WINDOW_ROUTE_MAP[role]
  if (!entry) {
    return false
  }

  const normalizedRoute = route.split('?')[0] || '/'
  return entry.allowedRoutes.some((pattern) => matchRoutePattern(pattern, normalizedRoute))
}

/**
 * 获取角色的默认路由。
 *
 * @param role 窗口角色。
 * @returns 默认路由路径。
 */
export function getDefaultRoute(role: WindowRole): string {
  return WINDOW_ROUTE_MAP[role]?.defaultRoute ?? '/not-found'
}
