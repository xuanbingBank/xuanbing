/**
 * @file 缓存查询组合式函数，实现 cacheFirst / networkFirst / staleWhileRevalidate 策略。
 *
 * 先读 IndexedDB。命中且未过期，立即返回。
 * 后台通过 IPC 请求 SQLite 最新数据。
 * 新数据回来后刷新页面和缓存。
 * SQLite 永远是事实来源。
 */

import { defineState, computedRef } from '../stores/base'
import { getCache, setCache } from '../cache/cache-store'
import {
  DEFAULT_QUERY_STRATEGY,
  isExpired,
  type CachePolicy,
  type QueryStrategy
} from '../cache/cache-policy'
import type { CacheEntry } from '../cache/indexeddb-client'

/**
 * useCachedQuery 返回值。
 */
export interface UseCachedQueryReturn<T> {
  /** 当前数据 */
  data: ReturnType<typeof computedRef<T | null>>
  /** 是否加载中 */
  loading: ReturnType<typeof computedRef<boolean>>
  /** 是否在后台刷新 */
  refreshing: ReturnType<typeof computedRef<boolean>>
  /** 错误 */
  error: ReturnType<typeof computedRef<Error | null>>
  /** 执行查询 */
  execute: () => Promise<T | null>
  /** 刷新（强制走网络） */
  refresh: () => Promise<T | null>
}

/**
 * 缓存查询组合式函数。
 *
 * @param namespace 命名空间。
 * @param key 缓存键。
 * @param fetcher 网络获取函数（走 IPC 到 SQLite）。
 * @param options 选项。
 * @returns 查询状态与方法。
 */
export function useCachedQuery<T>(
  namespace: string,
  key: string,
  fetcher: () => Promise<T>,
  options?: {
    strategy?: QueryStrategy
    policy?: Partial<CachePolicy>
    onRefresh?: (data: T) => void
  }
): UseCachedQueryReturn<T> {
  const strategy = options?.strategy ?? DEFAULT_QUERY_STRATEGY
  const policy = options?.policy ?? {}

  const state = defineState({
    data: null as T | null,
    loading: false,
    refreshing: false,
    error: null as Error | null
  })

  const data = computedRef<T | null>(() => state.data)
  const loading = computedRef<boolean>(() => state.loading)
  const refreshing = computedRef<boolean>(() => state.refreshing)
  const error = computedRef<Error | null>(() => state.error)

  /**
   * 从网络获取并更新缓存。
   */
  async function fetchFromNetwork(): Promise<T> {
    const result = await fetcher()
    await setCache(namespace, key, result, policy)
    state.data = result
    return result
  }

  /**
   * 后台刷新。
   */
  async function backgroundRefresh(): Promise<void> {
    state.refreshing = true
    state.error = null
    try {
      const result = await fetchFromNetwork()
      options?.onRefresh?.(result)
    } catch (err) {
      state.error = err instanceof Error ? err : new Error(String(err))
    } finally {
      state.refreshing = false
    }
  }

  async function execute(): Promise<T | null> {
    state.loading = true
    state.error = null

    try {
      if (strategy === 'networkFirst') {
        try {
          return await fetchFromNetwork()
        } catch (err) {
          console.warn('[useCachedQuery] network failed, fallback to cache', err)
          const cached = await getCache<T>(namespace, key, policy.version)
          if (cached !== null) {
            state.data = cached
            return cached
          }
          throw state.error ?? new Error('Network failed and no cache available.')
        }
      }

      if (strategy === 'cacheFirst') {
        const cached = await getCache<T>(namespace, key, policy.version)
        if (cached !== null) {
          state.data = cached
          return cached
        }
        return await fetchFromNetwork()
      }

      // staleWhileRevalidate
      const { getCacheEntry } = await import('../cache/cache-store')
      const entry = await getCacheEntry(namespace, key)
      const hasStale = !!(entry && entry.value !== null && entry.value !== undefined)
      const expired = entry ? isExpired(entry as { expiresAt: number | null }) : false

      if (hasStale && !expired) {
        state.data = entry.value as T
        void backgroundRefresh()
        return entry.value as T
      }

      try {
        return await fetchFromNetwork()
      } catch (err) {
        // 网络失败时回退到过期 stale 缓存（若有），避免无数据可用
        if (hasStale && expired) {
          console.warn('[useCachedQuery] network failed, returning stale cache', err)
          state.data = entry.value as T
          return entry.value as T
        }
        throw err
      }
    } catch (err) {
      state.error = err instanceof Error ? err : new Error(String(err))
      throw err
    } finally {
      state.loading = false
    }
  }

  async function refresh(): Promise<T | null> {
    state.loading = true
    state.error = null
    try {
      return await fetchFromNetwork()
    } catch (err) {
      state.error = err instanceof Error ? err : new Error(String(err))
      throw err
    } finally {
      state.loading = false
    }
  }

  return { data, loading, refreshing, error, execute, refresh }
}

// 引入 CacheEntry 类型避免未使用警告
export type { CacheEntry }
