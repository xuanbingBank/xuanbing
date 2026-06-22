/**
 * @file 缓存存储，提供 get/set/remove/clear 能力。
 *
 * 支持 namespace、version、tags、TTL。
 * 错误降级，不影响主流程。
 */

import {
  STORE_CACHE_ENTRIES,
  STORE_CACHE_META,
  cacheEntryId,
  openCacheDb,
  withStore,
  type CacheEntry
} from './indexeddb-client'
import {
  DEFAULT_CACHE_POLICY,
  computeExpiresAt,
  mergePolicy,
  type CachePolicy
} from './cache-policy'

/**
 * 设置缓存。
 *
 * @param namespace 命名空间。
 * @param key 键。
 * @param value 值。
 * @param policyOverride 策略覆盖。
 */
export async function setCache(
  namespace: string,
  key: string,
  value: unknown,
  policyOverride?: Partial<CachePolicy>
): Promise<void> {
  try {
    const policy = mergePolicy(DEFAULT_CACHE_POLICY, policyOverride ?? {})
    const now = Date.now()
    const id = cacheEntryId(namespace, key)

    const entry: CacheEntry = {
      id,
      namespace,
      key,
      value,
      version: policy.version,
      tags: policy.tags,
      createdAt: now,
      updatedAt: now,
      expiresAt: computeExpiresAt(policy),
      stale: false
    }

    await withStore(STORE_CACHE_ENTRIES, 'readwrite', (store) => store.put(entry))

    await withStore(STORE_CACHE_META, 'readwrite', (store) =>
      store.put({
        id: namespace,
        namespace,
        version: policy.version,
        updatedAt: now
      })
    )
  } catch (error) {
    console.warn('[cache] setCache failed, degrading silently', error)
  }
}

/**
 * 获取缓存。
 *
 * @param namespace 命名空间。
 * @param key 键。
 * @param expectedVersion 期望版本，不匹配返回 null。
 * @returns 缓存值或 null。
 */
export async function getCache<T>(
  namespace: string,
  key: string,
  expectedVersion?: number
): Promise<T | null> {
  try {
    const id = cacheEntryId(namespace, key)
    const entry = await withStore<CacheEntry | undefined>(
      STORE_CACHE_ENTRIES,
      'readonly',
      (store) => store.get(id)
    )

    if (!entry) {
      return null
    }

    if (expectedVersion !== undefined && entry.version !== expectedVersion) {
      return null
    }

    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      return null
    }

    return entry.value as T
  } catch (error) {
    console.warn('[cache] getCache failed, degrading silently', error)
    return null
  }
}

/**
 * 获取缓存条目（含元信息）。
 *
 * @param namespace 命名空间。
 * @param key 键。
 * @returns 缓存条目或 null。
 */
export async function getCacheEntry(
  namespace: string,
  key: string
): Promise<CacheEntry | null> {
  try {
    const id = cacheEntryId(namespace, key)
    const entry = await withStore<CacheEntry | undefined>(
      STORE_CACHE_ENTRIES,
      'readonly',
      (store) => store.get(id)
    )
    return entry ?? null
  } catch (error) {
    console.warn('[cache] getCacheEntry failed, degrading silently', error)
    return null
  }
}

/**
 * 移除缓存。
 *
 * @param namespace 命名空间。
 * @param key 键。
 */
export async function removeCache(namespace: string, key: string): Promise<void> {
  try {
    const id = cacheEntryId(namespace, key)
    await withStore(STORE_CACHE_ENTRIES, 'readwrite', (store) => store.delete(id))
  } catch (error) {
    console.warn('[cache] removeCache failed, degrading silently', error)
  }
}

/**
 * 按命名空间清理缓存。
 *
 * @param namespace 命名空间。
 */
export async function clearByNamespace(namespace: string): Promise<void> {
  try {
    const db = await openCacheDb()
    const tx = db.transaction(STORE_CACHE_ENTRIES, 'readwrite')
    const store = tx.objectStore(STORE_CACHE_ENTRIES)
    const index = store.index('namespace')
    const range = IDBKeyRange.only(namespace)
    const request = index.openCursor(range)

    return new Promise<void>((resolve, reject) => {
      request.onsuccess = () => {
        const cursor = request.result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        } else {
          resolve()
        }
      }
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.warn('[cache] clearByNamespace failed, degrading silently', error)
  }
}

/**
 * 按标签清理缓存。
 *
 * @param tag 标签。
 */
export async function clearByTag(tag: string): Promise<void> {
  try {
    const db = await openCacheDb()
    const tx = db.transaction(STORE_CACHE_ENTRIES, 'readwrite')
    const store = tx.objectStore(STORE_CACHE_ENTRIES)
    const request = store.openCursor()

    return new Promise<void>((resolve, reject) => {
      request.onsuccess = () => {
        const cursor = request.result
        if (cursor) {
          const entry = cursor.value as CacheEntry
          if (entry.tags && entry.tags.includes(tag)) {
            cursor.delete()
          }
          cursor.continue()
        } else {
          resolve()
        }
      }
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.warn('[cache] clearByTag failed, degrading silently', error)
  }
}

/**
 * 清理过期缓存。
 */
export async function clearExpired(): Promise<void> {
  try {
    const db = await openCacheDb()
    const tx = db.transaction(STORE_CACHE_ENTRIES, 'readwrite')
    const store = tx.objectStore(STORE_CACHE_ENTRIES)
    const index = store.index('expiresAt')
    const now = Date.now()
    const range = IDBKeyRange.upperBound(now, true)
    const request = index.openCursor(range)

    return new Promise<void>((resolve, reject) => {
      request.onsuccess = () => {
        const cursor = request.result
        if (cursor) {
          const entry = cursor.value as CacheEntry
          if (entry.expiresAt !== null && entry.expiresAt < now) {
            cursor.delete()
          }
          cursor.continue()
        } else {
          resolve()
        }
      }
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.warn('[cache] clearExpired failed, degrading silently', error)
  }
}

/**
 * 清理全部缓存。
 */
export async function clearAll(): Promise<void> {
  try {
    await withStore(STORE_CACHE_ENTRIES, 'readwrite', (store) => store.clear())
  } catch (error) {
    console.warn('[cache] clearAll failed, degrading silently', error)
  }
}
