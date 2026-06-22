/**
 * @file 原子写入工具。
 *
 * 写入必须原子写入：temp → fsync 可选 → rename。
 * 写入失败删除 temp。
 */

import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { throwDbError } from '../ipcBus/shared/database'

/**
 * 原子写入文件内容。
 *
 * 流程：
 * 1. 写入临时文件（同目录，随机名）。
 * 2. 可选 fsync。
 * 3. rename 到目标路径。
 * 4. 失败删除临时文件。
 *
 * @param targetPath 目标文件路径。
 * @param content 文件内容。
 * @param options 写入选项。
 */
export function atomicWriteFile(
  targetPath: string,
  content: string,
  options: { fsync?: boolean } = {}
): void {
  const { fsync = true } = options
  const dir = path.dirname(targetPath)
  const tempName = `.tmp-${randomUUID()}-${path.basename(targetPath)}`
  const tempPath = path.join(dir, tempName)

  try {
    fs.writeFileSync(tempPath, content, 'utf8')

    if (fsync) {
      const fd = fs.openSync(tempPath, 'r')
      try {
        fs.fsyncSync(fd)
      } finally {
        fs.closeSync(fd)
      }
    }

    fs.renameSync(tempPath, targetPath)
  } catch (error) {
    // 清理临时文件
    try {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath)
      }
    } catch {
      // 忽略清理失败
    }

    const message = error instanceof Error ? error.message : String(error)
    throwDbError('XUANBING_FILE_EXPORT_FAILED', 'Atomic write failed.', {
      retryable: true,
      severity: 'high',
      safeDetail: { reason: 'write_failed' },
      devDetail: message,
      cause: message
    })
  }
}
