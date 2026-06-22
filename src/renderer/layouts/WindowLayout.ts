/**
 * @file Electron 窗口布局（Fluent 风格），含自定义可拖拽标题栏与窗口控制按钮。
 */

import type { ComponentOptions } from '../vue-global'
import { AppWindowControls } from '../components/layout/AppWindowControls'
import { FluentIcon } from '../components/base/FluentIcon'

export const WindowLayout: ComponentOptions = {
  name: 'WindowLayout',
  components: { AppWindowControls, FluentIcon },
  setup() {
    // 注入页面渲染上下文
    const getPageComponent = Vue.inject<() => ComponentOptions>('getPageComponent')
    const getPageProps = Vue.inject<() => Record<string, unknown>>('getPageProps')

    // 页面组件
    const pageComponent = Vue.computed(() => {
      if (!getPageComponent) return null
      return getPageComponent()
    })

    // 页面 props
    const pageProps = Vue.computed(() => {
      if (!getPageProps) return {}
      return getPageProps()
    })

    return {
      pageComponent,
      pageProps
    }
  },
  template: `
    <div class="h-screen flex flex-col bg-[var(--xb-bg-app)] text-[var(--xb-text-primary)]">
      <!-- 自定义标题栏（可拖拽） -->
      <div
        class="h-9 flex items-center justify-between px-2 bg-[var(--xb-bg-surface)] border-b border-[var(--xb-border-subtle)] select-none shrink-0"
        style="-webkit-app-region: drag"
      >
        <div class="flex items-center gap-2 px-2">
          <div class="w-5 h-5 rounded-[var(--xb-radius-sm)] bg-[var(--xb-brand)] flex items-center justify-center">
            <FluentIcon name="home" :size="12" class="text-white" />
          </div>
          <span class="text-xs font-medium text-[var(--xb-text-primary)]">All In One</span>
        </div>
        <div style="-webkit-app-region: no-drag">
          <AppWindowControls />
        </div>
      </div>
      <!-- 页面内容 -->
      <div class="flex-1 overflow-auto xb-scroll-y">
        <component :is="pageComponent" v-bind="pageProps" />
      </div>
    </div>
  `
}
