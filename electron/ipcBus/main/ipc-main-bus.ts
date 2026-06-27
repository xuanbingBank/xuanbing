/**
 * @file 实现主进程侧统一的 IPC 总线，包含注册、校验、权限、超时、日志与事件分发。
 */

import { randomUUID } from 'node:crypto'
import { eventContracts, requestContracts } from '../shared/contracts'
import { ZodValidationError } from '../shared/zod'
import { createIpcContext, type IpcInvokeEventLike, type IpcRequestContext } from './ipc-context'
import { createIpcError, normalizeIpcError } from './ipc-errors'
import { IpcLogger } from './ipc-logger'
import { createPermissionChecker } from './ipc-permissions'
import { WindowManager } from './window-manager'
import type { AuditRepository } from '../../repositories/audit.repository'

/**
 * 包含校验所需的模型接口。
 */
export interface SchemaLike<TValue> {
  parse(value: unknown): TValue
  safeParse?(value: unknown): { success: true; data: TValue } | { success: false; error: unknown }
}

/**
 * 描述请求契约所需的最小结构。
 */
export interface RequestContractLike<TInput = unknown, TOutput = unknown> {
  channel: string
  description: string
  permission: string
  inputSchema: SchemaLike<TInput>
  outputSchema: SchemaLike<TOutput>
  timeoutMs?: number
  maxPayloadBytes?: number
  rateLimit?: {
    maxCalls: number
    windowMs: number
  }
  audit?: boolean
}

/**
 * 描述事件契约所需的最小结构。
 */
export interface EventContractLike<TPayload = unknown> {
  event: string
  description: string
  direction: 'main-to-renderer' | 'renderer-to-main'
  permission: string
  payloadSchema: SchemaLike<TPayload>
  audit?: boolean
}

/**
 * 描述主进程所需的最小化 ipcMain 接口。
 */
export interface IpcMainLike {
  handle(channel: string, listener: (event: IpcInvokeEventLike, payload: unknown) => Promise<unknown>): void
  removeHandler(channel: string): void
}

/**
 * 描述处理函数的上下文。
 */
export interface IpcHandlerContext<TInput> extends IpcRequestContext {
  input: TInput
}

/**
 * 描述处理函数的可选选项。
 */
export interface IpcHandlerOptions {
  timeoutMs?: number
  maxPayloadBytes?: number
}

/**
 * 描述总线初始化选项。
 */
export interface IpcMainBusOptions {
  ipcMain: IpcMainLike
  logger: IpcLogger
  windowManager: WindowManager
  environment: string
  rolePermissions?: Record<string, string[]>
  auditRepository?: AuditRepository
}

/**
 * 描述订阅上下文。
 */
export interface SubscriptionContext<TInput, TPayload> {
  input: TInput
  windowId: number
  send(payload: TPayload): void
}

/**
 * 主进程内部使用的处理记录。
 */
interface HandlerRecord {
  contract: RequestContractLike<unknown, unknown>
  handler: (context: IpcHandlerContext<unknown>) => Promise<unknown>
  options: IpcHandlerOptions
}

/**
 * 主进程内部使用的订阅记录。
 */
interface SubscriptionRecord {
  contract: EventContractLike<unknown>
  subscribe: (context: SubscriptionContext<unknown, unknown>) => (() => void) | void
}

/**
 * 统一的请求型 IPC 总线的实现。
 */
export class IpcMainBus {
  private readonly ipcMain: IpcMainLike

  private readonly logger: IpcLogger

  private readonly windowManager: WindowManager

  private readonly environment: string

  private readonly auditRepository?: AuditRepository

  private readonly permissionChecker: ReturnType<typeof createPermissionChecker>

  private readonly handlers = new Map<string, HandlerRecord>()

  private readonly eventRegistry = new Map<string, EventContractLike<unknown>>()

  private readonly subscriptions = new Map<string, SubscriptionRecord>()

  private readonly activeSubscriptions = new Map<number, Map<string, Set<() => void>>>()

  private readonly rateLimitState = new Map<string, number[]>()

  private started = false

  /**
   * 初始化 IPC 总线。
   *
   * @param options 总线初始化选项。
   */
  public constructor(options: IpcMainBusOptions) {
    this.ipcMain = options.ipcMain
    this.logger = options.logger
    this.windowManager = options.windowManager
    this.environment = options.environment
    this.auditRepository = options.auditRepository
    this.permissionChecker = createPermissionChecker({
      environment: options.environment,
      rolePermissions: options.rolePermissions ?? {}
    })

    for (const contract of Object.values(eventContracts) as unknown as EventContractLike<unknown>[]) {
      this.eventRegistry.set(contract.event, contract)
    }
  }

  /**
   * 主进程侧必须暴露的统一入口，注册所有请求通道的处理器。
   */
  public async start(): Promise<void> {
    if (this.started) {
      return
    }

    for (const contract of Object.values(requestContracts) as unknown as RequestContractLike<unknown, unknown>[]) {
      this.ipcMain.handle(contract.channel, (event, payload) => this.dispatchInvoke(contract.channel, event, payload))
    }

    this.started = true
  }

  /**
   * 主进程侧释放逻辑，移除所有请求通道的处理器与事件订阅。
   */
  public dispose(): void {
    for (const contract of Object.values(requestContracts) as unknown as RequestContractLike<unknown, unknown>[]) {
      this.ipcMain.removeHandler(contract.channel)
    }

    for (const windowId of [...this.activeSubscriptions.keys()]) {
      this.cleanupWindow(windowId)
    }

    this.handlers.clear()
    this.rateLimitState.clear()
    this.eventRegistry.clear()
    this.subscriptions.clear()

    this.started = false
  }

  /**
   * 注册一个请求处理器。
   *
   * @param contract 请求契约。
   * @param handler 处理器实现。
   * @param options 运行时选项。
   */
  public registerHandler<TInput, TOutput>(
    contract: RequestContractLike<TInput, TOutput>,
    handler: (context: IpcHandlerContext<TInput>) => Promise<TOutput>,
    options: IpcHandlerOptions = {}
  ): void {
    if (this.handlers.has(contract.channel)) {
      throw createIpcError('IPC_CONFLICT', `IPC handler already registered for ${contract.channel}.`)
    }

    this.handlers.set(contract.channel, {
      contract: contract as unknown as RequestContractLike<unknown, unknown>,
      handler: handler as unknown as (context: IpcHandlerContext<unknown>) => Promise<unknown>,
      options
    })
  }

  /**
   * 注销一个请求处理器。
   *
   * @param channel 请求通道名。
   */
  public unregisterHandler(channel: string): void {
    this.handlers.delete(channel)
  }

  /**
   * 注册一个事件契约。
   *
   * @param contract 事件契约。
   */
  public registerEvent<TPayload>(contract: EventContractLike<TPayload>): void {
    this.eventRegistry.set(contract.event, contract as unknown as EventContractLike<unknown>)
  }

  /**
   * 注册一个主进程到渲染进程的订阅源。
   *
   * @param contract 事件契约。
   * @param subscribe 订阅回调函数。
   */
  public registerSubscription<TInput, TPayload>(
    contract: EventContractLike<TPayload>,
    subscribe: (context: SubscriptionContext<TInput, TPayload>) => (() => void) | void
  ): void {
    this.subscriptions.set(contract.event, {
      contract: contract as unknown as EventContractLike<unknown>,
      subscribe: subscribe as unknown as (context: SubscriptionContext<unknown, unknown>) => (() => void) | void
    })
  }

  /**
   * 激活指定窗口上的一个订阅。
   *
   * @param windowId 窗口标识符。
   * @param eventChannel 事件通道名。
   * @param input 订阅输入。
   * @returns 取消订阅的回调函数。
   */
  public activateSubscription<TInput>(windowId: number, eventChannel: string, input: TInput): () => void {
    const subscription = this.subscriptions.get(eventChannel)

    if (!subscription) {
      throw createIpcError('IPC_HANDLER_NOT_FOUND', `Subscription ${eventChannel} is not registered.`)
    }

    const cleanup = subscription.subscribe({
      input: input as unknown,
      windowId,
      send: (payload) => {
        this.sendToWindow(windowId, eventChannel, payload)
      }
    })

    const windowSubscriptions = this.activeSubscriptions.get(windowId) ?? new Map<string, Set<() => void>>()
    const channelSubscriptions = windowSubscriptions.get(eventChannel) ?? new Set<() => void>()
    const unsubscribe = () => {
      cleanup?.()
      channelSubscriptions.delete(unsubscribe)
    }

    channelSubscriptions.add(unsubscribe)
    windowSubscriptions.set(eventChannel, channelSubscriptions)
    this.activeSubscriptions.set(windowId, windowSubscriptions)
    return unsubscribe
  }

  /**
   * 清理某个窗口下的所有订阅。
   *
   * @param windowId 窗口标识符。
   */
  public cleanupWindow(windowId: number): void {
    this.clearRateLimitForWindow(windowId)

    const windowSubscriptions = this.activeSubscriptions.get(windowId)

    if (!windowSubscriptions) {
      return
    }

    for (const callbacks of windowSubscriptions.values()) {
      for (const callback of callbacks.values()) {
        callback()
      }
    }

    this.activeSubscriptions.delete(windowId)
  }

  /**
   * 清理指定窗口的速率限制状态，避免窗口关闭后残留计数导致后续窗口误触发限流。
   *
   * @param windowId 窗口标识符。
   */
  public clearRateLimitForWindow(windowId: number): void {
    const prefix = `${windowId}:`
    for (const key of [...this.rateLimitState.keys()]) {
      if (key.startsWith(prefix)) {
        this.rateLimitState.delete(key)
      }
    }
  }

  /**
   * 判断某个请求通道是否已经注册处理器。
   *
   * @param channel 请求通道名。
   * @returns 是否已注册。
   */
  public hasHandler(channel: string): boolean {
    return this.handlers.has(channel)
  }

  /**
   * 列出当前已注册的请求处理器。
   *
   * @returns 请求通道名列表。
   */
  public listHandlers(): string[] {
    return [...this.handlers.keys()]
  }

  /**
   * 向指定窗口发送事件。
   *
   * @param windowId 窗口标识符。
   * @param eventChannel 事件通道名。
   * @param payload 事件载荷。
   * @returns 是否发送成功。
   */
  public sendToWindow(windowId: number, eventChannel: string, payload: unknown): boolean {
    const contract = this.requireEventContract(eventChannel)
    const parsedPayload = this.parseSchema(contract.payloadSchema, payload, eventChannel, 'output')
    return this.windowManager.sendToWindow(windowId, eventChannel, parsedPayload)
  }

  /**
   * 向所有窗口广播事件。
   *
   * TODO: 当前向所有窗口无差别广播，未按 contract.permission 过滤接收方角色权限。
   * 后续应改为遍历窗口时按 windowManager.getWindowRole(windowId) 与 permissionChecker 过滤，
   * 仅向拥有该事件权限的窗口投递。对 task:failed / windowCreated 等含敏感信息的事件尤为重要。
   *
   * @param eventChannel 事件通道名。
   * @param payload 事件载荷。
   * @returns 实际送达的窗口数量。
   */
  public broadcast(eventChannel: string, payload: unknown): number {
    const contract = this.requireEventContract(eventChannel)
    const parsedPayload = this.parseSchema(contract.payloadSchema, payload, eventChannel, 'output')
    return this.windowManager.broadcast(eventChannel, parsedPayload)
  }

  /**
   * 向当前聚焦窗口发送事件。
   *
   * @param eventChannel 事件通道名。
   * @param payload 事件载荷。
   * @returns 是否发送成功。
   */
  public sendToFocusedWindow(eventChannel: string, payload: unknown): boolean {
    const contract = this.requireEventContract(eventChannel)
    const parsedPayload = this.parseSchema(contract.payloadSchema, payload, eventChannel, 'output')
    return this.windowManager.sendToFocusedWindow(eventChannel, parsedPayload)
  }

  /**
   * 执行一次统一的请求分发调用。
   *
   * @param channel 请求通道名。
   * @param event 原始 Electron 事件。
   * @param rawInput 原始请求载荷。
   * @returns 统一结果结构。
   */
  private async dispatchInvoke(channel: string, event: IpcInvokeEventLike, rawInput: unknown): Promise<unknown> {
    const requestId = this.createRequestId()
    const startedAt = Date.now()
    let payloadSize = 0
    let timedOut = false
    let aborted = false

    try {
      payloadSize = this.measurePayloadBytes(rawInput)
      const record = this.handlers.get(channel)

      if (!record) {
        throw createIpcError('IPC_HANDLER_NOT_FOUND', `No IPC handler is registered for ${channel}.`)
      }

      const senderWindowId = this.windowManager.getWindowIdBySenderId(event.sender?.id)
      const windowRole = this.windowManager.getWindowRole(senderWindowId)

      if (!this.isAllowedSenderFrame(event.senderFrame?.url)) {
        throw createIpcError('IPC_FORBIDDEN', 'Sender frame not allowed.')
      }

      const permissionDecision = this.permissionChecker({
        contract: record.contract,
        senderWindowId,
        windowRole
      })

      if (!permissionDecision.allowed) {
        throw createIpcError('IPC_FORBIDDEN', `The renderer is not allowed to call ${channel}.`, {
          reason: permissionDecision.reason
        })
      }

      const payloadLimit = record.options.maxPayloadBytes ?? record.contract.maxPayloadBytes

      if (payloadLimit !== undefined && payloadSize > payloadLimit) {
        throw createIpcError('IPC_PAYLOAD_TOO_LARGE', `The request payload for ${channel} is too large.`, {
          payloadSize,
          payloadLimit
        })
      }

      this.enforceRateLimit(channel, senderWindowId, record.contract)

      const parsedInput = this.parseSchema(record.contract.inputSchema, rawInput, channel, 'input')
      const controller = new AbortController()
      const timeoutMs = record.options.timeoutMs ?? record.contract.timeoutMs ?? 15_000
      const context = createIpcContext({
        channel,
        event,
        logger: this.logger,
        requestId,
        signal: controller.signal,
        startedAt,
        windowManager: this.windowManager
      })

      const timer = setTimeout(() => {
        timedOut = true
        controller.abort()
      }, timeoutMs)

      let onAbort: (() => void) | undefined

      try {
        const handlerPromise = record.handler({
          ...context,
          input: parsedInput
        })
        // TODO: 超时后 handler 后台 reject 仅 console.warn，未并入 cause；
        // 后续应将后台 reject 并入 cause，便于排障时还原真实失败原因。
        handlerPromise.catch((err) => {
          console.warn('[ipc] handler rejected after timeout/complete', channel, err)
        })

        const rawOutput = await Promise.race([
          handlerPromise,
          new Promise<never>((_resolve, reject) => {
            onAbort = () => {
              if (timedOut) {
                reject(createIpcError('IPC_TIMEOUT', `${channel} timed out after ${timeoutMs}ms.`, undefined, 'timeout', true))
                return
              }

              aborted = true
              reject(createIpcError('IPC_ABORTED', `${channel} was canceled.`, undefined, 'abort', true))
            }
            controller.signal.addEventListener('abort', onAbort, { once: true })
          })
        ])

        const parsedOutput = this.parseSchema(record.contract.outputSchema, rawOutput, channel, 'output')

        return this.buildSuccessResult(parsedOutput, {
          requestId,
          startedAt,
          payloadSize,
          channel,
          senderWindowId
        })
      } finally {
        clearTimeout(timer)
        if (onAbort) {
          controller.signal.removeEventListener('abort', onAbort)
        }
      }
    } catch (error) {
      const normalized = normalizeIpcError(
        timedOut
          ? createIpcError('IPC_TIMEOUT', `${channel} timed out.`, undefined, error instanceof Error ? error.message : String(error), true)
          : error,
        this.environment
      )

      const errorResult = this.buildErrorResult(normalized, {
        requestId,
        startedAt,
        payloadSize,
        channel,
        senderWindowId: this.windowManager.getWindowIdBySenderId(event.sender?.id),
        timedOut,
        aborted
      })

      this.recordAuditIfNeeded(this.handlers.get(channel), {
        channel,
        senderWindowId: this.windowManager.getWindowIdBySenderId(event.sender?.id),
        requestId,
        result: 'failure',
        errorCode: normalized.code
      })

      return errorResult
    }
  }

  /**
   * 判断发起 IPC 调用的帧 URL 是否处于允许的源白名单内。
   *
   * 允许的源包括 `app://`、`file://` 以及 dev 模式下的本地 dev server
   * (`http://localhost` / `http://127.0.0.1`)。`undefined` 或其他来源一律拒绝，
   * 防止跨帧越权调用受限 handler。
   *
   * @param url 发起帧的 URL。
   * @returns 是否允许该帧发起调用。
   */
  private isAllowedSenderFrame(url: string | undefined): boolean {
    if (url === undefined) {
      return false
    }

    // 生产环境仅放行应用自有源（app:// / file://），本地 dev server 源仅在非生产环境放行，
    // 避免生产环境 webContents 被导航到本地恶意服务后越权调用受限 IPC。
    if (this.environment === 'production') {
      return url.startsWith('file://') || url.startsWith('app://')
    }

    return (
      url.startsWith('file://') ||
      url.startsWith('app://') ||
      url.startsWith('http://localhost') ||
      url.startsWith('http://127.0.0.1')
    )
  }

  /**
   * 在契约标记 audit 为 true 时，向 audit_logs 记录一次 IPC 调用审计。
   *
   * 仅在 dispatchInvoke 成功/失败分支末尾调用，不改变既有控制流；审计写入失败仅打印
   * 告警，不会影响业务返回值。未注入 auditRepository 或契约未开启 audit 时跳过。
   *
   * @param record 当前通道的处理器记录（未注册时为 undefined，跳过审计）。
   * @param context 审计上下文（通道、发送窗口、请求 ID、结果与错误码）。
   */
  private recordAuditIfNeeded(
    record: HandlerRecord | undefined,
    context: {
      channel: string
      senderWindowId: number | undefined
      requestId: string
      result: 'success' | 'failure'
      errorCode?: string
    }
  ): void {
    if (!this.auditRepository || !record?.contract.audit) {
      return
    }

    try {
      this.auditRepository.create({
        actorType: 'system',
        actorId: context.senderWindowId !== undefined ? `window:${context.senderWindowId}` : 'ipc-bus',
        action: 'invoke',
        entityType: 'ipc',
        entityId: context.channel,
        metadata: {
          requestId: context.requestId,
          senderWindowId: context.senderWindowId,
          result: context.result,
          errorCode: context.errorCode
        }
      })
    } catch (auditError) {
      console.warn('[ipc] audit log failed', context.channel, auditError)
    }
  }

  /**
   * 使用契约模型校验输入或输出。
   *
   * @param schema 校验模型。
   * @param value 待校验值。
   * @param channel 当前通道名。
   * @param phase 当前阶段。
   * @returns 校验后的值。
   */
  private parseSchema<TValue>(schema: SchemaLike<TValue>, value: unknown, channel: string, phase: 'input' | 'output'): TValue {
    try {
      if (typeof schema.safeParse === 'function') {
        const result = schema.safeParse(value)

        if (!result.success) {
          throw result.error
        }

        return result.data
      }

      return schema.parse(value)
    } catch (error) {
      if (error instanceof ZodValidationError) {
        throw createIpcError('IPC_VALIDATION_ERROR', `The ${phase} for ${channel} is invalid.`, error)
      }

      throw error
    }
  }

  /**
   * 执行请求速率限制判断。
   *
   * @param channel 当前通道名。
   * @param senderWindowId 发起调用的窗口标识符。
   * @param contract 请求契约。
   */
  private enforceRateLimit(channel: string, senderWindowId: number | undefined, contract: RequestContractLike<unknown, unknown>): void {
    if (!contract.rateLimit || senderWindowId === undefined) {
      return
    }

    const key = `${senderWindowId}:${channel}`
    const now = Date.now()
    const windowStart = now - contract.rateLimit.windowMs
    const history = (this.rateLimitState.get(key) ?? []).filter((timestamp) => timestamp >= windowStart)

    if (history.length >= contract.rateLimit.maxCalls) {
      throw createIpcError('IPC_RATE_LIMITED', `Too many ${channel} calls were made.`, undefined, 'rate-limit', true)
    }

    history.push(now)
    this.rateLimitState.set(key, history)
  }

  /**
   * 获取事件契约，未注册时抛出标准错误。
   *
   * @param eventChannel 事件通道名。
   * @returns 对应事件契约。
   */
  private requireEventContract(eventChannel: string): EventContractLike<unknown> {
    const contract = this.eventRegistry.get(eventChannel)

    if (!contract) {
      throw createIpcError('IPC_UNKNOWN_CHANNEL', `Unknown event channel ${eventChannel}.`)
    }

    return contract
  }

  /**
   * 计算载荷序列化后的近似字节大小。
   *
   * @param payload 原始载荷。
   * @returns 近似字节大小。
   */
  private measurePayloadBytes(payload: unknown): number {
    if (payload === undefined) {
      return 0
    }

    try {
      return new TextEncoder().encode(JSON.stringify(payload)).length
    } catch (error) {
      throw createIpcError('IPC_PAYLOAD_UNSERIALIZABLE', 'The request payload cannot be serialized.', error)
    }
  }

  /**
   * 生成请求标识符。
   *
   * @returns 请求标识符字符串。
   */
  private createRequestId(): string {
    try {
      return randomUUID()
    } catch {
      return `ipc-${Date.now()}-${Math.random().toString(16).slice(2)}`
    }
  }

  /**
   * 构造成功响应并写日志。
   *
   * @param data 成功数据。
   * @param metrics 日志元信息。
   * @returns 统一成功结果。
   */
  private buildSuccessResult<TValue>(data: TValue, metrics: {
    requestId: string
    startedAt: number
    payloadSize: number
    channel: string
    senderWindowId?: number
  }): { ok: true; data: TValue; meta: { requestId: string; durationMs: number } } {
    const durationMs = Date.now() - metrics.startedAt

    this.logger.log({
      requestId: metrics.requestId,
      channel: metrics.channel,
      senderWindowId: metrics.senderWindowId,
      durationMs,
      result: 'success',
      payloadSize: metrics.payloadSize,
      timestamp: new Date(metrics.startedAt).toISOString(),
      environment: this.environment,
      timedOut: false,
      aborted: false
    })

    return {
      ok: true,
      data,
      meta: {
        requestId: metrics.requestId,
        durationMs
      }
    }
  }

  /**
   * 构造失败响应并写日志。
   *
   * @param error 标准错误对象。
   * @param metrics 日志元信息。
   * @returns 统一失败结果。
   */
  private buildErrorResult(error: { code: string; message: string; detail?: unknown; cause?: string; retryable?: boolean }, metrics: {
    requestId: string
    startedAt: number
    payloadSize: number
    channel: string
    senderWindowId?: number
    timedOut: boolean
    aborted: boolean
  }): { ok: false; error: typeof error; meta: { requestId: string; durationMs: number } } {
    const durationMs = Date.now() - metrics.startedAt

    this.logger.log({
      requestId: metrics.requestId,
      channel: metrics.channel,
      senderWindowId: metrics.senderWindowId,
      durationMs,
      result: 'failure',
      errorCode: error.code,
      payloadSize: metrics.payloadSize,
      timestamp: new Date(metrics.startedAt).toISOString(),
      environment: this.environment,
      timedOut: metrics.timedOut,
      aborted: metrics.aborted
    })

    return {
      ok: false,
      error,
      meta: {
        requestId: metrics.requestId,
        durationMs
      }
    }
  }
}

