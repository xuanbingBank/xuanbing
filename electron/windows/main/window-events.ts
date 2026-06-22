/**
 * @file 窗口生命周期事件总线，提供去耦的事件订阅与发布能力。
 *
 * 高频事件（move/resize）会被去抖，避免渲染进程被淹没。
 * 已销毁窗口的事件不会被发出。
 */

import { z } from '../../ipcBus/shared/zod'
import { WINDOW_ROLES } from '../shared/window-types'
import { WINDOW_ERROR_CODES, createWindowError } from '../shared/window-errors'
import type { WindowError } from '../shared/window-errors'
import type {
  WindowEventPayload,
  WindowEventType
} from '../shared/window-types'

/** 高频事件去抖时长（毫秒）。 */
const HIGH_FREQ_DEBOUNCE_MS = 150

/** 需要去抖的事件类型集合。 */
const DEBOUNCED_EVENTS: ReadonlySet<WindowEventType> = new Set<WindowEventType>([
  'window:moved',
  'window:resized'
])

/** 最近事件保留数量。 */
const RECENT_EVENTS_LIMIT = 100

/** 事件 payload schema。 */
const eventPayloadSchema = z.object({
  type: z.enum([
    'window:created',
    'window:ready',
    'window:shown',
    'window:hidden',
    'window:focused',
    'window:blurred',
    'window:moved',
    'window:resized',
    'window:maximized',
    'window:unmaximized',
    'window:minimized',
    'window:restored',
    'window:closed',
    'window:destroyed',
    'window:route-changed',
    'window:title-changed',
    'window:crashed',
    'window:unresponsive',
    'window:responsive',
    'window:load-failed'
  ]),
  windowId: z.number({ integer: true, min: 1 }),
  role: z.enum(WINDOW_ROLES),
  timestamp: z.number({ min: 0 }),
  data: z.object({}).optional()
})

/** 事件处理器类型。 */
export type WindowEventHandler = (payload: WindowEventPayload) => void

/** 待去抖的事件条目。 */
interface PendingDebouncedEvent {
  payload: WindowEventPayload
  timer: ReturnType<typeof setTimeout> | null
}

/**
 * 窗口事件总线。
 */
export class WindowEventBus {
  private readonly handlers = new Map<WindowEventType, Set<WindowEventHandler>>()

  private readonly recentEvents: WindowEventPayload[] = []

  private readonly debounced = new Map<string, PendingDebouncedEvent>()

  /** 已销毁窗口集合，用于阻止后续事件。 */
  private readonly destroyedWindowIds = new Set<number>()

  /**
   * 订阅事件。
   *
   * @param type 事件类型。
   * @param handler 处理器。
   * @returns 取消订阅函数。
   */
  public on(type: WindowEventType, handler: WindowEventHandler): () => void {
    let set = this.handlers.get(type)
    if (!set) {
      set = new Set<WindowEventHandler>()
      this.handlers.set(type, set)
    }
    set.add(handler)
    return () => this.off(type, handler)
  }

  /**
   * 取消订阅。
   *
   * @param type 事件类型。
   * @param handler 处理器。
   */
  public off(type: WindowEventType, handler: WindowEventHandler): void {
    const set = this.handlers.get(type)
    if (set) {
      set.delete(handler)
      if (set.size === 0) {
        this.handlers.delete(type)
      }
    }
  }

  /**
   * 发布事件。
   *
   * @param payload 事件负载。
   * @throws WindowError 校验失败时抛出。
   */
  public emit(payload: WindowEventPayload): void {
    const result = eventPayloadSchema.safeParse(payload)
    if (!result.success) {
      throw createWindowError(
        WINDOW_ERROR_CODES.validationError,
        `Invalid window event payload: ${result.error.message}`
      )
    }

    const validated = result.data

    if (validated.type === 'window:destroyed') {
      this.destroyedWindowIds.add(validated.windowId)
    }

    if (this.destroyedWindowIds.has(validated.windowId) && validated.type !== 'window:destroyed') {
      return
    }

    if (DEBOUNCED_EVENTS.has(validated.type)) {
      this.scheduleDebounced(validated)
      return
    }

    this.dispatch(validated)
  }

  /**
   * 标记窗口已销毁，阻止后续事件。
   *
   * @param windowId 窗口 ID。
   */
  public markDestroyed(windowId: number): void {
    this.destroyedWindowIds.add(windowId)
    this.cancelDebouncedForWindow(windowId)
  }

  /**
   * 清除窗口的销毁标记（用于复用 ID 等极端场景）。
   *
   * @param windowId 窗口 ID。
   */
  public unmarkDestroyed(windowId: number): void {
    this.destroyedWindowIds.delete(windowId)
  }

  /**
   * 获取最近事件列表（调试用）。
   *
   * @returns 事件副本。
   */
  public getRecentEvents(): WindowEventPayload[] {
    return this.recentEvents.map((event) => ({ ...event }))
  }

  /**
   * 清空全部订阅与缓存。
   */
  public dispose(): void {
    for (const pending of this.debounced.values()) {
      if (pending.timer) {
        clearTimeout(pending.timer)
      }
    }
    this.debounced.clear()
    this.handlers.clear()
    this.recentEvents.length = 0
    this.destroyedWindowIds.clear()
  }

  /**
   * 调度去抖事件。
   *
   * @param payload 事件负载。
   */
  private scheduleDebounced(payload: WindowEventPayload): void {
    const key = `${payload.type}:${payload.windowId}`
    const existing = this.debounced.get(key)
    if (existing) {
      existing.payload = payload
      return
    }

    const entry: PendingDebouncedEvent = {
      payload,
      timer: null
    }
    entry.timer = setTimeout(() => {
      this.debounced.delete(key)
      this.dispatch(entry.payload)
    }, HIGH_FREQ_DEBOUNCE_MS)
    this.debounced.set(key, entry)
  }

  /**
   * 取消指定窗口的全部去抖事件。
   *
   * @param windowId 窗口 ID。
   */
  private cancelDebouncedForWindow(windowId: number): void {
    for (const [key, entry] of this.debounced.entries()) {
      if (entry.payload.windowId === windowId) {
        if (entry.timer) {
          clearTimeout(entry.timer)
        }
        this.debounced.delete(key)
      }
    }
  }

  /**
   * 实际派发事件给订阅者。
   *
   * @param payload 事件负载。
   */
  private dispatch(payload: WindowEventPayload): void {
    this.recordRecent(payload)
    const set = this.handlers.get(payload.type)
    if (!set) {
      return
    }
    for (const handler of set) {
      try {
        handler(payload)
      } catch (error) {
        console.error('[window-event-bus] handler error:', error)
      }
    }
  }

  /**
   * 记录最近事件。
   *
   * @param payload 事件负载。
   */
  private recordRecent(payload: WindowEventPayload): void {
    this.recentEvents.push(payload)
    if (this.recentEvents.length > RECENT_EVENTS_LIMIT) {
      this.recentEvents.shift()
    }
  }
}

export type { WindowError }
