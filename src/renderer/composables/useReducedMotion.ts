/**
 * @file reduced-motion 组合式函数，响应系统动效偏好变化。
 */

import { computedRef } from '../stores/base'
import { prefersReducedMotion, onReducedMotionChange } from '../utils/animation'

/**
 * useReducedMotion 返回值。
 */
export interface UseReducedMotionReturn {
  /** 是否启用 reduced motion */
  reduced: ReturnType<typeof Vue.computed>
}

/**
 * reduced-motion 组合式函数。
 *
 * 返回响应式的 reduced 状态，并在系统偏好变化时自动更新。
 */
export function useReducedMotion(): UseReducedMotionReturn {
  const reduced = Vue.ref<boolean>(prefersReducedMotion())

  Vue.onMounted(() => {
    const unsubscribe = onReducedMotionChange((value) => {
      reduced.value = value
    })
    Vue.onBeforeUnmount(() => {
      unsubscribe()
    })
  })

  return {
    reduced: computedRef<boolean>(() => reduced.value)
  }
}
