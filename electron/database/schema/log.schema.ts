/**
 * @file 应用日志表 schema。
 */

import { sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

/**
 * app_logs：应用日志索引（大日志体可外存，此处仅索引元信息与摘要）。
 */
export const appLogs = sqliteTable(
  'app_logs',
  {
    id: text('id').primaryKey(),
    level: text('level').notNull(),
    scope: text('scope').notNull().default(''),
    message: text('message').notNull(),
    payload: text('payload'),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => ({
    levelIdx: index('idx_app_logs_level').on(table.level),
    scopeIdx: index('idx_app_logs_scope').on(table.scope),
    createdAtIdx: index('idx_app_logs_created_at').on(table.createdAt)
  })
)
