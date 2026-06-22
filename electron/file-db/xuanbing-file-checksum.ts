/**
 * @file .xuanbing 文件 checksum 计算。
 *
 * checksum 对 payload + metadata + version 生成 sha256。
 */

import { createHash } from 'node:crypto'
import type { XuanbingFileMetadata } from './xuanbing-file-types'

/**
 * 计算 .xuanbing 文件 checksum。
 *
 * checksum 覆盖：formatVersion + type + schemaVersion + metadata + payload。
 * 不覆盖 checksum 自身、createdAt、updatedAt、appVersion（这些可变）。
 *
 * @param params checksum 输入。
 * @returns sha256 checksum 字符串，格式 `sha256:...`。
 */
export function computeChecksum(params: {
  formatVersion: number
  type: string
  schemaVersion: number
  metadata: XuanbingFileMetadata
  payload: unknown
}): string {
  const content = JSON.stringify({
    formatVersion: params.formatVersion,
    type: params.type,
    schemaVersion: params.schemaVersion,
    metadata: params.metadata,
    payload: params.payload
  })
  const hash = createHash('sha256').update(content).digest('hex')
  return `sha256:${hash}`
}

/**
 * 校验 checksum 是否匹配。
 *
 * @param file .xuanbing 文件对象。
 * @returns 是否匹配。
 */
export function verifyChecksum(file: {
  formatVersion: number
  type: string
  schemaVersion: number
  metadata: XuanbingFileMetadata
  payload: unknown
  checksum: string
}): boolean {
  const expected = computeChecksum({
    formatVersion: file.formatVersion,
    type: file.type,
    schemaVersion: file.schemaVersion,
    metadata: file.metadata,
    payload: file.payload
  })
  return expected === file.checksum
}
