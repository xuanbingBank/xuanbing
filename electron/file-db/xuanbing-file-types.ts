/**
 * @file .xuanbing 文件数据库类型定义。
 */

import type {
  XuanbingConflictStrategy,
  XuanbingFileType
} from '../ipcBus/shared/database'

/**
 * .xuanbing 文件元数据。
 */
export interface XuanbingFileMetadata {
  name: string
  description: string
  author: string
  tags: string[]
}

/**
 * .xuanbing 文件结构。
 */
export interface XuanbingFile {
  magic: string
  formatVersion: number
  type: XuanbingFileType
  appVersion: string
  schemaVersion: number
  createdAt: string
  updatedAt: string
  metadata: XuanbingFileMetadata
  payload: unknown
  checksum: string
}

/**
 * 文件引用（renderer 通过 dialog 获取，不直接持有路径）。
 */
export interface XuanbingFileRef {
  /** 不透明 token，main 进程通过它映射到真实路径。 */
  token: string
  /** 文件名（不含路径，仅用于显示）。 */
  displayName: string
  /** 文件大小。 */
  size: number
  /** 过期时间戳（ms）。 */
  expiresAt: number
}

/**
 * 导入预览项类型。
 */
export type ImportPlanAction = 'create' | 'update' | 'skip' | 'conflict' | 'error'

/**
 * 导入预览项。
 */
export interface ImportPlanItem {
  key: string
  action: ImportPlanAction
  reason?: string
  existingId?: string
}

/**
 * dryRun 导入计划。
 */
export interface ImportPlan {
  fileRef: XuanbingFileRef
  fileType: XuanbingFileType
  schemaVersion: number
  items: ImportPlanItem[]
  summary: {
    create: number
    update: number
    skip: number
    conflict: number
    error: number
    total: number
  }
  conflictStrategy: XuanbingConflictStrategy
  /** dryRun 时文件 checksum，正式导入时校验，绑定 plan 与文件状态。 */
  dryRunChecksum?: string
}

/**
 * 正式导入结果。
 */
export interface ImportResult {
  success: boolean
  imported: number
  skipped: number
  errors: Array<{ key: string; message: string }>
  rolledBack: boolean
  importedAt: string
}

/**
 * 导出输入。
 */
export interface ExportPackageInput {
  type: XuanbingFileType
  metadata?: Partial<XuanbingFileMetadata>
  /** 导出选项。 */
  options?: {
    /** 是否脱敏。 */
    redact?: boolean
    /** 导出数据范围。 */
    filter?: Record<string, unknown>
  }
}

/**
 * 导出结果。
 */
export interface ExportPackageResult {
  fileRef: XuanbingFileRef
  fileType: XuanbingFileType
  size: number
  checksum: string
  exportedAt: string
}

/**
 * 文件读取预览（不含敏感 payload）。
 */
export interface FileReadPreview {
  fileRef: XuanbingFileRef
  fileType: XuanbingFileType
  formatVersion: number
  schemaVersion: number
  appVersion: string
  metadata: XuanbingFileMetadata
  createdAt: string
  updatedAt: string
  checksum: string
  /** payload 大小（字节），不返回 payload 本身。 */
  payloadSize: number
  valid: boolean
}
