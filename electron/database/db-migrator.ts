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
import { closeConnection, getConnection, type DbConnection } from './db-connection'
import { backupDatabase, type BackupOptions } from './db-backup'
import { runTransaction } from './db-transaction'
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
  rawHash: string
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
 * 将 migration 文本规范化为稳定哈希输入。
 *
 * @param content migration 文件原始文本。
 * @returns 统一为 LF 换行的 migration 文本。
 */
function normalizeMigrationHashContent(content: string): string {
  return content.replace(/\r\n/g, '\n')
}

/**
 * 计算 migration 的规范化 SHA-256。
 *
 * @param content migration 文件原始文本。
 * @returns 规范化后的 SHA-256 hash。
 */
function createMigrationHash(content: string): string {
  return createHash('sha256').update(normalizeMigrationHashContent(content)).digest('hex')
}

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
    const hash = createMigrationHash(content)
    const rawHash = createHash('sha256').update(content).digest('hex')
    return {
      name: filename.replace(/\.sql$/, ''),
      filename,
      content,
      hash,
      rawHash
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
 * 查询已应用 migration 的 name → hash 映射。
 *
 * @param conn 数据库连接。
 * @returns name 到存储 hash 的映射。
 */
function getAppliedMigrationHashes(conn: DbConnection): Map<string, string> {
  ensureMigrationTable(conn)
  const rows = conn.raw.prepare(`SELECT name, hash FROM ${MIGRATION_TABLE}`).all() as Array<{ name: string; hash: string }>
  return new Map(rows.map((row) => [row.name, row.hash]))
}

/**
 * 将历史 raw hash 记录升级为当前规范化 hash。
 *
 * @param conn 数据库连接。
 * @param file 当前 migration 文件。
 */
function updateAppliedMigrationHash(conn: DbConnection, file: MigrationFile): void {
  conn.raw.prepare(
    `UPDATE ${MIGRATION_TABLE} SET hash = ? WHERE name = ?`
  ).run(file.hash, file.name)
}

/**
 * 校验已应用 migration 的存储 hash 与文件当前 hash 一致。
 *
 * 防止 migration 文件在应用后被篡改导致 schema 与记录不符。
 *
 * TODO: 仅遍历当前 files，无法发现"已应用但文件已被删除"的 migration，
 * 即 __migrations 表中存在、但 migrations 目录已移除的记录会被静默忽略，
 * 后续可考虑对孤儿记录做告警或校验。
 *
 * @param conn 数据库连接。
 * @param files 当前 migration 文件列表。
 */
function verifyAppliedMigrationHashes(conn: DbConnection, files: MigrationFile[]): void {
  const storedHashes = getAppliedMigrationHashes(conn)
  for (const file of files) {
    const stored = storedHashes.get(file.name)
    if (stored !== undefined && stored === file.rawHash && stored !== file.hash) {
      updateAppliedMigrationHash(conn, file)
      continue
    }

    if (stored !== undefined && stored !== file.hash) {
      throwDbError('DB_MIGRATION_FAILED', `Migration ${file.name} hash mismatch: file has been modified after being applied.`, {
        retryable: false,
        severity: 'critical',
        safeDetail: { migration: file.name, reason: 'hash_mismatch' },
        devDetail: { migration: file.name, storedHash: stored, currentHash: file.hash }
      })
    }
  }
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

  // 在执行 pending migration 前，校验已应用 migration 的 hash 与文件当前 hash 一致
  verifyAppliedMigrationHashes(conn, files)

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

  // schema version 更新单独事务包裹，保证原子性
  // TODO: setSchemaVersion 与各 migration 的 INSERT 不在同一事务，
  // 若进程在此处之前崩溃，可能出现 migration 已记录但 schema_version 未更新的不一致；
  // 后续考虑将 setSchemaVersion 合并进最后一个 migration 的事务内。
  runTransaction(() => {
    setSchemaVersion(conn, CURRENT_SCHEMA_VERSION)
  })

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

  // TODO: 此处存在 TOCTOU：先 SELECT 判断是否已 seed，再在事务内 INSERT，
  // 多窗口/多进程并发首次启动时可能重复写入（受 id 主键约束会抛错回滚）。
  // 后续可改为 INSERT OR IGNORE 或将判断并入同一事务以消除竞态。
  if (existing.c > 0) {
    return
  }

  // 两条 seed INSERT 包裹在事务内，保证原子性（全部成功或全部回滚）
  runTransaction((tx) => {
    tx.prepare(
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

    tx.prepare(
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
  })
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

  // 关闭连接并清空 activeConnection 引用，避免句柄关闭后活动连接仍指向已失效句柄
  closeConnection()

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
