/**
 * @file 审计日志表 schema。
 */

import { sql } from 'drizzle-orm'
import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core'

/**
 * audit_logs：审计日志，记录重要写操作的 before/after。
 */
export const auditLogs = sqliteTable(
  'audit_logs',
  {
    id: text('id').primaryKey(),
    actorType: text('actor_type').notNull(),
    actorId: text('actor_id').notNull(),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    before: text('before'),
    after: text('after'),
    metadata: text('metadata'),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => ({
    actorIdx: index('idx_audit_logs_actor').on(table.actorType, table.actorId),
    entityIdx: index('idx_audit_logs_entity').on(table.entityType, table.entityId),
    actionIdx: index('idx_audit_logs_action').on(table.action),
    createdAtIdx: index('idx_audit_logs_created_at').on(table.createdAt)
  })
)
