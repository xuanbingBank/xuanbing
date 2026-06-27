/**
 * @file .xuanbing 文件写入器。
 *
 * 写入必须原子写入。checksum 自动计算。
 */

import { atomicWriteFile } from './atomic-write'
import { computeChecksum } from './xuanbing-file-checksum'
import { XUANBING_FORMAT_VERSION, XUANBING_MAGIC } from '../ipcBus/shared/database'
import type { XuanbingFile, XuanbingFileMetadata } from './xuanbing-file-types'
import type { XuanbingFileType } from '../ipcBus/shared/database'

/**
 * 构造 .xuanbing 文件对象（自动计算 checksum）。
 *
 * @param params 文件参数。
 * @returns 完整 .xuanbing 文件对象。
 */
export function buildXuanbingFile(params: {
  type: XuanbingFileType
  appVersion: string
  schemaVersion: number
  metadata: XuanbingFileMetadata
  payload: unknown
}): XuanbingFile {
  const now = new Date().toISOString()
  const checksum = computeChecksum({
    formatVersion: XUANBING_FORMAT_VERSION,
    type: params.type,
    schemaVersion: params.schemaVersion,
    metadata: params.metadata,
    payload: params.payload
  })

  return {
    magic: XUANBING_MAGIC,
    formatVersion: XUANBING_FORMAT_VERSION,
    type: params.type,
    appVersion: params.appVersion,
    schemaVersion: params.schemaVersion,
    createdAt: now,
    updatedAt: now,
    metadata: params.metadata,
    payload: params.payload,
    checksum
  }
}

/**
 * 写入 .xuanbing 文件（原子写入）。
 *
 * @param filePath 目标文件路径。
 * @param file .xuanbing 文件对象。
 */
export function writeXuanbingFile(filePath: string, file: XuanbingFile): void {
  const content = JSON.stringify(file, null, 2)
  atomicWriteFile(filePath, content)
  // TODO: 可选写后回读校验 checksum
}

/**
 * 构造并写入 .xuanbing 文件。
 *
 * @param filePath 目标文件路径。
 * @param params 文件参数。
 * @returns 写入的文件对象。
 */
export function createAndWriteXuanbingFile(
  filePath: string,
  params: {
    type: XuanbingFileType
    appVersion: string
    schemaVersion: number
    metadata: XuanbingFileMetadata
    payload: unknown
  }
): XuanbingFile {
  const file = buildXuanbingFile(params)
  writeXuanbingFile(filePath, file)
  return file
}
