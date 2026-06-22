/**
 * @file 缓存清理器，定期清理过期缓存。
 */

import { clearExpired } from './cache-store'

let cleanerTimer: ReturnType<typeof setInterval> | null = null
const CLEAN_INTERVAL_MS = 5 * 60 * 1000

/**
 * 启动缓存清理器。
 */
export function startCacheCleaner(): void {
  if (cleanerTimer) {
    return
  }

  cleanerTimer = setInterval(() => {
    void clearExpired().catch((error) => {
      console.warn('[cache-cleaner] clearExpired failed', error)
    })
  }, CLEAN_INTERVAL_MS)
}

/**
 * 停止缓存清理器。
 */
export function stopCacheCleaner(): void {
  if (cleanerTimer) {
    clearInterval(cleanerTimer)
    cleanerTimer = null
  }
}

/**
 * 手动触发一次清理。
 */
export async function runCleanup(): Promise<void> {
  await clearExpired()
}
