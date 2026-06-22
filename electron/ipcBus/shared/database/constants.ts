/**
 * @file 数据库与 .xuanbing 文件数据库相关常量。
 */

/**
 * .xuanbing 文件魔数，用于快速识别文件格式。
 */
export const XUANBING_MAGIC = 'XUANBING_FILE_DB'

/**
 * .xuanbing 文件当前格式版本。
 */
export const XUANBING_FORMAT_VERSION = 1

/**
 * .xuanbing 文件扩展名（不含点）。
 */
export const XUANBING_EXTENSION = 'xuanbing'

/**
 * .xuanbing 文件扩展名（含点）。
 */
export const XUANBING_DOT_EXTENSION = '.xuanbing'

/**
 * .xuanbing 支持的文件类型枚举。
 */
export const XUANBING_FILE_TYPES = [
  'settings-package',
  'task-export',
  'workspace-package',
  'plugin-package',
  'data-snapshot',
  'diagnostics-package',
  'custom-json-db'
] as const

export type XuanbingFileType = (typeof XUANBING_FILE_TYPES)[number]

/**
 * .xuanbing 文件大小上限（默认 50MB）。
 */
export const XUANBING_MAX_FILE_BYTES = 50 * 1024 * 1024

/**
 * .xuanbing 导入冲突策略。
 */
export const XUANBING_CONFLICT_STRATEGIES = ['skip', 'overwrite', 'rename', 'merge', 'fail'] as const

export type XuanbingConflictStrategy = (typeof XUANBING_CONFLICT_STRATEGIES)[number]

/**
 * SQLite 数据库文件名。
 */
export const SQLITE_DB_FILENAME = 'app.sqlite'

/**
 * 备份保留数量上限。
 */
export const MAX_BACKUPS_TO_KEEP = 10

/**
 * 数据库目录结构子目录名。
 */
export const DB_DIR_NAMES = {
  root: 'app-data',
  db: 'db',
  backups: 'backups',
  exports: 'exports',
  imports: 'imports',
  fileDb: 'file-db',
  logs: 'logs'
} as const

/**
 * migration 记录表名。
 */
export const MIGRATION_TABLE = '__migrations'

/**
 * schema 版本表名（存储当前 schema version）。
 */
export const SCHEMA_VERSION_TABLE = '__schema_version'

/**
 * 当前 schema 版本。
 */
export const CURRENT_SCHEMA_VERSION = 1
