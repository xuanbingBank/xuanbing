/**
 * @file .xuanbing 文件数据库层统一导出。
 */

export type {
  ExportPackageInput,
  ExportPackageResult,
  FileReadPreview,
  ImportPlan,
  ImportPlanItem,
  ImportPlanAction,
  ImportResult,
  XuanbingFile,
  XuanbingFileMetadata,
  XuanbingFileRef
} from './xuanbing-file-types'

export { computeChecksum, verifyChecksum } from './xuanbing-file-checksum'
export { validateFile, validateFileOrThrow } from './xuanbing-file-validator'
export type { ValidationResult } from './xuanbing-file-validator'
export { readXuanbingFile, readXuanbingFilePreview } from './xuanbing-file-reader'
export { buildXuanbingFile, createAndWriteXuanbingFile, writeXuanbingFile } from './xuanbing-file-writer'
export { dryRunImport, importPackage } from './xuanbing-file-importer'
export type { TaskExportPayload } from './xuanbing-file-importer'
export { exportPackage, exportToPath } from './xuanbing-file-exporter'
export type { ExportFileResult, ExportOptions } from './xuanbing-file-exporter'
export { atomicWriteFile } from './atomic-write'
export {
  ensureFileSize,
  ensureNotDatabaseFile,
  ensurePathWithinDir,
  ensureXuanbingExtension,
  sanitizeFileName
} from './safe-file-path'
export { validateXuanbingFile, xuanbingFileSchema, xuanbingMetadataSchema } from './xuanbing-file.schema'
