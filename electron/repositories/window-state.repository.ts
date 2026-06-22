/**
 * @file 窗口状态 repository。
 */

import { BaseRepository, deserializeJson, generateId, nowIso, serializeJson } from './base.repository'

/**
 * 窗口状态行类型。
 */
export interface WindowStateRow {
  id: string
  role: string
  instanceKey: string
  bounds: string | null
  isMaximized: number
  isFullScreen: number
  displayId: number | null
  lastRoute: string | null
  customState: string | null
  createdAt: string
  updatedAt: string
}

/**
 * 保存窗口状态输入。
 */
export interface SaveWindowStateInput {
  role: string
  instanceKey: string
  bounds?: { x: number; y: number; width: number; height: number } | null
  isMaximized?: boolean
  isFullScreen?: boolean
  displayId?: number | null
  lastRoute?: string | null
  customState?: unknown
}

/**
 * 窗口状态 repository。
 */
export class WindowStateRepository extends BaseRepository {
  /**
   * 保存窗口状态（upsert）。
   *
   * @param input 输入。
   * @returns 窗口状态行。
   */
  save(input: SaveWindowStateInput): WindowStateRow {
    const now = nowIso()
    const bounds = serializeJson(input.bounds ?? null)
    const customState = serializeJson(input.customState ?? null)

    this.db.prepare(`
      INSERT INTO window_states (id, role, instance_key, bounds, is_maximized, is_full_screen, display_id, last_route, custom_state, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(role, instance_key) DO UPDATE SET
        bounds = excluded.bounds,
        is_maximized = excluded.is_maximized,
        is_full_screen = excluded.is_full_screen,
        display_id = excluded.display_id,
        last_route = excluded.last_route,
        custom_state = excluded.custom_state,
        updated_at = excluded.updated_at
    `).run(
      generateId(),
      input.role,
      input.instanceKey,
      bounds,
      input.isMaximized ? 1 : 0,
      input.isFullScreen ? 1 : 0,
      input.displayId ?? null,
      input.lastRoute ?? null,
      customState,
      now,
      now
    )

    return this.findByRoleAndKey(input.role, input.instanceKey)!
  }

  /**
   * 按角色和实例键查找窗口状态。
   *
   * @param role 角色。
   * @param instanceKey 实例键。
   * @returns 窗口状态行或 null。
   */
  findByRoleAndKey(role: string, instanceKey: string): WindowStateRow | null {
    return (this.db.prepare('SELECT * FROM window_states WHERE role = ? AND instance_key = ?').get(role, instanceKey) as WindowStateRow | undefined) ?? null
  }

  /**
   * 按角色列出全部窗口状态。
   *
   * @param role 角色。
   * @returns 窗口状态行列表。
   */
  listByRole(role: string): WindowStateRow[] {
    return this.db.prepare('SELECT * FROM window_states WHERE role = ? ORDER BY updated_at DESC').all(role) as WindowStateRow[]
  }

  /**
   * 删除窗口状态。
   *
   * @param role 角色。
   * @param instanceKey 实例键。
   * @returns 是否删除成功。
   */
  delete(role: string, instanceKey: string): boolean {
    const result = this.db.prepare('DELETE FROM window_states WHERE role = ? AND instance_key = ?').run(role, instanceKey)
    return result.changes > 0
  }

  /**
   * 反序列化窗口状态行。
   *
   * @param row 窗口状态行。
   * @returns 反序列化后的窗口状态。
   */
  static deserialize(row: WindowStateRow): {
    id: string
    role: string
    instanceKey: string
    bounds: { x: number; y: number; width: number; height: number } | null
    isMaximized: boolean
    isFullScreen: boolean
    displayId: number | null
    lastRoute: string | null
    customState: unknown
    createdAt: string
    updatedAt: string
  } {
    return {
      id: row.id,
      role: row.role,
      instanceKey: row.instanceKey,
      bounds: deserializeJson(row.bounds),
      isMaximized: row.isMaximized === 1,
      isFullScreen: row.isFullScreen === 1,
      displayId: row.displayId,
      lastRoute: row.lastRoute,
      customState: deserializeJson(row.customState),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }
  }
}
