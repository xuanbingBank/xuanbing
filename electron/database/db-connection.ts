/**
 * @file SQLite 数据库连接管理（单例）。
 *
 * 使用 better-sqlite3 + Drizzle ORM 初始化。
 * 单例连接，支持 close / reconnect / health check。
 * app quit 时关闭连接。禁止重复连接导致锁冲突。
 */

import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import fs from 'node:fs'
import { applyPragmas, readPragmas } from './db-pragmas'
import type { DbPaths } from './db-path'
import { throwDbError, createDbError, type DbError } from '../ipcBus/shared/database'
import * as schema from './schema'

/**
 * 数据库连接实例包装。
 */
export interface DbConnection {
  /** better-sqlite3 原始实例。 */
  raw: Database.Database
  /** Drizzle ORM 实例。 */
  drizzle: BetterSQLite3Database<typeof schema>
  /** 当前连接使用的路径。 */
  dbFile: string
  /** 是否已关闭。 */
  closed: boolean
}

let activeConnection: DbConnection | null = null

/**
 * 打开数据库连接（单例）。
 *
 * @param paths 数据库路径集合。
 * @returns 数据库连接实例。
 */
export function openConnection(paths: DbPaths): DbConnection {
  if (activeConnection && !activeConnection.closed) {
    return activeConnection
  }

  try {
    const raw = new Database(paths.dbFile, {
      verbose: undefined
    })

    applyPragmas(raw)

    const drizzleDb = drizzle(raw, { schema })

    activeConnection = {
      raw,
      drizzle: drizzleDb,
      dbFile: paths.dbFile,
      closed: false
    }

    return activeConnection
  } catch (error) {
    throwDbError('DB_CONNECTION_FAILED', 'Failed to open SQLite connection.', {
      retryable: true,
      severity: 'critical',
      safeDetail: { reason: 'open_failed' },
      devDetail: error instanceof Error ? error.message : String(error),
      cause: error instanceof Error ? error.message : undefined
    })
  }
}

/**
 * 获取当前活动连接，若未初始化则抛错。
 *
 * @returns 活动数据库连接。
 */
export function getConnection(): DbConnection {
  if (!activeConnection || activeConnection.closed) {
    throwDbError('DB_NOT_INITIALIZED', 'Database connection is not initialized.', {
      retryable: false,
      severity: 'critical',
      safeDetail: { reason: 'not_initialized' }
    })
  }
  return activeConnection
}

/**
 * 获取当前活动连接，若未初始化返回 null。
 *
 * @returns 活动数据库连接或 null。
 */
export function getConnectionOrNull(): DbConnection | null {
  if (!activeConnection || activeConnection.closed) {
    return null
  }
  return activeConnection
}

/**
 * 关闭数据库连接。
 */
export function closeConnection(): void {
  if (!activeConnection || activeConnection.closed) {
    return
  }

  try {
    activeConnection.raw.close()
  } catch {
    // 关闭失败不阻塞退出
  }

  activeConnection.closed = true
  activeConnection = null
}

/**
 * 重新连接数据库。
 *
 * @param paths 数据库路径集合。
 * @returns 新的数据库连接。
 */
export function reconnectConnection(paths: DbPaths): DbConnection {
  closeConnection()
  return openConnection(paths)
}

/**
 * 检查连接是否可读写。
 *
 * @returns 是否可读写。
 */
export function isConnectionWritable(): boolean {
  const conn = getConnectionOrNull()
  if (!conn) {
    return false
  }
  try {
    conn.raw.prepare('SELECT 1').get()
    return true
  } catch {
    return false
  }
}

/**
 * 获取数据库文件大小（字节）。
 *
 * @returns 文件大小，若文件不存在返回 0。
 */
export function getDbFileSize(): number {
  const conn = getConnectionOrNull()
  if (!conn) {
    return 0
  }
  try {
    const stat = fs.statSync(conn.dbFile)
    return stat.size
  } catch {
    return 0
  }
}

/**
 * 获取当前 PRAGMA 快照。
 *
 * @returns PRAGMA 值。
 */
export function getPragmaSnapshot(): ReturnType<typeof readPragmas> | null {
  const conn = getConnectionOrNull()
  if (!conn) {
    return null
  }
  return readPragmas(conn.raw)
}

/**
 * 将数据库层错误转为标准 DbError。
 *
 * @param error 原始错误。
 * @param fallbackCode 兜底错误码。
 * @returns 标准 DbError。
 */
export function normalizeDbError(error: unknown, fallbackCode: DbError['code'] = 'DB_QUERY_FAILED'): DbError {
  if (error instanceof Error && 'dbError' in error && error.dbError) {
    return (error as { dbError: DbError }).dbError
  }

  const message = error instanceof Error ? error.message : String(error)

  // SQLite 锁定错误
  if (message.includes('SQLITE_BUSY') || message.includes('database is locked')) {
    return createDbError('DB_LOCKED', 'Database is locked.', {
      retryable: true,
      severity: 'medium',
      devDetail: message
    })
  }

  return createDbError(fallbackCode, message, {
    retryable: false,
    severity: 'medium',
    devDetail: message
  })
}
