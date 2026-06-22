/**
 * @file 数据库基础层统一入口。
 */

export { resolveDbPaths, createBackupFileName, createExportFileName } from './db-path'
export type { DbPaths, DbPathOptions } from './db-path'

export {
  closeConnection,
  getConnection,
  getConnectionOrNull,
  isConnectionWritable,
  getDbFileSize,
  getPragmaSnapshot,
  normalizeDbError,
  openConnection,
  reconnectConnection
} from './db-connection'
export type { DbConnection } from './db-connection'

export { applyPragmas, EXPECTED_PRAGMAS, readPragmas, validatePragmas } from './db-pragmas'

export {
  getAppliedMigrations,
  getSchemaVersion,
  hasPendingMigrations,
  loadMigrationFiles,
  runMigrations,
  seedDatabase
} from './db-migrator'
export type { MigrationFile, MigrationRecord, MigrationResult } from './db-migrator'

export {
  backupDatabase,
  cleanupOldBackups,
  getLatestBackupTime,
  listBackups,
  verifyBackup
} from './db-backup'
export type { BackupOptions, BackupResult } from './db-backup'

export {
  clearAllLogs,
  clearOldLogs,
  restoreDatabase,
  vacuumDatabase
} from './db-restore'
export type { RestoreOptions, RestoreResult } from './db-restore'

export { checkHealth, getDatabaseStats } from './db-health'
export type { DbHealthReport } from './db-health'

export { runInTransaction, runTransaction } from './db-transaction'

export * as schema from './schema'
