/**
 * @file 窗口管理系统专用错误码与错误构造函数。
 */

/**
 * 窗口管理系统错误码。
 */
export const WINDOW_ERROR_CODES = {
  roleNotFound: 'WINDOW_ROLE_NOT_FOUND',
  routeNotAllowed: 'WINDOW_ROUTE_NOT_ALLOWED',
  routeNotFound: 'WINDOW_ROUTE_NOT_FOUND',
  singletonExists: 'WINDOW_SINGLETON_EXISTS',
  maxInstancesReached: 'WINDOW_MAX_INSTANCES',
  validationError: 'WINDOW_VALIDATION_ERROR',
  windowNotFound: 'WINDOW_NOT_FOUND',
  windowDestroyed: 'WINDOW_DESTROYED',
  forbidden: 'WINDOW_FORBIDDEN',
  payloadTooLarge: 'WINDOW_PAYLOAD_TOO_LARGE',
  displayNotFound: 'WINDOW_DISPLAY_NOT_FOUND',
  loadFailed: 'WINDOW_LOAD_FAILED',
  initPayloadExpired: 'WINDOW_INIT_PAYLOAD_EXPIRED',
  initPayloadNotFound: 'WINDOW_INIT_PAYLOAD_NOT_FOUND',
  environmentNotAllowed: 'WINDOW_ENV_NOT_ALLOWED',
  notReady: 'WINDOW_NOT_READY'
} as const

export type WindowErrorCode = (typeof WINDOW_ERROR_CODES)[keyof typeof WINDOW_ERROR_CODES]

export interface WindowError {
  code: WindowErrorCode
  message: string
  detail?: unknown
  retryable?: boolean
}

/**
 * 创建窗口管理系统错误对象。
 *
 * @param code 错误码。
 * @param message 错误消息。
 * @param detail 错误详情。
 * @param retryable 是否可重试。
 * @returns 窗口错误对象。
 */
export function createWindowError(
  code: WindowErrorCode,
  message: string,
  detail?: unknown,
  retryable?: boolean
): WindowError {
  return { code, message, detail, retryable }
}

/**
 * 判断值是否为窗口错误。
 *
 * @param value 待判断值。
 * @returns 是否为窗口错误。
 */
export function isWindowError(value: unknown): value is WindowError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    'message' in value &&
    (Object.values(WINDOW_ERROR_CODES) as string[]).includes((value as { code: string }).code)
  )
}
