/**
 * @file ���������ڲ��쳣��һ��Ϊ�ɰ�ȫ�·�����Ⱦ���̵� IPC ����ṹ��
 */

import { DbErrorException } from '../shared/database/db-errors'

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
 * �����������ڲ�ʹ�õĽṹ���������͡�
 */
export class IpcError extends Error {
  public readonly code: string

  public readonly causeCode?: string

  public readonly detail?: unknown

  public readonly retryable: boolean

  /**
   * ����һ���ṹ�� IPC ����
   *
   * @param code �����롣
   * @param message �û��ɶ���Ϣ��
   * @param options ���ӽṹ����Ϣ��
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
 * �����ṹ�� IPC ����ʵ����
 *
 * @param code �����롣
 * @param message �û��ɶ���Ϣ��
 * @param detail ���ӽṹ����Ϣ��
 * @param cause ԭ���ʶ��
 * @param retryable �Ƿ�����ԡ�
 * @returns �ṹ������ʵ����
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
 * ������׼ȡ������
 *
 * @param message ȡ����Ϣ��
 * @returns ȡ������ʵ����
 */
export function createAbortError(message: string): IpcError {
  return createIpcError('IPC_ABORTED', message, undefined, 'abort', false)
}

/**
 * �ж�δ֪�쳣�Ƿ�Ϊ�ṹ�� IPC ����
 *
 * @param error δ֪�쳣��
 * @returns �Ƿ�Ϊ�ṹ�� IPC ����
 */
export function isIpcError(error: unknown): error is IpcError {
  return error instanceof IpcError
}

/**
 * ��δ֪�쳣��׼��Ϊ���·�����Ⱦ���̵Ĵ������
 *
 * @param error δ֪�쳣��
 * @param environment ��ǰ���л�����
 * @returns ��׼���������
 */
export function normalizeIpcError(error: unknown, environment: string): IpcErrorShape {
  if (isIpcError(error)) {
    return sanitizeIpcError(error, environment)
  }

  if (error instanceof DbErrorException) {
    const dbError = error.dbError
    return sanitizeIpcError(
      createIpcError(
        dbError.code,
        dbError.message,
        environment === 'production' ? dbError.safeDetail : { safeDetail: dbError.safeDetail, devDetail: dbError.devDetail },
        dbError.cause,
        dbError.retryable
      ),
      environment
    )
  }

  if (error instanceof Error) {
    return sanitizeIpcError(
      createIpcError('IPC_INTERNAL_ERROR', '��������ִ��ʧ�ܡ�', environment === 'production' ? undefined : { message: error.message }, error.name),
      environment
    )
  }

  return sanitizeIpcError(
    createIpcError('IPC_INTERNAL_ERROR', '��������ִ��ʧ�ܡ�', environment === 'production' ? undefined : error),
    environment
  )
}

/**
 * �Դ���ϸ��������������
 *
 * @param error �ṹ������ʵ����
 * @param environment ��ǰ���л�����
 * @returns ������Ĵ������
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
 * �������Ӵ���ϸ�ڣ�����·���������������Ϣй¶��
 *
 * @param detail ԭʼϸ�ڶ���
 * @returns �������ϸ�ڶ���
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
