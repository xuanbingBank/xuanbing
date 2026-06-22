/**
 * @file 窗口 Store，管理当前 Electron 窗口上下文（windowId、role、状态）。
 *
 * 与 useCurrentWindow composable 配合使用：
 * - useCurrentWindow 负责订阅 IPC 事件并更新 store
 * - 其他组件通过 useWindowStore 读取响应式状态
 */

import { defineState, computedRef, registerStore } from './base'
import type { StoreBase } from './base'

/**
 * 窗口 Store 状态。
 */
interface WindowState {
  /** 当前窗口 ID */
  windowId: number
  /** 当前窗口角色 */
  windowRole: string
  /** 窗口实例键 */
  instanceKey: string
  /** 是否最大化 */
  isMaximized: boolean
  /** 是否聚焦 */
  isFocused: boolean
  /** 是否可见 */
  isVisible: boolean
  /** 是否全屏 */
  isFullScreen: boolean
  /** 是否置顶 */
  isAlwaysOnTop: boolean
  /** 是否已初始化 */
  initialized: boolean
}

/**
 * 窗口 Store 实例类型。
 */
export interface WindowStore extends StoreBase {
  state: WindowState
  /** 是否 Electron 环境 */
  isElectron: ReturnType<typeof Vue.computed>
  /** 设置窗口信息 */
  setWindowInfo: (info: Partial<Pick<WindowState, 'windowId' | 'windowRole' | 'instanceKey'>>) => void
  /** 更新窗口状态 */
  updateState: (state: Partial<Pick<WindowState, 'isMaximized' | 'isFocused' | 'isVisible' | 'isFullScreen' | 'isAlwaysOnTop'>>) => void
  /** 设置初始化完成 */
  setInitialized: () => void
  /** 重置 */
  reset: () => void
}

/** 窗口 Store 单例 */
let windowStoreInstance: WindowStore | null = null

/**
 * 创建窗口 Store。
 */
export function createWindowStore(): WindowStore {
  if (windowStoreInstance) return windowStoreInstance

  const state = defineState<WindowState>({
    windowId: 0,
    windowRole: '',
    instanceKey: '',
    isMaximized: false,
    isFocused: false,
    isVisible: true,
    isFullScreen: false,
    isAlwaysOnTop: false,
    initialized: false
  })

  const isElectron = computedRef<boolean>(
    () => typeof window !== 'undefined' && !!(window as unknown as { desktop?: unknown }).desktop
  )

  function setWindowInfo(info: Partial<Pick<WindowState, 'windowId' | 'windowRole' | 'instanceKey'>>): void {
    if (info.windowId !== undefined) state.windowId = info.windowId
    if (info.windowRole !== undefined) state.windowRole = info.windowRole
    if (info.instanceKey !== undefined) state.instanceKey = info.instanceKey
  }

  function updateState(
    update: Partial<Pick<WindowState, 'isMaximized' | 'isFocused' | 'isVisible' | 'isFullScreen' | 'isAlwaysOnTop'>>
  ): void {
    Object.assign(state, update)
  }

  function setInitialized(): void {
    state.initialized = true
  }

  function reset(): void {
    state.windowId = 0
    state.windowRole = ''
    state.instanceKey = ''
    state.isMaximized = false
    state.isFocused = false
    state.isVisible = true
    state.isFullScreen = false
    state.isAlwaysOnTop = false
    state.initialized = false
  }

  const store: WindowStore = {
    $id: 'window',
    state,
    isElectron,
    setWindowInfo,
    updateState,
    setInitialized,
    reset,
    $reset: reset
  }

  registerStore(store)
  windowStoreInstance = store
  return store
}

/**
 * 获取窗口 Store 单例。
 */
export function useWindowStore(): WindowStore {
  if (!windowStoreInstance) {
    return createWindowStore()
  }
  return windowStoreInstance
}
