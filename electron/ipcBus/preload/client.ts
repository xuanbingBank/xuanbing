/**
 * @file 实现 preload 内部使用的安全 IPC 客户端，负责统一解包结果、校验事件与清理订阅。
 */

import { ipcResultSchema } from '../shared'
import type { DesktopUnsubscribe } from '../renderer/desktop-api'
import type { IpcFailureResult } from '../shared'

/**
 * 定义兼容 `safeParse` 的模型返回结构。
 */
export interface SafeParseSuccess<TValue> {
  success: true
  data: TValue
}

/**
 * 定义兼容 `safeParse` 的失败结构。
 */
export interface SafeParseFailure {
  success: false
  error: unknown
}

/**
 * 定义兼容 `safeParse` 的模型接口。
 */
export interface SafeParseSchema<TValue> {
  safeParse(value: unknown): SafeParseSuccess<TValue> | SafeParseFailure
}

/**
 * 定义兼容 `parse` 的模型接口。
 */
export interface ParseSchema<TValue> {
  parse(value: unknown): TValue
}

/**
 * 定义客户端可识别的模型类型。
 */
export type SchemaLike<TValue> = SafeParseSchema<TValue> | ParseSchema<TValue>

/**
 * 定义 preload 所需的最小 ipcRenderer 接口。
 */
export interface IpcRendererLike {
  invoke(channel: string, payload?: unknown): Promise<unknown>
  on(channel: string, listener: (event: unknown, payload: unknown) => void): unknown
  removeListener(channel: string, listener: (event: unknown, payload: unknown) => void): unknown
}

/**
 * 定义 preload 可选的窗口对象接口。
 */
export interface PreloadWindowLike {
  addEventListener(type: 'unload', listener: () => void, options?: { once?: boolean }): void
  removeEventListener(type: 'unload', listener: () => void): void
}

/**
 * 定义订阅选项。
 */
export interface SubscribeOptions {
  onError?: (error: unknown) => void
}

/**
 * 定义 preload 内部客户端接口。
 */
export interface PreloadClient {
  rawInvoke<TResult, TPayload = void>(channel: string, payload?: TPayload): Promise<TResult>
  safeInvoke<TResult, TPayload = void>(channel: string, schema: SchemaLike<TResult>, payload?: TPayload): Promise<TResult>
  subscribe<TPayload>(
    channel: string,
    schema: SchemaLike<TPayload>,
    listener: (payload: TPayload) => void,
    options?: SubscribeOptions
  ): DesktopUnsubscribe
  dispose(): void
}

/**
 * 定义 preload 客户端依赖。
 */
export interface PreloadClientDependencies {
  ipcRenderer: IpcRendererLike
  windowTarget?: PreloadWindowLike
}

/**
 * 判断模型是否支持 `safeParse`。
 *
 * @param schema 待检查模型。
 * @returns 是否支持 `safeParse`。
 */
export function isSafeParseSchema<TValue>(schema: SchemaLike<TValue>): schema is SafeParseSchema<TValue> {
  return 'safeParse' in schema
}

/**
 * 使用模型解析任意值。
 *
 * @param schema 模型。
 * @param value 原始值。
 * @returns 校验后的值。
 */
export function parseWithSchema<TValue>(schema: SchemaLike<TValue>, value: unknown): TValue {
  if (isSafeParseSchema(schema)) {
    const result = schema.safeParse(value)

    if (!result.success) {
      throw result.error
    }

    return result.data
  }

  return schema.parse(value)
}

/**
 * 统一解包主进程返回的 Result 结构。
 *
 * @param value 主进程返回值。
 * @returns 解包后的成功数据。
 */
export function unwrapIpcResult<TValue>(value: unknown): TValue {
  const parsedResult = parseWithSchema(ipcResultSchema, value)

  if (!parsedResult.ok) {
    throw parsedResult.error as IpcFailureResult['error']
  }

  return parsedResult.data as TValue
}

/**
 * 创建 preload IPC 客户端。
 *
 * @param dependencies 运行时依赖。
 * @returns preload 客户端实例。
 */
export function createPreloadClient(dependencies: PreloadClientDependencies): PreloadClient {
  const subscriptions = new Set<DesktopUnsubscribe>()
  let disposed = false

  /**
   * 释放所有订阅。
   */
  function dispose(): void {
    if (disposed) {
      return
    }

    disposed = true

    for (const unsubscribe of [...subscriptions]) {
      unsubscribe()
    }

    subscriptions.clear()

    if (dependencies.windowTarget) {
      dependencies.windowTarget.removeEventListener('unload', dispose)
    }
  }

  if (dependencies.windowTarget) {
    dependencies.windowTarget.addEventListener('unload', dispose, { once: true })
  }

  return {
    /**
     * 发送原始请求并返回未解包结果。
     */
    async rawInvoke<TResult, TPayload = void>(channel: string, payload?: TPayload): Promise<TResult> {
      return dependencies.ipcRenderer.invoke(channel, payload) as Promise<TResult>
    },

    /**
     * 发送请求、解包统一结果并再次用目标模型校验成功数据。
     */
    async safeInvoke<TResult, TPayload = void>(channel: string, schema: SchemaLike<TResult>, payload?: TPayload): Promise<TResult> {
      const rawResult = await dependencies.ipcRenderer.invoke(channel, payload)
      const unwrapped = unwrapIpcResult<TResult>(rawResult)
      return parseWithSchema(schema, unwrapped)
    },

    /**
     * 订阅主进程事件并在回调前做数据校验。
     */
    subscribe<TPayload>(
      channel: string,
      schema: SchemaLike<TPayload>,
      listener: (payload: TPayload) => void,
      options: SubscribeOptions = {}
    ): DesktopUnsubscribe {
      let subscriptionDisposed = false

      /**
       * 处理一次事件回调。
       *
       * @param _event 原始事件对象，刻意丢弃。
       * @param payload 原始载荷。
       */
      function handleIpcEvent(_event: unknown, payload: unknown): void {
        try {
          listener(parseWithSchema(schema, payload))
        } catch (error) {
          options.onError?.(error)
        }
      }

      /**
       * 取消当前订阅。
       */
      function unsubscribe(): void {
        if (subscriptionDisposed) {
          return
        }

        subscriptionDisposed = true
        dependencies.ipcRenderer.removeListener(channel, handleIpcEvent)
        subscriptions.delete(unsubscribe)
      }

      dependencies.ipcRenderer.on(channel, handleIpcEvent)
      subscriptions.add(unsubscribe)
      return unsubscribe
    },
    dispose
  }
}
