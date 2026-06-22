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
import { throwDbError, CURRENT_SCHEMA_VERSION } from '../ipcBus/shared/database'
import type { XuanbingFileMetadata } from './xuanbing-file-types'
import type { TaskExportPayload } from './xuanbing-file-importer'
import type { XuanbingFileType } from '../ipcBus/shared/database'

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
  /** 数据过滤。 */
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
  const taskRepo = new TaskRepository()

  const statusFilter = filter?.status as string | undefined
  const result = taskRepo.list({
    page: 1,
    pageSize: 200,
    filter: statusFilter ? { status: statusFilter as never } : undefined
  })

  const tasks = result.items.map((row) => TaskRepository.deserializeTask(row))
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

  const stat = fs.statSync(outputPath)

  return {
    filePath: outputPath,
    fileName,
    size: stat.size,
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
 * @returns 导出结果。
 */
export function exportToPath(
  filePath: string,
  type: XuanbingFileType,
  appVersion: string,
  metadata?: Partial<XuanbingFileMetadata>,
  redact?: boolean
): ExportFileResult {
  ensureXuanbingExtension(filePath)

  let payload: unknown
  if (type === 'task-export') {
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

  const stat = fs.statSync(filePath)

  return {
    filePath,
    fileName: path.basename(filePath),
    size: stat.size,
    checksum: file.checksum,
    fileType: type,
    exportedAt: new Date().toISOString()
  }
}

// 引入 throwDbError 避免未使用警告
void throwDbError
