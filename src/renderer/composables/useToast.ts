/**
 * @file Toast 组合式函数，封装 notification store 的便捷方法。
 */

import { useNotificationStore } from '../stores/notification.store'
import { computedRef } from '../stores/base'
import type { Ref } from '../vue-global'
import type { ToastItem, ToastType } from '../stores/notification.store'

/**
 * Toast 组合式函数返回值。
 */
export interface UseToastReturn {
  /** Toast 队列 */
  toasts: Ref<ToastItem[]>
  /** 成功 */
  success: (title: string, description?: string, duration?: number) => string
  /** 错误 */
  error: (title: string, description?: string, duration?: number) => string
  /** 警告 */
  warning: (title: string, description?: string, duration?: number) => string
  /** 信息 */
  info: (title: string, description?: string, duration?: number) => string
  /** 加载中 */
  loading: (title: string, description?: string) => string
  /** 更新 */
  update: (id: string, update: { type?: ToastType; title?: string; description?: string }) => void
  /** 关闭 */
  close: (id: string) => void
  /** 关闭全部 */
  closeAll: () => void
}

/**
 * Toast 组合式函数。
 *
 * @returns Toast 操作方法。
 */
export function useToast(): UseToastReturn {
  const store = useNotificationStore()
  const toasts = computedRef<ToastItem[]>(() => store.state.toasts)

  return {
    toasts,
    success: store.success,
    error: store.error,
    warning: store.warning,
    info: store.info,
    loading: store.loading,
    update: (id, update) => store.updateToast(id, update),
    close: store.removeToast,
    closeAll: store.clearToasts
  }
}
