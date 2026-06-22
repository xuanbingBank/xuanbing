/**
 * @file 侧边栏组件（Fluent 风格，多级菜单）。
 *
 * 特性：
 * - 多级菜单（递归 AppSidebarItem）
 * - 折叠态（仅图标）
 * - 手风琴模式（由 menu.store 控制）
 * - 路由切换自动展开祖先链
 * - 顶部 Logo 区（可点击回首页）
 * - 底部操作区（折叠按钮）
 * - 滚动条 Fluent 风格
 */

import type { ComponentOptions } from '../../vue-global'
import { useMenuTree } from '../../composables/useMenuTree'
import { useSidebar } from '../../composables/useSidebar'
import { useLayoutStore } from '../../stores/layout.store'
import { FluentIcon } from '../base/FluentIcon'
import { AppSidebarItem } from './AppSidebarItem'

export const AppSidebar: ComponentOptions = {
  name: 'AppSidebar',
  components: { AppSidebarItem, FluentIcon },
  emits: ['toggle-collapse'],
  setup() {
    const { menu, expandActiveChain } = useMenuTree()
    const { collapsed, isMobile, closeMobileDrawer } = useSidebar()
    const layoutStore = useLayoutStore()

    // 注入路由
    const router = Vue.inject<{ navigate: (path: string) => void }>('router')
    const currentRoute = Vue.inject<{ value: { path: string } | null }>('currentRoute')

    const currentPath = Vue.computed<string>(() => currentRoute?.value?.path ?? '')

    // 路由变化时自动展开祖先链
    Vue.watch(
      currentPath,
      (path: unknown) => {
        if (typeof path === 'string' && path) expandActiveChain(path)
      },
      { immediate: true }
    )

    // 导航
    function handleNavigate(path: string): void {
      if (router) router.navigate(path)
      // 移动端导航后关闭 drawer
      if (isMobile.value) closeMobileDrawer()
    }

    // 回首页
    function goHome(): void {
      if (router) router.navigate('/')
      if (isMobile.value) closeMobileDrawer()
    }

    // 切换折叠
    function handleToggleCollapse(): void {
      layoutStore.toggleSidebar()
    }

    return {
      menu,
      collapsed,
      isMobile,
      handleNavigate,
      goHome,
      handleToggleCollapse
    }
  },
  template: `
    <aside
      :class="[
        'h-full flex flex-col bg-[var(--xb-bg-surface)] border-r border-[var(--xb-border-subtle)] transition-all duration-[var(--xb-motion-normal)] ease-[var(--xb-ease)]',
        collapsed ? 'w-16' : 'w-60'
      ]"
    >
      <!-- 顶部 Logo 区 -->
      <div
        :class="[
          'flex items-center h-14 shrink-0 border-b border-[var(--xb-border-subtle)]',
          collapsed ? 'justify-center px-2' : 'px-4 gap-2'
        ]"
      >
        <button
          type="button"
          class="flex items-center gap-2 min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--xb-brand)] rounded-[var(--xb-radius-sm)]"
          @click="goHome"
          :title="collapsed ? 'All In One' : ''"
        >
          <div class="w-7 h-7 rounded-[var(--xb-radius-md)] bg-[var(--xb-brand)] flex items-center justify-center shrink-0">
            <FluentIcon name="home" :size="16" class="text-white" />
          </div>
          <span v-if="!collapsed" class="text-sm font-semibold text-[var(--xb-text-primary)] truncate">All In One</span>
        </button>
      </div>

      <!-- 菜单区 -->
      <nav class="flex-1 overflow-y-auto xb-scroll-y py-2" :class="collapsed ? 'px-2' : 'px-3'">
        <div class="flex flex-col gap-0.5">
          <AppSidebarItem
            v-for="item in menu"
            :key="item.id || item.path"
            :item="item"
            :level="0"
            :collapsed="collapsed"
            @navigate="handleNavigate"
          />
        </div>
      </nav>

      <!-- 底部：折叠按钮（仅桌面端） -->
      <div v-if="!isMobile" class="shrink-0 border-t border-[var(--xb-border-subtle)] p-2">
        <button
          type="button"
          :class="[
            'w-full flex items-center gap-2.5 rounded-[var(--xb-radius-md)] px-3 py-2 text-sm transition-colors',
            'text-[var(--xb-text-secondary)] hover:bg-[var(--xb-bg-hover)] hover:text-[var(--xb-text-primary)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--xb-brand)]',
            collapsed ? 'justify-center px-0' : ''
          ]"
          :title="collapsed ? '展开侧栏' : '折叠侧栏'"
          @click="handleToggleCollapse"
        >
          <FluentIcon
            :name="collapsed ? 'chevronRight' : 'chevronLeft'"
            :size="16"
            class="shrink-0"
          />
          <span v-if="!collapsed">折叠</span>
        </button>
      </div>
    </aside>
  `
}
