/**
 * @file 用户 repository,提供 users 与 user_sessions 表的数据访问。
 *
 * repository 只负责数据库访问,不包含业务逻辑与密码哈希。
 */

import { BaseRepository, deserializeJson, generateId, nowIso, serializeJson } from './base.repository'

/**
 * users 表行类型。
 */
export interface UserRow {
  id: string
  username: string
  passwordHash: string
  passwordSalt: string
  displayName: string | null
  roles: string
  mustChangePassword: number
  createdAt: string
  updatedAt: string
}

/**
 * user_sessions 表行类型。
 */
export interface UserSessionRow {
  id: string
  userId: string
  token: string
  expiresAt: string
  createdAt: string
}

/**
 * 创建用户输入。
 */
export interface CreateUserInput {
  id?: string
  username: string
  passwordHash: string
  passwordSalt: string
  displayName?: string
  roles?: string[]
  mustChangePassword?: boolean
}

/**
 * 更新用户输入。
 */
export interface UpdateUserInput {
  passwordHash?: string
  passwordSalt?: string
  displayName?: string
  roles?: string[]
  mustChangePassword?: boolean
}

/**
 * 创建会话输入。
 */
export interface CreateUserSessionInput {
  userId: string
  token: string
  expiresAt: string
}

/**
 * 对外暴露的脱敏用户信息。
 */
export interface SafeUser {
  id: string
  username: string
  displayName: string
  roles: string[]
  mustChangePassword: boolean
  createdAt: string
  updatedAt: string
}

/**
 * 将 users 行转为脱敏对象(不含密码哈希与盐)。
 *
 * @param row users 表行。
 * @returns 脱敏用户对象。
 */
export function toSafeUser(row: UserRow): SafeUser {
  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName ?? row.username,
    roles: deserializeJson<string[]>(row.roles) ?? [],
    mustChangePassword: row.mustChangePassword === 1,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  }
}

/**
 * 用户 repository。
 */
export class UserRepository extends BaseRepository {
  /**
   * 按 ID 查询用户。
   *
   * @param id 用户 ID。
   * @returns 用户行或 null。
   */
  findById(id: string): UserRow | null {
    return (this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined) ?? null
  }

  /**
   * 按用户名查询用户。
   *
   * @param username 用户名。
   * @returns 用户行或 null。
   */
  findByUsername(username: string): UserRow | null {
    return (this.db.prepare('SELECT * FROM users WHERE username = ?').get(username) as UserRow | undefined) ?? null
  }

  /**
   * 创建用户。
   *
   * @param input 创建输入。
   * @returns 用户行。
   */
  create(input: CreateUserInput): UserRow {
    const id = input.id ?? generateId()
    const now = nowIso()
    this.db.prepare(`
      INSERT INTO users (id, username, password_hash, password_salt, display_name, roles, must_change_password, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.username,
      input.passwordHash,
      input.passwordSalt,
      input.displayName ?? null,
      serializeJson(input.roles ?? []) ?? '[]',
      input.mustChangePassword === false ? 0 : 1,
      now,
      now
    )
    const created = this.findById(id)
    if (!created) {
      throw new Error('User not found after create: ' + input.username)
    }
    return created
  }

  /**
   * 更新用户。
   *
   * @param id 用户 ID。
   * @param input 更新输入。
   * @returns 更新后的用户行或 null。
   */
  update(id: string, input: UpdateUserInput): UserRow | null {
    const existing = this.findById(id)
    if (!existing) {
      return null
    }
    const now = nowIso()
    const roles = input.roles !== undefined ? serializeJson(input.roles) : existing.roles
    this.db.prepare(`
      UPDATE users SET
        password_hash = ?,
        password_salt = ?,
        display_name = ?,
        roles = ?,
        must_change_password = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      input.passwordHash ?? existing.passwordHash,
      input.passwordSalt ?? existing.passwordSalt,
      input.displayName ?? existing.displayName,
      roles,
      input.mustChangePassword === undefined ? existing.mustChangePassword : (input.mustChangePassword ? 1 : 0),
      now,
      id
    )
    return this.findById(id)
  }

  /**
   * 删除用户。
   *
   * @param id 用户 ID。
   * @returns 是否删除成功。
   */
  delete(id: string): boolean {
    const result = this.db.prepare('DELETE FROM users WHERE id = ?').run(id)
    return result.changes > 0
  }

  /**
   * 列出全部用户(不含密码字段)。
   *
   * @returns 用户行列表。
   */
  list(): UserRow[] {
    return this.db.prepare('SELECT * FROM users ORDER BY created_at ASC').all() as UserRow[]
  }

  /* ───────────────────────── 会话 ───────────────────────── */

  /**
   * 创建会话。
   *
   * @param input 会话输入。
   * @returns 会话行。
   */
  createSession(input: CreateUserSessionInput): UserSessionRow {
    const id = generateId()
    this.db.prepare(`
      INSERT INTO user_sessions (id, user_id, token, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, input.userId, input.token, input.expiresAt, nowIso())
    return (this.db.prepare('SELECT * FROM user_sessions WHERE id = ?').get(id) as UserSessionRow)
  }

  /**
   * 按 token 查询会话。
   *
   * @param token 会话 token。
   * @returns 会话行或 null。
   */
  findSessionByToken(token: string): UserSessionRow | null {
    return (this.db.prepare('SELECT * FROM user_sessions WHERE token = ?').get(token) as UserSessionRow | undefined) ?? null
  }

  /**
   * 删除指定 token 的会话。
   *
   * @param token 会话 token。
   * @returns 是否删除成功。
   */
  deleteSessionByToken(token: string): boolean {
    const result = this.db.prepare('DELETE FROM user_sessions WHERE token = ?').run(token)
    return result.changes > 0
  }

  /**
   * 删除指定用户的全部会话。
   *
   * @param userId 用户 ID。
   * @returns 删除的会话数量。
   */
  deleteSessionsByUser(userId: string): number {
    const result = this.db.prepare('DELETE FROM user_sessions WHERE user_id = ?').run(userId)
    return result.changes
  }
}
