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
 * 运行时校验 payload 是否为合法的 TaskExportPayload。
 *
 * schema 层 payload 为 z.unknown(),此处兜底检查关键字段（tasks 数组），
 * 缺失或类型错误则抛错，避免后续 `as` 强转后访问 undefined 字段。
 *
 * TODO: 用 payload schema 替代 as 强转与手动校验。
 *
 * @param payload 待校验 payload。
 * @returns 校验通过的 payload。
 */
function assertTaskExportPayload(payload: unknown): TaskExportPayload {
  if (typeof payload !== 'object' || payload === null) {
    throwDbError('XUANBING_FILE_SCHEMA_FAILED', 'Payload is not an object.', {
      safeDetail: { reason: 'payload_not_object' }
    })
  }
  const obj = payload as Record<string, unknown>
  if (!Array.isArray(obj.tasks)) {
    throwDbError('XUANBING_FILE_SCHEMA_FAILED', 'Payload missing tasks array.', {
      safeDetail: { reason: 'payload_missing_tasks' }
    })
  }
  // events 可选,若存在必须为数组
  if (obj.events !== undefined && !Array.isArray(obj.events)) {
    throwDbError('XUANBING_FILE_SCHEMA_FAILED', 'Payload events must be an array.', {
      safeDetail: { reason: 'payload_events_not_array' }
    })
  }
  return payload as TaskExportPayload
}

/**
 * 计算单个任务的导入动作（dryRun 与 importPackage 共用，确保两端判定一致）。
 *
 * 复用同一份冲突检测逻辑，避免 dryRun 与正式导入判定分叉导致越权。
 *
 * @param task 待导入任务（仅需 id 字段）。
 * @param conflictStrategy 冲突策略。
 * @param taskRepo 任务仓储。
 * @returns 导入计划项。
 */
function computeAction(
  task: { id: string },
  conflictStrategy: XuanbingConflictStrategy,
  taskRepo: TaskRepository
): ImportPlanItem {
  const existing = taskRepo.findById(task.id)

  if (!existing) {
    return { key: task.id, action: 'create' }
  }

  switch (conflictStrategy) {
    case 'skip':
      return { key: task.id, action: 'skip', reason: 'already exists', existingId: existing.id }
    case 'overwrite':
      return { key: task.id, action: 'update', reason: 'overwrite', existingId: existing.id }
    case 'rename':
      return { key: task.id, action: 'create', reason: 'renamed from ' + task.id }
    case 'merge':
      // TODO: 当前 merge 实为全量覆盖,非字段级合并。此处仅打标 reason='merge',
      // 后续 importPackage 的 update 分支会用 payload 整体覆盖本地行。
      // 字段级合并策略(仅覆盖非空字段/按字段 conflictStrategy 合并)待实现。
      return { key: task.id, action: 'update', reason: 'merge', existingId: existing.id }
    case 'fail':
      return { key: task.id, action: 'conflict', reason: 'conflict, strategy=fail', existingId: existing.id }
  }
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

  // TODO: 用 payload schema 替代 as 强转
  const payload = assertTaskExportPayload(file.payload)
  const taskRepo = new TaskRepository()
  const items: ImportPlanItem[] = []

  for (const task of payload.tasks ?? []) {
    items.push(computeAction(task, conflictStrategy, taskRepo))
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
    conflictStrategy,
    dryRunChecksum: file.checksum
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
  // TODO: 用 payload schema 替代 as 强转
  const payload = assertTaskExportPayload(file.payload)
  const importedAt = new Date().toISOString()

  // 绑定 plan 与 dryRun 时的文件状态：checksum 不一致说明 dryRun 后文件被替换/篡改
  if (plan.dryRunChecksum !== undefined && plan.dryRunChecksum !== file.checksum) {
    throwDbError('XUANBING_FILE_IMPORT_FAILED', 'Plan checksum mismatch.', {
      severity: 'high',
      safeDetail: { reason: 'plan_checksum_mismatch' }
    })
  }

  // 服务端逐项重校验 action：renderer 可能在 checksum 不变前提下篡改 plan.items[*].action
  // （如把 dryRun 的 skip/conflict 改为 update/create 绕过冲突策略覆盖或新增任意任务）。
  // 复用 dryRunImport 的 computeAction 重新计算每个 item 应有的 action，
  // 与 plan 传入的 action 不一致则拒绝整个导入并抛错。
  // 执行阶段改用重算后的 items 驱动，避免 renderer 伪造的 reason 等字段影响导入行为。
  const taskRepo = new TaskRepository()
  const recomputedItems: ImportPlanItem[] = []
  for (const item of plan.items) {
    const task = payload.tasks?.find((t) => t.id === item.key)
    if (!task) {
      // plan 中存在 payload 里没有的 key，疑似篡改
      throwDbError('XUANBING_FILE_IMPORT_FAILED', 'Plan item key not found in payload.', {
        severity: 'high',
        safeDetail: { reason: 'plan_item_key_not_in_payload', key: item.key }
      })
    }
    const expected = computeAction(task, plan.conflictStrategy, taskRepo)
    if (expected.action !== item.action) {
      throwDbError('XUANBING_FILE_IMPORT_FAILED', 'Plan item action mismatch.', {
        severity: 'high',
        safeDetail: {
          reason: 'plan_item_action_mismatch',
          key: item.key,
          expected: expected.action,
          actual: item.action
        }
      })
    }
    recomputedItems.push(expected)
  }

  let imported = 0
  let skipped = 0
  const errors: Array<{ key: string; message: string }> = []

  try {
    runTransaction((tx) => {
      for (const item of recomputedItems) {
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
          let importSuffix = item.reason?.startsWith('renamed') ? `imported-${Date.now()}` : ''
          // 预检 rename 新 ID 冲突：生成的新 ID 可能撞上现有任务，冲突则追加随机后缀
          if (importSuffix && taskRepo.findById(`${task.id}-${importSuffix}`)) {
            importSuffix = `${importSuffix}-${Math.random().toString(36).slice(2, 8)}`
          }
          const id = importSuffix ? `${task.id}-${importSuffix}` : task.id

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
            const eventId = importSuffix ? `${event.id}-${importSuffix}` : event.id
            tx.prepare(`
              INSERT INTO task_events (id, task_id, event_type, message, payload, created_at)
              VALUES (?, ?, ?, ?, ?, ?)
            `).run(
              eventId,
              id,
              event.eventType,
              event.message,
              event.payload ? JSON.stringify(event.payload) : null,
              event.createdAt
            )
          }

          imported++
        } else if (item.action === 'update') {
          // 注意:此处为全量覆盖,非字段级合并。merge/overwrite 策略均走此分支,
          // 用 payload 整体替换本地行字段。TODO: 支持按字段 conflictStrategy 合并。
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
    // 记录错误日志便于排查；此处保留 return 而非 throw 以向调用方返回结构化失败结果
    console.error('[import] importPackage failed:', message, error)
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
