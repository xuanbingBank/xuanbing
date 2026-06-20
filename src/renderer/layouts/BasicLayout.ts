/**
 * @file 后台主布局，桌面端侧栏 + 内容区，移动端 drawer 侧栏。
 */

import type { ComponentOptions } from '../vue-global'
import { useLayoutStore } from '../stores/layout.store'
import { AppSidebar } from '../components/layout/AppSidebar'
import { AppHeader } from '../components/layout/AppHeader'
import { AppTabs } from '../components/layout/AppTabs'
import { AppContent } from '../components/layout/AppContent'

export const BasicLayout: ComponentOptions = {
  name: 'BasicLayout',
  components: { AppSidebar, AppHeader, AppTabs, AppContent },
  setup() {
    const layoutStore = useLayoutStore()

    // 侧栏是否折叠
    const sidebarCollapsed = Vue.computed(() => layoutStore.state.sidebarCollapsed)
    // 是否移动端
    const isMobile = Vue.computed(() => layoutStore.state.isMobile)
    // 移动端 drawer 是否打开
    const mobileDrawerOpen = Vue.computed(() => layoutStore.state.mobileDrawerOpen)
    // 侧栏宽度类名
    const sidebarWidthClass = layoutStore.sidebarWidthClass

    // 切换移动端 drawer
    function toggleMobileDrawer(): void {
      layoutStore.toggleMobileDrawer()
    }

    // 关闭移动端 drawer
    function closeMobileDrawer(): void {
      layoutStore.closeMobileDrawer()
    }

    return {
      sidebarCollapsed,
      isMobile,
      mobileDrawerOpen,
      sidebarWidthClass,
      toggleMobileDrawer,
      closeMobileDrawer
    }
  },
  template: `
    <div class="h-screen flex">
      <template v-if="isMobile">
        <!-- 移动端 drawer 侧栏 -->
        <div class="drawer">
          <input
            type="checkbox"
            :checked="mobileDrawerOpen"
            @change="toggleMobileDrawer"
            class="drawer-toggle"
          />
          <div class="drawer-content flex flex-col w-full overflow-hidden">
            <AppHeader />
            <AppTabs />
            <AppContent />
          </div>
          <div class="drawer-side">
            <label class="drawer-overlay" @click="closeMobileDrawer"></label>
            <div class="w-64 bg-base-100">
              <AppSidebar />
            </div>
          </div>
        </div>
      </template>
      <template v-else>
        <!-- 桌面端固定侧栏 -->
        <AppSidebar :class="sidebarWidthClass" class="transition-all duration-200" />
        <div class="flex-1 flex flex-col overflow-hidden">
          <AppHeader />
          <AppTabs />
          <AppContent />
        </div>
      </template>
    </div>
  `
}
