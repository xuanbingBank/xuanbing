/**
 * @file 菜单过滤工具，提供权限、角色、窗口角色、devOnly 等过滤函数。
 *
 * 与 menu-tree.ts 配合使用。menu-tree 负责构建，menu-filter 负责纯函数过滤。
 * UI 侧只做显示控制，真正权限仍由 IPC/main/API 校验。
 */

import type { MenuItem } from '../router/types'
import { flattenMenu } from './menu-tree'

/**
 * 权限匹配模式。
 */
export type PermissionMode = 'any' | 'all'

/**
 * 菜单过滤上下文。
 */
export interface MenuFilterContext {
  /** 当前用户权限列表 */
  permissions: string[]
  /** 当前用户角色列表 */
  roles: string[]
  /** 当前窗口角色 */
  windowRole: string
  /** 是否开发环境 */
  isDev: boolean
}

/**
 * 判断单个菜单项是否满足权限要求。
 */
export function matchItemPermissions(
  item: MenuItem,
  permissions: string[],
  mode: PermissionMode = 'all'
): boolean {
  if (!item.permissions || item.permissions.length === 0) {
    return true
  }
  if (mode === 'all') {
    return item.permissions.every((p) => permissions.includes(p))
  }
  return item.permissions.some((p) => permissions.includes(p))
}

/**
 * 判断单个菜单项是否满足角色要求（满足其一）。
 */
export function matchItemRoles(item: MenuItem, roles: string[]): boolean {
  if (!item.roles || item.roles.length === 0) {
    return true
  }
  return item.roles.some((r) => roles.includes(r))
}

/**
 * 判断单个菜单项是否允许在当前窗口角色下显示。
 */
export function matchItemWindowRole(item: MenuItem, windowRole: string): boolean {
  if (!item.windowRoles || item.windowRoles.length === 0) {
    return true
  }
  return item.windowRoles.includes(windowRole)
}

/**
 * 判断单个菜单项是否可见（综合权限、角色、窗口角色、devOnly、hidden、disabled）。
 */
export function isItemVisible(item: MenuItem, ctx: MenuFilterContext): boolean {
  if (item.hidden) return false
  if (item.divider) return true
  if (item.devOnly && !ctx.isDev) return false
  if (!matchItemPermissions(item, ctx.permissions)) return false
  if (!matchItemRoles(item, ctx.roles)) return false
  if (!matchItemWindowRole(item, ctx.windowRole)) return false
  return true
}

/**
 * 递归过滤菜单树，保留可见项。
 *
 * 父级被过滤时，子菜单一并移除。父级可见但所有子菜单被过滤时，
 * 父级若不可导航（无 path）则也移除。
 */
export function filterMenuTree(menu: MenuItem[], ctx: MenuFilterContext): MenuItem[] {
  const result: MenuItem[] = []
  for (const item of menu) {
    if (!isItemVisible(item, ctx)) continue

    if (item.children && item.children.length > 0) {
      const filteredChildren = filterMenuTree(item.children, ctx)
      if (filteredChildren.length === 0) {
        // 子菜单全部被过滤，父级若不可导航则移除
        if (!item.path) continue
        result.push({ ...item, children: undefined })
      } else {
        result.push({ ...item, children: filteredChildren })
      }
    } else {
      result.push(item)
    }
  }
  return result
}

/**
 * 搜索菜单项（标题、描述、路径匹配关键词）。
 *
 * 用于 Command Palette 与菜单搜索框。命中返回带高亮路径的扁平列表。
 */
export function searchMenu(menu: MenuItem[], keyword: string): MenuItem[] {
  const trimmed = keyword.trim().toLowerCase()
  if (!trimmed) return flattenMenu(menu)

  return flattenMenu(menu).filter((item: MenuItem) => {
    if (item.divider) return false
    const title = item.title.toLowerCase()
    const desc = (item.description ?? '').toLowerCase()
    const path = (item.path ?? '').toLowerCase()
    return title.includes(trimmed) || desc.includes(trimmed) || path.includes(trimmed)
  })
}

/**
 * 扁平化菜单（重导出，便于统一入口）。
 */
export { flattenMenu } from './menu-tree'
