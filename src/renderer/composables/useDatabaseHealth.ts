/**
 * @file 数据库健康检查组合式函数。
 */

import { defineState, computedRef } from '../stores/base'
import { databaseClient } from '../services/database.client'
import type { DatabaseHealthOutput } from '../../../electron/ipcBus/renderer/desktop-api'

/**
 * useDatabaseHealth 返回值。
 */
export interface UseDatabaseHealthReturn {
  /** 健康报告 */
  health: ReturnType<typeof computedRef<DatabaseHealthOutput | null>>
  /** 是否加载中 */
  loading: ReturnType<typeof computedRef<boolean>>
  /** 错误 */
  error: ReturnType<typeof computedRef<Error | null>>
  /** 是否健康 */
  isHealthy: ReturnType<typeof computedRef<boolean>>
  /** 刷新 */
  refresh: () => Promise<void>
}

/**
 * 数据库健康检查组合式函数。
 *
 * @returns 健康状态与方法。
 */
export function useDatabaseHealth(): UseDatabaseHealthReturn {
  const state = defineState({
    health: null as DatabaseHealthOutput | null,
    loading: false,
    error: null as Error | null
  })

  const health = computedRef<DatabaseHealthOutput | null>(() => state.health)
  const loading = computedRef<boolean>(() => state.loading)
  const error = computedRef<Error | null>(() => state.error)
  const isHealthy = computedRef<boolean>(() => state.health?.healthy ?? false)

  async function refresh(): Promise<void> {
    state.loading = true
    state.error = null
    try {
      state.health = await databaseClient.getHealth()
    } catch (err) {
      state.error = err instanceof Error ? err : new Error(String(err))
    } finally {
      state.loading = false
    }
  }

  return { health, loading, error, isHealthy, refresh }
}
