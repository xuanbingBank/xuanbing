/**
 * @file 将主进程内部异常归一化为可安全下发给渲染进程的 IPC 错误结构。
 */

export interface IpcErrorOptions {
  cause?: string
  detail?: unknown
  retryable?: boolean
}

export interface IpcErrorShape {
  code: string
  message: string
  cause?: string
  detail?: unknown
  retryable?: boolean
}

/**
 * 定义主进程内部使用的结构化错误类型。
 */
export class IpcError extends Error {
  public readonly code: string

  public readonly causeCode?: string

  public readonly detail?: unknown

  public readonly retryable: boolean

  /**
   * 创建一个结构化 IPC 错误。
   *
   * @param code 错误码。
   * @param message 用户可读消息。
   * @param options 附加结构化信息。
   */
  public constructor(code: string, message: string, options: IpcErrorOptions = {}) {
    super(message)
    this.name = 'IpcError'
    this.code = code
    this.causeCode = options.cause
    this.detail = options.detail
    this.retryable = options.retryable ?? false
  }
}

/**
 * 创建结构化 IPC 错误实例。
 *
 * @param code 错误码。
 * @param message 用户可读消息。
 * @param detail 附加结构化信息。
 * @param cause 原因标识。
 * @param retryable 是否可重试。
 * @returns 结构化错误实例。
 */
export function createIpcError(
  code: string,
  message: string,
  detail?: unknown,
  cause?: string,
  retryable?: boolean
): IpcError {
  return new IpcError(code, message, {
    cause,
    detail,
    retryable
  })
}

/**
 * 创建标准取消错误。
 *
 * @param message 取消消息。
 * @returns 取消错误实例。
 */
export function createAbortError(message: string): IpcError {
  return createIpcError('IPC_ABORTED', message, undefined, 'abort', false)
}

/**
 * 判断未知异常是否为结构化 IPC 错误。
 *
 * @param error 未知异常。
 * @returns 是否为结构化 IPC 错误。
 */
export function isIpcError(error: unknown): error is IpcError {
  return error instanceof IpcError
}

/**
 * 将未知异常标准化为可下发给渲染进程的错误对象。
 *
 * @param error 未知异常。
 * @param environment 当前运行环境。
 * @returns 标准化错误对象。
 */
export function normalizeIpcError(error: unknown, environment: string): IpcErrorShape {
  if (isIpcError(error)) {
    return sanitizeIpcError(error, environment)
  }

  if (error instanceof Error) {
    return sanitizeIpcError(
      createIpcError('IPC_INTERNAL_ERROR', '桌面能力执行失败。', environment === 'production' ? undefined : { message: error.message }, error.name),
      environment
    )
  }

  return sanitizeIpcError(
    createIpcError('IPC_INTERNAL_ERROR', '桌面能力执行失败。', environment === 'production' ? undefined : error),
    environment
  )
}

/**
 * 对错误细节做脱敏处理。
 *
 * @param error 结构化错误实例。
 * @param environment 当前运行环境。
 * @returns 脱敏后的错误对象。
 */
export function sanitizeIpcError(error: IpcError, environment: string): IpcErrorShape {
  return {
    code: error.code,
    message: error.message,
    cause: error.causeCode,
    retryable: error.retryable,
    detail: environment === 'production' ? undefined : sanitizeDetail(error.detail)
  }
}

/**
 * 脱敏复杂错误细节，避免路径、口令等敏感信息泄露。
 *
 * @param detail 原始细节对象。
 * @returns 脱敏后的细节对象。
 */
export function sanitizeDetail(detail: unknown): unknown {
  if (detail === undefined || detail === null) {
    return detail
  }

  if (typeof detail === 'string') {
    return detail.replace(/[A-Za-z]:\\[^"'\s]+/g, '[redacted-path]')
  }

  if (Array.isArray(detail)) {
    return detail.slice(0, 10).map((item) => sanitizeDetail(item))
  }

  if (typeof detail === 'object') {
    const entries = Object.entries(detail as Record<string, unknown>).slice(0, 20).map(([key, value]) => {
      if (/(token|secret|password|env|path|stack)/i.test(key)) {
        return [key, '[redacted]']
      }

      return [key, sanitizeDetail(value)]
    })

    return Object.fromEntries(entries)
  }

  return detail
}
