/**
 * @file 菜单工具函数，从路由表自动生成菜单树。
 *
 * 规则：
 * 1. meta.menu = true 才显示
 * 2. meta.hidden = true 不显示
 * 3. 根据 permissions 过滤
 * 4. 根据 windowRoles 过滤
 * 5. 根据 devOnly 过滤（生产环境隐藏 devOnly）
 * 6. 支持 meta.parent 构建多级菜单
 * 7. 按 menuOrder 排序
 */

import type { RouteRecord, MenuItem } from '../router/types'
import { routes } from '../router/routes'
import { APP_INFO } from '../constants'

/**
 * 菜单过滤选项。
 */
export interface MenuFilterOptions {
  /** 当前用户权限列表 */
  permissions: string[]
  /** 当前窗口角色 */
  windowRole: string
  /** 是否开发环境 */
  isDev?: boolean
}

/**
 * 判断路由是否满足权限要求。
 *
 * @param route 路由记录。
 * @param permissions 当前权限列表。
 * @returns 是否满足。
 */
function matchPermissions(route: RouteRecord, permissions: string[]): boolean {
  if (route.meta.permissions.length === 0) {
    return true
  }
  return route.meta.permissions.every((p) => permissions.includes(p))
}

/**
 * 判断路由是否允许在当前窗口角色下显示。
 *
 * 规则：
 * - main 窗口作为主控台，显示所有菜单项（便于导航/开窗）
 * - 其他窗口只显示与自身角色匹配的路由
 * - 子菜单（有 parent）允许跨角色，由父级控制
 *
 * @param route 路由记录。
 * @param windowRole 当前窗口角色。
 * @returns 是否允许。
 */
function matchWindowRole(route: RouteRecord, windowRole: string): boolean {
  // 子菜单（有 parent）允许跨角色，由父级控制
  if (route.meta.parent !== undefined) {
    return true
  }
  // main 窗口作为主控台，显示所有顶层菜单
  if (windowRole === 'main') {
    return true
  }
  // 其他窗口只显示与自身角色匹配的顶层路由
  return route.meta.windowRole === windowRole
}

/**
 * 将路由记录转换为菜单项。
 *
 * @param route 路由记录。
 * @returns 菜单项。
 */
function routeToMenuItem(route: RouteRecord): MenuItem {
  return {
    name: route.name,
    path: route.path,
    title: route.meta.title,
    icon: route.meta.icon,
    order: route.meta.menuOrder ?? 999,
    activeMenu: route.meta.activeMenu
  }
}

/**
 * 从路由表生成菜单树。
 *
 * @param options 过滤选项。
 * @returns 菜单树。
 */
export function generateMenu(options: MenuFilterOptions): MenuItem[] {
  const { permissions, windowRole, isDev = APP_INFO.ENVIRONMENT === 'development' } = options

  // 过滤可见路由
  const visibleRoutes = routes.filter((route) => {
    // 必须 menu = true
    if (!route.meta.menu) return false
    // hidden = true 不显示
    if (route.meta.hidden) return false
    // devOnly 在生产环境不显示
    if (route.meta.devOnly && !isDev) return false
    // 权限过滤
    if (!matchPermissions(route, permissions)) return false
    return true
  })

  // 按是否有 parent 分组
  const topItems: MenuItem[] = []
  const childMap = new Map<string, MenuItem[]>()

  for (const route of visibleRoutes) {
    const item = routeToMenuItem(route)
    if (route.meta.parent) {
      // 子菜单
      const siblings = childMap.get(route.meta.parent) ?? []
      siblings.push(item)
      childMap.set(route.meta.parent, siblings)
    } else {
      // 顶层菜单，只显示当前窗口角色的
      if (matchWindowRole(route, windowRole)) {
        topItems.push(item)
      }
    }
  }

  // 为顶层菜单挂载子菜单
  for (const top of topItems) {
    const children = childMap.get(top.path)
    if (children && children.length > 0) {
      children.sort((a, b) => a.order - b.order)
      top.children = children
    }
  }

  // 排序
  topItems.sort((a, b) => a.order - b.order)

  return topItems
}

/**
 * 扁平化菜单（用于移动端或简单列表）。
 *
 * @param menu 菜单树。
 * @returns 扁平菜单列表。
 */
export function flattenMenu(menu: MenuItem[]): MenuItem[] {
  const result: MenuItem[] = []
  for (const item of menu) {
    result.push(item)
    if (item.children) {
      result.push(...flattenMenu(item.children))
    }
  }
  return result
}

/**
 * 根据当前路径查找高亮的菜单路径。
 *
 * @param currentPath 当前路由路径。
 * @param menu 菜单树。
 * @returns 高亮菜单路径。
 */
export function findActiveMenuPath(currentPath: string, menu: MenuItem[]): string {
  // 先精确匹配
  for (const item of flattenMenu(menu)) {
    if (item.path === currentPath) {
      return item.path
    }
    // 检查 activeMenu
    if (item.activeMenu === currentPath) {
      return item.path
    }
  }

  // 模糊匹配（前缀）
  for (const item of flattenMenu(menu)) {
    if (currentPath.startsWith(item.path + '/')) {
      return item.path
    }
  }

  return ''
}
