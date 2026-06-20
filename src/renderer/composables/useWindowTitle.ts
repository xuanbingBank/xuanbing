/**
 * @file 窗口标题同步组合式函数，在路由变更时自动同步页面标题到窗口标题。
 */

import type { DesktopUnsubscribe } from '../../../electron/ipcBus/renderer'
import type { HashRouter } from '../router'
import type { CurrentRoute } from '../router/types'

/**
 * 窗口标题组合式函数返回值。
 */
export interface WindowTitleApi {
  /** 手动设置窗口标题 */
  setTitle: (title: string) => void
}

/**
 * 窗口标题组合式函数，在组件 setup 中调用。
 *
 * - 挂载时设置初始标题为当前路由的 meta.title
 * - 订阅路由变更，每次变更时同步窗口标题
 * - 卸载时自动取消订阅
 *
 * @param router 哈希路由实例。
 * @returns 窗口标题 API。
 */
export function useWindowTitle(router: HashRouter): WindowTitleApi {
  let routeUnsubscribe: DesktopUnsubscribe | null = null

  Vue.onMounted(() => {
    // 设置初始标题
    const current: CurrentRoute = router.getCurrentRoute()
    void window.desktop.window.setTitle(current.meta.title)

    // 订阅路由变更，同步窗口标题
    routeUnsubscribe = router.onChange((route) => {
      void window.desktop.window.setTitle(route.meta.title)
    })
  })

  Vue.onBeforeUnmount(() => {
    routeUnsubscribe?.()
  })

  const setTitle = (title: string): void => {
    void window.desktop.window.setTitle(title)
  }

  return { setTitle }
}
