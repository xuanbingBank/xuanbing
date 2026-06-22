/**
 * @file 设置服务，负责配置读写与审计。
 */

import { SettingRepository } from '../repositories/setting.repository'
import { AuditRepository } from '../repositories/audit.repository'
import { nowIso } from '../repositories/base.repository'
import type { SetSettingInput } from '../repositories/setting.repository'

/**
 * 设置 service。
 */
export class SettingService {
  private readonly settingRepo = new SettingRepository()
  private readonly auditRepo = new AuditRepository()

  /**
   * 设置配置值。
   *
   * @param input 设置输入。
   * @param actorId 操作者 ID。
   * @returns 设置值。
   */
  set(input: SetSettingInput, actorId = 'system'): unknown {
    const existing = this.settingRepo.get(input.namespace, input.key)
    const row = this.settingRepo.set(input)

    this.auditRepo.create({
      actorType: 'system',
      actorId,
      action: existing ? 'update' : 'create',
      entityType: 'setting',
      entityId: `${input.namespace}:${input.key}`,
      before: existing ? { value: existing.value } : null,
      after: { value: row.value }
    })

    return SettingRepository.deserialize(row)
  }

  /**
   * 获取配置值。
   *
   * @param namespace 命名空间。
   * @param key 键。
   * @returns 设置值或 null。
   */
  get(namespace: string, key: string): unknown | null {
    const row = this.settingRepo.get(namespace, key)
    return row ? SettingRepository.deserialize(row) : null
  }

  /**
   * 按命名空间列出配置。
   *
   * @param namespace 命名空间。
   * @returns 设置值列表。
   */
  listByNamespace(namespace: string): unknown[] {
    return this.settingRepo.listByNamespace(namespace).map((row) => SettingRepository.deserialize(row))
  }

  /**
   * 列出全部命名空间。
   *
   * @returns 命名空间列表。
   */
  listNamespaces(): string[] {
    return this.settingRepo.listNamespaces()
  }

  /**
   * 删除配置值。
   *
   * @param namespace 命名空间。
   * @param key 键。
   * @param actorId 操作者 ID。
   * @returns 是否删除成功。
   */
  delete(namespace: string, key: string, actorId = 'system'): boolean {
    const result = this.settingRepo.delete(namespace, key)

    if (result) {
      this.auditRepo.create({
        actorType: 'system',
        actorId,
        action: 'delete',
        entityType: 'setting',
        entityId: `${namespace}:${key}`,
        metadata: { deletedAt: nowIso() }
      })
    }

    return result
  }
}
