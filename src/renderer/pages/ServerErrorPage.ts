/**
 * @file 500 服务器错误页，服务异常时展示。
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

export const ServerErrorPage: ComponentOptions = {
  name: 'ServerErrorPage',
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

    // 重试
    function handleRetry(): void {
      window.location.reload()
    }
    // 返回首页
    function goHome(): void {
      if (router) {
        router.navigate(ROUTE_PATHS.HOME)
      } else {
        console.warn('[ServerErrorPage] router 未注入，无法返回首页')
      }
    }
    return { handleRetry, goHome }
  },
  template: `
    <div class="min-h-[60vh] flex flex-col items-center justify-center text-center">
      <div class="text-8xl font-bold text-error mb-4">500</div>
      <h2 class="text-2xl font-semibold mb-2">服务器错误</h2>
      <p class="text-base-content/60 mb-6">服务器遇到错误，请稍后重试</p>
      <div class="flex gap-2">
        <BaseButton variant="primary" @click="handleRetry">重试</BaseButton>
        <BaseButton variant="ghost" @click="goHome">返回首页</BaseButton>
      </div>
    </div>
  `
}
