/**
 * @file 内容区域组件（Fluent 风格），渲染当前路由对应的页面组件。
 */

import type { ComponentOptions } from '../../vue-global'

export const AppContent: ComponentOptions = {
  name: 'AppContent',
  setup() {
    // 注入路由与页面渲染上下文
    const currentRoute = Vue.inject<{ value: { name: string; path: string } | null }>('currentRoute')
    const renderPage = Vue.inject<() => ComponentOptions>('renderPage')
    const getPageProps = Vue.inject<() => Record<string, unknown>>('getPageProps')
    const cachedNames = Vue.inject<string[]>('cachedNames')

    // 当前页面组件
    const pageComponent = Vue.computed(() => {
      if (!renderPage) return null
      return renderPage()
    })

    // 当前页面 props
    const pageProps = Vue.computed(() => {
      if (!getPageProps) return {}
      return getPageProps()
    })

    // 是否缓存当前页面（keep-alive 模拟）
    const isCached = Vue.computed(() => {
      const route = currentRoute?.value
      if (!route || !cachedNames) return false
      return cachedNames.includes(route.name)
    })

    return {
      pageComponent,
      pageProps,
      isCached
    }
  },
  template: `
    <main class="flex-1 overflow-auto xb-scroll-y bg-[var(--xb-bg-app)]">
      <component :is="pageComponent" v-bind="pageProps" />
    </main>
  `
}
