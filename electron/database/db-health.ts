/**
 * @file 数据库健康检查。
 *
 * 返回健康报告：
 * 1. 数据库是否存在。
 * 2. 是否可读写。
 * 3. PRAGMA 是否正确。
 * 4. migration 是否最新。
 * 5. WAL 状态。
 * 6. 文件大小。
 * 7. 最近备份时间。
 * 8. integrity_check。
 */

import fs from 'node:fs'
import path from 'node:path'
import { getConnection, getConnectionOrNull, getDbFileSize, getPragmaSnapshot } from './db-connection'
import { validatePragmas } from './db-pragmas'
import { hasPendingMigrations, getSchemaVersion } from './db-migrator'
import { getLatestBackupTime } from './db-backup'
import { CURRENT_SCHEMA_VERSION } from '../ipcBus/shared/database'
import type { DbPaths } from './db-path'

/**
 * 健康检查报告。
 */
export interface DbHealthReport {
  healthy: boolean
  dbExists: boolean
  writable: boolean
  pragmaOk: boolean
  pragmaIssues: string[]
  migrationLatest: boolean
  pendingMigrations: boolean
  schemaVersion: number
  expectedSchemaVersion: number
  walEnabled: boolean
  dbFileSize: number
  latestBackupTime: string | null
  integrityCheck: string
  issues: string[]
  checkedAt: string
}

/**
 * 执行数据库健康检查。
 *
 * @param paths 数据库路径集合。
 * @param options 检查选项。
 * @returns 健康检查报告。
 */
export function checkHealth(
  paths: DbPaths,
  options: { integrityCheck?: boolean } = {}
): DbHealthReport {
  const { integrityCheck = true } = options
  const issues: string[] = []
  const checkedAt = new Date().toISOString()

  const dbExists = fs.existsSync(paths.dbFile)
  if (!dbExists) {
    issues.push('Database file does not exist')
  }

  const conn = getConnectionOrNull()
  let writable = false
  let pragmaOk = true
  let pragmaIssues: string[] = []
  let migrationLatest = true
  let pendingMigrations = false
  let schemaVersion = 0
  let walEnabled = false
  let integrityResult = 'skipped'

  if (conn) {
    try {
      conn.raw.prepare('SELECT 1').get()
      writable = true
    } catch {
      writable = false
      issues.push('Database is not writable')
    }

    if (writable) {
      pragmaIssues = validatePragmas(conn.raw)
      pragmaOk = pragmaIssues.length === 0
      if (!pragmaOk) {
        issues.push(...pragmaIssues)
      }

      try {
        pendingMigrations = hasPendingMigrations()
        migrationLatest = !pendingMigrations
        if (pendingMigrations) {
          issues.push('There are pending migrations')
        }
      } catch {
        migrationLatest = false
        issues.push('Failed to check migration status')
      }

      try {
        schemaVersion = getSchemaVersion(conn)
        if (schemaVersion < CURRENT_SCHEMA_VERSION) {
          issues.push(`Schema version ${schemaVersion} is behind expected ${CURRENT_SCHEMA_VERSION}`)
        }
      } catch {
        issues.push('Failed to read schema version')
      }

      const pragmas = getPragmaSnapshot()
      if (pragmas) {
        walEnabled = pragmas.journalMode.toLowerCase() === 'wal'
        if (!walEnabled) {
          issues.push(`WAL is not enabled (journal_mode=${pragmas.journalMode})`)
        }
      }

      if (integrityCheck) {
        try {
          const result = conn.raw.pragma('integrity_check', { simple: true })
          integrityResult = String(result)
          if (integrityResult !== 'ok') {
            issues.push(`integrity_check: ${integrityResult}`)
          }
        } catch {
          integrityResult = 'error'
          issues.push('integrity_check failed')
        }
      }
    }
  } else {
    issues.push('Database connection is not available')
  }

  const dbFileSize = getDbFileSize()
  const latestBackupTime = getLatestBackupTime(paths)

  return {
    healthy: issues.length === 0,
    dbExists,
    writable,
    pragmaOk,
    pragmaIssues,
    migrationLatest,
    pendingMigrations,
    schemaVersion,
    expectedSchemaVersion: CURRENT_SCHEMA_VERSION,
    walEnabled,
    dbFileSize,
    latestBackupTime,
    integrityCheck: integrityResult,
    issues,
    checkedAt
  }
}

/**
 * 获取数据库统计信息。
 *
 * @returns 各表行数统计。
 */
export function getDatabaseStats(): Record<string, number> {
  const conn = getConnection()
  const tables = [
    'app_settings',
    'window_states',
    'tasks',
    'task_events',
    'app_logs',
    'audit_logs',
    'file_assets',
    'sync_outbox',
    'sync_inbox'
  ]

  const stats: Record<string, number> = {}
  for (const table of tables) {
    try {
      const row = conn.raw.prepare(`SELECT COUNT(*) as c FROM ${table}`).get() as { c: number }
      stats[table] = row.c
    } catch {
      stats[table] = -1
    }
  }

  return stats
}

// 引入 path 避免未使用警告
void path
