/**
 * @file 审计日志 repository。
 */

import { BaseRepository, deserializeJson, generateId, nowIso, serializeJson } from './base.repository'
import type { ListQuery, PageResult } from '../ipcBus/shared/database'
import type { AuditAction, AuditActorType } from '../ipcBus/shared/database'

/**
 * 审计日志行类型。
 */
export interface AuditLogRow {
  id: string
  actorType: string
  actorId: string
  action: string
  entityType: string
  entityId: string
  before: string | null
  after: string | null
  metadata: string | null
  createdAt: string
}

/**
 * 创建审计日志输入。
 */
export interface CreateAuditInput {
  actorType: AuditActorType
  actorId: string
  action: AuditAction
  entityType: string
  entityId: string
  before?: unknown
  after?: unknown
  metadata?: unknown
}

/**
 * 审计过滤。
 */
export interface AuditFilter {
  actorType?: AuditActorType
  action?: AuditAction
  entityType?: string
  entityId?: string
}

/**
 * 审计日志 repository。
 */
export class AuditRepository extends BaseRepository {
  /**
   * 创建审计日志。
   *
   * @param input 输入。
   * @returns 审计日志行。
   */
  create(input: CreateAuditInput): AuditLogRow {
    const id = generateId()
    const now = nowIso()

    this.db.prepare(`
      INSERT INTO audit_logs (id, actor_type, actor_id, action, entity_type, entity_id, before, after, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.actorType,
      input.actorId,
      input.action,
      input.entityType,
      input.entityId,
      serializeJson(input.before ?? null),
      serializeJson(input.after ?? null),
      serializeJson(input.metadata ?? null),
      now
    )

    return (this.db.prepare('SELECT * FROM audit_logs WHERE id = ?').get(id) as AuditLogRow) ?? { id, actorType: input.actorType, actorId: input.actorId, action: input.action, entityType: input.entityType, entityId: input.entityId, before: serializeJson(input.before ?? null), after: serializeJson(input.after ?? null), metadata: serializeJson(input.metadata ?? null), createdAt: now }
  }

  /**
   * 分页查询审计日志。
   *
   * @param query 查询参数。
   * @returns 分页结果。
   */
  list(query: ListQuery<AuditFilter> = {}): PageResult<AuditLogRow> {
    const conditions: string[] = []
    const params: unknown[] = []

    if (query.filter?.actorType) {
      conditions.push('actor_type = ?')
      params.push(query.filter.actorType)
    }
    if (query.filter?.action) {
      conditions.push('action = ?')
      params.push(query.filter.action)
    }
    if (query.filter?.entityType) {
      conditions.push('entity_type = ?')
      params.push(query.filter.entityType)
    }
    if (query.filter?.entityId) {
      conditions.push('entity_id = ?')
      params.push(query.filter.entityId)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const sortSql = this.buildSortSql(query.sort, ['created_at', 'action', 'actor_type']) || 'ORDER BY created_at DESC'

    const countSql = `SELECT COUNT(*) as c FROM audit_logs ${whereClause}`
    const listSql = `SELECT * FROM audit_logs ${whereClause} ${sortSql} LIMIT ? OFFSET ?`

    return this.paginate<AuditLogRow>(countSql, listSql, params, query)
  }

  /**
   * 反序列化审计日志行。
   *
   * @param row 审计日志行。
   * @returns 反序列化后的审计日志。
   */
  static deserialize(row: AuditLogRow): {
    id: string
    actorType: AuditActorType
    actorId: string
    action: AuditAction
    entityType: string
    entityId: string
    before: unknown
    after: unknown
    metadata: unknown
    createdAt: string
  } {
    return {
      id: row.id,
      actorType: row.actorType as AuditActorType,
      actorId: row.actorId,
      action: row.action as AuditAction,
      entityType: row.entityType,
      entityId: row.entityId,
      before: deserializeJson(row.before),
      after: deserializeJson(row.after),
      metadata: deserializeJson(row.metadata),
      createdAt: row.createdAt
    }
  }
}
