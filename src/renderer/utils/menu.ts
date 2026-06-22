/**
 * @file 菜单工具函数（兼容旧接口，内部委托给 menu-tree.ts）。
 *
 * 保留 generateMenu / flattenMenu / findActiveMenuPath 旧签名，
 * 内部调用 Fluent 多级菜单实现。新代码请直接使用 utils/menu-tree.ts。
 */

import type { RouteRecord, MenuItem } from '../router/types'
import { routes } from '../router/routes'
import { APP_INFO } from '../constants'
import {
  generateMenuTree,
  flattenMenu as flattenMenuTree,
  findActiveMenuPath as findActiveMenuPathTree
} from './menu-tree'

/**
 * 菜单过滤选项（旧接口兼容）。
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
 */
function matchPermissions(route: RouteRecord, permissions: string[]): boolean {
  if (route.meta.permissions.length === 0) {
    return true
  }
  return route.meta.permissions.every((p) => permissions.includes(p))
}

/**
 * 判断路由是否允许在当前窗口角色下显示（旧逻辑，保留向后兼容）。
 */
function matchWindowRole(route: RouteRecord, windowRole: string): boolean {
  if (route.meta.parent !== undefined) {
    return true
  }
  if (windowRole === 'main') {
    return true
  }
  return route.meta.windowRole === windowRole
}

/**
 * 从路由表生成菜单树（旧接口，返回多级菜单）。
 *
 * 内部调用 generateMenuTree，返回带分组的菜单树。
 */
export function generateMenu(options: MenuFilterOptions): MenuItem[] {
  const { permissions, windowRole, isDev = APP_INFO.ENVIRONMENT === 'development' } = options
  return generateMenuTree({ permissions, windowRole, isDev })
}

/**
 * 扁平化菜单（用于移动端或简单列表）。
 */
export function flattenMenu(menu: MenuItem[]): MenuItem[] {
  return flattenMenuTree(menu)
}

/**
 * 根据当前路径查找高亮的菜单路径。
 */
export function findActiveMenuPath(currentPath: string, menu: MenuItem[]): string {
  return findActiveMenuPathTree(currentPath, menu)
}

// 保留旧函数引用以兼容可能的直接调用
export { matchPermissions, matchWindowRole }
