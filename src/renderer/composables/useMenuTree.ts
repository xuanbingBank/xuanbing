/**
 * @file 菜单树组合式函数，封装 menu.store 的响应式菜单树与展开状态。
 *
 * 替代旧 useMenu，提供多级菜单、展开/收起、手风琴、activeMenu 高亮等能力。
 */

import { computedRef } from '../stores/base'
import { useMenuStore } from '../stores/menu.store'
import { usePermissionStore } from '../stores/permission.store'
import { useAppStore } from '../stores/app.store'
import { generateMenuTree, findActiveMenuPath, findActiveMenuChain } from '../utils/menu-tree'
import type { MenuItem } from '../router/types'

/**
 * useMenuTree 返回值。
 */
export interface UseMenuTreeReturn {
  /** 菜单树（含分组 divider） */
  menu: ReturnType<typeof Vue.computed>
  /** 当前高亮菜单路径 */
  activePath: ReturnType<typeof Vue.computed>
  /** 当前路径的祖先链 */
  activeChain: (currentPath: string) => MenuItem[]
  /** 判断菜单 id 是否展开 */
  isExpanded: (id: string) => boolean
  /** 切换展开 */
  toggleExpand: (id: string) => void
  /** 展开当前路径祖先链 */
  expandActiveChain: (currentPath: string) => void
  /** 手风琴模式 */
  accordion: ReturnType<typeof Vue.computed>
  /** 设置手风琴模式 */
  setAccordion: (accordion: boolean) => void
  /** 只展开当前路径 */
  expandOnlyActive: ReturnType<typeof Vue.computed>
  /** 设置只展开当前路径 */
  setExpandOnlyActive: (only: boolean) => void
}

/**
 * 菜单树组合式函数。
 *
 * 菜单根据当前权限与窗口角色自动生成，权限或角色变化时自动更新。
 * 展开状态持久化，支持手风琴模式。
 */
export function useMenuTree(): UseMenuTreeReturn {
  const menuStore = useMenuStore()
  const permissionStore = usePermissionStore()
  const appStore = useAppStore()

  // 直接使用 store 的响应式菜单（已响应权限变化）
  const menu = menuStore.menu

  // 当前高亮路径
  const activePath = menuStore.activePath

  // 当前路径的祖先链
  function activeChain(currentPath: string): MenuItem[] {
    return findActiveMenuChain(currentPath, menu.value as unknown as MenuItem[])
  }

  // 手风琴模式
  const accordion = computedRef<boolean>(() => menuStore.state.accordion)
  function setAccordion(accordion: boolean): void {
    menuStore.setAccordion(accordion)
  }

  // 只展开当前路径
  const expandOnlyActive = computedRef<boolean>(() => menuStore.state.expandOnlyActive)
  function setExpandOnlyActive(only: boolean): void {
    menuStore.setExpandOnlyActive(only)
  }

  return {
    menu,
    activePath,
    activeChain,
    isExpanded: menuStore.isExpanded,
    toggleExpand: menuStore.toggleExpand,
    expandActiveChain: menuStore.expandActiveChain,
    accordion,
    setAccordion,
    expandOnlyActive,
    setExpandOnlyActive
  }
}

/**
 * 根据当前路径查找高亮菜单路径（独立函数，不依赖 store）。
 *
 * 保留旧 useMenu 的 activeMenuPath 接口以兼容。
 */
export function useActiveMenuPath() {
  const permissionStore = usePermissionStore()
  const appStore = useAppStore()

  const menu = computedRef<MenuItem[]>(() =>
    generateMenuTree({
      permissions: permissionStore.allPermissions.value as unknown as string[],
      windowRole: permissionStore.state.windowRole,
      isDev: appStore.isDev.value as unknown as boolean
    })
  )

  function activeMenuPath(currentPath: string): string {
    return findActiveMenuPath(currentPath, menu.value as unknown as MenuItem[])
  }

  return { menu, activeMenuPath }
}
