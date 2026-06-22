/**
 * @file 权限工具函数，提供权限判断的纯函数实现。
 */

import type { RouteRecord } from '../router/types'

/**
 * 判断是否拥有指定权限。
 *
 * @param permissions 当前权限列表。
 * @param permission 目标权限。
 * @returns 是否拥有。
 */
export function hasPermission(permissions: string[], permission: string): boolean {
  return permissions.includes(permission)
}

/**
 * 判断是否拥有任一权限。
 *
 * @param permissions 当前权限列表。
 * @param required 所需权限列表。
 * @returns 是否拥有任一。
 */
export function hasAnyPermission(permissions: string[], required: string[]): boolean {
  if (required.length === 0) return true
  return required.some((p) => permissions.includes(p))
}

/**
 * 判断是否拥有全部权限。
 *
 * @param permissions 当前权限列表。
 * @param required 所需权限列表。
 * @returns 是否全部拥有。
 */
export function hasAllPermissions(permissions: string[], required: string[]): boolean {
  if (required.length === 0) return true
  return required.every((p) => permissions.includes(p))
}

/**
 * 判断是否拥有指定角色。
 *
 * @param roles 当前角色列表。
 * @param role 目标角色。
 * @returns 是否拥有。
 */
export function hasRole(roles: string[], role: string): boolean {
  return roles.includes(role)
}

/**
 * 过滤路由列表，只保留有权限的路由。
 *
 * @param routeList 路由列表。
 * @param permissions 当前权限列表。
 * @returns 过滤后的路由列表。
 */
export function filterRoutesByPermission(
  routeList: RouteRecord[],
  permissions: string[]
): RouteRecord[] {
  return routeList.filter((route) => hasAllPermissions(permissions, route.meta.permissions))
}

/**
 * 过滤菜单（与 utils/menu.ts 配合使用）。
 */
export function filterMenuByPermission<T extends { children?: T[] }>(
  items: T[],
  permissions: string[],
  checkFn: (item: T, permissions: string[]) => boolean
): T[] {
  const result: T[] = []
  for (const item of items) {
    if (!checkFn(item, permissions)) continue
    if (item.children) {
      const filteredChildren = filterMenuByPermission(item.children, permissions, checkFn)
      result.push({ ...item, children: filteredChildren })
    } else {
      result.push(item)
    }
  }
  return result
}
