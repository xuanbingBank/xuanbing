/**
 * @file 窗口初始化数据存储，使用一次性令牌在主进程与渲染进程间安全传递 payload。
 *
 * 渲染进程通过 token 拉取数据，仅允许对应 windowId 读取，且只能读一次。
 * 数据有过期时间，过期或被消费后自动清理。
 */

import { randomUUID } from 'crypto'
import { z } from '../../ipcBus/shared/zod'
import { WINDOW_ROLES } from '../shared/window-types'
import { WINDOW_ERROR_CODES, createWindowError } from '../shared/window-errors'
import type { WindowError } from '../shared/window-errors'
import type { WindowRole } from '../shared/window-types'

/**
 * 存储条目结构。
 */
export interface StoredInitPayloadEntry {
  token: string
  windowId: number
  role: WindowRole
  payload: unknown
  createdAt: number
  expiresAt: number
  consumed: boolean
}

/**
 * 构造参数。
 */
export interface WindowInitPayloadStoreOptions {
  /** 单条 payload 最大字节数，默认 256KB。 */
  maxPayloadBytes?: number
  /** 过期时间（毫秒），默认 60 秒。 */
  ttlMs?: number
}

/**
 * payload 读取结果。
 */
export interface InitPayloadReadResult {
  token: string
  payload: unknown
  role: WindowRole
}

/** 默认单条 payload 最大字节数。 */
const DEFAULT_MAX_PAYLOAD_BYTES = 256 * 1024

/** 默认过期时间。 */
const DEFAULT_TTL_MS = 60_000

/** 清理周期。 */
const CLEANUP_INTERVAL_MS = 30_000

/** token schema。 */
const tokenSchema = z.string({ minLength: 1 })

/** windowId schema。 */
const windowIdSchema = z.number({ integer: true, min: 1 })

/** role schema。 */
const roleSchema = z.enum(WINDOW_ROLES)

/**
 * 计算值的近似字节大小。
 *
 * @param value 待计算值。
 * @returns 字节大小。
 */
function approximateByteSize(value: unknown): number {
  try {
    return Buffer.byteLength(JSON.stringify(value), 'utf8')
  } catch {
    return Infinity
  }
}

/**
 * 窗口初始化数据存储。
 */
export class WindowInitPayloadStore {
  private readonly entries = new Map<string, StoredInitPayloadEntry>()

  private readonly maxPayloadBytes: number

  private readonly ttlMs: number

  private cleanupTimer: ReturnType<typeof setInterval> | null = null

  public constructor(options: WindowInitPayloadStoreOptions = {}) {
    this.maxPayloadBytes = options.maxPayloadBytes ?? DEFAULT_MAX_PAYLOAD_BYTES
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS
  }

  /**
   * 启动过期清理定时器。
   */
  public startCleanup(): void {
    if (this.cleanupTimer) {
      return
    }
    this.cleanupTimer = setInterval(() => {
      this.purgeExpired()
    }, CLEANUP_INTERVAL_MS)
    if (this.cleanupTimer && typeof this.cleanupTimer === 'object' && 'unref' in this.cleanupTimer) {
      ;(this.cleanupTimer as { unref: () => void }).unref()
    }
  }

  /**
   * 停止过期清理定时器。
   */
  public stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
  }

  /**
   * 为窗口生成一次性 token 并存储 payload。
   *
   * @param windowId 目标窗口 ID。
   * @param role 窗口角色。
   * @param payload 初始化数据。
   * @returns 一次性 token。
   * @throws WindowError payload 过大或参数非法时抛出。
   */
  public create(windowId: number, role: WindowRole, payload: unknown): string {
    const windowIdResult = windowIdSchema.safeParse(windowId)
    if (!windowIdResult.success) {
      throw createWindowError(
        WINDOW_ERROR_CODES.validationError,
        `Invalid windowId: ${windowIdResult.error.message}`
      )
    }

    const roleResult = roleSchema.safeParse(role)
    if (!roleResult.success) {
      throw createWindowError(
        WINDOW_ERROR_CODES.validationError,
        `Invalid role: ${roleResult.error.message}`
      )
    }

    const size = approximateByteSize(payload)
    if (size > this.maxPayloadBytes) {
      throw createWindowError(
        WINDOW_ERROR_CODES.payloadTooLarge,
        `Payload size ${size} bytes exceeds limit ${this.maxPayloadBytes} bytes.`
      )
    }

    const token = randomUUID()
    const now = Date.now()
    const entry: StoredInitPayloadEntry = {
      token,
      windowId: windowIdResult.data,
      role: roleResult.data,
      payload,
      createdAt: now,
      expiresAt: now + this.ttlMs,
      consumed: false
    }
    this.entries.set(token, entry)
    return token
  }

  /**
   * 读取并消费 payload（一次性）。
   *
   * @param token 令牌。
   * @param windowId 请求读取的窗口 ID，必须与存储时一致。
   * @returns payload 读取结果。
   * @throws WindowError token 不存在、过期、已被消费或 windowId 不匹配时抛出。
   */
  public consume(token: string, windowId: number): InitPayloadReadResult {
    const tokenResult = tokenSchema.safeParse(token)
    if (!tokenResult.success) {
      throw createWindowError(
        WINDOW_ERROR_CODES.initPayloadNotFound,
        'Token must be a non-empty string.'
      )
    }

    const windowIdResult = windowIdSchema.safeParse(windowId)
    if (!windowIdResult.success) {
      throw createWindowError(
        WINDOW_ERROR_CODES.validationError,
        `Invalid windowId: ${windowIdResult.error.message}`
      )
    }

    const entry = this.entries.get(tokenResult.data)
    if (!entry) {
      throw createWindowError(
        WINDOW_ERROR_CODES.initPayloadNotFound,
        `Init payload token "${token}" not found.`
      )
    }

    if (entry.windowId !== windowIdResult.data) {
      throw createWindowError(
        WINDOW_ERROR_CODES.forbidden,
        `windowId ${windowIdResult.data} is not allowed to read payload for windowId ${entry.windowId}.`
      )
    }

    const now = Date.now()
    if (now >= entry.expiresAt) {
      this.entries.delete(token)
      throw createWindowError(
        WINDOW_ERROR_CODES.initPayloadExpired,
        `Init payload token "${token}" has expired.`
      )
    }

    if (entry.consumed) {
      this.entries.delete(token)
      throw createWindowError(
        WINDOW_ERROR_CODES.initPayloadNotFound,
        `Init payload token "${token}" has already been consumed.`
      )
    }

    entry.consumed = true
    const result: InitPayloadReadResult = {
      token: entry.token,
      payload: entry.payload,
      role: entry.role
    }
    this.entries.delete(token)
    return result
  }

  /**
   * 仅查看 payload（不消费），用于调试。
   *
   * @param token 令牌。
   * @returns 存储条目（不含 payload 引用计数变化），未找到时返回 undefined。
   */
  public peek(token: string): StoredInitPayloadEntry | undefined {
    const entry = this.entries.get(token)
    if (!entry) {
      return undefined
    }
    return { ...entry, payload: entry.payload }
  }

  /**
   * 清理指定窗口的全部 payload。
   *
   * @param windowId 窗口 ID。
   */
  public cleanupForWindow(windowId: number): void {
    for (const [token, entry] of this.entries.entries()) {
      if (entry.windowId === windowId) {
        this.entries.delete(token)
      }
    }
  }

  /**
   * 清理全部已过期条目。
   */
  public purgeExpired(): void {
    const now = Date.now()
    for (const [token, entry] of this.entries.entries()) {
      if (now >= entry.expiresAt || entry.consumed) {
        this.entries.delete(token)
      }
    }
  }

  /**
   * 清空全部存储。
   */
  public clear(): void {
    this.entries.clear()
  }

  /**
   * 获取当前存储条目数量。
   *
   * @returns 条目数量。
   */
  public size(): number {
    return this.entries.size
  }
}

export type { WindowError }
