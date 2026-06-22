/**
 * @file Fluent 主题组合式函数，封装主题切换与暗色模式判断。
 *
 * 委托给 theme.store，提供 Fluent 风格的便捷接口。
 */

import { computedRef } from '../stores/base'
import { useThemeStore } from '../stores/theme.store'
import type { ThemeName } from '../constants'

/**
 * useFluentTheme 返回值。
 */
export interface UseFluentThemeReturn {
  /** 当前主题 */
  currentTheme: { value: ThemeName }
  /** 是否暗色 */
  isDark: { value: boolean }
  /** 可用主题 */
  availableThemes: { value: { value: ThemeName; label: string }[] }
  /** 设置主题 */
  setTheme: (theme: ThemeName) => void
  /** 切换深浅色 */
  toggleDark: () => void
}

/**
 * Fluent 主题组合式函数。
 */
export function useFluentTheme(): UseFluentThemeReturn {
  const themeStore = useThemeStore()

  const currentTheme = themeStore.currentTheme as { value: ThemeName }
  const isDark = themeStore.isDark as { value: boolean }
  const availableThemes = computedRef<{ value: ThemeName; label: string }[]>(
    () => themeStore.availableThemes
  )

  function setTheme(theme: ThemeName): void {
    themeStore.setTheme(theme)
  }

  function toggleDark(): void {
    themeStore.toggleDark()
  }

  return {
    currentTheme,
    isDark,
    availableThemes,
    setTheme,
    toggleDark
  }
}
