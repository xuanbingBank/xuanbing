/**
 * @file 面包屑组件（Fluent 风格），根据当前路由自动生成导航面包屑。
 */

import type { ComponentOptions } from '../../vue-global'
import type { CurrentRoute } from '../../router/types'
import { useBreadcrumb } from '../../composables/useBreadcrumb'
import { FluentBreadcrumb } from '../navigation/FluentBreadcrumb'
import type { FluentBreadcrumbItem } from '../navigation/FluentBreadcrumb'

export const AppBreadcrumb: ComponentOptions = {
  name: 'AppBreadcrumb',
  components: { FluentBreadcrumb },
  setup() {
    // 注入当前路由
    const currentRoute = Vue.inject<{ value: CurrentRoute | null }>('currentRoute')
    // 注入路由器
    const router = Vue.inject<{ navigate: (path: string) => void }>('router')

    // 生成面包屑
    const { breadcrumbs } = useBreadcrumb(currentRoute ?? { value: null })

    // 转换为 FluentBreadcrumbItem 格式
    const items = Vue.computed<FluentBreadcrumbItem[]>(() =>
      breadcrumbs.value.map((item) => ({
        title: item.title,
        path: item.path,
        clickable: item.clickable
      }))
    )

    // 导航到指定路径
    function navigate(path: string): void {
      if (router) {
        router.navigate(path)
      }
    }

    return {
      items,
      navigate
    }
  },
  template: `
    <FluentBreadcrumb :items="items" @navigate="navigate" />
  `
}
