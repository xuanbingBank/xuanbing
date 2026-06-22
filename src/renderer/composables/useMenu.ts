/**
 * @file 菜单组合式函数，从路由表自动生成菜单，响应权限与窗口角色变化。
 */

import { computedRef } from '../stores/base'
import { generateMenu, findActiveMenuPath } from '../utils/menu'
import type { MenuItem } from '../router/types'
import { usePermissionStore } from '../stores/permission.store'
import { useAppStore } from '../stores/app.store'

/**
 * 菜单组合式函数返回值。
 */
export interface UseMenuReturn {
  /** 菜单树 */
  menu: ReturnType<typeof Vue.computed>
  /** 当前高亮菜单路径 */
  activeMenuPath: (currentPath: string) => string
}

/**
 * 菜单组合式函数。
 *
 * 菜单根据当前权限与窗口角色自动生成，权限或角色变化时自动更新。
 *
 * @returns 菜单操作方法。
 */
export function useMenu(): UseMenuReturn {
  const permissionStore = usePermissionStore()
  const appStore = useAppStore()

  const menu = computedRef<MenuItem[]>(() =>
    generateMenu({
      permissions: permissionStore.allPermissions.value as unknown as string[],
      windowRole: permissionStore.state.windowRole,
      isDev: appStore.isDev.value as unknown as boolean
    })
  )

  function activeMenuPath(currentPath: string): string {
    return findActiveMenuPath(currentPath, menu.value as unknown as MenuItem[])
  }

  return {
    menu,
    activeMenuPath
  }
}
