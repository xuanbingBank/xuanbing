/**
 * @file 菜单 Store，管理菜单树、展开状态、折叠状态、手风琴模式。
 *
 * 菜单树从路由自动生成（响应权限与窗口角色变化）。
 * 展开状态持久化到 localStorage，支持手风琴模式（只展开当前路径）。
 */

import { defineState, computedRef, storage, registerStore } from './base'
import type { StoreBase } from './base'
import { STORAGE_KEYS } from '../constants'
import { generateMenuTree, findActiveMenuPath, findActiveMenuChain } from '../utils/menu-tree'
import type { MenuItem } from '../router/types'
import { usePermissionStore } from './permission.store'
import { useAppStore } from './app.store'

/**
 * 菜单 Store 状态。
 */
interface MenuState {
  /** 展开的菜单 id 集合 */
  expandedIds: string[]
  /** 是否手风琴模式（只展开一个同级菜单） */
  accordion: boolean
  /** 是否只展开当前路径（切换路由时自动收起其他） */
  expandOnlyActive: boolean
  /** 当前高亮菜单路径（内部使用） */
  _activePath?: string
}

/**
 * 菜单 Store 实例类型。
 */
export interface MenuStore extends StoreBase {
  state: MenuState
  /** 当前菜单树（响应权限与窗口角色） */
  menu: ReturnType<typeof Vue.computed>
  /** 当前高亮菜单路径 */
  activePath: ReturnType<typeof Vue.computed>
  /** 切换展开 */
  toggleExpand: (id: string) => void
  /** 设置展开 */
  setExpanded: (id: string, expanded: boolean) => void
  /** 展开当前路径的祖先链 */
  expandActiveChain: (currentPath: string) => void
  /** 设置手风琴模式 */
  setAccordion: (accordion: boolean) => void
  /** 设置只展开当前路径 */
  setExpandOnlyActive: (only: boolean) => void
  /** 判断是否展开 */
  isExpanded: (id: string) => boolean
  /** 重置 */
  $reset: () => void
}

/** 菜单 Store 单例 */
let menuStoreInstance: MenuStore | null = null

/**
 * 创建菜单 Store。
 */
export function createMenuStore(): MenuStore {
  if (menuStoreInstance) return menuStoreInstance

  const state = defineState<MenuState>({
    expandedIds: storage.get<string[]>(STORAGE_KEYS.MENU_EXPANDED, []),
    accordion: storage.get<boolean>(STORAGE_KEYS.MENU_ACCORDION, false),
    expandOnlyActive: false
  })

  const permissionStore = usePermissionStore()
  const appStore = useAppStore()

  // 菜单树：响应权限与窗口角色变化
  const menu = computedRef<MenuItem[]>(() =>
    generateMenuTree({
      permissions: permissionStore.allPermissions.value as unknown as string[],
      windowRole: permissionStore.state.windowRole,
      isDev: appStore.isDev.value as unknown as boolean
    })
  )

  // 当前高亮菜单路径（由外部调用 expandActiveChain 时更新）
  state._activePath = ''
  const activePath = computedRef<string>(() => state._activePath ?? '')

  /**
   * 持久化展开状态。
   */
  function persistExpanded(): void {
    storage.set(STORAGE_KEYS.MENU_EXPANDED, state.expandedIds)
  }

  /**
   * 判断菜单 id 是否展开。
   */
  function isExpanded(id: string): boolean {
    return state.expandedIds.includes(id)
  }

  /**
   * 切换展开。
   *
   * 手风琴模式下，展开某项会收起同级其他项。
   */
  function toggleExpand(id: string): void {
    const idx = state.expandedIds.indexOf(id)
    if (idx >= 0) {
      // 已展开，收起
      state.expandedIds.splice(idx, 1)
    } else {
      // 展开
      if (state.accordion) {
        // 手风琴：收起同级其他项（同父级的兄弟）
        // 简化实现：清空所有，只保留当前
        state.expandedIds = [id]
      } else {
        state.expandedIds.push(id)
      }
    }
    persistExpanded()
  }

  /**
   * 设置展开状态。
   */
  function setExpanded(id: string, expanded: boolean): void {
    const idx = state.expandedIds.indexOf(id)
    if (expanded && idx < 0) {
      if (state.accordion) {
        state.expandedIds = [id]
      } else {
        state.expandedIds.push(id)
      }
    } else if (!expanded && idx >= 0) {
      state.expandedIds.splice(idx, 1)
    }
    persistExpanded()
  }

  /**
   * 展开当前路径的祖先链。
   *
   * 切换路由时调用，自动展开父级菜单。
   * expandOnlyActive 模式下，收起非当前路径的菜单。
   */
  function expandActiveChain(currentPath: string): void {
    const active = findActiveMenuPath(currentPath, menu.value as unknown as MenuItem[])
    state._activePath = active

    const chain = findActiveMenuChain(currentPath, menu.value as unknown as MenuItem[])
    const chainIds = chain.map((item) => item.id).filter(Boolean)

    if (state.expandOnlyActive) {
      // 只保留当前路径的祖先链
      state.expandedIds = chainIds
    } else {
      // 合并：确保祖先链都展开
      for (const id of chainIds) {
        if (!state.expandedIds.includes(id)) {
          state.expandedIds.push(id)
        }
      }
    }
    persistExpanded()
  }

  /**
   * 设置手风琴模式。
   */
  function setAccordion(accordion: boolean): void {
    state.accordion = accordion
    storage.set(STORAGE_KEYS.MENU_ACCORDION, accordion)
  }

  /**
   * 设置只展开当前路径。
   */
  function setExpandOnlyActive(only: boolean): void {
    state.expandOnlyActive = only
  }

  const store: MenuStore = {
    $id: 'menu',
    state,
    menu,
    activePath,
    toggleExpand,
    setExpanded,
    expandActiveChain,
    setAccordion,
    setExpandOnlyActive,
    isExpanded,
    $reset: () => {
      state.expandedIds = []
      state.accordion = false
      state.expandOnlyActive = false
      persistExpanded()
    }
  }

  registerStore(store)
  menuStoreInstance = store
  return store
}

/**
 * 获取菜单 Store 单例。
 */
export function useMenuStore(): MenuStore {
  if (!menuStoreInstance) {
    return createMenuStore()
  }
  return menuStoreInstance
}
