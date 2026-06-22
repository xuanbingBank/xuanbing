/**
 * @file 数据库层通用类型定义：分页、排序、过滤、查询参数与统一时间戳约定。
 */

/**
 * 统一时间戳格式：ISO 8601 字符串。
 *
 * 全库时间字段统一使用 ISO string 存储（text 列），避免整数时间戳的时区与精度歧义。
 */
export type DbTimestamp = string

/**
 * 排序方向。
 */
export type SortDirection = 'asc' | 'desc'

/**
 * 通用排序参数。
 */
export interface SortParam {
  field: string
  direction: SortDirection
}

/**
 * 分页请求参数。
 */
export interface PageQuery {
  page: number
  pageSize: number
}

/**
 * 分页响应结构。
 */
export interface PageResult<TItem> {
  items: TItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  hasMore: boolean
}

/**
 * 通用列表查询参数（分页 + 排序 + 过滤）。
 */
export interface ListQuery<TFilter = Record<string, unknown>> {
  page?: number
  pageSize?: number
  sort?: SortParam
  filter?: TFilter
  /** 软删除过滤：默认仅返回未删除。 */
  includeDeleted?: boolean
}

/**
 * 默认分页参数。
 */
export const DEFAULT_PAGE: PageQuery = { page: 1, pageSize: 20 }

/**
 * 分页参数上限。
 */
export const MAX_PAGE_SIZE = 200

/**
 * 规范化分页参数，确保 page >= 1 且 pageSize 在合理区间。
 *
 * @param query 原始查询参数。
 * @returns 规范化后的分页参数。
 */
export function normalizePageQuery(query: { page?: number; pageSize?: number }): PageQuery {
  const page = Number.isFinite(query.page) && (query.page as number) >= 1
    ? Math.floor(query.page as number)
    : DEFAULT_PAGE.page
  const rawSize = Number.isFinite(query.pageSize) && (query.pageSize as number) >= 1
    ? Math.floor(query.pageSize as number)
    : DEFAULT_PAGE.pageSize
  const pageSize = Math.min(rawSize, MAX_PAGE_SIZE)
  return { page, pageSize }
}

/**
 * 根据总数与分页参数计算分页结果元信息。
 *
 * @param total 总条数。
 * @param pageQuery 分页参数。
 * @returns 分页元信息。
 */
export function computePageMeta(total: number, pageQuery: PageQuery): Pick<PageResult<never>, 'totalPages' | 'hasMore'> {
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageQuery.pageSize)
  const hasMore = pageQuery.page < totalPages
  return { totalPages, hasMore }
}

/**
 * 将分页参数转换为 SQLite OFFSET / LIMIT 值。
 *
 * @param pageQuery 分页参数。
 * @returns offset 与 limit。
 */
export function pageQueryToOffsetLimit(pageQuery: PageQuery): { offset: number; limit: number } {
  return {
    offset: (pageQuery.page - 1) * pageQuery.pageSize,
    limit: pageQuery.pageSize
  }
}
