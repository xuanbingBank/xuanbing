/**
 * @file 后台主布局（Fluent 风格）。
 *
 * 桌面端：固定侧栏 + 内容区，侧栏可折叠。
 * 移动端：drawer 侧栏（遮罩 + 滑入动画）。
 * 包含 Command Palette、Context Menu、Toast 等全局浮层。
 */

import type { ComponentOptions } from '../vue-global'
import { useLayoutStore } from '../stores/layout.store'
import { AppSidebar } from '../components/layout/AppSidebar'
import { AppHeader } from '../components/layout/AppHeader'
import { AppTabs } from '../components/layout/AppTabs'
import { AppContent } from '../components/layout/AppContent'
import { FluentCommandPalette } from '../components/navigation/FluentCommandPalette'
import { FluentContextMenu } from '../components/base/FluentContextMenu'
import { FluentToast } from '../components/base/FluentToast'
import { FluentIcon } from '../components/base/FluentIcon'

export const BasicLayout: ComponentOptions = {
  name: 'BasicLayout',
  components: {
    AppSidebar,
    AppHeader,
    AppTabs,
    AppContent,
    FluentCommandPalette,
    FluentContextMenu,
    FluentToast,
    FluentIcon
  },
  setup() {
    const layoutStore = useLayoutStore()

    const sidebarCollapsed = Vue.computed(() => layoutStore.state.sidebarCollapsed)
    const isMobile = Vue.computed(() => layoutStore.state.isMobile)
    const mobileDrawerOpen = Vue.computed(() => layoutStore.state.mobileDrawerOpen)

    function toggleMobileDrawer(): void {
      layoutStore.toggleMobileDrawer()
    }

    function closeMobileDrawer(): void {
      layoutStore.closeMobileDrawer()
    }

    return {
      sidebarCollapsed,
      isMobile,
      mobileDrawerOpen,
      toggleMobileDrawer,
      closeMobileDrawer
    }
  },
  template: `
    <div class="h-screen flex bg-[var(--xb-bg-app)] text-[var(--xb-text-primary)] overflow-hidden">
      <template v-if="isMobile">
        <!-- 移动端 drawer 侧栏 -->
        <transition name="xb-fade">
          <div
            v-if="mobileDrawerOpen"
            class="fixed inset-0 z-[var(--xb-z-overlay)] bg-black/40"
            @click="closeMobileDrawer"
          ></div>
        </transition>
        <transition name="xb-drawer-left">
          <div
            v-if="mobileDrawerOpen"
            class="fixed left-0 top-0 bottom-0 z-[var(--xb-z-drawer)]"
          >
            <AppSidebar />
          </div>
        </transition>

        <!-- 主内容区 -->
        <div class="flex-1 flex flex-col w-full overflow-hidden">
          <AppHeader />
          <AppTabs />
          <AppContent />
        </div>
      </template>
      <template v-else>
        <!-- 桌面端固定侧栏 -->
        <AppSidebar />
        <div class="flex-1 flex flex-col overflow-hidden min-w-0">
          <AppHeader />
          <AppTabs />
          <AppContent />
        </div>
      </template>

      <!-- 全局浮层 -->
      <FluentCommandPalette />
      <FluentContextMenu />
      <FluentToast />
    </div>
  `
}
