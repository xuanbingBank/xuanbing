/**
 * @file .xuanbing 文件导出器。
 *
 * 1. 从 SQLite 收集数据。
 * 2. 构建 .xuanbing 文件结构。
 * 3. 支持脱敏。
 * 4. 原子写入。
 */

import path from 'node:path'
import fs from 'node:fs'
import { TaskRepository } from '../repositories/task.repository'
import { createAndWriteXuanbingFile } from './xuanbing-file-writer'
import { ensurePathWithinDir, ensureXuanbingExtension, sanitizeFileName } from './safe-file-path'
import { CURRENT_SCHEMA_VERSION } from '../ipcBus/shared/database'
import { runInTransaction } from '../database/db-transaction'
import type { XuanbingFileMetadata } from './xuanbing-file-types'
import type { TaskExportPayload } from './xuanbing-file-importer'
import type { XuanbingFileType } from '../ipcBus/shared/database'

/**
 * 路径级并发锁，避免同一文件路径被并发写入。
 */
const pathLocks = new Map<string, Promise<void>>()

/**
 * 在路径锁保护下执行异步操作，串行化同一路径的并发写入。
 *
 * @param lockPath 锁定的路径。
 * @param fn 受保护执行的异步操作。
 * @returns fn 的返回值。
 */
async function withPathLock<T>(lockPath: string, fn: () => Promise<T> | T): Promise<T> {
  const prev = pathLocks.get(lockPath) ?? Promise.resolve()
  let release!: () => void
  const next = new Promise<void>((resolve) => {
    release = resolve
  })
  pathLocks.set(lockPath, next)

  try {
    await prev
    return await fn()
  } finally {
    release()
    if (pathLocks.get(lockPath) === next) {
      pathLocks.delete(lockPath)
    }
  }
}

/**
 * 导出选项。
 */
export interface ExportOptions {
  /** 导出目录。 */
  outputDir: string
  /** 文件名（不含扩展名）。 */
  fileName?: string
  /** 应用版本。 */
  appVersion: string
  /** 元数据。 */
  metadata?: Partial<XuanbingFileMetadata>
  /** 是否脱敏。 */
  redact?: boolean
  /** 数据过滤。 // TODO: filter 仅识别 status,其余字段被忽略 */
  filter?: Record<string, unknown>
}

/**
 * 导出结果。
 */
export interface ExportFileResult {
  filePath: string
  fileName: string
  size: number
  checksum: string
  fileType: XuanbingFileType
  exportedAt: string
}

/**
 * 收集任务导出数据。
 *
 * @param filter 过滤条件。
 * @param redact 是否脱敏。
 * @returns 任务导出 payload。
 */
function collectTaskExportData(filter?: Record<string, unknown>, redact?: boolean): TaskExportPayload {
  // 包裹在事务中读取,保证 tasks 与 events 为同一时刻的快照,
  // 避免分页过程中其他写入导致 tasks/events 不一致。
  return runInTransaction(() => {
    const taskRepo = new TaskRepository()

    // TODO: filter 仅识别 status,其余字段被忽略
    const statusFilter = filter?.status as string | undefined
    const pageSize = 200
    const tasks: ReturnType<typeof TaskRepository.deserializeTask>[] = []

    let page = 1
    while (true) {
      const result = taskRepo.list({
        page,
        pageSize,
        filter: statusFilter ? { status: statusFilter as never } : undefined
      })
      const pageTasks = result.items.map((row) => TaskRepository.deserializeTask(row))
      tasks.push(...pageTasks)
      if (result.items.length < pageSize) {
        break
      }
      page++
    }

    if (tasks.length > pageSize * 10) {
      console.warn('[export] exporting %d tasks', tasks.length)
    }

    const events: TaskExportPayload['events'] = []

    for (const task of tasks) {
      const eventRows = taskRepo.listEvents(task.id)
      for (const eventRow of eventRows) {
        const event = TaskRepository.deserializeEvent(eventRow)
        events.push({
          id: event.id,
          taskId: event.taskId,
          eventType: event.eventType,
          message: event.message,
          payload: redact ? null : event.payload,
          createdAt: event.createdAt
        })
      }
    }

    return {
      tasks: tasks.map((t) => ({
        id: t.id,
        type: t.type,
        title: t.title,
        status: t.status,
        progress: t.progress,
        input: redact ? null : t.input,
        output: redact ? null : t.output,
        error: t.error,
        startedAt: t.startedAt,
        finishedAt: t.finishedAt,
        canceledAt: t.canceledAt,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt
      })),
      events
    }
  })
}

/**
 * 导出 .xuanbing 文件。
 *
 * @param type 文件类型。
 * @param options 导出选项。
 * @returns 导出结果。
 */
export function exportPackage(
  type: XuanbingFileType,
  options: ExportOptions
): ExportFileResult {
  // TODO: 同步版未走 withPathLock，无法串行化同一路径的并发写入，
  // 调用方需自行避免并发；后续考虑统一改为带锁实现。
  // 收集数据
  let payload: unknown

  if (type === 'task-export') {
    payload = collectTaskExportData(options.filter, options.redact)
  } else {
    payload = {}
  }

  // 构建文件名
  const baseName = sanitizeFileName(options.fileName ?? `export-${type}`)
  const fileName = `${baseName}.xuanbing`
  const outputPath = path.join(options.outputDir, fileName)

  // 安全校验
  ensurePathWithinDir(outputPath, options.outputDir)
  ensureXuanbingExtension(outputPath)

  // 构建元数据
  const metadata: XuanbingFileMetadata = {
    name: options.metadata?.name ?? baseName,
    description: options.metadata?.description ?? '',
    author: options.metadata?.author ?? 'local',
    tags: options.metadata?.tags ?? []
  }

  // 写入文件
  const file = createAndWriteXuanbingFile(outputPath, {
    type,
    appVersion: options.appVersion,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    metadata,
    payload
  })

  let size: number
  try {
    size = fs.statSync(outputPath).size
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to stat exported file "${outputPath}": ${message}`)
  }

  return {
    filePath: outputPath,
    fileName,
    size,
    checksum: file.checksum,
    fileType: type,
    exportedAt: new Date().toISOString()
  }
}

/**
 * 导出至指定路径（用于 saveDialog 后写入）。
 *
 * @param filePath 目标文件路径。
 * @param type 文件类型。
 * @param appVersion 应用版本。
 * @param metadata 元数据。
 * @param redact 是否脱敏。
 * @param allowedDir 允许的基础目录（由调用方传入，避免在 file-db 层直接依赖 electron）。
 * @returns 导出结果。
 */
export async function exportToPath(
  filePath: string,
  type: XuanbingFileType,
  appVersion: string,
  metadata?: Partial<XuanbingFileMetadata>,
  redact?: boolean,
  allowedDir?: string
): Promise<ExportFileResult> {
  ensureXuanbingExtension(filePath)
  if (allowedDir) {
    ensurePathWithinDir(filePath, allowedDir)
  }

  return withPathLock(filePath, () => {
    let payload: unknown
    if (type === 'task-export') {
      // TODO: 当前未传 filter，导出全量任务；后续如需支持按条件导出，
      // 应由调用方传入 filter 并透传给 collectTaskExportData。
      payload = collectTaskExportData(undefined, redact)
    } else {
      payload = {}
    }

    const fullMetadata: XuanbingFileMetadata = {
      name: metadata?.name ?? path.basename(filePath, '.xuanbing'),
      description: metadata?.description ?? '',
      author: metadata?.author ?? 'local',
      tags: metadata?.tags ?? []
    }

    const file = createAndWriteXuanbingFile(filePath, {
      type,
      appVersion,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      metadata: fullMetadata,
      payload
    })

    let size: number
    try {
      size = fs.statSync(filePath).size
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to stat exported file "${filePath}": ${message}`)
    }

    return {
      filePath,
      fileName: path.basename(filePath),
      size,
      checksum: file.checksum,
      fileType: type,
      exportedAt: new Date().toISOString()
    }
  })
}
