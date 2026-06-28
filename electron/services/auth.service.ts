/**
 * @file 鉴权服务,负责本地用户登录、token 生成与校验、密码修改。
 *
 * 密码哈希使用 Node.js crypto.scryptSync,不引入外部依赖。
 * token 用 crypto.randomBytes 生成,会话持久化到 user_sessions 表。
 */

import crypto from 'node:crypto'
import { UserRepository, toSafeUser, type SafeUser, type UserRow } from '../repositories/user.repository'
import { RoleRepository } from '../repositories/role.repository'
import { AuditRepository } from '../repositories/audit.repository'
import { deserializeJson } from '../repositories/base.repository'
import type { AuditAction } from '../ipcBus/shared/database'

/**
 * 登录响应。
 */
export interface LoginResult {
  user: SafeUser
  token: string
  permissions: string[]
  /** 是否需要强制修改密码 */
  mustChangePassword: boolean
}

/**
 * token 校验结果。
 */
export interface VerifyResult {
  user: SafeUser
  permissions: string[]
}

/**
 * 默认 admin 用户配置。
 */
const DEFAULT_ADMIN = {
  id: 'user-admin',
  username: 'admin',
  password: 'admin123',
  roles: ['admin']
}

/**
 * token 有效期:24 小时。
 */
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000

/**
 * scrypt 输出密钥长度(字节)。
 */
const SCRYPT_KEY_LENGTH = 64

/**
 * 盐长度(字节)。
 */
const SALT_LENGTH = 16

/**
 * 密码最小长度。
 */
const MIN_PASSWORD_LENGTH = 6

/**
 * 使用 scrypt 对密码进行哈希。
 *
 * @param password 明文密码。
 * @param salt 盐(十六进制字符串)。
 * @returns 密码哈希(十六进制字符串)。
 */
function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, SCRYPT_KEY_LENGTH).toString('hex')
}

/**
 * 生成随机盐。
 *
 * @returns 十六进制盐字符串。
 */
function generateSalt(): string {
  return crypto.randomBytes(SALT_LENGTH).toString('hex')
}

/**
 * 生成随机 token。
 *
 * @returns 十六进制 token 字符串。
 */
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * 使用恒定时间比较校验密码哈希,避免计时攻击。
 *
 * @param expected 期望的哈希值。
 * @param actual 实际计算出的哈希值。
 * @returns 是否匹配。
 */
function safeEqualHash(expected: string, actual: string): boolean {
  const expectedBuf = Buffer.from(expected, 'hex')
  const actualBuf = Buffer.from(actual, 'hex')
  if (expectedBuf.length !== actualBuf.length) {
    return false
  }
  return crypto.timingSafeEqual(expectedBuf, actualBuf)
}

/**
 * 鉴权服务。
 */
export class AuthService {
  private readonly userRepo = new UserRepository()
  private readonly roleRepo = new RoleRepository()
  private readonly auditRepo = new AuditRepository()

  /**
   * 登录:校验密码,生成 token 与会话。
   *
   * @param username 用户名。
   * @param password 明文密码。
   * @returns 登录结果(含用户、token、权限)。
   * @throws 用户不存在或密码错误时抛出错误。
   */
  login(username: string, password: string): LoginResult {
    const user = this.userRepo.findByUsername(username)
    // 无论用户是否存在都执行一次哈希计算,避免通过响应时间探测用户是否存在
    const dummySalt = '0'.repeat(SALT_LENGTH * 2)
    const effectiveSalt = user?.passwordSalt ?? dummySalt
    const computedHash = hashPassword(password, effectiveSalt)

    if (!user || !safeEqualHash(user.passwordHash, computedHash)) {
      throw new Error('用户名或密码错误')
    }

    const permissions = this.getPermissionsForUser(user)
    const token = generateToken()
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString()

    this.userRepo.createSession({ userId: user.id, token, expiresAt })

    this.writeAudit('login', user.id, { username })

    const safeUser = toSafeUser(user)
    return {
      user: safeUser,
      token,
      permissions,
      mustChangePassword: safeUser.mustChangePassword
    }
  }

  /**
   * 登出:删除指定 token 的会话。
   *
   * @param token 会话 token。
   */
  logout(token: string): void {
    const session = this.userRepo.findSessionByToken(token)
    if (session) {
      this.userRepo.deleteSessionByToken(token)
      this.writeAudit('logout', session.userId, {})
    }
  }

  /**
   * 校验 token 有效性,返回用户信息与权限。
   *
   * @param token 会话 token。
   * @returns 校验结果。
   * @throws token 无效或已过期时抛出错误。
   */
  verifyToken(token: string): VerifyResult {
    if (!token) {
      throw new Error('token 不能为空')
    }
    const session = this.userRepo.findSessionByToken(token)
    if (!session) {
      throw new Error('token 无效或已失效')
    }
    const expiresAt = Date.parse(session.expiresAt)
    if (Number.isNaN(expiresAt) || expiresAt < Date.now()) {
      this.userRepo.deleteSessionByToken(token)
      throw new Error('token 已过期')
    }
    const user = this.userRepo.findById(session.userId)
    if (!user) {
      this.userRepo.deleteSessionByToken(token)
      throw new Error('用户不存在')
    }
    const permissions = this.getPermissionsForUser(user)
    return { user: toSafeUser(user), permissions }
  }

  /**
   * 修改密码:校验旧密码后写入新密码。
   *
   * 修改成功后会清除该用户全部历史会话,强制重新登录。
   *
   * @param userId 用户 ID。
   * @param oldPassword 旧密码。
   * @param newPassword 新密码。
   */
  changePassword(userId: string, oldPassword: string, newPassword: string): void {
    if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
      throw new Error(`新密码长度不能少于 ${MIN_PASSWORD_LENGTH} 位`)
    }
    const user = this.userRepo.findById(userId)
    if (!user) {
      throw new Error('用户不存在')
    }
    const computedHash = hashPassword(oldPassword, user.passwordSalt)
    if (!safeEqualHash(user.passwordHash, computedHash)) {
      throw new Error('旧密码不正确')
    }

    const newSalt = generateSalt()
    const newHash = hashPassword(newPassword, newSalt)
    this.userRepo.update(userId, {
      passwordHash: newHash,
      passwordSalt: newSalt,
      mustChangePassword: false
    })

    // 清除全部历史会话,强制重新登录
    this.userRepo.deleteSessionsByUser(userId)

    this.writeAudit('update', userId, { field: 'password' })
  }

  /**
   * 首次启动时确保默认 admin 用户存在。
   *
   * 默认账号:admin / admin123,首次登录需强制修改密码。
   * 若已存在同名用户则跳过。
   */
  ensureDefaultAdmin(): void {
    const existing = this.userRepo.findByUsername(DEFAULT_ADMIN.username)
    if (existing) {
      return
    }
    const salt = generateSalt()
    const hash = hashPassword(DEFAULT_ADMIN.password, salt)
    this.userRepo.create({
      id: DEFAULT_ADMIN.id,
      username: DEFAULT_ADMIN.username,
      passwordHash: hash,
      passwordSalt: salt,
      displayName: '默认管理员',
      roles: DEFAULT_ADMIN.roles,
      mustChangePassword: true
    })
  }

  /**
   * 查询用户的聚合权限。
   *
   * @param userId 用户 ID。
   * @returns 权限标识列表。
   */
  getPermissionsForUserById(userId: string): string[] {
    const user = this.userRepo.findById(userId)
    if (!user) {
      return []
    }
    return this.getPermissionsForUser(user)
  }

  /**
   * 查询用户的聚合权限(内部实现)。
   *
   * @param user 用户行。
   * @returns 权限标识列表。
   */
  private getPermissionsForUser(user: UserRow): string[] {
    const roleNames = deserializeJson<string[]>(user.roles) ?? []
    return this.roleRepo.getPermissionsByRoleNames(roleNames)
  }

  /**
   * 写入审计日志,失败仅告警不抛错。
   *
   * @param action 操作类型。
   * @param actorId 操作者 ID。
   * @param metadata 附加元数据。
   */
  private writeAudit(action: AuditAction, actorId: string, metadata: Record<string, unknown>): void {
    try {
      this.auditRepo.create({
        actorType: 'system',
        actorId,
        action,
        entityType: 'user',
        entityId: actorId,
        metadata
      })
    } catch (err) {
      console.warn('[auth.service] audit create failed', action, err)
    }
  }
}
