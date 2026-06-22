/**
 * @file .xuanbing 文件导入器。
 *
 * 1. 导入前必须 dryRun。
 * 2. dryRun 生成导入计划：新增 / 更新 / 跳过 / 冲突 / 错误。
 * 3. 正式导入必须事务执行。
 * 4. 导入失败必须回滚。
 * 5. 支持冲突策略：skip / overwrite / rename / merge / fail。
 */

import { runTransaction } from '../database/db-transaction'
import { TaskRepository } from '../repositories/task.repository'
import { readXuanbingFile } from './xuanbing-file-reader'
import { throwDbError } from '../ipcBus/shared/database'
import type { XuanbingConflictStrategy } from '../ipcBus/shared/database'
import type { ImportPlan, ImportPlanItem, ImportResult, XuanbingFileRef } from './xuanbing-file-types'

/**
 * 任务导出 payload 结构。
 */
export interface TaskExportPayload {
  tasks: Array<{
    id: string
    type: string
    title: string
    status: string
    progress: number
    input: unknown
    output: unknown
    error: string | null
    startedAt: string | null
    finishedAt: string | null
    canceledAt: string | null
    createdAt: string
    updatedAt: string
  }>
  events: Array<{
    id: string
    taskId: string
    eventType: string
    message: string
    payload: unknown
    createdAt: string
  }>
}

/**
 * dryRun 导入预览。
 *
 * @param filePath 文件路径。
 * @param fileRef 文件引用。
 * @param conflictStrategy 冲突策略。
 * @returns 导入计划。
 */
export function dryRunImport(
  filePath: string,
  fileRef: XuanbingFileRef,
  conflictStrategy: XuanbingConflictStrategy = 'skip'
): ImportPlan {
  const file = readXuanbingFile(filePath)

  if (file.type !== 'task-export') {
    throwDbError('XUANBING_FILE_INVALID', `Unsupported file type for import: ${file.type}`, {
      safeDetail: { reason: 'unsupported_type', got: file.type }
    })
  }

  const payload = file.payload as TaskExportPayload
  const taskRepo = new TaskRepository()
  const items: ImportPlanItem[] = []

  for (const task of payload.tasks ?? []) {
    const existing = taskRepo.findById(task.id)

    if (!existing) {
      items.push({ key: task.id, action: 'create' })
    } else {
      switch (conflictStrategy) {
        case 'skip':
          items.push({ key: task.id, action: 'skip', reason: 'already exists', existingId: existing.id })
          break
        case 'overwrite':
          items.push({ key: task.id, action: 'update', reason: 'overwrite', existingId: existing.id })
          break
        case 'rename':
          items.push({ key: task.id, action: 'create', reason: 'renamed from ' + task.id })
          break
        case 'merge':
          items.push({ key: task.id, action: 'update', reason: 'merge', existingId: existing.id })
          break
        case 'fail':
          items.push({ key: task.id, action: 'conflict', reason: 'conflict, strategy=fail', existingId: existing.id })
          break
      }
    }
  }

  const summary = {
    create: items.filter((i) => i.action === 'create').length,
    update: items.filter((i) => i.action === 'update').length,
    skip: items.filter((i) => i.action === 'skip').length,
    conflict: items.filter((i) => i.action === 'conflict').length,
    error: items.filter((i) => i.action === 'error').length,
    total: items.length
  }

  return {
    fileRef,
    fileType: file.type,
    schemaVersion: file.schemaVersion,
    items,
    summary,
    conflictStrategy
  }
}

/**
 * 正式导入（事务执行，失败回滚）。
 *
 * @param filePath 文件路径。
 * @param plan 导入计划（必须先 dryRun）。
 * @returns 导入结果。
 */
export function importPackage(filePath: string, plan: ImportPlan): ImportResult {
  const file = readXuanbingFile(filePath)
  const payload = file.payload as TaskExportPayload
  const importedAt = new Date().toISOString()

  let imported = 0
  let skipped = 0
  const errors: Array<{ key: string; message: string }> = []

  try {
    runTransaction((tx) => {
      const taskRepo = new TaskRepository()

      for (const item of plan.items) {
        if (item.action === 'skip' || item.action === 'conflict') {
          skipped++
          continue
        }

        const task = payload.tasks?.find((t) => t.id === item.key)
        if (!task) {
          errors.push({ key: item.key, message: 'Task not found in payload' })
          continue
        }

        if (item.action === 'create') {
          // 如果是 rename 策略，生成新 ID
          const id = item.reason?.startsWith('renamed') ? `${task.id}-imported-${Date.now()}` : task.id

          tx.prepare(`
            INSERT INTO tasks (id, type, title, status, progress, input, output, error, started_at, finished_at, canceled_at, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            id,
            task.type,
            task.title,
            task.status,
            task.progress,
            task.input ? JSON.stringify(task.input) : null,
            task.output ? JSON.stringify(task.output) : null,
            task.error,
            task.startedAt,
            task.finishedAt,
            task.canceledAt,
            task.createdAt,
            task.updatedAt
          )

          // 导入关联事件
          const events = payload.events?.filter((e) => e.taskId === task.id) ?? []
          for (const event of events) {
            tx.prepare(`
              INSERT INTO task_events (id, task_id, event_type, message, payload, created_at)
              VALUES (?, ?, ?, ?, ?, ?)
            `).run(
              event.id,
              id,
              event.eventType,
              event.message,
              event.payload ? JSON.stringify(event.payload) : null,
              event.createdAt
            )
          }

          imported++
        } else if (item.action === 'update') {
          tx.prepare(`
            UPDATE tasks SET
              type = ?, title = ?, status = ?, progress = ?, input = ?, output = ?, error = ?,
              started_at = ?, finished_at = ?, canceled_at = ?, updated_at = ?
            WHERE id = ?
          `).run(
            task.type,
            task.title,
            task.status,
            task.progress,
            task.input ? JSON.stringify(task.input) : null,
            task.output ? JSON.stringify(task.output) : null,
            task.error,
            task.startedAt,
            task.finishedAt,
            task.canceledAt,
            new Date().toISOString(),
            task.id
          )
          imported++
        }
      }

      void taskRepo
    })

    return {
      success: true,
      imported,
      skipped,
      errors,
      rolledBack: false,
      importedAt
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      imported: 0,
      skipped,
      errors: [{ key: '__transaction__', message }],
      rolledBack: true,
      importedAt
    }
  }
}
