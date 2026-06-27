/**
 * @file 数据库与文件数据库层统一错误码、错误工厂与标准错误结构。
 *
 * 这些错误码独立于 IPC 错误码（IPC_ERROR_CODES），用于 SQLite / IndexedDB / .xuanbing
 * 三层存储内部的标准化错误表达。service / repository 抛出 DbError，IPC 层再将其
 * 映射为 IpcError 返回 renderer。
 */

/**
 * 数据库层全部错误码。
 */
export const DB_ERROR_CODES = {
  dbNotInitialized: 'DB_NOT_INITIALIZED',
  dbConnectionFailed: 'DB_CONNECTION_FAILED',
  dbMigrationFailed: 'DB_MIGRATION_FAILED',
  dbBackupFailed: 'DB_BACKUP_FAILED',
  dbRestoreFailed: 'DB_RESTORE_FAILED',
  dbHealthCheckFailed: 'DB_HEALTH_CHECK_FAILED',
  dbQueryFailed: 'DB_QUERY_FAILED',
  dbTransactionFailed: 'DB_TRANSACTION_FAILED',
  dbValidationError: 'DB_VALIDATION_ERROR',
  dbConflict: 'DB_CONFLICT',
  dbNotFound: 'DB_NOT_FOUND',
  dbLocked: 'DB_LOCKED',

  cacheOpenFailed: 'CACHE_OPEN_FAILED',
  cacheReadFailed: 'CACHE_READ_FAILED',
  cacheWriteFailed: 'CACHE_WRITE_FAILED',
  cacheExpired: 'CACHE_EXPIRED',

  xuanbingFileInvalid: 'XUANBING_FILE_INVALID',
  xuanbingFileVersionUnsupported: 'XUANBING_FILE_VERSION_UNSUPPORTED',
  xuanbingFileChecksumFailed: 'XUANBING_FILE_CHECKSUM_FAILED',
  xuanbingFileSchemaFailed: 'XUANBING_FILE_SCHEMA_FAILED',
  xuanbingFileTooLarge: 'XUANBING_FILE_TOO_LARGE',
  xuanbingFilePathForbidden: 'XUANBING_FILE_PATH_FORBIDDEN',
  xuanbingFileImportConflict: 'XUANBING_FILE_IMPORT_CONFLICT',
  xuanbingFileImportFailed: 'XUANBING_FILE_IMPORT_FAILED',
  xuanbingFileExportFailed: 'XUANBING_FILE_EXPORT_FAILED',
  xuanbingFileWriteFailed: 'XUANBING_FILE_WRITE_FAILED',
  xuanbingFileRefInvalid: 'XUANBING_FILE_REF_INVALID'
} as const

export type DbErrorCode = (typeof DB_ERROR_CODES)[keyof typeof DB_ERROR_CODES]

/**
 * 错误严重级别。
 */
export type DbErrorSeverity = 'low' | 'medium' | 'high' | 'critical'

/**
 * 数据库层标准错误结构。
 */
export interface DbError {
  code: DbErrorCode
  message: string
  retryable: boolean
  severity: DbErrorSeverity
  /** 对 renderer 安全的细节，不含敏感路径或内部信息。 */
  safeDetail?: unknown
  /** 仅供开发调试的细节，生产环境不应返回 renderer。 */
  devDetail?: unknown
  cause?: string
}

/**
 * 判断字符串是否为合法数据库错误码。
 *
 * @param value 待判断字符串。
 * @returns 是否为合法错误码。
 */
export function isDbErrorCode(value: string): value is DbErrorCode {
  return (Object.values(DB_ERROR_CODES) as string[]).includes(value)
}

/**
 * 创建数据库层标准错误对象。
 *
 * @param code 错误码。
 * @param message 面向用户的错误消息。
 * @param options 额外错误属性。
 * @returns 标准数据库错误对象。
 */
export function createDbError(
  code: DbErrorCode,
  message: string,
  options: {
    retryable?: boolean
    severity?: DbErrorSeverity
    safeDetail?: unknown
    devDetail?: unknown
    cause?: string
  } = {}
): DbError {
  return {
    code,
    message,
    retryable: options.retryable ?? false,
    severity: options.severity ?? 'medium',
    safeDetail: options.safeDetail,
    devDetail: options.devDetail,
    cause: options.cause
  }
}

/**
 * 数据库层错误异常类，便于在 service / repository 中 throw。
 */
export class DbErrorException extends Error {
  public readonly dbError: DbError

  public constructor(error: DbError) {
    super(error.message)
    this.name = 'DbErrorException'
    this.dbError = error
  }
}

/**
 * 快速抛出数据库错误。
 *
 * @param code 错误码。
 * @param message 错误消息。
 * @param options 额外错误属性。
 */
export function throwDbError(
  code: DbErrorCode,
  message: string,
  options?: {
    retryable?: boolean
    severity?: DbErrorSeverity
    safeDetail?: unknown
    devDetail?: unknown
    cause?: string
  }
): never {
  throw new DbErrorException(createDbError(code, message, options ?? {}))
}
