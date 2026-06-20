/**
 * @file 窗口生命周期绑定，将 BrowserWindow 与 webContents 的事件桥接到事件总线。
 *
 * 高频事件（move/resize）由事件总线内部去抖，本模块只负责转发。
 * 窗口关闭时保存状态、反注册、清理初始化数据。
 */

import type { WindowEventPayload, WindowEventType, WindowRole } from '../shared/window-types'
import type { WindowConfig } from '../shared/window-types'
import type { WindowEventBus } from './window-events'
import type { WindowRegistry } from './window-registry'
import type { WindowStateStore } from './window-state-store'
import type { WindowInitPayloadStore } from './window-init-payload'

/**
 * 浏览器窗口的最小接口（生命周期绑定所需）。
 */
export interface BrowserWindowLike {
  id: number
  isDestroyed(): boolean
  getBounds(): { x: number; y: number; width: number; height: number }
  isMaximized(): boolean
  isMinimized(): boolean
  isFullScreen(): boolean
  isAlwaysOnTop(): boolean
  on(event: string, handler: (...args: unknown[]) => void): void
  once(event: string, handler: (...args: unknown[]) => void): void
  off(event: string, handler: (...args: unknown[]) => void): void
  webContents: WebContentsLike
}

/**
 * webContents 最小接口。
 */
export interface WebContentsLike {
  id: number
  isDestroyed(): boolean
  getURL(): string
  on(event: string, handler: (...args: unknown[]) => void): void
  once(event: string, handler: (...args: unknown[]) => void): void
  off(event: string, handler: (...args: unknown[]) => void): void
}

/**
 * bind 方法所需的依赖。
 */
export interface WindowLifecycleDeps {
  eventBus: WindowEventBus
  registry: WindowRegistry
  stateStore: WindowStateStore
  initPayloadStore: WindowInitPayloadStore
}

/**
 * 窗口生命周期绑定器。
 */
export class WindowLifecycle {
  private readonly deps: WindowLifecycleDeps

  public constructor(deps: WindowLifecycleDeps) {
    this.deps = deps
  }

  /**
   * 绑定窗口全部生命周期事件。
   *
   * @param window 目标窗口。
   * @param windowId 窗口 ID。
   * @param role 窗口角色。
   * @param config 窗口配置。
   * @returns 清理函数，调用后移除全部监听器。
   */
  public bind(
    window: BrowserWindowLike,
    windowId: number,
    role: WindowRole,
    config: WindowConfig
  ): () => void {
    const { eventBus, registry, stateStore, initPayloadStore } = this.deps
    const handlers: Array<{ event: string; handler: (...args: unknown[]) => void; target: { on: (e: string, h: (...a: unknown[]) => void) => void; off: (e: string, h: (...a: unknown[]) => void) => void } }> = []

    const register = (
      target: { on: (e: string, h: (...a: unknown[]) => void) => void; off: (e: string, h: (...a: unknown[]) => void) => void },
      event: string,
      handler: (...args: unknown[]) => void
    ): void => {
      target.on(event, handler)
      handlers.push({ event, handler, target })
    }

    const emit = (type: WindowEventType, data?: Record<string, unknown>): void => {
      const payload: WindowEventPayload = {
        type,
        windowId,
        role,
        timestamp: Date.now(),
        data
      }
      eventBus.emit(payload)
    }

    register(window, 'ready-to-show', () => {
      emit('window:ready')
    })

    register(window, 'show', () => {
      registry.markFocused(windowId)
      emit('window:shown')
    })

    register(window, 'hide', () => {
      emit('window:hidden')
    })

    register(window, 'focus', () => {
      registry.markFocused(windowId)
      emit('window:focused')
    })

    register(window, 'blur', () => {
      emit('window:blurred')
    })

    register(window, 'move', () => {
      if (window.isDestroyed()) {
        return
      }
      const bounds = window.getBounds()
      emit('window:moved', { bounds })
    })

    register(window, 'resize', () => {
      if (window.isDestroyed()) {
        return
      }
      const bounds = window.getBounds()
      emit('window:resized', { bounds })
    })

    register(window, 'maximize', () => {
      emit('window:maximized')
    })

    register(window, 'unmaximize', () => {
      emit('window:unmaximized')
    })

    register(window, 'minimize', () => {
      emit('window:minimized')
    })

    register(window, 'restore', () => {
      emit('window:restored')
    })

    register(window, 'close', () => {
      if (config.rememberBounds && !window.isDestroyed()) {
        const bounds = window.getBounds()
        stateStore.saveNow(this.stateKey(role, windowId, config), {
          bounds,
          isMaximized: window.isMaximized(),
          isFullScreen: window.isFullScreen(),
          displayId: 0,
          lastRoute: registry.get(windowId)?.route ?? config.route,
          lastFocusedAt: Date.now()
        })
      }
      emit('window:closed')
    })

    register(window, 'closed', () => {
      eventBus.markDestroyed(windowId)
      initPayloadStore.cleanupForWindow(windowId)
      registry.unregister(windowId)
      emit('window:destroyed')
    })

    register(window, 'unresponsive', () => {
      emit('window:unresponsive')
    })

    register(window, 'responsive', () => {
      emit('window:responsive')
    })

    const webContents = window.webContents

    register(webContents, 'render-process-gone', () => {
      emit('window:crashed')
    })

    register(webContents, 'did-fail-load', () => {
      emit('window:load-failed')
    })

    return () => {
      for (const item of handlers) {
        try {
          item.target.off(item.event, item.handler)
        } catch {
          // 窗口已销毁时 off 可能失败，忽略。
        }
      }
      handlers.length = 0
    }
  }

  /**
   * 计算状态存储键。
   *
   * 单例窗口按 role，多实例窗口按 instanceKey。
   *
   * @param role 窗口角色。
   * @param windowId 窗口 ID。
   * @param config 窗口配置。
   * @returns 状态键。
   */
  private stateKey(role: WindowRole, windowId: number, config: WindowConfig): string {
    if (config.singleton) {
      return role
    }
    const entry = this.deps.registry.get(windowId)
    return entry?.instanceKey ?? `${role}:${windowId}`
  }
}
