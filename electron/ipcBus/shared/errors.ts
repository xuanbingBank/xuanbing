/**
 * @file 共享 IPC 错误码与结果类型定义。
 */

/**
 * 全部 IPC 错误码常量。
 */
export const IPC_ERROR_CODES = {
  unknownChannel: 'IPC_UNKNOWN_CHANNEL',
  handlerNotFound: 'IPC_HANDLER_NOT_FOUND',
  validationError: 'IPC_VALIDATION_ERROR',
  forbidden: 'IPC_FORBIDDEN',
  timeout: 'IPC_TIMEOUT',
  aborted: 'IPC_ABORTED',
  internalError: 'IPC_INTERNAL_ERROR',
  windowNotFound: 'IPC_WINDOW_NOT_FOUND',
  windowDestroyed: 'IPC_WINDOW_DESTROYED',
  rateLimited: 'IPC_RATE_LIMITED',
  payloadTooLarge: 'IPC_PAYLOAD_TOO_LARGE',
  payloadUnserializable: 'IPC_PAYLOAD_UNSERIALIZABLE',
  unsupported: 'IPC_UNSUPPORTED',
  conflict: 'IPC_CONFLICT',
  notReady: 'IPC_NOT_READY',
  taskLimitExceeded: 'IPC_TASK_LIMIT_EXCEEDED'
} as const

/**
 * 受控的 IPC 错误码类型。
 */
export type IpcErrorCode = (typeof IPC_ERROR_CODES)[keyof typeof IPC_ERROR_CODES]

/**
 * 描述一次 IPC 错误的结构。
 */
export interface IpcError {
  code: IpcErrorCode
  message: string
  detail?: unknown
  cause?: string
  retryable?: boolean
}

/**
 * 描述 IPC 调用结果的元数据。
 */
export interface IpcResultMeta {
  requestId: string
  durationMs: number
}

/**
 * 成功的 IPC 调用结果。
 */
export interface IpcSuccessResult<TData> {
  ok: true
  data: TData
  meta?: IpcResultMeta
}

/**
 * 失败的 IPC 调用结果。
 */
export interface IpcFailureResult {
  ok: false
  error: IpcError
  meta?: IpcResultMeta
}

/**
 * IPC 调用结果的联合类型。
 */
export type IpcResult<TData> = IpcSuccessResult<TData> | IpcFailureResult

/**
 * 判断字符串是否为合法的 IPC 错误码。
 *
 * @param value 待判断的字符串。
 * @returns 是合法 IPC 错误码时为 `true`。
 */
export function isIpcErrorCode(value: string): value is IpcErrorCode {
  return (Object.values(IPC_ERROR_CODES) as string[]).includes(value)
}

/**
 * 构造一个 IPC 错误对象。
 *
 * @param code 错误码。
 * @param message 错误描述。
 * @param detail 错误详情。
 * @param cause 错误原因。
 * @param retryable 是否可重试。
 * @returns 构造好的 IPC 错误对象。
 */
export function createIpcError(
  code: IpcErrorCode,
  message: string,
  detail?: unknown,
  cause?: string,
  retryable?: boolean
): IpcError {
  return {
    code,
    message,
    detail,
    cause,
    retryable
  }
}

/**
 * 构造成功的 IPC 调用结果。
 *
 * @param data 返回数据。
 * @param meta 结果元数据。
 * @returns 成功 IPC 结果。
 */
export function createIpcSuccessResult<TData>(data: TData, meta?: IpcResultMeta): IpcSuccessResult<TData> {
  return {
    ok: true,
    data,
    meta
  }
}

/**
 * 构造失败的 IPC 调用结果。
 *
 * @param code 错误码。
 * @param message 错误描述。
 * @param detail 错误详情。
 * @param cause 错误原因。
 * @param retryable 是否可重试。
 * @param meta 结果元数据。
 * @returns 失败 IPC 结果。
 */
export function createIpcErrorResult(
  code: IpcErrorCode,
  message: string,
  detail?: unknown,
  cause?: string,
  retryable?: boolean,
  meta?: IpcResultMeta
): IpcFailureResult {
  return {
    ok: false,
    error: createIpcError(code, message, detail, cause, retryable),
    meta
  }
}
