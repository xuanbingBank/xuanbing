/**
 * @file IPC 请求组合式函数，封装 IPC 调用的 loading/error/data 状态管理。
 */

import { defineState, computedRef } from '../stores/base'
import type { Ref } from '../vue-global'
import { normalizeError } from '../utils/error'
import type { AppError } from '../utils/error'

/**
 * IPC 请求状态。
 */
export type RequestStatus = 'idle' | 'loading' | 'success' | 'error'

/**
 * IPC 请求组合式函数返回值。
 */
export interface UseIpcRequestReturn<TData, TInput> {
  /** 当前数据 */
  data: Ref<TData | null>
  /** 错误信息 */
  error: Ref<AppError | null>
  /** 状态 */
  status: Ref<RequestStatus>
  /** 是否加载中 */
  loading: ReturnType<typeof Vue.computed>
  /** 是否成功 */
  isSuccess: ReturnType<typeof Vue.computed>
  /** 是否出错 */
  isError: ReturnType<typeof Vue.computed>
  /** 执行请求 */
  execute: (input: TInput) => Promise<TData>
  /** 重置状态 */
  reset: () => void
}

/**
 * IPC 请求组合式函数。
 *
 * @param fn IPC 调用函数。
 * @returns 请求状态与方法。
 */
export function useIpcRequest<TData, TInput = void>(
  fn: (input: TInput) => Promise<TData>
): UseIpcRequestReturn<TData, TInput> {
  const state = defineState({
    data: null as TData | null,
    error: null as AppError | null,
    status: 'idle' as RequestStatus
  })

  const data = computedRef<TData | null>(() => state.data)
  const error = computedRef<AppError | null>(() => state.error)
  const status = computedRef<RequestStatus>(() => state.status)
  const loading = computedRef<boolean>(() => state.status === 'loading')
  const isSuccess = computedRef<boolean>(() => state.status === 'success')
  const isError = computedRef<boolean>(() => state.status === 'error')

  async function execute(input: TInput): Promise<TData> {
    state.status = 'loading'
    state.error = null
    try {
      const result = await fn(input)
      state.data = result
      state.status = 'success'
      return result
    } catch (err) {
      state.error = normalizeError(err)
      state.status = 'error'
      throw err
    }
  }

  function reset(): void {
    state.data = null
    state.error = null
    state.status = 'idle'
  }

  return {
    data,
    error,
    status,
    loading,
    isSuccess,
    isError,
    execute,
    reset
  }
}
