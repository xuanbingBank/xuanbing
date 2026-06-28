/**
 * @file 用户与角色 schema,支持本地鉴权。
 *
 * users 表存储本地账号与密码哈希,roles 表存储角色到权限的映射,
 * user_sessions 表记录登录会话 token。密码哈希使用 Node.js crypto.scryptSync。
 */

import { sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

/**
 * 用户表:存储本地账号与凭据。
 */
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  passwordSalt: text('password_salt').notNull(),
  displayName: text('display_name'),
  // JSON 数组字符串,记录角色名称列表
  roles: text('roles').notNull().default('[]'),
  // 1 表示首次登录需强制修改密码,0 表示无需修改
  mustChangePassword: integer('must_change_password').notNull().default(1),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`)
}, (table) => ({
  usernameIdx: index('idx_users_username').on(table.username)
}))

/**
 * 角色表:存储角色到权限的映射。
 */
export const roles = sqliteTable('roles', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  // JSON 数组字符串,记录权限标识列表
  permissions: text('permissions').notNull().default('[]'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`)
})

/**
 * 用户会话表:记录登录 token 及过期时间。
 */
export const userSessions = sqliteTable('user_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  token: text('token').notNull().unique(),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`)
}, (table) => ({
  tokenIdx: index('idx_user_sessions_token').on(table.token),
  userIdx: index('idx_user_sessions_user').on(table.userId)
}))
