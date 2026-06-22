/**
 * @file 日志 repository。
 */

import { BaseRepository, deserializeJson, generateId, nowIso, serializeJson } from './base.repository'
import type { ListQuery, PageResult } from '../ipcBus/shared/database'
import type { LogLevel } from '../ipcBus/shared/database'

/**
 * 日志行类型。
 */
export interface AppLogRow {
  id: string
  level: string
  scope: string
  message: string
  payload: string | null
  createdAt: string
}

/**
 * 创建日志输入。
 */
export interface CreateLogInput {
  level: LogLevel
  scope?: string
  message: string
  payload?: unknown
}

/**
 * 日志过滤。
 */
export interface LogFilter {
  level?: LogLevel
  scope?: string
}

/**
 * 日志 repository。
 */
export class LogRepository extends BaseRepository {
  /**
   * 创建日志。
   *
   * @param input 输入。
   * @returns 日志行。
   */
  create(input: CreateLogInput): AppLogRow {
    const id = generateId()
    const now = nowIso()

    this.db.prepare(`
      INSERT INTO app_logs (id, level, scope, message, payload, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, input.level, input.scope ?? '', input.message, serializeJson(input.payload ?? null), now)

    return (this.db.prepare('SELECT * FROM app_logs WHERE id = ?').get(id) as AppLogRow) ?? { id, level: input.level, scope: input.scope ?? '', message: input.message, payload: serializeJson(input.payload ?? null), createdAt: now }
  }

  /**
   * 分页查询日志。
   *
   * @param query 查询参数。
   * @returns 分页结果。
   */
  list(query: ListQuery<LogFilter> = {}): PageResult<AppLogRow> {
    const conditions: string[] = []
    const params: unknown[] = []

    if (query.filter?.level) {
      conditions.push('level = ?')
      params.push(query.filter.level)
    }
    if (query.filter?.scope) {
      conditions.push('scope = ?')
      params.push(query.filter.scope)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const sortSql = this.buildSortSql(query.sort, ['created_at', 'level', 'scope']) || 'ORDER BY created_at DESC'

    const countSql = `SELECT COUNT(*) as c FROM app_logs ${whereClause}`
    const listSql = `SELECT * FROM app_logs ${whereClause} ${sortSql} LIMIT ? OFFSET ?`

    return this.paginate<AppLogRow>(countSql, listSql, params, query)
  }

  /**
   * 清理指定时间之前的日志。
   *
   * @param beforeTimestamp 时间戳。
   * @returns 删除行数。
   */
  clearBefore(beforeTimestamp: string): number {
    return this.db.prepare('DELETE FROM app_logs WHERE created_at < ?').run(beforeTimestamp).changes
  }

  /**
   * 清理全部日志。
   *
   * @returns 删除行数。
   */
  clearAll(): number {
    return this.db.prepare('DELETE FROM app_logs').run().changes
  }

  /**
   * 反序列化日志行。
   *
   * @param row 日志行。
   * @returns 反序列化后的日志。
   */
  static deserialize(row: AppLogRow): {
    id: string
    level: LogLevel
    scope: string
    message: string
    payload: unknown
    createdAt: string
  } {
    return {
      id: row.id,
      level: row.level as LogLevel,
      scope: row.scope,
      message: row.message,
      payload: deserializeJson(row.payload),
      createdAt: row.createdAt
    }
  }
}
