/**
 * @file 基础 repository，提供通用 CRUD、分页、JSON 序列化辅助。
 *
 * repository 只负责数据库访问，不包含业务逻辑。
 */

import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import { getConnection } from '../database/db-connection'
import {
  computePageMeta,
  normalizePageQuery,
  pageQueryToOffsetLimit,
  type ListQuery,
  type PageQuery,
  type PageResult
} from '../ipcBus/shared/database'

/**
 * JSON 字段安全序列化。
 *
 * @param value 待序列化值。
 * @returns JSON 字符串，null 值返回 null。
 */
export function serializeJson(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null
  }
  return JSON.stringify(value)
}

/**
 * JSON 字段安全反序列化。
 *
 * @param value 待反序列化字符串。
 * @returns 解析后的值，null 或解析失败返回 null。
 */
export function deserializeJson<T = unknown>(value: string | null): T | null {
  if (value === null || value === undefined || value === '') {
    return null
  }
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

/**
 * 生成 UUID。
 *
 * @returns UUID 字符串。
 */
export function generateId(): string {
  return randomUUID()
}

/**
 * 获取当前 ISO 时间戳。
 *
 * @returns ISO 时间字符串。
 */
export function nowIso(): string {
  return new Date().toISOString()
}

/**
 * 基础 repository 抽象类。
 */
export abstract class BaseRepository {
  /**
   * 获取数据库连接。
   *
   * @returns better-sqlite3 数据库实例。
   */
  protected get db(): Database.Database {
    return getConnection().raw
  }

  /**
   * 执行分页查询。
   *
   * @param countSql 计数 SQL。
   * @param listSql 列表 SQL。
   * @param params SQL 参数。
   * @param query 分页查询参数。
   * @returns 分页结果。
   */
  protected paginate<TItem>(
    countSql: string,
    listSql: string,
    params: unknown[],
    query: { page?: number; pageSize?: number }
  ): PageResult<TItem> {
    const pageQuery: PageQuery = normalizePageQuery(query)
    const { offset, limit } = pageQueryToOffsetLimit(pageQuery)

    const countRow = this.db.prepare(countSql).get(...params) as { c: number }
    const total = countRow.c

    const items = this.db.prepare(listSql).all(...params, limit, offset) as TItem[]

    const meta = computePageMeta(total, pageQuery)

    return {
      items,
      total,
      page: pageQuery.page,
      pageSize: pageQuery.pageSize,
      totalPages: meta.totalPages,
      hasMore: meta.hasMore
    }
  }

  /**
   * 构建排序 SQL 片段（白名单校验，防止 SQL 注入）。
   *
   * @param sort 排序参数。
   * @param allowedFields 允许排序的字段白名单。
   * @returns 排序 SQL 片段。
   */
  protected buildSortSql(
    sort: ListQuery['sort'],
    allowedFields: readonly string[]
  ): string {
    if (!sort || !allowedFields.includes(sort.field)) {
      return ''
    }
    const direction = sort.direction === 'desc' ? 'DESC' : 'ASC'
    return `ORDER BY ${sort.field} ${direction}`
  }
}
