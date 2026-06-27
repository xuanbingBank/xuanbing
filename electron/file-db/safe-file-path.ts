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
  // Windows 文件系统大小写不敏感，归一化为小写后比较；同时去除 \\?\ 长路径前缀
  // 以保证 startsWith 比较结果稳定（path.resolve 不会剥离该前缀）。
  let resolvedTarget = path.resolve(targetPath)
  let resolvedBase = path.resolve(baseDir)
  const LONG_PATH_PREFIX = '\\\\?\\'
  if (resolvedTarget.startsWith(LONG_PATH_PREFIX)) {
    resolvedTarget = resolvedTarget.slice(LONG_PATH_PREFIX.length)
  }
  if (resolvedBase.startsWith(LONG_PATH_PREFIX)) {
    resolvedBase = resolvedBase.slice(LONG_PATH_PREFIX.length)
  }
  const normalizedTarget = resolvedTarget.toLowerCase()
  const normalizedBase = resolvedBase.toLowerCase()

  if (!normalizedTarget.startsWith(normalizedBase + path.sep) && normalizedTarget !== normalizedBase) {
    throwDbError('XUANBING_FILE_PATH_FORBIDDEN', 'Path traversal detected.', {
      severity: 'high',
      safeDetail: { reason: 'path_traversal' }
    })
  }

  return resolvedTarget
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
  // Windows 大小写不敏感，归一化为小写后比较；同时覆盖 -wal / -shm / -journal 侧车文件
  const normalizedTarget = path.resolve(filePath).toLowerCase()
  const normalizedDb = path.resolve(dbFile).toLowerCase()

  const protectedSuffixes = ['', '-wal', '-shm', '-journal']
  for (const suffix of protectedSuffixes) {
    if (normalizedTarget === normalizedDb + suffix) {
      throwDbError('XUANBING_FILE_PATH_FORBIDDEN', 'Cannot overwrite the main database file.', {
        severity: 'critical',
        safeDetail: { reason: 'overwrite_database' }
      })
    }
  }
}

/**
 * 生成安全的文件名（去除路径分隔符和特殊字符）。
 *
 * @param name 原始文件名。
 * @returns 安全文件名。
 */
export function sanitizeFileName(name: string): string {
  let sanitized = name.replace(/[^a-zA-Z0-9._-]/g, '_')
  if (sanitized.length === 0) {
    sanitized = 'untitled'
  }
  // 拒绝纯点号文件名（如 "..." / "."），Windows 下无意义且易与系统保留名混淆
  if (/^\.+$/.test(sanitized)) {
    sanitized = 'untitled'
  }
  // 剥离尾部点号与空格：Windows 文件系统会截断文件名尾部 . 与空格，
  // 不剥离则 "CON." / "CON " 可绕过保留名检查被识别为 CON 设备
  sanitized = sanitized.replace(/[\s.]+$/, '')
  if (sanitized.length === 0) {
    sanitized = 'untitled'
  }
  // 屏蔽 Windows 保留设备名（CON/PRN/AUX/NUL/COM1-9/LPT1-9），
  // 含带扩展名形式（如 CON.txt 也视为设备名），前置下划线避免被系统占用
  const RESERVED = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\..*)?$/i
  if (RESERVED.test(sanitized)) {
    sanitized = '_' + sanitized
  }
  // 限制文件名长度，避免超出文件系统上限（NTFS 255，留余量给扩展名）
  if (sanitized.length > 200) {
    sanitized = sanitized.slice(0, 200)
  }
  return sanitized
}
