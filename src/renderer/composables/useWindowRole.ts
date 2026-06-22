/**
 * @file 窗口角色组合式函数，封装 window store 的窗口角色判断能力。
 */

import { useWindowStore } from '../stores/window.store'
import { computedRef } from '../stores/base'

/**
 * 窗口角色组合式函数返回值。
 */
export interface UseWindowRoleReturn {
  /** 当前窗口角色 */
  windowRole: ReturnType<typeof Vue.computed>
  /** 窗口 ID */
  windowId: ReturnType<typeof Vue.computed>
  /** 是否 Electron 环境 */
  isElectron: ReturnType<typeof Vue.computed>
  /** 是否最大化 */
  isMaximized: ReturnType<typeof Vue.computed>
  /** 是否聚焦 */
  isFocused: ReturnType<typeof Vue.computed>
  /** 是否可见 */
  isVisible: ReturnType<typeof Vue.computed>
  /** 是否已初始化 */
  initialized: ReturnType<typeof Vue.computed>
  /** 判断当前窗口角色是否匹配 */
  isRole: (role: string) => boolean
  /** 判断当前窗口角色是否在指定列表中 */
  isRoleIn: (roles: string[]) => boolean
}

/**
 * 窗口角色组合式函数。
 *
 * @returns 窗口角色判断方法。
 */
export function useWindowRole(): UseWindowRoleReturn {
  const store = useWindowStore()

  const windowRole = computedRef<string>(() => store.state.windowRole)
  const windowId = computedRef<number>(() => store.state.windowId)
  const isElectron = store.isElectron
  const isMaximized = computedRef<boolean>(() => store.state.isMaximized)
  const isFocused = computedRef<boolean>(() => store.state.isFocused)
  const isVisible = computedRef<boolean>(() => store.state.isVisible)
  const initialized = computedRef<boolean>(() => store.state.initialized)

  function isRole(role: string): boolean {
    return store.state.windowRole === role
  }

  function isRoleIn(roles: string[]): boolean {
    return roles.includes(store.state.windowRole)
  }

  return {
    windowRole,
    windowId,
    isElectron,
    isMaximized,
    isFocused,
    isVisible,
    initialized,
    isRole,
    isRoleIn
  }
}
