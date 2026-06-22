/**
 * @file 任务服务，负责任务创建、更新、查询、事件记录。
 *
 * service 负责业务事务。任务创建 + 任务事件必须事务。
 * 重要写操作写 audit_logs。
 */

import { runTransaction } from '../database/db-transaction'
import { TaskRepository } from '../repositories/task.repository'
import { AuditRepository } from '../repositories/audit.repository'
import { generateId, nowIso, serializeJson } from '../repositories/base.repository'
import type { ListQuery, PageResult } from '../ipcBus/shared/database'
import type { CreateTaskInput, TaskFilter, TaskRow, UpdateTaskInput } from '../repositories/task.repository'

/**
 * 反序列化后的任务类型。
 */
export type TaskEntity = ReturnType<typeof TaskRepository.deserializeTask>

/**
 * 反序列化后的事件类型。
 */
export type TaskEventEntity = ReturnType<typeof TaskRepository.deserializeEvent>

/**
 * 任务 service。
 */
export class TaskService {
  private readonly taskRepo = new TaskRepository()
  private readonly auditRepo = new AuditRepository()

  /**
   * 创建任务（事务：创建任务 + 记录事件 + 审计）。
   *
   * @param input 创建输入。
   * @param actorId 操作者 ID。
   * @returns 创建的任务。
   */
  create(input: CreateTaskInput, actorId = 'system'): TaskEntity {
    return runTransaction((tx) => {
      const now = nowIso()
      const id = input.id ?? generateId()

      tx.prepare(`
        INSERT INTO tasks (id, type, title, status, progress, input, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        input.type,
        input.title,
        input.status ?? 'pending',
        input.progress ?? 0,
        serializeJson(input.input ?? null),
        now,
        now
      )

      tx.prepare(`
        INSERT INTO task_events (id, task_id, event_type, message, payload, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(generateId(), id, 'created', `Task created: ${input.title}`, serializeJson({ type: input.type }), now)

      tx.prepare(`
        INSERT INTO audit_logs (id, actor_type, actor_id, action, entity_type, entity_id, after, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(generateId(), 'system', actorId, 'create', 'task', id, serializeJson({ type: input.type, title: input.title }), now)

      const row = tx.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as TaskRow
      return TaskRepository.deserializeTask(row)
    })
  }

  /**
   * 更新任务（事务：更新任务 + 记录事件 + 审计）。
   *
   * @param id 任务 ID。
   * @param input 更新输入。
   * @param actorId 操作者 ID。
   * @returns 更新后的任务或 null。
   */
  update(id: string, input: UpdateTaskInput, actorId = 'system'): TaskEntity | null {
    return runTransaction((tx) => {
      const existing = tx.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as TaskRow | undefined
      if (!existing) {
        return null
      }

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
        return TaskRepository.deserializeTask(existing)
      }

      const now = nowIso()
      sets.push('updated_at = ?')
      params.push(now)
      params.push(id)

      tx.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`).run(...params)

      const eventType = input.status === 'success' ? 'completed'
        : input.status === 'failed' ? 'failed'
        : input.status === 'canceled' ? 'canceled'
        : 'progress'

      tx.prepare(`
        INSERT INTO task_events (id, task_id, event_type, message, payload, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(generateId(), id, eventType, `Task ${eventType}: ${input.status ?? 'updated'}`, serializeJson({ status: input.status, progress: input.progress }), now)

      tx.prepare(`
        INSERT INTO audit_logs (id, actor_type, actor_id, action, entity_type, entity_id, before, after, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        generateId(),
        'system',
        actorId,
        'update',
        'task',
        id,
        serializeJson({ status: existing.status, progress: existing.progress }),
        serializeJson({ status: input.status, progress: input.progress }),
        now
      )

      const row = tx.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as TaskRow
      return TaskRepository.deserializeTask(row)
    })
  }

  /**
   * 根据 ID 查找任务。
   *
   * @param id 任务 ID。
   * @returns 任务或 null。
   */
  findById(id: string): TaskEntity | null {
    const row = this.taskRepo.findById(id)
    return row ? TaskRepository.deserializeTask(row) : null
  }

  /**
   * 分页查询任务。
   *
   * @param query 查询参数。
   * @returns 分页结果。
   */
  list(query: ListQuery<TaskFilter> = {}): PageResult<TaskEntity> {
    const result = this.taskRepo.list(query)
    return {
      ...result,
      items: result.items.map((row) => TaskRepository.deserializeTask(row))
    }
  }

  /**
   * 获取任务及其事件。
   *
   * @param id 任务 ID。
   * @returns 任务与事件。
   */
  getWithEvents(id: string): { task: TaskEntity | null; events: TaskEventEntity[] } {
    const { task, events } = this.taskRepo.getWithEvents(id)
    return {
      task: task ? TaskRepository.deserializeTask(task) : null,
      events: events.map((row) => TaskRepository.deserializeEvent(row))
    }
  }

  /**
   * 删除任务。
   *
   * @param id 任务 ID。
   * @param actorId 操作者 ID。
   * @returns 是否删除成功。
   */
  delete(id: string, actorId = 'system'): boolean {
    const result = this.taskRepo.delete(id)

    if (result) {
      this.auditRepo.create({
        actorType: 'system',
        actorId,
        action: 'delete',
        entityType: 'task',
        entityId: id,
        metadata: { deletedAt: nowIso() }
      })
    }

    return result
  }
}
