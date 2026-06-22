/**
 * @file 窗口状态表 schema。
 */

import { sql } from 'drizzle-orm'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

/**
 * window_states：窗口位置、大小、状态持久化。
 */
export const windowStates = sqliteTable('window_states', {
  id: text('id').primaryKey(),
  role: text('role').notNull(),
  instanceKey: text('instance_key').notNull(),
  bounds: text('bounds'),
  isMaximized: integer('is_maximized', { mode: 'boolean' }).notNull().default(false),
  isFullScreen: integer('is_full_screen', { mode: 'boolean' }).notNull().default(false),
  displayId: integer('display_id'),
  lastRoute: text('last_route'),
  customState: text('custom_state'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`)
})

/**
 * window_states 唯一约束：role + instance_key（见 migration DDL）。
 */
