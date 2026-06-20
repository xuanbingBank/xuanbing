/**
 * @file 登录页布局，居中卡片样式，含 logo 与版权信息。
 */

import type { ComponentOptions } from '../vue-global'

export const AuthLayout: ComponentOptions = {
  name: 'AuthLayout',
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
    <div class="min-h-screen flex items-center justify-center bg-base-200 p-4">
      <div class="card bg-base-100 shadow-xl w-full max-w-md">
        <div class="card-body">
          <!-- 顶部 logo + 应用名 -->
          <div class="text-center mb-6">
            <h1 class="text-2xl font-bold">All In One</h1>
            <p class="text-sm text-base-content/60">登录到您的账户</p>
          </div>
          <!-- 页面内容 -->
          <component :is="pageComponent" v-bind="pageProps" />
          <!-- 底部版权信息 -->
          <div class="text-center text-xs text-base-content/40 mt-6">© 2026 All In One</div>
        </div>
      </div>
    </div>
  `
}
