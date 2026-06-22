/**
 * @file 全部路由记录的集中声明，每条路由包含路径、名称、组件标识与元信息。
 *
 * 菜单、面包屑、标签页均从此路由表自动生成，禁止手写第二套菜单。
 */

import type { RouteRecord } from './types'
import { ROUTE_NAMES, ROUTE_PATHS, LAYOUTS, PERMISSIONS } from '../constants'

/**
 * 全部路由记录列表。
 *
 * 顺序不影响匹配结果，匹配时按精确路径优先（无参数的路由自然优先匹配）。
 */
export const routes: RouteRecord[] = [
  /* ── 首页 / 仪表盘 ── */
  {
    path: ROUTE_PATHS.HOME,
    name: ROUTE_NAMES.HOME,
    component: 'home',
    meta: {
      title: '首页',
      windowRole: 'main',
      requiresAuth: false,
      permissions: [],
      keepAlive: true,
      layout: LAYOUTS.BASIC,
      allowDirectOpen: true,
      closeBehavior: 'close',
      devOnly: false,
      icon: 'home',
      menu: true,
      menuOrder: 1,
      breadcrumb: true,
      affixTab: true,
      closableTab: false,
      group: 'workbench'
    }
  },
  {
    path: ROUTE_PATHS.DASHBOARD,
    name: ROUTE_NAMES.DASHBOARD,
    component: 'dashboard',
    meta: {
      title: '仪表盘',
      windowRole: 'main',
      requiresAuth: false,
      permissions: [],
      keepAlive: true,
      layout: LAYOUTS.BASIC,
      allowDirectOpen: true,
      closeBehavior: 'close',
      devOnly: false,
      icon: 'dashboard',
      menu: true,
      menuOrder: 2,
      breadcrumb: true,
      affixTab: false,
      closableTab: true,
      group: 'workbench',
      shortcut: 'Ctrl+D',
      description: '应用概览与快捷操作'
    }
  },

  /* ── 登录 ── */
  {
    path: ROUTE_PATHS.LOGIN,
    name: ROUTE_NAMES.LOGIN,
    component: 'login',
    meta: {
      title: '登录',
      windowRole: 'login',
      requiresAuth: false,
      permissions: [],
      keepAlive: false,
      layout: LAYOUTS.AUTH,
      allowDirectOpen: true,
      closeBehavior: 'close',
      devOnly: false,
      hidden: true
    }
  },

  /* ── 设置（含子页） ── */
  {
    path: ROUTE_PATHS.SETTINGS,
    name: ROUTE_NAMES.SETTINGS,
    component: 'settings',
    meta: {
      title: '设置',
      windowRole: 'settings',
      requiresAuth: true,
      permissions: [PERMISSIONS.ROUTE_SETTINGS],
      keepAlive: false,
      layout: LAYOUTS.BASIC,
      allowDirectOpen: false,
      closeBehavior: 'close',
      devOnly: false,
      icon: 'settings',
      menu: true,
      menuOrder: 90,
      breadcrumb: true,
      closableTab: true,
      group: 'system',
      description: '应用与个人设置'
    }
  },
  {
    path: ROUTE_PATHS.SETTINGS_PROFILE,
    name: ROUTE_NAMES.SETTINGS_PROFILE,
    component: 'settingsProfile',
    meta: {
      title: '个人资料',
      windowRole: 'settings',
      requiresAuth: true,
      permissions: [PERMISSIONS.ROUTE_SETTINGS],
      keepAlive: false,
      layout: LAYOUTS.BASIC,
      allowDirectOpen: false,
      closeBehavior: 'close',
      devOnly: false,
      icon: 'profile',
      menu: true,
      menuOrder: 91,
      breadcrumb: true,
      parent: ROUTE_PATHS.SETTINGS,
      closableTab: true,
      group: 'system'
    }
  },
  {
    path: ROUTE_PATHS.SETTINGS_SECURITY,
    name: ROUTE_NAMES.SETTINGS_SECURITY,
    component: 'settingsSecurity',
    meta: {
      title: '安全设置',
      windowRole: 'settings',
      requiresAuth: true,
      permissions: [PERMISSIONS.ROUTE_SETTINGS],
      keepAlive: false,
      layout: LAYOUTS.BASIC,
      allowDirectOpen: false,
      closeBehavior: 'close',
      devOnly: false,
      icon: 'security',
      menu: true,
      menuOrder: 92,
      breadcrumb: true,
      parent: ROUTE_PATHS.SETTINGS,
      closableTab: true,
      group: 'system'
    }
  },

  /* ── 任务中心 ── */
  {
    path: ROUTE_PATHS.TASK_CENTER,
    name: ROUTE_NAMES.TASK_CENTER,
    component: 'taskCenter',
    meta: {
      title: '任务中心',
      windowRole: 'taskCenter',
      requiresAuth: true,
      permissions: [PERMISSIONS.ROUTE_TASK_CENTER],
      keepAlive: false,
      layout: LAYOUTS.BASIC,
      allowDirectOpen: false,
      closeBehavior: 'hide',
      devOnly: false,
      icon: 'task',
      menu: true,
      menuOrder: 50,
      breadcrumb: true,
      closableTab: true,
      group: 'workbench',
      badge: 'new',
      description: '管理本地任务和运行状态'
    }
  },
  {
    path: ROUTE_PATHS.TASK_DETAIL,
    name: ROUTE_NAMES.TASK_DETAIL,
    component: 'taskDetail',
    meta: {
      title: '任务详情',
      windowRole: 'taskCenter',
      requiresAuth: true,
      permissions: [PERMISSIONS.ROUTE_TASK_CENTER],
      keepAlive: false,
      layout: LAYOUTS.BASIC,
      allowDirectOpen: false,
      closeBehavior: 'close',
      devOnly: false,
      hidden: true,
      breadcrumb: true,
      activeMenu: ROUTE_PATHS.TASK_CENTER,
      closableTab: true
    }
  },

  /* ── 关于 ── */
  {
    path: ROUTE_PATHS.ABOUT,
    name: ROUTE_NAMES.ABOUT,
    component: 'about',
    meta: {
      title: '关于',
      windowRole: 'about',
      requiresAuth: false,
      permissions: [],
      keepAlive: false,
      layout: LAYOUTS.BASIC,
      allowDirectOpen: false,
      closeBehavior: 'close',
      devOnly: false,
      icon: 'info',
      menu: true,
      menuOrder: 100,
      breadcrumb: true,
      closableTab: true,
      group: 'system'
    }
  },

  /* ── 组件演示（仅开发环境） ── */
  {
    path: ROUTE_PATHS.COMPONENT_DEMO,
    name: ROUTE_NAMES.COMPONENT_DEMO,
    component: 'componentDemo',
    meta: {
      title: '组件演示',
      windowRole: 'main',
      requiresAuth: false,
      permissions: [],
      keepAlive: false,
      layout: LAYOUTS.BASIC,
      allowDirectOpen: true,
      closeBehavior: 'close',
      devOnly: true,
      icon: 'beaker',
      menu: true,
      menuOrder: 999,
      breadcrumb: true,
      closableTab: true,
      group: 'system',
      tag: 'Dev'
    }
  },

  /* ── Fluent UI 演示页 ── */
  {
    path: '/demo/fluent-ui',
    name: 'fluentUiDemo',
    component: 'fluentUiDemo',
    meta: {
      title: 'Fluent UI 演示',
      windowRole: 'main',
      requiresAuth: false,
      permissions: [],
      keepAlive: false,
      layout: LAYOUTS.BASIC,
      allowDirectOpen: true,
      closeBehavior: 'close',
      devOnly: true,
      icon: 'sparkle',
      menu: true,
      menuOrder: 998,
      breadcrumb: true,
      closableTab: true,
      group: 'system',
      tag: 'Dev',
      description: 'Fluent UI 组件体系演示'
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
      permissions: [PERMISSIONS.ROUTE_DETAIL],
      keepAlive: false,
      layout: LAYOUTS.BASIC,
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
      layout: LAYOUTS.BASIC,
      allowDirectOpen: false,
      closeBehavior: 'close',
      devOnly: false,
      icon: 'log',
      menu: true,
      menuOrder: 60,
      breadcrumb: true,
      closableTab: true,
      group: 'workbench'
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
    path: ROUTE_PATHS.FORBIDDEN,
    name: ROUTE_NAMES.FORBIDDEN,
    component: 'forbidden',
    meta: {
      title: '无权访问',
      windowRole: 'main',
      requiresAuth: false,
      permissions: [],
      keepAlive: false,
      layout: LAYOUTS.BLANK,
      allowDirectOpen: true,
      closeBehavior: 'close',
      devOnly: false,
      hidden: true
    }
  },
  {
    path: ROUTE_PATHS.NOT_FOUND,
    name: ROUTE_NAMES.NOT_FOUND,
    component: 'notFound',
    meta: {
      title: '页面不存在',
      windowRole: 'main',
      requiresAuth: false,
      permissions: [],
      keepAlive: false,
      layout: LAYOUTS.BLANK,
      allowDirectOpen: true,
      closeBehavior: 'close',
      devOnly: false,
      hidden: true
    }
  },
  {
    path: ROUTE_PATHS.SERVER_ERROR,
    name: ROUTE_NAMES.SERVER_ERROR,
    component: 'serverError',
    meta: {
      title: '服务器错误',
      windowRole: 'main',
      requiresAuth: false,
      permissions: [],
      keepAlive: false,
      layout: LAYOUTS.BLANK,
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
      layout: LAYOUTS.BLANK,
      allowDirectOpen: true,
      closeBehavior: 'close',
      devOnly: false,
      hidden: true
    }
  }
]

/**
 * 按路由名称查找路由记录。
 *
 * @param name 路由名称。
 * @returns 路由记录，未找到时返回 undefined。
 */
export function findRouteByName(name: string): RouteRecord | undefined {
  return routes.find((route) => route.name === name)
}

/**
 * 按路由路径查找路由记录（精确匹配，不含参数）。
 *
 * @param path 路由路径。
 * @returns 路由记录，未找到时返回 undefined。
 */
export function findRouteByPath(path: string): RouteRecord | undefined {
  return routes.find((route) => route.path === path)
}
