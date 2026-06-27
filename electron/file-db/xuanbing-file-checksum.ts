/**
 * @file .xuanbing 文件 checksum 计算。
 *
 * checksum 对 payload + metadata + version 生成 sha256。
 */

import { createHash } from 'node:crypto'
import type { XuanbingFileMetadata } from './xuanbing-file-types'

/**
 * 确定性 JSON 序列化：对对象键排序后序列化，保证相同内容产生相同字符串。
 *
 * 避免对象键序不同导致 checksum 不稳定（不同引擎或不同插入顺序）。
 * 仅对顶层对象键排序；嵌套结构（metadata / payload）由生成方保证键序稳定。
 *
 * @param obj 待序列化对象。
 * @returns 稳定 JSON 字符串。
 */
function stableStringify(obj: unknown): string {
  if (typeof obj !== 'object' || obj === null) {
    return JSON.stringify(obj)
  }
  const sorted = Object.keys(obj as Record<string, unknown>)
    .sort()
    .reduce<Record<string, unknown>>((acc, k) => {
      acc[k] = (obj as Record<string, unknown>)[k]
      return acc
    }, {})
  return JSON.stringify(sorted)
}

/**
 * 计算 .xuanbing 文件 checksum。
 *
 * checksum 覆盖：formatVersion + type + schemaVersion + metadata + payload。
 * 不覆盖 checksum 自身、createdAt、updatedAt、appVersion（这些可变）。
 * 注意:appVersion 未纳入 checksum,文件可伪造 appVersion 声称来自任意应用版本而不被发现。
 *
 * 注意:checksum 为无密钥 SHA-256,仅防意外损坏,不防恶意篡改。
 * 攻击者可重新计算 checksum 覆盖原值,如需防篡改应改用 HMAC + 密钥签名。
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
  const content = stableStringify({
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
