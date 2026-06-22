/**
 * @file 安全文件路径校验，防止路径穿越。
 *
 * 所有文件操作路径必须经过此模块校验。
 */

import path from 'node:path'
import fs from 'node:fs'
import { throwDbError } from '../ipcBus/shared/database'
import { XUANBING_DOT_EXTENSION, XUANBING_EXTENSION } from '../ipcBus/shared/database'

/**
 * 校验路径是否在允许的基础目录内，防止路径穿越。
 *
 * @param targetPath 待校验路径。
 * @param baseDir 允许的基础目录。
 * @returns 规范化后的绝对路径。
 */
export function ensurePathWithinDir(targetPath: string, baseDir: string): string {
  const normalizedBase = path.resolve(baseDir)
  const normalizedTarget = path.resolve(normalizedBase, targetPath)

  if (!normalizedTarget.startsWith(normalizedBase + path.sep) && normalizedTarget !== normalizedBase) {
    throwDbError('XUANBING_FILE_PATH_FORBIDDEN', 'Path traversal detected.', {
      severity: 'high',
      safeDetail: { reason: 'path_traversal' }
    })
  }

  return normalizedTarget
}

/**
 * 校验文件扩展名必须是 .xuanbing。
 *
 * @param filePath 文件路径。
 * @returns 规范化后的路径。
 */
export function ensureXuanbingExtension(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  if (ext !== XUANBING_DOT_EXTENSION) {
    throwDbError('XUANBING_FILE_INVALID', `File must have .${XUANBING_EXTENSION} extension.`, {
      safeDetail: { reason: 'invalid_extension', got: ext }
    })
  }
  return filePath
}

/**
 * 校验文件大小不超过限制。
 *
 * @param filePath 文件路径。
 * @param maxBytes 最大字节数。
 */
export function ensureFileSize(filePath: string, maxBytes: number): void {
  let size: number
  try {
    size = fs.statSync(filePath).size
  } catch {
    throwDbError('XUANBING_FILE_INVALID', 'File does not exist or is not accessible.', {
      safeDetail: { reason: 'file_not_found' }
    })
  }

  if (size > maxBytes) {
    throwDbError('XUANBING_FILE_TOO_LARGE', `File size ${size} exceeds limit ${maxBytes}.`, {
      safeDetail: { reason: 'too_large', size, maxBytes }
    })
  }
}

/**
 * 禁止覆盖主数据库文件。
 *
 * @param filePath 文件路径。
 * @param dbFile 主数据库文件路径。
 */
export function ensureNotDatabaseFile(filePath: string, dbFile: string): void {
  const normalizedTarget = path.resolve(filePath)
  const normalizedDb = path.resolve(dbFile)

  if (normalizedTarget === normalizedDb) {
    throwDbError('XUANBING_FILE_PATH_FORBIDDEN', 'Cannot overwrite the main database file.', {
      severity: 'critical',
      safeDetail: { reason: 'overwrite_database' }
    })
  }
}

/**
 * 生成安全的文件名（去除路径分隔符和特殊字符）。
 *
 * @param name 原始文件名。
 * @returns 安全文件名。
 */
export function sanitizeFileName(name: string): string {
  const sanitized = name.replace(/[^a-zA-Z0-9._-]/g, '_')
  return sanitized.length > 0 ? sanitized : 'untitled'
}
