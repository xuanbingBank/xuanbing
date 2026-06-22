/**
 * @file 应用设置表 schema。
 */

import { sql } from 'drizzle-orm'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

/**
 * app_settings：键值对配置存储，按 namespace + key 唯一。
 */
export const appSettings = sqliteTable('app_settings', {
  id: text('id').primaryKey(),
  namespace: text('namespace').notNull(),
  key: text('key').notNull(),
  value: text('value').notNull(),
  valueType: text('value_type').notNull(),
  description: text('description').notNull().default(''),
  isSystem: integer('is_system', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`)
})

/**
 * app_settings 唯一索引：namespace + key。
 * 通过 UNIQUE 约束在 DDL 中实现（见 migration）。
 */
