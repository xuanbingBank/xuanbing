/**
 * @file 标签页组件（Fluent 风格），支持多标签切换、关闭与右键菜单。
 */

import type { ComponentOptions } from '../../vue-global'
import { useTabStore } from '../../stores/tab.store'
import { useUiStore } from '../../stores/ui.store'
import type { ContextMenuItem } from '../../stores/ui.store'
import { FluentIcon } from '../base/FluentIcon'

export const AppTabs: ComponentOptions = {
  name: 'AppTabs',
  components: { FluentIcon },
  setup() {
    const tabStore = useTabStore()
    const uiStore = useUiStore()
    // 注入路由器
    const router = Vue.inject<{ navigate: (path: string) => void }>('router')

    // 标签列表
    const tabs = Vue.computed(() => tabStore.state.tabs)
    // 当前激活标签路径
    const activePath = Vue.computed(() => tabStore.state.activePath)

    // 导航到指定路径
    function navigate(path: string): void {
      if (router) {
        router.navigate(path)
      }
    }

    // 关闭标签
    function closeTab(path: string): void {
      const next = tabStore.removeTab(path)
      if (next) {
        navigate(next)
      }
    }

    // 关闭其他标签
    function closeOthers(path: string): void {
      tabStore.removeOthers(path)
      navigate(path)
    }

    // 关闭全部标签
    function closeAll(): void {
      tabStore.removeAll()
      const first = tabStore.state.tabs[0]
      if (first) {
        navigate(first.path)
      }
    }

    // 右键菜单
    function showContextMenu(event: MouseEvent, path: string): void {
      event.preventDefault()
      const items: ContextMenuItem[] = [
        { id: 'close-current', title: '关闭当前', icon: 'close', action: () => closeTab(path) },
        { id: 'close-others', title: '关闭其他', icon: 'filter', action: () => closeOthers(path) },
        { id: 'close-all', title: '关闭全部', icon: 'close', action: () => closeAll() }
      ]
      uiStore.showContextMenu(event.clientX, event.clientY, items)
    }

    return {
      tabs,
      activePath,
      navigate,
      closeTab,
      showContextMenu
    }
  },
  template: `
    <div
      v-if="tabs.length > 0"
      class="flex items-center gap-1 px-2 h-9 bg-[var(--xb-bg-surface)] border-b border-[var(--xb-border-subtle)] overflow-x-auto xb-scroll-x shrink-0"
    >
      <div
        v-for="tab in tabs"
        :key="tab.path"
        :class="[
          'group flex items-center gap-1.5 h-7 px-3 rounded-[var(--xb-radius-sm)] cursor-pointer text-xs transition-colors whitespace-nowrap',
          tab.path === activePath
            ? 'bg-[var(--xb-brand-subtle)] text-[var(--xb-brand)] font-medium'
            : 'text-[var(--xb-text-secondary)] hover:bg-[var(--xb-bg-hover)] hover:text-[var(--xb-text-primary)]'
        ]"
        @click="navigate(tab.path)"
        @contextmenu="showContextMenu($event, tab.path)"
      >
        <span>{{ tab.title }}</span>
        <button
          v-if="tab.closable && !tab.affix"
          type="button"
          class="inline-flex items-center justify-center w-4 h-4 rounded-[var(--xb-radius-sm)] hover:bg-[var(--xb-bg-hover)] opacity-0 group-hover:opacity-100 transition-opacity"
          @click.stop="closeTab(tab.path)"
          aria-label="关闭标签"
        >
          <FluentIcon name="close" :size="12" />
        </button>
      </div>
    </div>
  `
}
