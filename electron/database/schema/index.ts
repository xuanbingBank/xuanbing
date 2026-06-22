/**
 * @file Drizzle ORM SQLite schema 统一定义。
 *
 * 所有表集中管理，JSON 字段用 text 存储，时间统一 ISO string。
 * better-sqlite3 + drizzle-orm 仅在 main / utilityProcess 中使用。
 */

import { sql } from 'drizzle-orm'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export * from './app.schema'
export * from './task.schema'
export * from './setting.schema'
export * from './window-state.schema'
export * from './log.schema'
export * from './audit.schema'
export * from './sync.schema'
export * from './file-asset.schema'

/**
 * migration 记录表，跟踪已执行的 migration。
 */
export const migrations = sqliteTable('__migrations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  hash: text('hash').notNull(),
  appliedAt: text('applied_at').notNull().default(sql`CURRENT_TIMESTAMP`)
})

/**
 * schema 版本表，存储当前数据库 schema 版本号。
 */
export const schemaVersion = sqliteTable('__schema_version', {
  id: integer('id').primaryKey(),
  version: integer('version').notNull(),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`)
})
