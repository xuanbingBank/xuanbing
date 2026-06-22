/**
 * @file 主题组合式函数，封装 theme store 的常用操作。
 */

import { useThemeStore } from '../stores/theme.store'
import { computedRef } from '../stores/base'
import type { Ref } from '../vue-global'
import type { ThemeName } from '../constants'

/**
 * 主题组合式函数返回值。
 */
export interface UseThemeReturn {
  /** 当前主题 */
  currentTheme: ReturnType<typeof Vue.computed>
  /** 是否深色 */
  isDark: ReturnType<typeof Vue.computed>
  /** 可用主题列表 */
  availableThemes: { value: ThemeName; label: string }[]
  /** 是否跟随系统 */
  followSystem: Ref<boolean>
  /** 设置主题 */
  setTheme: (theme: ThemeName) => void
  /** 切换深浅色 */
  toggleDark: () => void
  /** 设置跟随系统 */
  setFollowSystem: (follow: boolean) => void
  /** 初始化主题 */
  initTheme: () => void
}

/**
 * 主题组合式函数。
 *
 * @returns 主题操作方法。
 */
export function useTheme(): UseThemeReturn {
  const store = useThemeStore()
  const followSystem = computedRef<boolean>(() => store.state.followSystem)

  return {
    currentTheme: store.currentTheme,
    isDark: store.isDark,
    availableThemes: store.availableThemes,
    followSystem,
    setTheme: store.setTheme,
    toggleDark: store.toggleDark,
    setFollowSystem: store.setFollowSystem,
    initTheme: store.initTheme
  }
}
