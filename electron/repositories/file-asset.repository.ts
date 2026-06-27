/**
 * @file 文件素材 repository。
 */

import { BaseRepository, deserializeJson, generateId, nowIso, serializeJson } from './base.repository'
import type { ListQuery, PageResult } from '../ipcBus/shared/database'
import type { FileAssetCategory } from '../ipcBus/shared/database'

/**
 * 文件素材行类型。
 */
export interface FileAssetRow {
  id: string
  name: string
  originalName: string
  path: string
  relativePath: string | null
  mimeType: string
  size: number
  sha256: string | null
  ext: string | null
  category: string
  tags: string | null
  metadata: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

/**
 * 创建文件素材输入。
 */
export interface CreateFileAssetInput {
  name: string
  originalName: string
  path: string
  relativePath?: string
  mimeType: string
  size?: number
  sha256?: string
  ext?: string
  category?: FileAssetCategory
  tags?: string[]
  metadata?: unknown
}

/**
 * 文件素材过滤。
 */
export interface FileAssetFilter {
  category?: FileAssetCategory
  sha256?: string
  includeDeleted?: boolean
}

/**
 * 文件素材 repository。
 */
export class FileAssetRepository extends BaseRepository {
  /**
   * 创建文件素材。
   *
   * @param input 输入。
   * @returns 文件素材行。
   */
  create(input: CreateFileAssetInput): FileAssetRow {
    const id = generateId()
    const now = nowIso()

    this.db.prepare(`
      INSERT INTO file_assets (id, name, original_name, path, relative_path, mime_type, size, sha256, ext, category, tags, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.name,
      input.originalName,
      input.path,
      input.relativePath ?? null,
      input.mimeType,
      input.size ?? 0,
      input.sha256 ?? null,
      input.ext ?? null,
      input.category ?? 'other',
      serializeJson(input.tags ?? null),
      serializeJson(input.metadata ?? null),
      now,
      now
    )

    const created = this.findById(id)
    if (!created) {
      // TODO: 此处抛 new Error 而非 throwDbError，错误码与上下文信息缺失，
      // 后续应统一改为 throwDbError 以纳入数据库错误处理链路。
      throw new Error('FileAsset not found after insert: ' + id)
    }
    return created
  }

  /**
   * 根据 ID 查找文件素材。
   *
   * @param id 文件素材 ID。
   * @returns 文件素材行或 null。
   */
  findById(id: string): FileAssetRow | null {
    // TODO: 未过滤 deleted_at，会返回已软删除的记录。
    // 调用方若需排除已删除记录，应另行判断 deletedAt 或新增带过滤的查询方法。
    return (this.db.prepare('SELECT * FROM file_assets WHERE id = ?').get(id) as FileAssetRow | undefined) ?? null
  }

  /**
   * 按 sha256 查找文件素材。
   *
   * @param sha256 哈希值。
   * @returns 文件素材行或 null。
   */
  findBySha256(sha256: string): FileAssetRow | null {
    return (this.db.prepare('SELECT * FROM file_assets WHERE sha256 = ? AND deleted_at IS NULL').get(sha256) as FileAssetRow | undefined) ?? null
  }

  /**
   * 分页查询文件素材。
   *
   * @param query 查询参数。
   * @returns 分页结果。
   */
  list(query: ListQuery<FileAssetFilter> = {}): PageResult<FileAssetRow> {
    const conditions: string[] = []
    const params: unknown[] = []

    // 顶层 includeDeleted 与 filter.includeDeleted 任一为 true 时包含已删除记录,
    // 仅当两者均未显式开启时才过滤掉 deleted_at
    if (!query.includeDeleted && !query.filter?.includeDeleted) {
      conditions.push('deleted_at IS NULL')
    }
    if (query.filter?.category) {
      conditions.push('category = ?')
      params.push(query.filter.category)
    }
    if (query.filter?.sha256) {
      conditions.push('sha256 = ?')
      params.push(query.filter.sha256)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const sortSql = this.buildSortSql(query.sort, ['created_at', 'updated_at', 'size', 'name']) || 'ORDER BY created_at DESC'

    const countSql = `SELECT COUNT(*) as c FROM file_assets ${whereClause}`
    const listSql = `SELECT * FROM file_assets ${whereClause} ${sortSql} LIMIT ? OFFSET ?`

    return this.paginate<FileAssetRow>(countSql, listSql, params, query)
  }

  /**
   * 软删除文件素材。
   *
   * @param id 文件素材 ID。
   * @returns 是否成功。
   */
  softDelete(id: string): boolean {
    const result = this.db.prepare('UPDATE file_assets SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL').run(nowIso(), nowIso(), id)
    return result.changes > 0
  }

  /**
   * 反序列化文件素材行。
   *
   * @param row 文件素材行。
   * @returns 反序列化后的文件素材。
   */
  static deserialize(row: FileAssetRow): {
    id: string
    name: string
    originalName: string
    path: string
    relativePath: string | null
    mimeType: string
    size: number
    sha256: string | null
    ext: string | null
    category: FileAssetCategory
    tags: string[] | null
    metadata: unknown
    createdAt: string
    updatedAt: string
    deletedAt: string | null
  } {
    return {
      id: row.id,
      name: row.name,
      originalName: row.originalName,
      path: row.path,
      relativePath: row.relativePath,
      mimeType: row.mimeType,
      size: row.size,
      sha256: row.sha256,
      ext: row.ext,
      category: row.category as FileAssetCategory,
      tags: deserializeJson<string[]>(row.tags),
      metadata: deserializeJson(row.metadata),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt
    }
  }
}
