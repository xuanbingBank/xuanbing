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
 * .xuanbing 文件元数据 schema。
 */
export const xuanbingMetadataSchema = z.object({
  name: z.string().min(1).max(256),
  description: z.string().max(2048).default(''),
  author: z.string().max(128).default('local'),
  tags: z.array(z.string().max(64)).max(50).default([])
})

/**
 * .xuanbing 文件结构 schema。
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
