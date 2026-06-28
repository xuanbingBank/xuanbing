/**
 * @file 同步队列表 schema（outbox / inbox），预留远程同步。
 *
 * ⚠️ 未实现状态:表结构已就绪,但当前无 SyncRepository、无 sync.service、无同步 IPC。
 * 若暂不实现云同步功能,这两张表仅作为占位存在,不影响应用运行。
 * 启用云同步时需补齐:
 *   1. electron/repositories/sync.repository.ts — outbox/inbox CRUD
 *   2. electron/services/sync.service.ts — 同步调度器(轮询/触发)
 *   3. electron/ipcBus/main/modules/sync.ipc.ts — 同步状态查询 IPC
 *   4. 远程服务端 API 对接
 */

import { sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

/**
 * sync_outbox：待推送至远程的变更队列。
 */
export const syncOutbox = sqliteTable(
  'sync_outbox',
  {
    id: text('id').primaryKey(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    operation: text('operation').notNull(),
    payload: text('payload'),
    status: text('status').notNull().default('pending'),
    retryCount: integer('retry_count').notNull().default(0),
    lastError: text('last_error'),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => ({
    statusIdx: index('idx_sync_outbox_status').on(table.status),
    entityIdx: index('idx_sync_outbox_entity').on(table.entityType, table.entityId)
  })
)

/**
 * sync_inbox：从远程拉取的变更队列。
 */
export const syncInbox = sqliteTable(
  'sync_inbox',
  {
    id: text('id').primaryKey(),
    entityType: text('entity_type').notNull(),
    externalId: text('external_id').notNull(),
    source: text('source').notNull(),
    payload: text('payload'),
    status: text('status').notNull().default('pending'),
    retryCount: integer('retry_count').notNull().default(0),
    lastError: text('last_error'),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    processedAt: text('processed_at')
  },
  (table) => ({
    statusIdx: index('idx_sync_inbox_status').on(table.status),
    entityIdx: index('idx_sync_inbox_entity').on(table.entityType, table.externalId)
  })
)
