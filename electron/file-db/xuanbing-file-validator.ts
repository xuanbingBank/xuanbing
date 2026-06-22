/**
 * @file .xuanbing 文件校验器。
 *
 * 独立校验入口，不读取文件，仅校验内存中的文件对象。
 */

import { verifyChecksum } from './xuanbing-file-checksum'
import { validateXuanbingFile } from './xuanbing-file.schema'
import { throwDbError } from '../ipcBus/shared/database'
import { XUANBING_FORMAT_VERSION, XUANBING_MAGIC } from '../ipcBus/shared/database'
import type { XuanbingFile } from './xuanbing-file-types'

/**
 * 校验结果。
 */
export interface ValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * 校验 .xuanbing 文件对象（不抛异常，返回结果）。
 *
 * @param data 待校验数据。
 * @returns 校验结果。
 */
export function validateFile(data: unknown): ValidationResult {
  const errors: string[] = []

  // 快速 magic 校验
  if (typeof data === 'object' && data !== null) {
    const magic = (data as { magic?: unknown }).magic
    if (magic !== XUANBING_MAGIC) {
      errors.push(`Invalid magic: expected ${XUANBING_MAGIC}, got ${String(magic)}`)
    }
  } else {
    errors.push('File is not an object')
    return { valid: false, errors }
  }

  // zod schema 校验
  const result = validateXuanbingFile(data)
  if (!result.success) {
    for (const issue of result.error.issues) {
      errors.push(`${issue.path.join('.')}: ${issue.message}`)
    }
    return { valid: false, errors }
  }

  const file = result.data

  // formatVersion 校验
  if (file.formatVersion > XUANBING_FORMAT_VERSION) {
    errors.push(`Unsupported format version ${file.formatVersion} (max ${XUANBING_FORMAT_VERSION})`)
  }

  // checksum 校验
  if (!verifyChecksum(file)) {
    errors.push('Checksum verification failed')
  }

  return { valid: errors.length === 0, errors }
}

/**
 * 严格校验 .xuanbing 文件对象（校验失败抛异常）。
 *
 * @param data 待校验数据。
 * @returns 校验通过的文件对象。
 */
export function validateFileOrThrow(data: unknown): XuanbingFile {
  const result = validateFile(data)

  if (!result.valid) {
    throwDbError('XUANBING_FILE_SCHEMA_FAILED', 'File validation failed.', {
      safeDetail: { reason: 'validation_failed', errors: result.errors },
      devDetail: result.errors
    })
  }

  return data as XuanbingFile
}
