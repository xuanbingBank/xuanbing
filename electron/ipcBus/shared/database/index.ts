/**
 * @file 数据库 shared 层统一导出。
 */

export {
  DB_ERROR_CODES,
  createDbError,
  DbErrorException,
  isDbErrorCode,
  throwDbError
} from './db-errors'
export type {
  DbError,
  DbErrorCode,
  DbErrorSeverity
} from './db-errors'

export {
  DEFAULT_PAGE,
  MAX_PAGE_SIZE,
  computePageMeta,
  normalizePageQuery,
  pageQueryToOffsetLimit
} from './pagination'
export type {
  DbTimestamp,
  ListQuery,
  PageQuery,
  PageResult,
  SortDirection,
  SortParam
} from './pagination'

export {
  AUDIT_ACTIONS,
  AUDIT_ACTOR_TYPES,
  FILE_ASSET_CATEGORIES,
  LOG_LEVELS,
  SETTING_VALUE_TYPES,
  SYNC_DIRECTIONS,
  SYNC_OPERATIONS,
  SYNC_STATUSES,
  TASK_EVENT_TYPES,
  TASK_STATUSES,
  TASK_TYPES
} from './db-types'
export type {
  AuditAction,
  AuditActorType,
  BaseEntity,
  FileAssetCategory,
  LogLevel,
  SettingValueType,
  SoftDeletableEntity,
  SyncDirection,
  SyncOperation,
  SyncStatus,
  SyncableEntity,
  TaskEvent,
  TaskEventType,
  TaskStatus,
  TaskType
} from './db-types'

export {
  CURRENT_SCHEMA_VERSION,
  DB_DIR_NAMES,
  MAX_BACKUPS_TO_KEEP,
  MIGRATION_TABLE,
  SCHEMA_VERSION_TABLE,
  SQLITE_DB_FILENAME,
  XUANBING_CONFLICT_STRATEGIES,
  XUANBING_DOT_EXTENSION,
  XUANBING_EXTENSION,
  XUANBING_FILE_TYPES,
  XUANBING_FORMAT_VERSION,
  XUANBING_MAGIC,
  XUANBING_MAX_FILE_BYTES
} from './constants'
export type {
  XuanbingConflictStrategy,
  XuanbingFileType
} from './constants'
