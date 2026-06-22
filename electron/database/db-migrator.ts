/**
 * @file 数据库迁移运行器。
 *
 * 1. 使用 drizzle-kit 生成 migration（SQL 文件）。
 * 2. app 启动执行 pending migrations。
 * 3. migration 前自动备份。
 * 4. migration 失败保留备份并阻止危险启动。
 * 5. 支持 schema version 查询。
 * 6. 支持 seed。
 * 7. 生产环境禁止 destructive reset。
 */

import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { getConnection, type DbConnection } from './db-connection'
import { backupDatabase, type BackupOptions } from './db-backup'
import { throwDbError, createDbError, CURRENT_SCHEMA_VERSION, MIGRATION_TABLE } from '../ipcBus/shared/database'
import type { DbPaths } from './db-path'

/**
 * migration 记录。
 */
export interface MigrationRecord {
  id: number
  name: string
  hash: string
  appliedAt: string
}

/**
 * migration 文件描述。
 */
export interface MigrationFile {
  name: string
  filename: string
  content: string
  hash: string
}

/**
 * migration 执行结果。
 */
export interface MigrationResult {
  applied: string[]
  skipped: string[]
  schemaVersion: number
  backupPath: string | null
}

/**
 * migrations 目录默认路径（相对于编译后 dist/electron/database/migrations）。
 */
const MIGRATIONS_DIR = path.join(__dirname, 'migrations')

/**
 * 读取 migrations 目录下全部 .sql 文件，按文件名排序。
 *
 * @param migrationsDir migrations 目录。
 * @returns migration 文件列表。
 */
export function loadMigrationFiles(migrationsDir: string = MIGRATIONS_DIR): MigrationFile[] {
  if (!fs.existsSync(migrationsDir)) {
    return []
  }

  const entries = fs.readdirSync(migrationsDir)
  const sqlFiles = entries
    .filter((name) => name.endsWith('.sql'))
    .sort()

  return sqlFiles.map((filename) => {
    const filePath = path.join(migrationsDir, filename)
    const content = fs.readFileSync(filePath, 'utf8')
    const hash = createHash('sha256').update(content).digest('hex')
    return {
      name: filename.replace(/\.sql$/, ''),
      filename,
      content,
      hash
    }
  })
}

/**
 * 确保 migration 跟踪表存在。
 *
 * @param conn 数据库连接。
 */
function ensureMigrationTable(conn: DbConnection): void {
  conn.raw.exec(`
    CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      hash TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `)
}

/**
 * 查询已应用的 migration 列表。
 *
 * @param conn 数据库连接。
 * @returns 已应用 migration 名称集合。
 */
export function getAppliedMigrations(conn: DbConnection): Set<string> {
  ensureMigrationTable(conn)
  const rows = conn.raw.prepare(`SELECT name FROM ${MIGRATION_TABLE}`).all() as Array<{ name: string }>
  return new Set(rows.map((row) => row.name))
}

/**
 * 查询当前 schema 版本。
 *
 * @param conn 数据库连接。
 * @returns 当前 schema 版本号。
 */
export function getSchemaVersion(conn: DbConnection): number {
  try {
    const row = conn.raw.prepare('SELECT version FROM __schema_version WHERE id = 1').get() as { version: number } | undefined
    return row?.version ?? 0
  } catch {
    return 0
  }
}

/**
 * 更新 schema 版本。
 *
 * @param conn 数据库连接。
 * @param version 新版本号。
 */
function setSchemaVersion(conn: DbConnection, version: number): void {
  conn.raw.prepare(
    'INSERT INTO __schema_version (id, version) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET version = excluded.version, updated_at = CURRENT_TIMESTAMP'
  ).run(version)
}

/**
 * 执行全部 pending migrations。
 *
 * 流程：
 * 1. migration 前自动备份（如果有 pending migration）。
 * 2. 逐个执行 migration，记录到 __migrations 表。
 * 3. 失败抛出 DB_MIGRATION_FAILED，保留备份。
 *
 * @param paths 数据库路径集合。
 * @param options 备份选项。
 * @returns migration 执行结果。
 */
export function runMigrations(paths: DbPaths, options: { backup?: boolean } = {}): MigrationResult {
  const conn = getConnection()
  const files = loadMigrationFiles()
  const applied = getAppliedMigrations(conn)

  const pending = files.filter((file) => !applied.has(file.name))

  let backupPath: string | null = null

  if (pending.length > 0 && options.backup !== false) {
    const backupResult = backupDatabase(paths, { prefix: 'pre-migration' })
    backupPath = backupResult.backupPath
  }

  const appliedNames: string[] = []
  const skippedNames: string[] = []

  for (const file of pending) {
    try {
      const execMigration = conn.raw.transaction(() => {
        conn.raw.exec(file.content)
        conn.raw.prepare(
          `INSERT INTO ${MIGRATION_TABLE} (name, hash) VALUES (?, ?)`
        ).run(file.name, file.hash)
      })
      execMigration()
      appliedNames.push(file.name)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throwDbError('DB_MIGRATION_FAILED', `Migration ${file.name} failed.`, {
        retryable: false,
        severity: 'critical',
        safeDetail: { migration: file.name, backupPath },
        devDetail: message,
        cause: message
      })
    }
  }

  for (const file of files) {
    if (applied.has(file.name)) {
      skippedNames.push(file.name)
    }
  }

  setSchemaVersion(conn, CURRENT_SCHEMA_VERSION)

  return {
    applied: appliedNames,
    skipped: skippedNames,
    schemaVersion: getSchemaVersion(conn),
    backupPath
  }
}

/**
 * 检查是否有 pending migration。
 *
 * @returns 是否有未应用的 migration。
 */
export function hasPendingMigrations(): boolean {
  const conn = getConnection()
  const files = loadMigrationFiles()
  const applied = getAppliedMigrations(conn)
  return files.some((file) => !applied.has(file.name))
}

/**
 * 初始化示例数据（seed）。
 *
 * @param conn 数据库连接。
 */
export function seedDatabase(conn: DbConnection = getConnection()): void {
  const now = new Date().toISOString()
  const existing = conn.raw.prepare('SELECT COUNT(*) as c FROM app_settings WHERE namespace = ? AND key = ?').get('system', 'seeded') as { c: number }

  if (existing.c > 0) {
    return
  }

  conn.raw.prepare(
    'INSERT INTO app_settings (id, namespace, key, value, value_type, description, is_system) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(
    'seed-flag',
    'system',
    'seeded',
    'true',
    'boolean',
    '标记数据库是否已执行 seed',
    1
  )

  conn.raw.prepare(
    'INSERT INTO app_settings (id, namespace, key, value, value_type, description, is_system) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(
    'seed-theme',
    'ui',
    'theme',
    'light',
    'string',
    '默认主题',
    0
  )

  void now
}

/**
 * 重置测试数据库（仅测试模式允许）。
 *
 * @param paths 数据库路径集合。
 */
export function resetTestDatabase(paths: DbPaths): void {
  if (!paths.testMode) {
    throw createDbError('DB_VALIDATION_ERROR', 'Destructive reset is only allowed in test mode.', {
      severity: 'critical',
      safeDetail: { reason: 'not_test_mode' }
    })
  }

  const conn = getConnectionOrNullSafe()
  if (conn) {
    conn.raw.close()
  }

  // 删除数据库文件及 WAL/SHM
  for (const suffix of ['', '-wal', '-shm']) {
    const filePath = paths.dbFile + suffix
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  }
}

function getConnectionOrNullSafe(): DbConnection | null {
  try {
    return getConnection()
  } catch {
    return null
  }
}
