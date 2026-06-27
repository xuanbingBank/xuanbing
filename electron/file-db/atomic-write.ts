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
 * 同步阻塞等待指定毫秒数，用于 Windows rename EPERM 重试退避。
 *
 * 已知问题：busy-wait 会阻塞主线程，单次等待已降至 20ms、重试次数降至 2 次以减小影响。
 * TODO: 重构为异步流程（async/await + setTimeout）后可彻底消除主线程阻塞。
 *
 * @param ms 等待毫秒数。
 */
function sleepSync(ms: number): void {
  const end = Date.now() + ms
  while (Date.now() < end) {
    // busy wait
  }
}

/**
 * 重命名文件，Windows 下 EPERM 错误自动重试。
 *
 * @param src 源路径。
 * @param dest 目标路径。
 */
function renameWithRetry(src: string, dest: string): void {
  let lastError: unknown
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      fs.renameSync(src, dest)
      return
    } catch (error) {
      lastError = error
      const code = (error as NodeJS.ErrnoException).code
      if (code === 'EPERM' && attempt < 2) {
        sleepSync(20 * attempt)
        continue
      }
      throw error
    }
  }
  throw lastError
}

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

  // 防止 dest 是符号链接：写入会跟随符号链接覆盖链接目标，绕过路径校验。
  // 若 dest 已存在且为符号链接则拒绝写入。
  try {
    const destStat = fs.lstatSync(targetPath)
    if (destStat.isSymbolicLink()) {
      throw new Error('Destination path is a symbolic link')
    }
  } catch (error) {
    // dest 不存在属于正常情况，仅对真实错误抛出
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error
    }
  }

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

    // Linux/macOS 下对父目录 fsync，确保临时文件目录项与 rename 操作持久化到磁盘，
    // 防止崩溃后出现「temp 已 fsync 但 rename 未落盘」的不一致状态。Windows 不支持以 'r' 打开目录。
    if (process.platform !== 'win32') {
      const dirFd = fs.openSync(dir, 'r')
      try {
        fs.fsyncSync(dirFd)
      } finally {
        fs.closeSync(dirFd)
      }
    }

    renameWithRetry(tempPath, targetPath)
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
    throwDbError('XUANBING_FILE_WRITE_FAILED', 'Atomic write failed.', {
      retryable: true,
      severity: 'high',
      safeDetail: { reason: 'write_failed' },
      devDetail: message,
      cause: message
    })
  }
}
