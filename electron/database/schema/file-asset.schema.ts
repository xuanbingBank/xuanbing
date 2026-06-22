/**
 * @file 文件素材元数据表 schema。
 *
 * 大文件不存入 SQLite，只存路径、hash、size、mime、metadata。
 */

import { sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

/**
 * file_assets：文件素材元数据。
 */
export const fileAssets = sqliteTable(
  'file_assets',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    originalName: text('original_name').notNull(),
    path: text('path').notNull(),
    relativePath: text('relative_path'),
    mimeType: text('mime_type').notNull(),
    size: integer('size').notNull().default(0),
    sha256: text('sha256'),
    ext: text('ext'),
    category: text('category').notNull().default('other'),
    tags: text('tags'),
    metadata: text('metadata'),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    deletedAt: text('deleted_at')
  },
  (table) => ({
    sha256Idx: index('idx_file_assets_sha256').on(table.sha256),
    categoryIdx: index('idx_file_assets_category').on(table.category),
    deletedAtIdx: index('idx_file_assets_deleted_at').on(table.deletedAt)
  })
)
