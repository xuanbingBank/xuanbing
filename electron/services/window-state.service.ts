/**
 * @file 窗口状态服务。
 */

import { WindowStateRepository } from '../repositories/window-state.repository'
import type { SaveWindowStateInput } from '../repositories/window-state.repository'

/**
 * 窗口状态 service。
 */
export class WindowStateService {
  private readonly repo = new WindowStateRepository()

  /**
   * 保存窗口状态。
   *
   * @param input 输入。
   * @returns 窗口状态。
   */
  save(input: SaveWindowStateInput): unknown {
    const row = this.repo.save(input)
    return WindowStateRepository.deserialize(row)
  }

  /**
   * 查找窗口状态。
   *
   * @param role 角色。
   * @param instanceKey 实例键。
   * @returns 窗口状态或 null。
   */
  findByRoleAndKey(role: string, instanceKey: string): unknown | null {
    const row = this.repo.findByRoleAndKey(role, instanceKey)
    return row ? WindowStateRepository.deserialize(row) : null
  }

  /**
   * 按角色列出窗口状态。
   *
   * @param role 角色。
   * @returns 窗口状态列表。
   */
  listByRole(role: string): unknown[] {
    return this.repo.listByRole(role).map((row) => WindowStateRepository.deserialize(row))
  }
}
