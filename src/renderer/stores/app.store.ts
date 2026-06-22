/**
 * @file 应用 Store，管理应用级状态（名称、版本、环境、就绪状态）。
 */

import { defineState, computedRef, registerStore } from './base'
import type { StoreBase } from './base'
import { APP_INFO } from '../constants'

/**
 * 应用 Store 状态。
 */
interface AppState {
  appName: string
  version: string
  environment: 'development' | 'production' | 'test'
  isReady: boolean
  platform: string
  isElectron: boolean
}

/**
 * 应用 Store 实例类型。
 */
export interface AppStore extends StoreBase {
  state: AppState
  /** 是否开发环境 */
  isDev: ReturnType<typeof Vue.computed>
  /** 是否生产环境 */
  isProd: ReturnType<typeof Vue.computed>
  /** 设置就绪状态 */
  setReady: (ready: boolean) => void
  /** 设置平台信息 */
  setPlatform: (platform: string) => void
  /** 初始化应用信息 */
  initApp: () => void
}

/** 应用 Store 单例 */
let appStoreInstance: AppStore | null = null

/**
 * 创建应用 Store。
 */
export function createAppStore(): AppStore {
  if (appStoreInstance) return appStoreInstance

  const state = defineState<AppState>({
    appName: APP_INFO.NAME,
    version: APP_INFO.VERSION,
    environment: APP_INFO.ENVIRONMENT as AppState['environment'],
    isReady: false,
    platform: 'unknown',
    isElectron: typeof window !== 'undefined' && !!(window as unknown as { desktop?: unknown }).desktop
  })

  const isDev = computedRef<boolean>(() => state.environment === 'development')
  const isProd = computedRef<boolean>(() => state.environment === 'production')

  function setReady(ready: boolean): void {
    state.isReady = ready
  }

  function setPlatform(platform: string): void {
    state.platform = platform
  }

  function initApp(): void {
    // 从 navigator 获取平台信息
    if (typeof navigator !== 'undefined') {
      state.platform = navigator.platform || 'unknown'
    }
  }

  const store: AppStore = {
    $id: 'app',
    state,
    isDev,
    isProd,
    setReady,
    setPlatform,
    initApp,
    $reset: () => {
      state.isReady = false
    }
  }

  registerStore(store)
  appStoreInstance = store
  return store
}

/**
 * 获取应用 Store 单例。
 */
export function useAppStore(): AppStore {
  if (!appStoreInstance) {
    return createAppStore()
  }
  return appStoreInstance
}
