/**
 * @file 任务与任务事件表 schema。
 */

import { sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

/**
 * tasks：后台任务记录。
 */
export const tasks = sqliteTable(
  'tasks',
  {
    id: text('id').primaryKey(),
    type: text('type').notNull(),
    title: text('title').notNull(),
    status: text('status').notNull().default('pending'),
    progress: integer('progress').notNull().default(0),
    input: text('input'),
    output: text('output'),
    error: text('error'),
    startedAt: text('started_at'),
    finishedAt: text('finished_at'),
    canceledAt: text('canceled_at'),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => ({
    statusIdx: index('idx_tasks_status').on(table.status),
    typeIdx: index('idx_tasks_type').on(table.type),
    createdAtIdx: index('idx_tasks_created_at').on(table.createdAt)
  })
)

/**
 * task_events：任务事件流水。
 */
export const taskEvents = sqliteTable(
  'task_events',
  {
    id: text('id').primaryKey(),
    taskId: text('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    eventType: text('event_type').notNull(),
    message: text('message').notNull().default(''),
    payload: text('payload'),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => ({
    taskIdIdx: index('idx_task_events_task_id').on(table.taskId),
    createdAtIdx: index('idx_task_events_created_at').on(table.createdAt)
  })
)
