/**
 * @file 设置 repository。
 */

import { BaseRepository, deserializeJson, generateId, nowIso, serializeJson } from './base.repository'
import type { SettingValueType } from '../ipcBus/shared/database'

/**
 * 设置行类型。
 */
export interface SettingRow {
  id: string
  namespace: string
  key: string
  value: string
  valueType: string
  description: string
  isSystem: number
  createdAt: string
  updatedAt: string
}

/**
 * 设置值输入。
 */
export interface SetSettingInput {
  namespace: string
  key: string
  value: unknown
  valueType?: SettingValueType
  description?: string
  isSystem?: boolean
}

/**
 * 设置 repository。
 */
export class SettingRepository extends BaseRepository {
  /**
   * 设置配置值（upsert）。
   *
   * @param input 设置输入。
   * @returns 设置行。
   */
  set(input: SetSettingInput): SettingRow {
    const valueType = input.valueType ?? this.inferValueType(input.value)
    const stringValue = this.stringifyValue(input.value, valueType)
    const now = nowIso()

    this.db.prepare(`
      INSERT INTO app_settings (id, namespace, key, value, value_type, description, is_system, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(namespace, key) DO UPDATE SET
        value = excluded.value,
        value_type = excluded.value_type,
        description = excluded.description,
        is_system = excluded.is_system,
        updated_at = excluded.updated_at
    `).run(
      generateId(),
      input.namespace,
      input.key,
      stringValue,
      valueType,
      input.description ?? '',
      input.isSystem ? 1 : 0,
      now,
      now
    )

    return this.get(input.namespace, input.key)!
  }

  /**
   * 获取配置值。
   *
   * @param namespace 命名空间。
   * @param key 键。
   * @returns 设置行或 null。
   */
  get(namespace: string, key: string): SettingRow | null {
    return (this.db.prepare('SELECT * FROM app_settings WHERE namespace = ? AND key = ?').get(namespace, key) as SettingRow | undefined) ?? null
  }

  /**
   * 按命名空间列出全部配置。
   *
   * @param namespace 命名空间。
   * @returns 设置行列表。
   */
  listByNamespace(namespace: string): SettingRow[] {
    return this.db.prepare('SELECT * FROM app_settings WHERE namespace = ? ORDER BY key ASC').all(namespace) as SettingRow[]
  }

  /**
   * 列出全部命名空间。
   *
   * @returns 命名空间列表。
   */
  listNamespaces(): string[] {
    const rows = this.db.prepare('SELECT DISTINCT namespace FROM app_settings ORDER BY namespace ASC').all() as Array<{ namespace: string }>
    return rows.map((row) => row.namespace)
  }

  /**
   * 删除配置值。
   *
   * @param namespace 命名空间。
   * @param key 键。
   * @returns 是否删除成功。
   */
  delete(namespace: string, key: string): boolean {
    const result = this.db.prepare('DELETE FROM app_settings WHERE namespace = ? AND key = ?').run(namespace, key)
    return result.changes > 0
  }

  /**
   * 删除命名空间下全部配置。
   *
   * @param namespace 命名空间。
   * @returns 删除行数。
   */
  deleteByNamespace(namespace: string): number {
    const result = this.db.prepare('DELETE FROM app_settings WHERE namespace = ?').run(namespace)
    return result.changes
  }

  /**
   * 推断值类型。
   *
   * @param value 值。
   * @returns 值类型。
   */
  private inferValueType(value: unknown): SettingValueType {
    if (value === null) {
      return 'null'
    }
    if (typeof value === 'boolean') {
      return 'boolean'
    }
    if (typeof value === 'number') {
      return 'number'
    }
    if (typeof value === 'string') {
      return 'string'
    }
    return 'json'
  }

  /**
   * 将值转为字符串存储。
   *
   * @param value 值。
   * @param valueType 值类型。
   * @returns 字符串值。
   */
  private stringifyValue(value: unknown, valueType: SettingValueType): string {
    switch (valueType) {
      case 'null':
        return ''
      case 'string':
        return String(value)
      case 'number':
        return String(value)
      case 'boolean':
        return value ? 'true' : 'false'
      case 'json':
        return serializeJson(value) ?? '{}'
      default:
        return String(value)
    }
  }

  /**
   * 反序列化设置行。
   *
   * @param row 设置行。
   * @returns 反序列化后的设置。
   */
  static deserialize(row: SettingRow): {
    id: string
    namespace: string
    key: string
    value: unknown
    valueType: SettingValueType
    description: string
    isSystem: boolean
    createdAt: string
    updatedAt: string
  } {
    let value: unknown = row.value
    switch (row.valueType as SettingValueType) {
      case 'boolean':
        value = row.value === 'true'
        break
      case 'number':
        value = Number(row.value)
        break
      case 'json':
        value = deserializeJson(row.value)
        break
      case 'null':
        value = null
        break
      default:
        value = row.value
    }

    return {
      id: row.id,
      namespace: row.namespace,
      key: row.key,
      value,
      valueType: row.valueType as SettingValueType,
      description: row.description,
      isSystem: row.isSystem === 1,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }
  }
}
