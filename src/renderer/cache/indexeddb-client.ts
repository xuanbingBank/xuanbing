/**
 * @file IndexedDB 客户端，renderer 唯一的 IndexedDB 访问入口。
 *
 * IndexedDB 只在 renderer 使用，不是主数据库。
 * IndexedDB 数据可随时删除。不存 token、密钥、敏感数据。
 * 必须支持 TTL、namespace、version、tags。
 * 页面不得裸写 indexedDB，必须通过 cache client。
 */

const DB_NAME = 'xuanbing-cache'
const DB_VERSION = 1
const STORE_CACHE_ENTRIES = 'cache_entries'
const STORE_CACHE_META = 'cache_meta'
const STORE_DRAFT_ENTRIES = 'draft_entries'
const STORE_UI_STATE = 'ui_state'

/**
 * 缓存条目结构。
 */
export interface CacheEntry {
  id: string
  namespace: string
  key: string
  value: unknown
  version: number
  tags: string[]
  createdAt: number
  updatedAt: number
  expiresAt: number | null
  stale: boolean
}

/**
 * 缓存元信息。
 */
export interface CacheMeta {
  id: string
  namespace: string
  version: number
  updatedAt: number
}

let dbInstance: IDBDatabase | null = null
let openPromise: Promise<IDBDatabase> | null = null

/**
 * 打开 IndexedDB 连接（单例）。
 *
 * @returns IDBDatabase 实例。
 */
export function openCacheDb(): Promise<IDBDatabase> {
  if (dbInstance) {
    return Promise.resolve(dbInstance)
  }

  if (openPromise) {
    return openPromise
  }

  openPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this environment.'))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB.'))
    }

    request.onsuccess = () => {
      dbInstance = request.result
      resolve(dbInstance)
    }

    request.onupgradeneeded = (_event) => {
      const db = request.result

      if (!db.objectStoreNames.contains(STORE_CACHE_ENTRIES)) {
        const store = db.createObjectStore(STORE_CACHE_ENTRIES, { keyPath: 'id' })
        store.createIndex('namespace', 'namespace', { unique: false })
        store.createIndex('namespace_key', ['namespace', 'key'], { unique: true })
        store.createIndex('expiresAt', 'expiresAt', { unique: false })
      }

      if (!db.objectStoreNames.contains(STORE_CACHE_META)) {
        const store = db.createObjectStore(STORE_CACHE_META, { keyPath: 'id' })
        store.createIndex('namespace', 'namespace', { unique: true })
      }

      if (!db.objectStoreNames.contains(STORE_DRAFT_ENTRIES)) {
        const store = db.createObjectStore(STORE_DRAFT_ENTRIES, { keyPath: 'id' })
        store.createIndex('namespace', 'namespace', { unique: false })
      }

      if (!db.objectStoreNames.contains(STORE_UI_STATE)) {
        const store = db.createObjectStore(STORE_UI_STATE, { keyPath: 'id' })
        store.createIndex('namespace', 'namespace', { unique: false })
      }
    }
  })

  return openPromise
}

/**
 * 执行事务的辅助函数。
 *
 * @param storeName store 名称。
 * @param mode 事务模式。
 * @param fn 事务操作函数。
 * @returns 操作结果。
 */
export async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openCacheDb()
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(storeName, mode)
    const store = tx.objectStore(storeName)
    const request = fn(store)

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * 生成缓存条目 ID。
 *
 * @param namespace 命名空间。
 * @param key 键。
 * @returns 条目 ID。
 */
export function cacheEntryId(namespace: string, key: string): string {
  return `${namespace}::${key}`
}

export {
  STORE_CACHE_ENTRIES,
  STORE_CACHE_META,
  STORE_DRAFT_ENTRIES,
  STORE_UI_STATE
}
