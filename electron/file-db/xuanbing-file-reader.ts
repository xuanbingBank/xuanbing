/**
 * @file .xuanbing 文件读取器。
 *
 * 读取时必须验证 checksum、magic、formatVersion、schemaVersion。
 */

import fs from 'node:fs'
import { throwDbError } from '../ipcBus/shared/database'
import { XUANBING_FORMAT_VERSION, XUANBING_MAGIC, XUANBING_MAX_FILE_BYTES } from '../ipcBus/shared/database'
import { verifyChecksum } from './xuanbing-file-checksum'
import { validateXuanbingFile } from './xuanbing-file.schema'
import { ensureFileSize, ensureXuanbingExtension } from './safe-file-path'
import type { XuanbingFile } from './xuanbing-file-types'

/**
 * 读取 .xuanbing 文件。
 *
 * 流程：
 * 1. 校验扩展名。
 * 2. 校验文件大小。
 * 3. 读取并解析 JSON。
 * 4. 校验 magic。
 * 5. 校验 formatVersion。
 * 6. zod schema 校验。
 * 7. 校验 checksum。
 *
 * @param filePath 文件路径。
 * @returns .xuanbing 文件对象。
 */
export function readXuanbingFile(filePath: string): XuanbingFile {
  // 1. 校验扩展名
  ensureXuanbingExtension(filePath)

  // 2. 校验文件大小
  ensureFileSize(filePath, XUANBING_MAX_FILE_BYTES)

  // 3. 读取并解析 JSON
  let rawContent: string
  try {
    rawContent = fs.readFileSync(filePath, 'utf8')
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throwDbError('XUANBING_FILE_INVALID', 'Failed to read file.', {
      safeDetail: { reason: 'read_failed' },
      devDetail: message
    })
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(rawContent)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throwDbError('XUANBING_FILE_INVALID', 'File content is not valid JSON.', {
      safeDetail: { reason: 'invalid_json' },
      devDetail: message
    })
  }

  // 4. 校验 magic（在完整 schema 校验前快速失败）
  if (typeof parsed === 'object' && parsed !== null) {
    const magic = (parsed as { magic?: unknown }).magic
    if (magic !== XUANBING_MAGIC) {
      throwDbError('XUANBING_FILE_INVALID', 'Invalid file magic.', {
        safeDetail: { reason: 'invalid_magic', expected: XUANBING_MAGIC }
      })
    }
  }

  // 5. zod schema 校验（包含 formatVersion、schemaVersion 等）
  const result = validateXuanbingFile(parsed)
  if (!result.success) {
    const issues = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    throwDbError('XUANBING_FILE_SCHEMA_FAILED', 'File schema validation failed.', {
      safeDetail: { reason: 'schema_failed', issues },
      devDetail: issues
    })
  }

  const file = result.data

  // 6. 校验 formatVersion
  if (file.formatVersion > XUANBING_FORMAT_VERSION) {
    throwDbError('XUANBING_FILE_VERSION_UNSUPPORTED', `Unsupported format version ${file.formatVersion}.`, {
      safeDetail: { reason: 'unsupported_format_version', got: file.formatVersion, max: XUANBING_FORMAT_VERSION }
    })
  }

  // 7. 校验 checksum
  if (!verifyChecksum(file)) {
    throwDbError('XUANBING_FILE_CHECKSUM_FAILED', 'Checksum verification failed.', {
      severity: 'high',
      safeDetail: { reason: 'checksum_mismatch' }
    })
  }

  return file
}

/**
 * 安全读取文件内容（不暴露 payload 细节）。
 *
 * @param filePath 文件路径。
 * @returns 文件预览信息。
 */
export function readXuanbingFilePreview(filePath: string): {
  fileType: string
  formatVersion: number
  schemaVersion: number
  appVersion: string
  metadata: XuanbingFile['metadata']
  createdAt: string
  updatedAt: string
  checksum: string
  payloadSize: number
  valid: boolean
} {
  const file = readXuanbingFile(filePath)
  const payloadSize = new TextEncoder().encode(JSON.stringify(file.payload)).length

  return {
    fileType: file.type,
    formatVersion: file.formatVersion,
    schemaVersion: file.schemaVersion,
    appVersion: file.appVersion,
    metadata: file.metadata,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
    checksum: file.checksum,
    payloadSize,
    valid: true
  }
}
