/**
 * @file 路由视图包装器，渲染当前路由页面组件并用 Suspense 包裹。
 */

import type { ComponentOptions } from '../../vue-global'

export const RouteViewWrapper: ComponentOptions = {
  name: 'RouteViewWrapper',
  setup() {
    // 注入页面组件获取函数
    const getPageComponent = Vue.inject<() => ComponentOptions | null>('getPageComponent')
    // 注入页面 props 获取函数
    const getPageProps = Vue.inject<() => Record<string, unknown>>('getPageProps')
    // 注入缓存名单（用于判断是否缓存当前页面）
    Vue.inject<string[]>('cachedNames')

    // 当前页面组件
    const pageComponent = Vue.computed(() => {
      if (!getPageComponent) return null
      return getPageComponent()
    })

    // 当前页面 props
    const pageProps = Vue.computed(() => {
      if (!getPageProps) return {}
      return getPageProps()
    })

    return { pageComponent, pageProps }
  },
  template: `
    <Suspense>
      <template #default>
        <component :is="pageComponent" v-bind="pageProps" />
      </template>
      <template #fallback>
        <div class="flex items-center justify-center h-64">
          <span class="loading loading-spinner loading-lg"></span>
        </div>
      </template>
    </Suspense>
  `
}
