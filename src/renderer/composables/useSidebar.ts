/**
 * @file 侧边栏组合式函数，封装折叠、移动端 drawer、宽度计算。
 */

import { computedRef } from '../stores/base'
import { useLayoutStore } from '../stores/layout.store'

/**
 * useSidebar 返回值。
 */
export interface UseSidebarReturn {
  /** 是否折叠（桌面端） */
  collapsed: ReturnType<typeof Vue.computed>
  /** 是否移动端 */
  isMobile: ReturnType<typeof Vue.computed>
  /** 移动端 drawer 是否打开 */
  mobileDrawerOpen: ReturnType<typeof Vue.computed>
  /** 侧栏实际宽度（px） */
  sidebarWidth: ReturnType<typeof Vue.computed>
  /** 切换折叠 */
  toggle: () => void
  /** 设置折叠 */
  setCollapsed: (collapsed: boolean) => void
  /** 切换移动端 drawer */
  toggleMobileDrawer: () => void
  /** 关闭移动端 drawer */
  closeMobileDrawer: () => void
}

/**
 * 侧边栏组合式函数。
 */
export function useSidebar(): UseSidebarReturn {
  const layoutStore = useLayoutStore()

  const collapsed = computedRef<boolean>(() => layoutStore.state.sidebarCollapsed)
  const isMobile = computedRef<boolean>(() => layoutStore.state.isMobile)
  const mobileDrawerOpen = computedRef<boolean>(() => layoutStore.state.mobileDrawerOpen)

  // 侧栏实际宽度（px）
  const sidebarWidth = computedRef<number>(() => {
    if (isMobile.value) {
      return 280 // 移动端 drawer 宽度
    }
    return collapsed.value ? 64 : 260
  })

  function toggle(): void {
    layoutStore.toggleSidebar()
  }

  function setCollapsed(collapsed: boolean): void {
    layoutStore.setSidebarCollapsed(collapsed)
  }

  function toggleMobileDrawer(): void {
    layoutStore.toggleMobileDrawer()
  }

  function closeMobileDrawer(): void {
    layoutStore.closeMobileDrawer()
  }

  return {
    collapsed,
    isMobile,
    mobileDrawerOpen,
    sidebarWidth,
    toggle,
    setCollapsed,
    toggleMobileDrawer,
    closeMobileDrawer
  }
}
