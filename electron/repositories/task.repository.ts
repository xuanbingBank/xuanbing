/**
 * @file 任务 repository。
 *
 * 只负责 tasks 与 task_events 表的数据库访问。
 */

import { BaseRepository, deserializeJson, generateId, nowIso, serializeJson } from './base.repository'
import type { ListQuery, PageResult } from '../ipcBus/shared/database'
import type { TaskEventType, TaskStatus, TaskType } from '../ipcBus/shared/database'

/**
 * 任务记录（数据库行类型）。
 */
export interface TaskRow {
  id: string
  type: string
  title: string
  status: string
  progress: number
  input: string | null
  output: string | null
  error: string | null
  startedAt: string | null
  finishedAt: string | null
  canceledAt: string | null
  createdAt: string
  updatedAt: string
}

/**
 * 任务事件记录（数据库行类型）。
 */
export interface TaskEventRow {
  id: string
  taskId: string
  eventType: string
  message: string
  payload: string | null
  createdAt: string
}

/**
 * 创建任务输入。
 */
export interface CreateTaskInput {
  id?: string
  type: TaskType
  title: string
  status?: TaskStatus
  progress?: number
  input?: unknown
}

/**
 * 更新任务输入。
 */
export interface UpdateTaskInput {
  status?: TaskStatus
  progress?: number
  output?: unknown
  error?: string | null
  startedAt?: string | null
  finishedAt?: string | null
  canceledAt?: string | null
}

/**
 * 任务查询过滤。
 */
export interface TaskFilter {
  status?: TaskStatus
  type?: TaskType
}

/**
 * 任务 repository。
 */
export class TaskRepository extends BaseRepository {
  /**
   * 创建任务。
   *
   * @param input 创建输入。
   * @returns 任务行。
   */
  create(input: CreateTaskInput): TaskRow {
    const id = input.id ?? generateId()
    const now = nowIso()
    const status = input.status ?? 'pending'
    const progress = input.progress ?? 0

    this.db.prepare(`
      INSERT INTO tasks (id, type, title, status, progress, input, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, input.type, input.title, status, progress, serializeJson(input.input ?? null), now, now)

    return this.findById(id)!
  }

  /**
   * 根据 ID 查找任务。
   *
   * @param id 任务 ID。
   * @returns 任务行或 null。
   */
  findById(id: string): TaskRow | null {
    return (this.db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as TaskRow | undefined) ?? null
  }

  /**
   * 分页查询任务。
   *
   * @param query 查询参数。
   * @returns 分页结果。
   */
  list(query: ListQuery<TaskFilter> = {}): PageResult<TaskRow> {
    const conditions: string[] = []
    const params: unknown[] = []

    const filter = query.filter
    if (filter?.status) {
      conditions.push('status = ?')
      params.push(filter.status)
    }
    if (filter?.type) {
      conditions.push('type = ?')
      params.push(filter.type)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const sortSql = this.buildSortSql(query.sort, ['created_at', 'updated_at', 'status', 'type', 'progress']) || 'ORDER BY created_at DESC'

    const countSql = `SELECT COUNT(*) as c FROM tasks ${whereClause}`
    const listSql = `SELECT * FROM tasks ${whereClause} ${sortSql} LIMIT ? OFFSET ?`

    return this.paginate<TaskRow>(countSql, listSql, params, query)
  }

  /**
   * 更新任务。
   *
   * @param id 任务 ID。
   * @param input 更新输入。
   * @returns 更新后的任务行或 null。
   */
  update(id: string, input: UpdateTaskInput): TaskRow | null {
    const sets: string[] = []
    const params: unknown[] = []

    if (input.status !== undefined) {
      sets.push('status = ?')
      params.push(input.status)
    }
    if (input.progress !== undefined) {
      sets.push('progress = ?')
      params.push(input.progress)
    }
    if (input.output !== undefined) {
      sets.push('output = ?')
      params.push(serializeJson(input.output))
    }
    if (input.error !== undefined) {
      sets.push('error = ?')
      params.push(input.error)
    }
    if (input.startedAt !== undefined) {
      sets.push('started_at = ?')
      params.push(input.startedAt)
    }
    if (input.finishedAt !== undefined) {
      sets.push('finished_at = ?')
      params.push(input.finishedAt)
    }
    if (input.canceledAt !== undefined) {
      sets.push('canceled_at = ?')
      params.push(input.canceledAt)
    }

    if (sets.length === 0) {
      return this.findById(id)
    }

    sets.push('updated_at = ?')
    params.push(nowIso())
    params.push(id)

    this.db.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`).run(...params)

    return this.findById(id)
  }

  /**
   * 删除任务（物理删除，连带事件级联删除）。
   *
   * @param id 任务 ID。
   * @returns 是否删除成功。
   */
  delete(id: string): boolean {
    const result = this.db.prepare('DELETE FROM tasks WHERE id = ?').run(id)
    return result.changes > 0
  }

  /**
   * 添加任务事件。
   *
   * @param taskId 任务 ID。
   * @param eventType 事件类型。
   * @param message 消息。
   * @param payload 载荷。
   * @returns 事件行。
   */
  addEvent(taskId: string, eventType: TaskEventType, message: string, payload?: unknown): TaskEventRow {
    const id = generateId()
    const now = nowIso()

    this.db.prepare(`
      INSERT INTO task_events (id, task_id, event_type, message, payload, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, taskId, eventType, message, serializeJson(payload ?? null), now)

    return (this.db.prepare('SELECT * FROM task_events WHERE id = ?').get(id) as TaskEventRow) ?? { id, taskId, eventType, message, payload: serializeJson(payload ?? null), createdAt: now }
  }

  /**
   * 查询任务事件列表。
   *
   * @param taskId 任务 ID。
   * @returns 事件列表。
   */
  listEvents(taskId: string): TaskEventRow[] {
    return this.db.prepare('SELECT * FROM task_events WHERE task_id = ? ORDER BY created_at ASC').all(taskId) as TaskEventRow[]
  }

  /**
   * 获取任务及其事件。
   *
   * @param id 任务 ID。
   * @returns 任务与事件。
   */
  getWithEvents(id: string): { task: TaskRow | null; events: TaskEventRow[] } {
    const task = this.findById(id)
    const events = task ? this.listEvents(id) : []
    return { task, events }
  }

  /**
   * 反序列化任务行的 JSON 字段。
   *
   * @param row 任务行。
   * @returns 反序列化后的任务。
   */
  static deserializeTask(row: TaskRow): {
    id: string
    type: TaskType
    title: string
    status: TaskStatus
    progress: number
    input: unknown
    output: unknown
    error: string | null
    startedAt: string | null
    finishedAt: string | null
    canceledAt: string | null
    createdAt: string
    updatedAt: string
  } {
    return {
      id: row.id,
      type: row.type as TaskType,
      title: row.title,
      status: row.status as TaskStatus,
      progress: row.progress,
      input: deserializeJson(row.input),
      output: deserializeJson(row.output),
      error: row.error,
      startedAt: row.startedAt,
      finishedAt: row.finishedAt,
      canceledAt: row.canceledAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }
  }

  /**
   * 反序列化任务事件行的 JSON 字段。
   *
   * @param row 事件行。
   * @returns 反序列化后的事件。
   */
  static deserializeEvent(row: TaskEventRow): {
    id: string
    taskId: string
    eventType: TaskEventType
    message: string
    payload: unknown
    createdAt: string
  } {
    return {
      id: row.id,
      taskId: row.taskId,
      eventType: row.eventType as TaskEventType,
      message: row.message,
      payload: deserializeJson(row.payload),
      createdAt: row.createdAt
    }
  }
}
