/**
 * @file 提供渲染进程安全使用桌面 API 的辅助函数与状态构造器。
 */

import type {
  DesktopApi,
  DesktopInvokeErrorState,
  DesktopInvokeIdleState,
  DesktopInvokeLoadingState,
  DesktopInvokeState,
  DesktopInvokeSuccessState,
  DesktopUnsubscribe
} from './desktop-api'

/**
 * 获取 preload 暴露到全局窗口对象上的桌面 API。
 *
 * @returns 桌面 API。
 */
export function getDesktopApi(): DesktopApi {
  return window.desktop
}

/**
 * 创建空闲状态。
 *
 * @returns 空闲状态对象。
 */
export function createIdleInvokeState(): DesktopInvokeIdleState {
  return {
    status: 'idle',
    data: undefined,
    error: undefined
  }
}

/**
 * 创建加载状态。
 *
 * @param input 当前请求输入。
 * @returns 加载状态对象。
 */
export function createLoadingInvokeState<TInput>(input: TInput): DesktopInvokeLoadingState<TInput> {
  return {
    status: 'loading',
    input,
    data: undefined,
    error: undefined
  }
}

/**
 * 创建成功状态。
 *
 * @param data 成功数据。
 * @returns 成功状态对象。
 */
export function createSuccessInvokeState<TData>(data: TData): DesktopInvokeSuccessState<TData> {
  return {
    status: 'success',
    data,
    error: undefined
  }
}

/**
 * 创建失败状态。
 *
 * @param error 错误数据。
 * @returns 失败状态对象。
 */
export function createErrorInvokeState<TError>(error: TError): DesktopInvokeErrorState<TError> {
  return {
    status: 'error',
    data: undefined,
    error
  }
}

/**
 * 判断当前状态是否为加载中。
 *
 * @param state 当前调用状态。
 * @returns 是否处于加载中。
 */
export function isInvokeLoading<TData, TInput, TError>(
  state: DesktopInvokeState<TData, TInput, TError>
): state is DesktopInvokeLoadingState<TInput> {
  return state.status === 'loading'
}

/**
 * 将多个取消订阅函数组合成一个。
 *
 * @param unsubscribes 多个取消订阅函数。
 * @returns 组合后的取消订阅函数。
 */
export function composeDesktopUnsubscribe(...unsubscribes: DesktopUnsubscribe[]): DesktopUnsubscribe {
  let disposed = false

  /**
   * 统一执行清理。
   */
  function unsubscribeAll(): void {
    if (disposed) {
      return
    }

    disposed = true

    for (const unsubscribe of unsubscribes) {
      unsubscribe()
    }
  }

  return unsubscribeAll
}
