/**
 * @file 窗口状态持久化存储，将边界、最大化、全屏、显示器、最近路由等保存到 JSON 文件。
 *
 * 单例窗口按 role 存储，多实例窗口按 instanceKey 存储。
 * 保存操作去抖（300ms），关闭前与退出前强制保存。
 * 恢复时校验显示器是否存在，并自动校正离屏与过小尺寸。
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname } from 'path'
import { z } from '../../ipcBus/shared/zod'
import { WINDOW_ERROR_CODES, createWindowError } from '../shared/window-errors'
import type { WindowError } from '../shared/window-errors'
import type { WindowStateRecord, WindowStateMap } from '../shared/window-types'
import {
  autoCorrectBounds,
  getPrimaryDisplay,
  type ScreenLike
} from './window-display'

/** 保存去抖时长（毫秒）。 */
const SAVE_DEBOUNCE_MS = 300

/** 默认窗口边界。 */
const DEFAULT_BOUNDS = { x: 0, y: 0, width: 1024, height: 768 }

/** 状态记录 schema。 */
const stateRecordSchema = z.object({
  bounds: z.object({
    x: z.number({ integer: true }),
    y: z.number({ integer: true }),
    width: z.number({ integer: true, min: 1 }),
    height: z.number({ integer: true, min: 1 })
  }),
  isMaximized: z.boolean(),
  isFullScreen: z.boolean(),
  displayId: z.number({ integer: true }),
  lastRoute: z.string(),
  lastFocusedAt: z.number({ min: 0 })
})

/** 状态映射 schema。 */
const stateMapSchema = z.object({})

/**
 * 构造参数。
 */
export interface WindowStateStoreOptions {
  /** JSON 文件路径。 */
  filePath: string
  /** 注入的 screen 模块。 */
  screen: ScreenLike
}

/**
 * 待保存的状态条目（用于去抖）。
 */
interface PendingSave {
  record: WindowStateRecord
  timer: ReturnType<typeof setTimeout> | null
}

/**
 * 窗口状态存储。
 */
export class WindowStateStore {
  private readonly filePath: string

  private readonly screen: ScreenLike

  /** 内存中的状态映射，key 为 role 或 instanceKey。 */
  private readonly stateMap: WindowStateMap = {}

  /** 去抖保存队列。 */
  private readonly pending = new Map<string, PendingSave>()

  /** 是否已从磁盘加载。 */
  private loaded = false

  public constructor(options: WindowStateStoreOptions) {
    this.filePath = options.filePath
    this.screen = options.screen
  }

  /**
   * 从磁盘加载状态。损坏文件时回退到空映射。
   */
  public load(): void {
    this.loaded = true
    if (!existsSync(this.filePath)) {
      return
    }
    try {
      const raw = readFileSync(this.filePath, 'utf8')
      const parsed: unknown = JSON.parse(raw)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return
      }
      const source = parsed as Record<string, unknown>
      const result: WindowStateMap = {}
      for (const key of Object.keys(source)) {
        const recordResult = stateRecordSchema.safeParse(source[key])
        if (recordResult.success) {
          result[key] = recordResult.data
        }
      }
      for (const key of Object.keys(result)) {
        this.stateMap[key] = result[key]
      }
    } catch {
      // 损坏文件回退到空映射。
    }
  }

  /**
   * 保存窗口状态（去抖）。
   *
   * @param key 状态键（role 或 instanceKey）。
   * @param record 状态记录。
   */
  public save(key: string, record: WindowStateRecord): void {
    const existing = this.pending.get(key)
    if (existing) {
      existing.record = record
      return
    }
    const entry: PendingSave = {
      record,
      timer: null
    }
    entry.timer = setTimeout(() => {
      this.pending.delete(key)
      this.stateMap[key] = record
      this.flushToDisk()
    }, SAVE_DEBOUNCE_MS)
    this.pending.set(key, entry)
  }

  /**
   * 立即保存指定键（关闭前调用）。
   *
   * @param key 状态键。
   * @param record 状态记录。
   */
  public saveNow(key: string, record: WindowStateRecord): void {
    const pending = this.pending.get(key)
    if (pending && pending.timer) {
      clearTimeout(pending.timer)
    }
    this.pending.delete(key)
    this.stateMap[key] = record
    this.flushToDisk()
  }

  /**
   * 保存全部待写入与内存中的状态（退出前调用）。
   */
  public saveAllNow(): void {
    for (const [key, pending] of this.pending.entries()) {
      if (pending.timer) {
        clearTimeout(pending.timer)
      }
      this.stateMap[key] = pending.record
    }
    this.pending.clear()
    this.flushToDisk()
  }

  /**
   * 读取窗口状态，并校正显示器与边界。
   *
   * @param key 状态键。
   * @param minWidth 最小宽度。
   * @param minHeight 最小高度。
   * @param maxWidth 最大宽度（可选）。
   * @param maxHeight 最大高度（可选）。
   * @returns 状态记录，未找到时返回 undefined。
   */
  public restore(
    key: string,
    minWidth: number,
    minHeight: number,
    maxWidth?: number,
    maxHeight?: number
  ): WindowStateRecord | undefined {
    if (!this.loaded) {
      this.load()
    }

    const record = this.stateMap[key]
    if (!record) {
      return undefined
    }

    const displays = this.screen.getAllDisplays()
    const displayExists = displays.some((display) => display.id === record.displayId)
    if (!displayExists) {
      const primary = getPrimaryDisplay(this.screen)
      const centered = {
        x: primary.bounds.x + Math.max(0, Math.floor((primary.bounds.width - record.bounds.width) / 2)),
        y: primary.bounds.y + Math.max(0, Math.floor((primary.bounds.height - record.bounds.height) / 2)),
        width: record.bounds.width,
        height: record.bounds.height
      }
      const corrected = autoCorrectBounds(
        this.screen,
        centered,
        minWidth,
        minHeight,
        maxWidth,
        maxHeight
      )
      return {
        ...record,
        displayId: primary.id,
        bounds: corrected
      }
    }

    const corrected = autoCorrectBounds(
      this.screen,
      record.bounds,
      minWidth,
      minHeight,
      maxWidth,
      maxHeight
    )
    return {
      ...record,
      bounds: corrected
    }
  }

  /**
   * 获取默认状态（无历史记录时使用）。
   *
   * @param width 默认宽度。
   * @param height 默认高度。
   * @param route 初始路由。
   * @returns 默认状态记录。
   */
  public getDefaultState(
    width: number,
    height: number,
    route: string
  ): WindowStateRecord {
    const primary = getPrimaryDisplay(this.screen)
    return {
      bounds: {
        x: primary.bounds.x + Math.max(0, Math.floor((primary.bounds.width - width) / 2)),
        y: primary.bounds.y + Math.max(0, Math.floor((primary.bounds.height - height) / 2)),
        width,
        height
      },
      isMaximized: false,
      isFullScreen: false,
      displayId: primary.id,
      lastRoute: route,
      lastFocusedAt: Date.now()
    }
  }

  /**
   * 清除指定角色的状态。
   *
   * @param key 状态键。
   */
  public clearWindowState(key: string): void {
    const pending = this.pending.get(key)
    if (pending && pending.timer) {
      clearTimeout(pending.timer)
    }
    this.pending.delete(key)
    if (key in this.stateMap) {
      delete this.stateMap[key]
      this.flushToDisk()
    }
  }

  /**
   * 清空全部状态。
   */
  public clearAll(): void {
    for (const pending of this.pending.values()) {
      if (pending.timer) {
        clearTimeout(pending.timer)
      }
    }
    this.pending.clear()
    for (const key of Object.keys(this.stateMap)) {
      delete this.stateMap[key]
    }
    this.flushToDisk()
  }

  /**
   * 销毁存储，取消全部去抖定时器。
   */
  public dispose(): void {
    for (const pending of this.pending.values()) {
      if (pending.timer) {
        clearTimeout(pending.timer)
      }
    }
    this.pending.clear()
  }

  /**
   * 将内存中的状态写入磁盘。
   */
  private flushToDisk(): void {
    try {
      const dir = dirname(this.filePath)
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }
      writeFileSync(this.filePath, JSON.stringify(this.stateMap, null, 2), 'utf8')
    } catch (error) {
      console.error('[window-state-store] failed to persist state:', error)
    }
  }
}

export type { WindowError }
export { DEFAULT_BOUNDS, stateMapSchema }
