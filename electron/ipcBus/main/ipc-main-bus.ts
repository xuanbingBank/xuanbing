/**
 * @file 实现主进程侧统一 IPC 总线，负责注册、校验、权限、超时、日志和事件下发。
 */

import { randomUUID } from 'node:crypto'
import { eventContracts, requestContracts } from '../shared/contracts'
import { ZodValidationError } from '../shared/zod'
import { createIpcContext, type IpcInvokeEventLike, type IpcRequestContext } from './ipc-context'
import { createIpcError, normalizeIpcError } from './ipc-errors'
import { IpcLogger } from './ipc-logger'
import { createPermissionChecker } from './ipc-permissions'
import { WindowManager } from './window-manager'

/**
 * 定义最小可用的模型接口。
 */
export interface SchemaLike<TValue> {
  parse(value: unknown): TValue
  safeParse?(value: unknown): { success: true; data: TValue } | { success: false; error: unknown }
}

/**
 * 定义请求契约的最小结构。
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
 * 定义事件契约的最小结构。
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
 * 定义主进程适配层所需的最小 ipcMain 接口。
 */
export interface IpcMainLike {
  handle(channel: string, listener: (event: IpcInvokeEventLike, payload: unknown) => Promise<unknown>): void
  removeHandler(channel: string): void
}

/**
 * 定义处理器上下文。
 */
export interface IpcHandlerContext<TInput> extends IpcRequestContext {
  input: TInput
}

/**
 * 定义处理器运行时选项。
 */
export interface IpcHandlerOptions {
  timeoutMs?: number
  maxPayloadBytes?: number
}

/**
 * 定义总线初始化配置。
 */
export interface IpcMainBusOptions {
  ipcMain: IpcMainLike
  logger: IpcLogger
  windowManager: WindowManager
  environment: string
  rolePermissions?: Record<string, string[]>
}

/**
 * 定义订阅上下文。
 */
export interface SubscriptionContext<TInput, TPayload> {
  input: TInput
  windowId: number
  send(payload: TPayload): void
}

/**
 * 定义内部处理器记录。
 */
interface HandlerRecord {
  contract: RequestContractLike<unknown, unknown>
  handler: (context: IpcHandlerContext<unknown>) => Promise<unknown>
  options: IpcHandlerOptions
}

/**
 * 定义内部订阅记录。
 */
interface SubscriptionRecord {
  contract: EventContractLike<unknown>
  subscribe: (context: SubscriptionContext<unknown, unknown>) => (() => void) | void
}

/**
 * 统一治理主进程 IPC 的总线实现。
 */
export class IpcMainBus {
  private readonly ipcMain: IpcMainLike

  private readonly logger: IpcLogger

  private readonly windowManager: WindowManager

  private readonly environment: string

  private readonly permissionChecker: ReturnType<typeof createPermissionChecker>

  private readonly handlers = new Map<string, HandlerRecord>()

  private readonly eventRegistry = new Map<string, EventContractLike<unknown>>()

  private readonly subscriptions = new Map<string, SubscriptionRecord>()

  private readonly activeSubscriptions = new Map<number, Map<string, Set<() => void>>>()

  private readonly rateLimitState = new Map<string, number[]>()

  private started = false

  /**
   * 初始化主进程总线。
   *
   * @param options 总线初始化配置。
   */
  public constructor(options: IpcMainBusOptions) {
    this.ipcMain = options.ipcMain
    this.logger = options.logger
    this.windowManager = options.windowManager
    this.environment = options.environment
    this.permissionChecker = createPermissionChecker({
      environment: options.environment,
      rolePermissions: options.rolePermissions ?? {}
    })

    for (const contract of Object.values(eventContracts) as unknown as EventContractLike<unknown>[]) {
      this.eventRegistry.set(contract.event, contract)
    }
  }

  /**
   * 启动总线并为所有声明过的请求通道挂载统一入口。
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
   * 销毁总线并清理请求处理器与订阅。
   */
  public dispose(): void {
    for (const contract of Object.values(requestContracts) as unknown as RequestContractLike<unknown, unknown>[]) {
      this.ipcMain.removeHandler(contract.channel)
    }

    for (const windowId of [...this.activeSubscriptions.keys()]) {
      this.cleanupWindow(windowId)
    }

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
   * @param channel 请求通道。
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
   * @param subscribe 订阅启动函数。
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
   * @param windowId 窗口标识。
   * @param eventChannel 事件通道。
   * @param input 订阅输入。
   * @returns 取消订阅函数。
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
   * @param windowId 窗口标识。
   */
  public cleanupWindow(windowId: number): void {
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
   * 判断某个请求通道是否已经注册处理器。
   *
   * @param channel 请求通道。
   * @returns 是否已注册。
   */
  public hasHandler(channel: string): boolean {
    return this.handlers.has(channel)
  }

  /**
   * 列出当前所有已注册请求处理器。
   *
   * @returns 请求通道列表。
   */
  public listHandlers(): string[] {
    return [...this.handlers.keys()]
  }

  /**
   * 向指定窗口发送校验后的事件。
   *
   * @param windowId 窗口标识。
   * @param eventChannel 事件通道。
   * @param payload 事件载荷。
   * @returns 是否发送成功。
   */
  public sendToWindow(windowId: number, eventChannel: string, payload: unknown): boolean {
    const contract = this.requireEventContract(eventChannel)
    const parsedPayload = this.parseSchema(contract.payloadSchema, payload, eventChannel, 'output')
    return this.windowManager.sendToWindow(windowId, eventChannel, parsedPayload)
  }

  /**
   * 向所有窗口广播校验后的事件。
   *
   * @param eventChannel 事件通道。
   * @param payload 事件载荷。
   * @returns 实际送达的窗口数量。
   */
  public broadcast(eventChannel: string, payload: unknown): number {
    const contract = this.requireEventContract(eventChannel)
    const parsedPayload = this.parseSchema(contract.payloadSchema, payload, eventChannel, 'output')
    return this.windowManager.broadcast(eventChannel, parsedPayload)
  }

  /**
   * 向当前焦点窗口发送事件。
   *
   * @param eventChannel 事件通道。
   * @param payload 事件载荷。
   * @returns 是否发送成功。
   */
  public sendToFocusedWindow(eventChannel: string, payload: unknown): boolean {
    const contract = this.requireEventContract(eventChannel)
    const parsedPayload = this.parseSchema(contract.payloadSchema, payload, eventChannel, 'output')
    return this.windowManager.sendToFocusedWindow(eventChannel, parsedPayload)
  }

  /**
   * 执行一次统一治理过的请求调用。
   *
   * @param channel 请求通道。
   * @param event 原始 Electron 事件。
   * @param rawInput 原始输入载荷。
   * @returns 统一结果结构。
   */
  private async dispatchInvoke(channel: string, event: IpcInvokeEventLike, rawInput: unknown): Promise<unknown> {
    const requestId = this.createRequestId()
    const startedAt = Date.now()
    const payloadSize = this.measurePayloadBytes(rawInput)
    let timedOut = false
    let aborted = false

    try {
      const record = this.handlers.get(channel)

      if (!record) {
        throw createIpcError('IPC_HANDLER_NOT_FOUND', `No IPC handler is registered for ${channel}.`)
      }

      const senderWindowId = this.windowManager.getWindowIdBySenderId(event.sender?.id)
      const windowRole = this.windowManager.getWindowRole(senderWindowId)
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

      try {
        const rawOutput = await Promise.race([
          record.handler({
            ...context,
            input: parsedInput
          }),
          new Promise<never>((_resolve, reject) => {
            controller.signal.addEventListener(
              'abort',
              () => {
                if (timedOut) {
                  reject(createIpcError('IPC_TIMEOUT', `${channel} timed out after ${timeoutMs}ms.`, undefined, 'timeout', true))
                  return
                }

                aborted = true
                reject(createIpcError('IPC_ABORTED', `${channel} was canceled.`, undefined, 'abort', true))
              },
              { once: true }
            )
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
      }
    } catch (error) {
      const normalized = normalizeIpcError(
        timedOut
          ? createIpcError('IPC_TIMEOUT', `${channel} timed out.`, undefined, 'timeout', true)
          : error,
        this.environment
      )

      return this.buildErrorResult(normalized, {
        requestId,
        startedAt,
        payloadSize,
        channel,
        senderWindowId: this.windowManager.getWindowIdBySenderId(event.sender?.id),
        timedOut,
        aborted
      })
    }
  }

  /**
   * 使用契约模型校验输入或输出。
   *
   * @param schema 校验模型。
   * @param value 待校验值。
   * @param channel 当前通道。
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
      if (error instanceof ZodValidationError || error instanceof Error) {
        throw createIpcError('IPC_VALIDATION_ERROR', `The ${phase} for ${channel} is invalid.`, error)
      }

      throw error
    }
  }

  /**
   * 执行速率限制判定。
   *
   * @param channel 当前通道。
   * @param senderWindowId 发起调用的窗口标识。
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
   * @param eventChannel 事件通道。
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

    return new TextEncoder().encode(JSON.stringify(payload)).length
  }

  /**
   * 生成请求标识。
   *
   * @returns 请求标识字符串。
   */
  private createRequestId(): string {
    try {
      return randomUUID()
    } catch {
      return `ipc-${Date.now()}-${Math.random().toString(16).slice(2)}`
    }
  }

  /**
   * 生成成功响应并写日志。
   *
   * @param data 成功数据。
   * @param metrics 日志与元信息。
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
   * 生成失败响应并写日志。
   *
   * @param error 标准化错误对象。
   * @param metrics 日志与元信息。
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

