/**
 * @file 事务辅助工具。
 *
 * 支持 db.transaction。多表写入必须事务。失败自动回滚。
 */

import type Database from 'better-sqlite3'
import { getConnection } from './db-connection'
import { normalizeDbError } from './db-connection'
import { throwDbError } from '../ipcBus/shared/database'

/**
 * 在事务中执行函数，失败自动回滚。
 *
 * @param fn 事务体函数，接收 better-sqlite3 事务上下文。
 * @returns 事务体函数的返回值。
 */
export function runTransaction<T>(fn: (tx: Database.Database) => T): T {
  const conn = getConnection()
  const transaction = conn.raw.transaction(fn)

  try {
    return transaction(conn.raw)
  } catch (error) {
    const dbError = normalizeDbError(error, 'DB_TRANSACTION_FAILED')
    throwDbError(dbError.code, dbError.message, {
      retryable: dbError.retryable,
      severity: dbError.severity,
      safeDetail: dbError.safeDetail,
      devDetail: dbError.devDetail,
      cause: dbError.cause
    })
  }
}

/**
 * 在事务中执行异步友好函数（better-sqlite3 事务是同步的，此方法仅做错误包装）。
 *
 * 注意：better-sqlite3 事务是同步的，不能在事务体内 await。
 * 如需异步操作，应在事务外准备数据，事务内仅做同步写入。
 *
 * @param fn 事务体函数。
 * @returns 事务体函数的返回值。
 */
export function runInTransaction<T>(fn: (tx: Database.Database) => T): T {
  return runTransaction(fn)
}
