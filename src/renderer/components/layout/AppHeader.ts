/**
 * @file 顶部导航栏组件（Fluent 风格）。
 *
 * 包含：
 * - 折叠按钮（桌面端）/ 菜单按钮（移动端）
 * - 应用名称（移动端显示）
 * - 搜索框（点击打开命令面板，Ctrl/Cmd+K）
 * - 面包屑
 * - 主题切换
 * - 用户菜单
 * - 窗口控制（Electron）
 * - 拖拽区域（frameless window）
 */

import type { ComponentOptions } from '../../vue-global'
import { useLayoutStore } from '../../stores/layout.store'
import { useAuthStore } from '../../stores/auth.store'
import { AppBreadcrumb } from './AppBreadcrumb'
import { AppThemeToggle } from './AppThemeToggle'
import { AppWindowControls } from './AppWindowControls'
import { AppSearchBox } from './AppSearchBox'
import { AppUserMenu } from './AppUserMenu'
import { FluentIconButton } from '../base/FluentIconButton'

export const AppHeader: ComponentOptions = {
  name: 'AppHeader',
  components: {
    AppBreadcrumb,
    AppThemeToggle,
    AppWindowControls,
    AppSearchBox,
    AppUserMenu,
    FluentIconButton
  },
  setup() {
    const layoutStore = useLayoutStore()
    const authStore = useAuthStore()

    const isMobile = Vue.computed(() => layoutStore.state.isMobile)
    const sidebarCollapsed = Vue.computed(() => layoutStore.state.sidebarCollapsed)
    const isLoggedIn = authStore.isLoggedIn

    // 注入路由器
    const router = Vue.inject<{ navigate: (path: string) => void }>('router')

    // 切换侧栏（桌面端折叠 / 移动端 drawer）
    function handleToggle(): void {
      if (isMobile.value) {
        layoutStore.toggleMobileDrawer()
      } else {
        layoutStore.toggleSidebar()
      }
    }

    // 登出
    async function handleLogout(): Promise<void> {
      await authStore.logout()
    }

    // 用户菜单导航
    function handleNavigate(path: string): void {
      if (router) router.navigate(path)
    }

    return {
      isMobile,
      sidebarCollapsed,
      isLoggedIn,
      handleToggle,
      handleLogout,
      handleNavigate
    }
  },
  template: `
    <header
      class="flex items-center h-14 px-4 gap-3 bg-[var(--xb-bg-surface)] border-b border-[var(--xb-border-subtle)] shrink-0"
      style="-webkit-app-region: drag;"
    >
      <!-- 左侧：折叠按钮 + 应用名（移动端） -->
      <div class="flex items-center gap-2 shrink-0" style="-webkit-app-region: no-drag;">
        <FluentIconButton
          :icon="isMobile ? 'menu' : (sidebarCollapsed ? 'chevronRight' : 'chevronLeft')"
          size="medium"
          :aria-label="isMobile ? '打开菜单' : '折叠侧栏'"
          @click="handleToggle"
        />
        <span v-if="isMobile" class="text-base font-semibold text-[var(--xb-text-primary)]">All In One</span>
      </div>

      <!-- 中间：搜索框（桌面端）/ 面包屑（移动端） -->
      <div class="flex-1 min-w-0 flex items-center justify-center" style="-webkit-app-region: no-drag;">
        <AppSearchBox v-if="!isMobile" class="hidden lg:flex" />
        <div v-else class="flex-1 min-w-0">
          <AppBreadcrumb />
        </div>
      </div>

      <!-- 面包屑（桌面端，搜索框右侧） -->
      <div v-if="!isMobile" class="hidden xl:flex items-center min-w-0 max-w-[300px]" style="-webkit-app-region: no-drag;">
        <AppBreadcrumb />
      </div>

      <!-- 右侧：主题 + 用户 + 窗口控制 -->
      <div class="flex items-center gap-1 shrink-0" style="-webkit-app-region: no-drag;">
        <AppThemeToggle />
        <AppUserMenu
          v-if="isLoggedIn"
          @navigate="handleNavigate"
          @logout="handleLogout"
        />
        <AppWindowControls />
      </div>
    </header>
  `
}
