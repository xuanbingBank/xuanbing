/**
 * @file 窗口事件订阅组合式函数，提供统一的事件订阅与取消能力。
 */

import type { DesktopUnsubscribe } from '../../../electron/ipcBus/renderer'
import type {
  WindowFocusChangedPayload,
  WindowRoutePayload,
  WindowStatePayload
} from '../../../electron/ipcBus/renderer'

/**
 * 窗口事件处理器集合，按需传入需要订阅的事件回调。
 */
export interface WindowEventHandlers {
  /** 窗口状态变化回调 */
  onStateChanged?: (payload: WindowStatePayload) => void
  /** 窗口路由变化回调 */
  onRouteChanged?: (payload: WindowRoutePayload) => void
  /** 窗口聚焦变化回调 */
  onFocusChanged?: (payload: WindowFocusChangedPayload) => void
}

/**
 * 窗口事件组合式函数返回值。
 */
export interface WindowEventsApi {
  /**
   * 订阅窗口事件，返回复合取消订阅函数。
   *
   * @param handlers 事件处理器集合。
   * @returns 取消订阅函数，调用后取消全部已订阅事件。
   */
  subscribe: (handlers: WindowEventHandlers) => DesktopUnsubscribe
}

/**
 * 窗口事件组合式函数。
 *
 * 该函数不使用生命周期钩子，返回的 subscribe 方法可在任意位置调用，
 * 调用方需自行在合适的时机（如 beforeUnmount）调用返回的取消订阅函数。
 *
 * @returns 窗口事件订阅 API。
 */
export function useWindowEvents(): WindowEventsApi {
  const subscribe = (handlers: WindowEventHandlers): DesktopUnsubscribe => {
    const unsubscribers: DesktopUnsubscribe[] = []

    if (handlers.onStateChanged) {
      unsubscribers.push(
        window.desktop.window.onStateChanged(handlers.onStateChanged)
      )
    }
    if (handlers.onRouteChanged) {
      unsubscribers.push(
        window.desktop.window.onRouteChanged(handlers.onRouteChanged)
      )
    }
    if (handlers.onFocusChanged) {
      unsubscribers.push(
        window.desktop.window.onFocusChanged(handlers.onFocusChanged)
      )
    }

    let disposed = false
    return () => {
      if (disposed) {
        return
      }
      disposed = true
      for (const unsubscribe of unsubscribers) {
        unsubscribe()
      }
    }
  }

  return { subscribe }
}
