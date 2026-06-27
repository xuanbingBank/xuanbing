/**
 * @file 403 禁止访问页，无权限时展示。
 */

import type { ComponentOptions } from '../vue-global'
import type { CurrentRoute, RouteMeta } from '../router/types'
import { ROUTE_PATHS } from '../constants'
import { BaseButton } from '../components/base/BaseButton'

/** 页面 Props */
interface PageProps {
  params: Record<string, string>
  query: Record<string, string>
  meta: RouteMeta
  route: CurrentRoute
}

export const ForbiddenPage: ComponentOptions = {
  name: 'ForbiddenPage',
  components: { BaseButton },
  props: {
    params: { type: Object, default: () => ({}) },
    query: { type: Object, default: () => ({}) },
    meta: { type: Object, default: () => ({}) },
    route: { type: Object, default: () => ({}) }
  },
  setup() {
    // 注入路由器
    const router = Vue.inject<{ navigate: (path: string) => void }>('router')

    // 返回首页
    function goHome(): void {
      if (router) {
        router.navigate(ROUTE_PATHS.HOME)
      } else {
        console.warn('[ForbiddenPage] router 未注入，无法返回首页')
      }
    }
    return { goHome }
  },
  template: `
    <div class="min-h-[60vh] flex flex-col items-center justify-center text-center">
      <div class="text-8xl font-bold text-error mb-4">403</div>
      <h2 class="text-2xl font-semibold mb-2">无权访问</h2>
      <p class="text-base-content/60 mb-6">您没有权限访问此页面</p>
      <BaseButton @click="goHome">返回首页</BaseButton>
    </div>
  `
}
