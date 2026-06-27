/**
 * @file 当前窗口状态组合式函数，获取当前窗口信息并订阅状态变化。
 */

import type { Ref } from '../vue-global'
import type {
  DesktopUnsubscribe,
  WindowCurrentInfo,
  WindowFocusChangedPayload,
  WindowStatePayload
} from '../../../electron/ipcBus/renderer'
import { ROUTE_PATHS } from '../constants'

/**
 * 当前窗口的响应式状态。
 */
export interface CurrentWindowState {
  /** 窗口 ID */
  windowId: Ref<number>
  /** 窗口角色 */
  role: Ref<string>
  /** 窗口实例键 */
  instanceKey: Ref<string>
  /** 是否最大化 */
  isMaximized: Ref<boolean>
  /** 是否聚焦 */
  isFocused: Ref<boolean>
  /** 是否可见 */
  isVisible: Ref<boolean>
  /** 当前窗口拥有的权限列表 */
  permissions: Ref<string[]>
  /** 窗口信息加载是否失败（IPC 重试后仍失败时为 true） */
  loadError: Ref<boolean>
}

/**
 * 当前窗口组合式函数，在组件 setup 中调用。
 *
 * - 挂载时调用 window.desktop.window.getCurrent() 获取窗口信息
 * - 订阅 onStateChanged 跟踪最大化/可见性等状态
 * - 订阅 onFocusChanged 跟踪聚焦状态
 * - 卸载时自动取消全部订阅
 * - IPC 失败时记录错误、标记 loadError，并重试一次；重试仍失败则导航到错误页
 *
 * @returns 当前窗口的响应式状态。
 */
export function useCurrentWindow(): CurrentWindowState {
  const windowId = Vue.ref<number>(0)
  const role = Vue.ref<string>('')
  const instanceKey = Vue.ref<string>('')
  const isMaximized = Vue.ref<boolean>(false)
  const isFocused = Vue.ref<boolean>(false)
  const isVisible = Vue.ref<boolean>(true)
  const permissions = Vue.ref<string[]>([])
  const loadError = Vue.ref<boolean>(false)

  let stateUnsubscribe: DesktopUnsubscribe | null = null
  let focusUnsubscribe: DesktopUnsubscribe | null = null
  // 标记组件是否已卸载，防止 async onMounted 在卸载后竞态写入
  let isUnmounted = false

  /**
   * 获取当前窗口信息；失败时记录错误并标记 loadError，首次失败后重试一次。
   *
   * @param isRetry 是否为重试调用。
   * @returns 是否获取成功。
   */
  async function fetchCurrent(isRetry: boolean): Promise<boolean> {
    try {
      const info: WindowCurrentInfo = await window.desktop.window.getCurrent()
      // 卸载后不再写入响应式状态，避免 async 竞态
      if (isUnmounted) return true
      windowId.value = info.windowId
      role.value = info.role
      instanceKey.value = info.instanceKey
      permissions.value = info.permissions
      loadError.value = false
      return true
    } catch (err) {
      console.error('[useCurrentWindow] getCurrent failed', err)
      loadError.value = true
      if (!isRetry) {
        // 首次失败：1s 后重试一次
        setTimeout(() => {
          if (isUnmounted) return
          void fetchCurrent(true).then((ok) => {
            if (ok || isUnmounted) return
            // 重试仍失败：导航到错误页，避免静默卡在 /403
            window.location.hash = '#' + ROUTE_PATHS.SERVER_ERROR
          })
        }, 1000)
      }
      return false
    }
  }

  Vue.onMounted(async () => {
    await fetchCurrent(false)
    // 卸载后不再注册订阅，避免 async onMounted 竞态
    if (isUnmounted) return

    stateUnsubscribe = window.desktop.window.onStateChanged(
      (payload: WindowStatePayload) => {
        if (windowId.value !== 0 && payload.windowId !== windowId.value) {
          return
        }
        switch (payload.state) {
          case 'maximized':
            isMaximized.value = true
            break
          case 'unmaximized':
            isMaximized.value = false
            break
          case 'focused':
            isFocused.value = true
            break
          case 'blurred':
            isFocused.value = false
            break
          case 'shown':
            isVisible.value = true
            break
          case 'hidden':
            isVisible.value = false
            break
          case 'minimized':
            isVisible.value = false
            break
          case 'restored':
            isMaximized.value = false
            isVisible.value = true
            break
          default:
            break
        }
      }
    )

    focusUnsubscribe = window.desktop.window.onFocusChanged(
      (payload: WindowFocusChangedPayload) => {
        if (windowId.value !== 0 && payload.windowId !== windowId.value) {
          return
        }
        isFocused.value = payload.focused
      }
    )
  })

  Vue.onBeforeUnmount(() => {
    isUnmounted = true
    stateUnsubscribe?.()
    focusUnsubscribe?.()
  })

  return {
    windowId,
    role,
    instanceKey,
    isMaximized,
    isFocused,
    isVisible,
    permissions,
    loadError
  }
}
