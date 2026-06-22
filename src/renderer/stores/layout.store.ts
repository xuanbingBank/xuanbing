/**
 * @file 布局 Store，管理侧栏折叠、移动端 drawer、布局模式。
 */

import { defineState, computedRef, storage, registerStore } from './base'
import type { StoreBase } from './base'
import { STORAGE_KEYS, LAYOUTS } from '../constants'
import type { LayoutType } from '../constants'

/**
 * 布局 Store 状态。
 */
interface LayoutState {
  /** 侧栏是否折叠（桌面端） */
  sidebarCollapsed: boolean
  /** 移动端 drawer 是否打开 */
  mobileDrawerOpen: boolean
  /** 当前布局模式 */
  layoutMode: LayoutType
  /** 是否移动端视口 */
  isMobile: boolean
}

/**
 * 布局 Store 实例类型。
 */
export interface LayoutStore extends StoreBase {
  state: LayoutState
  /** 侧栏实际宽度类名 */
  sidebarWidthClass: ReturnType<typeof Vue.computed>
  /** 切换侧栏折叠 */
  toggleSidebar: () => void
  /** 设置侧栏折叠 */
  setSidebarCollapsed: (collapsed: boolean) => void
  /** 切换移动端 drawer */
  toggleMobileDrawer: () => void
  /** 关闭移动端 drawer */
  closeMobileDrawer: () => void
  /** 设置布局模式 */
  setLayoutMode: (mode: LayoutType) => void
  /** 设置移动端状态 */
  setIsMobile: (isMobile: boolean) => void
}

/** 布局 Store 单例 */
let layoutStoreInstance: LayoutStore | null = null

/** 移动端断点（px） */
const MOBILE_BREAKPOINT = 768

/**
 * 创建布局 Store。
 */
export function createLayoutStore(): LayoutStore {
  if (layoutStoreInstance) return layoutStoreInstance

  const state = defineState<LayoutState>({
    sidebarCollapsed: storage.get<boolean>(STORAGE_KEYS.SIDEBAR_COLLAPSED, false),
    mobileDrawerOpen: false,
    layoutMode: LAYOUTS.BASIC,
    isMobile: typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false
  })

  const sidebarWidthClass = computedRef<string>(() =>
    state.sidebarCollapsed ? 'w-16' : 'w-60'
  )

  function toggleSidebar(): void {
    state.sidebarCollapsed = !state.sidebarCollapsed
    storage.set(STORAGE_KEYS.SIDEBAR_COLLAPSED, state.sidebarCollapsed)
  }

  function setSidebarCollapsed(collapsed: boolean): void {
    state.sidebarCollapsed = collapsed
    storage.set(STORAGE_KEYS.SIDEBAR_COLLAPSED, collapsed)
  }

  function toggleMobileDrawer(): void {
    state.mobileDrawerOpen = !state.mobileDrawerOpen
  }

  function closeMobileDrawer(): void {
    state.mobileDrawerOpen = false
  }

  function setLayoutMode(mode: LayoutType): void {
    state.layoutMode = mode
  }

  function setIsMobile(isMobile: boolean): void {
    state.isMobile = isMobile
    if (!isMobile) {
      state.mobileDrawerOpen = false
    }
  }

  const store: LayoutStore = {
    $id: 'layout',
    state,
    sidebarWidthClass,
    toggleSidebar,
    setSidebarCollapsed,
    toggleMobileDrawer,
    closeMobileDrawer,
    setLayoutMode,
    setIsMobile,
    $reset: () => {
      state.sidebarCollapsed = false
      state.mobileDrawerOpen = false
      state.layoutMode = LAYOUTS.BASIC
    }
  }

  registerStore(store)
  layoutStoreInstance = store
  return store
}

/**
 * 获取布局 Store 单例。
 */
export function useLayoutStore(): LayoutStore {
  if (!layoutStoreInstance) {
    return createLayoutStore()
  }
  return layoutStoreInstance
}

/**
 * 初始化窗口尺寸监听，自动更新 isMobile 状态。
 */
export function initLayoutResizeListener(): () => void {
  const handler = () => {
    const store = useLayoutStore()
    store.setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
  }
  window.addEventListener('resize', handler)
  return () => window.removeEventListener('resize', handler)
}
