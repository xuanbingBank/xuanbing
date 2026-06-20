/**
 * @file 面包屑组件，根据当前路由自动生成导航面包屑。
 */

import type { ComponentOptions } from '../../vue-global'
import type { CurrentRoute } from '../../router/types'
import { useBreadcrumb } from '../../composables/useBreadcrumb'

export const AppBreadcrumb: ComponentOptions = {
  name: 'AppBreadcrumb',
  setup() {
    // 注入当前路由
    const currentRoute = Vue.inject<{ value: CurrentRoute | null }>('currentRoute')
    // 注入路由器
    const router = Vue.inject<{ navigate: (path: string) => void }>('router')

    // 生成面包屑
    const { breadcrumbs } = useBreadcrumb(currentRoute ?? { value: null })

    // 导航到指定路径
    function navigate(path: string): void {
      if (router) {
        router.navigate(path)
      }
    }

    return {
      breadcrumbs,
      navigate
    }
  },
  template: `
    <div class="breadcrumbs text-sm">
      <ul>
        <li v-for="item in breadcrumbs" :key="item.path">
          <a v-if="item.clickable" @click="navigate(item.path)">{{ item.title }}</a>
          <span v-else class="text-base-content/60">{{ item.title }}</span>
        </li>
      </ul>
    </div>
  `
}
