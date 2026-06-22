/**
 * @file 缓存策略，定义 TTL、版本、清理规则。
 *
 * SQLite 与 IndexedDB 冲突时，永远以 SQLite 为准。
 * 错误降级，不影响主流程。
 */

/**
 * 缓存策略。
 */
export interface CachePolicy {
  /** TTL 毫秒，null 表示永不过期。 */
  ttlMs: number | null
  /** stale 时间毫秒，超过此时间标记为 stale 但仍可返回。 */
  staleMs: number | null
  /** 缓存版本，版本变化清理。 */
  version: number
  /** 标签，用于批量清理。 */
  tags: string[]
}

/**
 * 默认缓存策略。
 */
export const DEFAULT_CACHE_POLICY: CachePolicy = {
  ttlMs: 5 * 60 * 1000,
  staleMs: 30 * 60 * 1000,
  version: 1,
  tags: []
}

/**
 * 查询策略。
 */
export type QueryStrategy = 'cacheFirst' | 'networkFirst' | 'staleWhileRevalidate'

/**
 * 默认查询策略。
 */
export const DEFAULT_QUERY_STRATEGY: QueryStrategy = 'staleWhileRevalidate'

/**
 * 判断缓存条目是否过期。
 *
 * @param entry 缓存条目。
 * @returns 是否过期。
 */
export function isExpired(entry: { expiresAt: number | null }): boolean {
  if (entry.expiresAt === null) {
    return false
  }
  return Date.now() > entry.expiresAt
}

/**
 * 判断缓存条目是否 stale。
 *
 * @param entry 缓存条目。
 * @param policy 缓存策略。
 * @returns 是否 stale。
 */
export function isStale(
  entry: { updatedAt: number },
  policy: CachePolicy
): boolean {
  if (policy.staleMs === null) {
    return false
  }
  return Date.now() - entry.updatedAt > policy.staleMs
}

/**
 * 合并缓存策略。
 *
 * @param base 基础策略。
 * @param override 覆盖策略。
 * @returns 合并后的策略。
 */
export function mergePolicy(
  base: CachePolicy,
  override: Partial<CachePolicy>
): CachePolicy {
  return {
    ttlMs: override.ttlMs ?? base.ttlMs,
    staleMs: override.staleMs ?? base.staleMs,
    version: override.version ?? base.version,
    tags: override.tags ?? base.tags
  }
}

/**
 * 计算 expiresAt。
 *
 * @param policy 缓存策略。
 * @returns 过期时间戳，null 表示永不过期。
 */
export function computeExpiresAt(policy: CachePolicy): number | null {
  if (policy.ttlMs === null) {
    return null
  }
  return Date.now() + policy.ttlMs
}
