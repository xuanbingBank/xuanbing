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
}

/**
 * 当前窗口组合式函数，在组件 setup 中调用。
 *
 * - 挂载时调用 window.desktop.window.getCurrent() 获取窗口信息
 * - 订阅 onStateChanged 跟踪最大化/可见性等状态
 * - 订阅 onFocusChanged 跟踪聚焦状态
 * - 卸载时自动取消全部订阅
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

  let stateUnsubscribe: DesktopUnsubscribe | null = null
  let focusUnsubscribe: DesktopUnsubscribe | null = null

  Vue.onMounted(async () => {
    try {
      const info: WindowCurrentInfo = await window.desktop.window.getCurrent()
      windowId.value = info.windowId
      role.value = info.role
      instanceKey.value = info.instanceKey
      permissions.value = info.permissions
    } catch {
      // 获取窗口信息失败时保持默认值
    }

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
    permissions
  }
}
