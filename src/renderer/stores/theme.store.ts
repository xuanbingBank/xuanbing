/**
 * @file 主题 Store，管理 daisyUI 主题切换、跟随系统、本地持久化。
 */

import { defineState, computedRef, storage, registerStore } from './base'
import type { StoreBase } from './base'
import { THEMES, STORAGE_KEYS, AVAILABLE_THEMES } from '../constants'
import type { ThemeName } from '../constants'

/**
 * 主题 Store 状态。
 */
interface ThemeState {
  /** 当前主题 */
  theme: ThemeName
  /** 是否跟随系统主题 */
  followSystem: boolean
  /** 系统当前偏好（light/dark） */
  systemPreference: ThemeName
  /** 是否已初始化 */
  initialized: boolean
}

/**
 * 主题 Store 实例类型。
 */
export interface ThemeStore extends StoreBase {
  state: ThemeState
  /** 当前生效主题（考虑 followSystem） */
  currentTheme: ReturnType<typeof Vue.computed>
  /** 可用主题列表 */
  availableThemes: typeof AVAILABLE_THEMES
  /** 是否深色主题 */
  isDark: ReturnType<typeof Vue.computed>
  /** 初始化主题（读取本地存储 + 监听系统偏好） */
  initTheme: () => void
  /** 设置主题 */
  setTheme: (theme: ThemeName) => void
  /** 切换深浅色 */
  toggleDark: () => void
  /** 设置是否跟随系统 */
  setFollowSystem: (follow: boolean) => void
  /** 应用主题到 <html data-theme> */
  applyTheme: () => void
}

/** 默认主题 */
const DEFAULT_THEME: ThemeName = THEMES.LIGHT

/**
 * 判断主题是否为深色。
 */
function isDarkTheme(theme: ThemeName): boolean {
  return theme === THEMES.DARK || theme === THEMES.BUSINESS
}

/**
 * 读取系统颜色方案偏好。
 */
function readSystemPreference(): ThemeName {
  if (typeof window === 'undefined' || !window.matchMedia) return THEMES.LIGHT
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? THEMES.DARK : THEMES.LIGHT
}

/** 主题 Store 单例 */
let themeStoreInstance: ThemeStore | null = null

/**
 * 创建主题 Store。
 *
 * @returns 主题 Store 实例。
 */
export function createThemeStore(): ThemeStore {
  if (themeStoreInstance) return themeStoreInstance

  const state = defineState<ThemeState>({
    theme: storage.get<ThemeName>(STORAGE_KEYS.THEME, DEFAULT_THEME),
    followSystem: storage.get<boolean>(STORAGE_KEYS.FOLLOW_SYSTEM, true),
    systemPreference: readSystemPreference(),
    initialized: false
  })

  const currentTheme = computedRef<ThemeName>(() =>
    state.followSystem ? state.systemPreference : state.theme
  )

  const isDark = computedRef<boolean>(() => isDarkTheme(currentTheme.value as unknown as ThemeName))

  /**
   * 应用当前主题到 document.documentElement。
   */
  function applyTheme(): void {
    if (typeof document === 'undefined') return
    const theme = currentTheme.value as unknown as ThemeName
    document.documentElement.setAttribute('data-theme', theme)
  }

  /**
   * 初始化主题：读取本地存储、监听系统偏好变化。
   */
  function initTheme(): void {
    if (state.initialized) return

    // 监听系统主题变化
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = (e: MediaQueryListEvent) => {
        state.systemPreference = e.matches ? THEMES.DARK : THEMES.LIGHT
        if (state.followSystem) {
          applyTheme()
        }
      }
      // 兼容旧版 Safari
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handler)
      } else if (mediaQuery.addListener) {
        mediaQuery.addListener(handler)
      }
    }

    applyTheme()
    state.initialized = true
  }

  /**
   * 设置主题。
   */
  function setTheme(theme: ThemeName): void {
    state.theme = theme
    state.followSystem = false
    storage.set(STORAGE_KEYS.THEME, theme)
    storage.set(STORAGE_KEYS.FOLLOW_SYSTEM, false)
    applyTheme()
  }

  /**
   * 切换深浅色。
   */
  function toggleDark(): void {
    const next = isDarkTheme(state.theme) ? THEMES.LIGHT : THEMES.DARK
    setTheme(next)
  }

  /**
   * 设置是否跟随系统主题。
   */
  function setFollowSystem(follow: boolean): void {
    state.followSystem = follow
    storage.set(STORAGE_KEYS.FOLLOW_SYSTEM, follow)
    if (follow) {
      state.systemPreference = readSystemPreference()
    }
    applyTheme()
  }

  const store: ThemeStore = {
    $id: 'theme',
    state,
    currentTheme,
    availableThemes: AVAILABLE_THEMES,
    isDark,
    initTheme,
    setTheme,
    toggleDark,
    setFollowSystem,
    applyTheme,
    $reset: () => {
      state.theme = DEFAULT_THEME
      state.followSystem = true
      state.systemPreference = readSystemPreference()
      storage.remove(STORAGE_KEYS.THEME)
      storage.remove(STORAGE_KEYS.FOLLOW_SYSTEM)
      applyTheme()
    }
  }

  registerStore(store)
  themeStoreInstance = store
  return store
}

/**
 * 获取主题 Store 单例（需先调用 createThemeStore）。
 */
export function useThemeStore(): ThemeStore {
  if (!themeStoreInstance) {
    return createThemeStore()
  }
  return themeStoreInstance
}
