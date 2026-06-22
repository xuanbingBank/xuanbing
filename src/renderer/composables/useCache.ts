/**
 * @file 通用缓存组合式函数，封装 cache-store 的响应式访问。
 */

import { defineState, computedRef } from '../stores/base'
import type { CachePolicy } from '../cache/cache-policy'
import {
  getCache,
  removeCache,
  setCache
} from '../cache/cache-store'

/**
 * useCache 返回值。
 */
export interface UseCacheReturn<T> {
  /** 当前数据 */
  data: ReturnType<typeof computedRef<T | null>>
  /** 是否加载中 */
  loading: ReturnType<typeof computedRef<boolean>>
  /** 错误 */
  error: ReturnType<typeof computedRef<Error | null>>
  /** 读取缓存 */
  read: () => Promise<T | null>
  /** 写入缓存 */
  write: (value: T, policyOverride?: Partial<CachePolicy>) => Promise<void>
  /** 移除缓存 */
  remove: () => Promise<void>
}

/**
 * 通用缓存组合式函数。
 *
 * @param namespace 命名空间。
 * @param key 缓存键。
 * @param policyOverride 策略覆盖。
 * @returns 缓存状态与方法。
 */
export function useCache<T>(
  namespace: string,
  key: string,
  policyOverride?: Partial<CachePolicy>
): UseCacheReturn<T> {
  const state = defineState({
    data: null as T | null,
    loading: false,
    error: null as Error | null
  })

  const data = computedRef<T | null>(() => state.data)
  const loading = computedRef<boolean>(() => state.loading)
  const error = computedRef<Error | null>(() => state.error)

  async function read(): Promise<T | null> {
    state.loading = true
    state.error = null
    try {
      const value = await getCache<T>(namespace, key, policyOverride?.version)
      state.data = value
      return value
    } catch (err) {
      state.error = err instanceof Error ? err : new Error(String(err))
      return null
    } finally {
      state.loading = false
    }
  }

  async function write(value: T, override?: Partial<CachePolicy>): Promise<void> {
    try {
      await setCache(namespace, key, value, override ?? policyOverride)
      state.data = value
    } catch (err) {
      state.error = err instanceof Error ? err : new Error(String(err))
    }
  }

  async function remove(): Promise<void> {
    try {
      await removeCache(namespace, key)
      state.data = null
    } catch (err) {
      state.error = err instanceof Error ? err : new Error(String(err))
    }
  }

  return { data, loading, error, read, write, remove }
}
