/**
 * @file .xuanbing 文件 zod schema 校验。
 *
 * 使用真实 zod（main 进程可用外部依赖）。
 */

import { z } from 'zod'
import {
  XUANBING_FILE_TYPES,
  XUANBING_CONFLICT_STRATEGIES,
  XUANBING_FORMAT_VERSION,
  XUANBING_MAGIC
} from '../ipcBus/shared/database'
import type { XuanbingFile } from './xuanbing-file-types'

/**
 * .xuanbing 文件支持的最低 formatVersion。
 *
 * 低于此版本的文件拒绝读取，作为未来版本迁移框架的占位：
 * 当格式演进引入不兼容变更时，提升此常量并实现对应迁移函数。
 */
export const XUANBING_MIN_SUPPORTED_VERSION = 1

/**
 * .xuanbing 文件元数据 schema。
 */
export const xuanbingMetadataSchema = z.object({
  name: z.string().min(1).max(256),
  description: z.string().max(2048).default(''),
  author: z.string().max(128).default('local'),
  tags: z.array(z.string().max(64)).max(50).default([])
})

/**
 * task-export 类型 payload schema。
 *
 * 与 importer 内 TaskExportPayload 结构对齐，作为未来 discriminatedUnion 落地的基础。
 * 当前未在 xuanbingFileSchema 中强制使用，仍由 importer 内 assertTaskExportPayload 兜底校验。
 */
export const taskExportPayloadSchema = z.object({
  tasks: z.array(
    z.object({
      id: z.string(),
      type: z.string(),
      title: z.string(),
      status: z.string(),
      progress: z.number(),
      input: z.unknown(),
      output: z.unknown(),
      error: z.string().nullable(),
      startedAt: z.string().nullable(),
      finishedAt: z.string().nullable(),
      canceledAt: z.string().nullable(),
      createdAt: z.string(),
      updatedAt: z.string()
    })
  ),
  events: z
    .array(
      z.object({
        id: z.string(),
        taskId: z.string(),
        eventType: z.string(),
        message: z.string(),
        payload: z.unknown(),
        createdAt: z.string()
      })
    )
    .optional()
})

/**
 * 其余文件类型 payload schema 占位。
 *
 * 对应 importer 尚未稳定，暂以宽松 record 占位，待落地后细化。
 */
export const settingsPackagePayloadSchema = z.record(z.string(), z.unknown())
export const workspacePackagePayloadSchema = z.record(z.string(), z.unknown())
export const pluginPackagePayloadSchema = z.record(z.string(), z.unknown())
export const dataSnapshotPayloadSchema = z.record(z.string(), z.unknown())
export const diagnosticsPackagePayloadSchema = z.record(z.string(), z.unknown())
export const customJsonDbPayloadSchema = z.record(z.string(), z.unknown())

/**
 * .xuanbing 文件结构 schema。
 *
 * payload 当前为 unknown（向后兼容），TODO 改为 discriminatedUnion（按 type 选择上方各 payload schema），
 * 由 importer 内 assertTaskExportPayload 兜底校验。上方已预定义各类型 payload schema 常量供后续切换引用。
 */
export const xuanbingFileSchema = z.object({
  magic: z.literal(XUANBING_MAGIC),
  formatVersion: z.number().int().min(1),
  type: z.enum(XUANBING_FILE_TYPES as unknown as [string, ...string[]]),
  appVersion: z.string().min(1),
  schemaVersion: z.number().int().min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  metadata: xuanbingMetadataSchema,
  // TODO: 改为 discriminatedUnion,每种文件类型定义 payload schema
  // (settings-package / task-export / workspace-package / ...)。
  // 当前保留 z.unknown(),由 importer 内运行时关键字段检查兜底。
  payload: z.unknown(),
  checksum: z.string().min(1)
})

/**
 * 冲突策略 schema。
 */
export const conflictStrategySchema = z.enum(XUANBING_CONFLICT_STRATEGIES as unknown as [string, ...string[]])

/**
 * 导出输入 schema。
 */
export const exportPackageInputSchema = z.object({
  type: z.enum(XUANBING_FILE_TYPES as unknown as [string, ...string[]]),
  metadata: xuanbingMetadataSchema.partial().optional(),
  options: z
    .object({
      redact: z.boolean().optional(),
      filter: z.record(z.string(), z.unknown()).optional()
    })
    .optional()
})

/**
 * safeParse 返回类型。
 */
export type XuanbingSafeParseResult =
  | { success: true; data: XuanbingFile }
  | { success: false; error: z.ZodError }

/**
 * 校验 .xuanbing 文件结构。
 *
 * @param data 待校验数据。
 * @returns 校验结果。
 */
export function validateXuanbingFile(data: unknown): XuanbingSafeParseResult {
  return xuanbingFileSchema.safeParse(data) as XuanbingSafeParseResult
}

/**
 * 当前格式版本。
 */
export { XUANBING_FORMAT_VERSION }
