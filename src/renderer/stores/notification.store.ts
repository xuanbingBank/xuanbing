/**
 * @file 通知 Store，管理全局 Toast 消息队列。
 */

import { defineState, computedRef, registerStore } from './base'
import type { StoreBase } from './base'

/**
 * Toast 类型。
 */
export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading'

/**
 * 单条 Toast 消息。
 */
export interface ToastItem {
  /** 唯一 ID */
  id: string
  /** 类型 */
  type: ToastType
  /** 标题 */
  title: string
  /** 描述（可选） */
  description?: string
  /** 持续时间（毫秒），0 表示不自动关闭 */
  duration: number
  /** 创建时间戳 */
  createdAt: number
  /** 自动关闭定时器句柄（移除时需 clearTimeout，避免定时器残留触发） */
  timerId?: ReturnType<typeof setTimeout>
}

/**
 * 通知 Store 状态。
 */
interface NotificationState {
  /** Toast 队列 */
  toasts: ToastItem[]
  /** 未读消息数 */
  unreadCount: number
}

/**
 * 通知 Store 实例类型。
 */
export interface NotificationStore extends StoreBase {
  state: NotificationState
  /** 是否有 Toast */
  hasToasts: ReturnType<typeof Vue.computed>
  /** 添加 Toast */
  addToast: (toast: Omit<ToastItem, 'id' | 'createdAt' | 'timerId'>) => string
  /** 更新 Toast */
  updateToast: (id: string, update: Partial<Omit<ToastItem, 'id' | 'createdAt'>>) => void
  /** 移除 Toast */
  removeToast: (id: string) => void
  /** 清空全部 Toast */
  clearToasts: () => void
  /** 成功 Toast */
  success: (title: string, description?: string, duration?: number) => string
  /** 错误 Toast */
  error: (title: string, description?: string, duration?: number) => string
  /** 警告 Toast */
  warning: (title: string, description?: string, duration?: number) => string
  /** 信息 Toast */
  info: (title: string, description?: string, duration?: number) => string
  /** 加载中 Toast（不自动关闭） */
  loading: (title: string, description?: string) => string
}

/** 最大 Toast 数量 */
const MAX_TOASTS = 5

/** loading 类型 Toast（duration: 0）的最大常驻时间兜底，避免永久残留 */
const LOADING_MAX_DURATION = 30 * 1000

/** 通知 Store 单例 */
let notificationStoreInstance: NotificationStore | null = null

/** Toast ID 计数器 */
let toastIdCounter = 0

/**
 * 生成 Toast ID。
 */
function generateToastId(): string {
  toastIdCounter += 1
  return `toast-${Date.now()}-${toastIdCounter}`
}

/**
 * 创建通知 Store。
 */
export function createNotificationStore(): NotificationStore {
  if (notificationStoreInstance) return notificationStoreInstance

  const state = defineState<NotificationState>({
    toasts: [],
    unreadCount: 0
  })

  const hasToasts = computedRef<boolean>(() => state.toasts.length > 0)

  function addToast(toast: Omit<ToastItem, 'id' | 'createdAt' | 'timerId'>): string {
    const id = generateToastId()
    const item: ToastItem = {
      ...toast,
      id,
      createdAt: Date.now()
    }
    state.toasts.push(item)

    // 超出最大数量时移除最早的，并清理其定时器
    while (state.toasts.length > MAX_TOASTS) {
      const removed = state.toasts.shift()
      if (removed && removed.timerId) {
        clearTimeout(removed.timerId)
      }
    }

    // 自动关闭：duration > 0 按指定时间；loading 类型兜底最大常驻时间
    const effectiveDuration = toast.duration > 0
      ? toast.duration
      : toast.type === 'loading'
        ? LOADING_MAX_DURATION
        : 0

    if (effectiveDuration > 0) {
      item.timerId = setTimeout(() => {
        removeToast(id)
      }, effectiveDuration)
    }

    return id
  }

  function updateToast(id: string, update: Partial<Omit<ToastItem, 'id' | 'createdAt'>>): void {
    const toast = state.toasts.find((t) => t.id === id)
    if (toast) {
      Object.assign(toast, update)
    }
  }

  function removeToast(id: string): void {
    const index = state.toasts.findIndex((t) => t.id === id)
    if (index >= 0) {
      const [removed] = state.toasts.splice(index, 1)
      if (removed && removed.timerId) {
        clearTimeout(removed.timerId)
      }
    }
  }

  function clearToasts(): void {
    for (const t of state.toasts) {
      if (t.timerId) {
        clearTimeout(t.timerId)
      }
    }
    state.toasts = []
  }

  function success(title: string, description?: string, duration = 3000): string {
    return addToast({ type: 'success', title, description, duration })
  }

  function error(title: string, description?: string, duration = 5000): string {
    return addToast({ type: 'error', title, description, duration })
  }

  function warning(title: string, description?: string, duration = 4000): string {
    return addToast({ type: 'warning', title, description, duration })
  }

  function info(title: string, description?: string, duration = 3000): string {
    return addToast({ type: 'info', title, description, duration })
  }

  function loading(title: string, description?: string): string {
    return addToast({ type: 'loading', title, description, duration: 0 })
  }

  const store: NotificationStore = {
    $id: 'notification',
    state,
    hasToasts,
    addToast,
    updateToast,
    removeToast,
    clearToasts,
    success,
    error,
    warning,
    info,
    loading,
    $reset: () => {
      for (const t of state.toasts) {
        if (t.timerId) {
          clearTimeout(t.timerId)
        }
      }
      state.toasts = []
      state.unreadCount = 0
    }
  }

  registerStore(store)
  notificationStoreInstance = store
  return store
}

/**
 * 获取通知 Store 单例。
 */
export function useNotificationStore(): NotificationStore {
  if (!notificationStoreInstance) {
    return createNotificationStore()
  }
  return notificationStoreInstance
}
