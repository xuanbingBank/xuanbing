/**
 * @file 角色 repository,提供 roles 表的数据访问与权限聚合。
 */

import { BaseRepository, deserializeJson, generateId, nowIso, serializeJson } from './base.repository'

/**
 * roles 表行类型。
 */
export interface RoleRow {
  id: string
  name: string
  description: string | null
  permissions: string
  createdAt: string
}

/**
 * 创建角色输入。
 */
export interface CreateRoleInput {
  id?: string
  name: string
  description?: string
  permissions?: string[]
}

/**
 * 角色 repository。
 */
export class RoleRepository extends BaseRepository {
  /**
   * 按角色名查询角色。
   *
   * @param name 角色名。
   * @returns 角色行或 null。
   */
  findByName(name: string): RoleRow | null {
    return (this.db.prepare('SELECT * FROM roles WHERE name = ?').get(name) as RoleRow | undefined) ?? null
  }

  /**
   * 按 ID 查询角色。
   *
   * @param id 角色 ID。
   * @returns 角色行或 null。
   */
  findById(id: string): RoleRow | null {
    return (this.db.prepare('SELECT * FROM roles WHERE id = ?').get(id) as RoleRow | undefined) ?? null
  }

  /**
   * 列出全部角色。
   *
   * @returns 角色行列表。
   */
  list(): RoleRow[] {
    return this.db.prepare('SELECT * FROM roles ORDER BY name ASC').all() as RoleRow[]
  }

  /**
   * 创建角色。
   *
   * @param input 创建输入。
   * @returns 角色行。
   */
  create(input: CreateRoleInput): RoleRow {
    const id = input.id ?? generateId()
    this.db.prepare(`
      INSERT INTO roles (id, name, description, permissions, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, input.name, input.description ?? null, serializeJson(input.permissions ?? []) ?? '[]', nowIso())
    const created = this.findById(id)
    if (!created) {
      throw new Error('Role not found after create: ' + input.name)
    }
    return created
  }

  /**
   * 按角色名列表聚合权限。
   *
   * 若任一角色拥有通配权限 "*",直接返回 ["*"]。
   * 找不到的角色会被静默跳过。
   *
   * @param roleNames 角色名列表。
   * @returns 去重后的权限标识列表。
   */
  getPermissionsByRoleNames(roleNames: string[]): string[] {
    if (roleNames.length === 0) {
      return []
    }
    const placeholders = roleNames.map(() => '?').join(',')
    const rows = this.db.prepare(`SELECT permissions FROM roles WHERE name IN (${placeholders})`).all(...roleNames) as Array<{ permissions: string }>

    const permissionSet = new Set<string>()
    for (const row of rows) {
      const perms = deserializeJson<string[]>(row.permissions) ?? []
      for (const perm of perms) {
        if (perm === '*') {
          return ['*']
        }
        permissionSet.add(perm)
      }
    }
    return Array.from(permissionSet)
  }
}
