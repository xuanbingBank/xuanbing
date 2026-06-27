/**
 * @file 表格组合式函数，封装分页、排序、选择等逻辑。
 */

import { defineState, computedRef } from '../stores/base'
import type { Ref } from '../vue-global'

/**
 * 表格列定义。
 */
export interface DataTableColumn<T = Record<string, unknown>> {
  /** 列键 */
  key: string
  /** 列标题 */
  title: string
  /** 列宽度 */
  width?: string
  /** 是否可排序 */
  sortable?: boolean
  /** 自定义渲染函数（返回字符串） */
  render?: (row: T, index: number) => string
  /** 对齐方式 */
  align?: 'left' | 'center' | 'right'
  /** 是否固定列 */
  fixed?: 'left' | 'right'
}

/**
 * 排序状态。
 */
export interface SortState {
  /** 排序字段 */
  field: string
  /** 排序方向 */
  order: 'asc' | 'desc' | null
}

/**
 * 分页状态。
 */
export interface PaginationState {
  /** 当前页码（从 1 开始） */
  current: number
  /** 每页条数 */
  pageSize: number
  /** 总条数 */
  total: number
}

/**
 * 表格选项。
 */
export interface UseTableOptions<T> {
  /** 列定义 */
  columns: DataTableColumn<T>[]
  /** 数据源（本地模式） */
  data?: T[]
  /** 行键字段 */
  rowKey?: string
  /** 是否开启分页 */
  pagination?: boolean
  /** 每页条数 */
  pageSize?: number
  /** 是否开启选择 */
  selectable?: boolean
  /** 是否服务端模式 */
  serverSide?: boolean
  /** 服务端数据加载函数 */
  fetchData?: (params: { current: number; pageSize: number; sort: SortState }) => Promise<{ data: T[]; total: number }>
}

/**
 * 表格组合式函数返回值。
 */
export interface UseTableReturn<T> {
  /** 列定义 */
  columns: DataTableColumn<T>[]
  /** 当前数据 */
  data: Ref<T[]>
  /** 加载状态 */
  loading: Ref<boolean>
  /** 排序状态 */
  sort: SortState
  /** 分页状态 */
  pagination: PaginationState
  /** 选中行键列表 */
  selectedKeys: Ref<(string | number)[]>
  /** 是否有选中 */
  hasSelected: ReturnType<typeof Vue.computed>
  /** 总页数 */
  totalPages: ReturnType<typeof Vue.computed>
  /** 切换排序 */
  toggleSort: (field: string) => void
  /** 跳转页码 */
  goToPage: (page: number) => void
  /** 下一页 */
  nextPage: () => void
  /** 上一页 */
  prevPage: () => void
  /** 切换选中 */
  toggleSelect: (key: string | number) => void
  /** 全选/取消全选 */
  toggleSelectAll: () => void
  /** 清空选中 */
  clearSelected: () => void
  /** 刷新数据 */
  refresh: () => Promise<void>
  /** 设置每页条数 */
  setPageSize: (size: number) => void
}

/**
 * 表格组合式函数。
 *
 * @param options 表格选项。
 * @returns 表格操作方法。
 */
export function useTable<T extends Record<string, unknown>>(
  options: UseTableOptions<T>
): UseTableReturn<T> {
  const {
    columns,
    data: initialData = [],
    rowKey = 'id',
    pagination: enablePagination = true,
    pageSize: initialPageSize = 10,
    selectable: enableSelectable = false,
    serverSide = false,
    fetchData
  } = options

  const state = defineState({
    data: initialData as T[],
    loading: false,
    error: null as string | null,
    sort: { field: '', order: null } as SortState,
    pagination: {
      current: 1,
      pageSize: initialPageSize,
      total: initialData.length
    } as PaginationState,
    selectedKeys: [] as (string | number)[]
  })

  const hasSelected = computedRef<boolean>(() => state.selectedKeys.length > 0)
  const totalPages = computedRef<number>(() =>
    Math.max(1, Math.ceil(state.pagination.total / state.pagination.pageSize))
  )
  const data = computedRef<T[]>(() => getLocalPageData())
  const loading = computedRef<boolean>(() => state.loading)
  const selectedKeys = computedRef<(string | number)[]>(() => state.selectedKeys)

  function toggleSort(field: string): void {
    if (state.sort.field !== field) {
      state.sort = { field, order: 'asc' }
    } else if (state.sort.order === 'asc') {
      state.sort = { field, order: 'desc' }
    } else if (state.sort.order === 'desc') {
      state.sort = { field: '', order: null }
    } else {
      state.sort = { field, order: 'asc' }
    }
    if (!serverSide) {
      applyLocalSort()
    } else {
      void refresh()
    }
  }

  function applyLocalSort(): void {
    if (!state.sort.field || !state.sort.order) return
    const field = state.sort.field
    const order = state.sort.order === 'asc' ? 1 : -1
    state.data = [...state.data].sort((a, b) => {
      const av = (a as Record<string, unknown>)[field]
      const bv = (b as Record<string, unknown>)[field]
      if (av === bv) return 0
      if (av === undefined || av === null) return 1
      if (bv === undefined || bv === null) return -1
      return av > bv ? order : -order
    })
  }

  function getLocalPageData(): T[] {
    if (!enablePagination) return state.data
    const start = (state.pagination.current - 1) * state.pagination.pageSize
    const end = start + state.pagination.pageSize
    return state.data.slice(start, end)
  }

  // 请求序号，用于丢弃过期响应，避免并发刷新竞态
  let refreshSeq = 0

  async function refresh(): Promise<void> {
    if (serverSide && fetchData) {
      const seq = ++refreshSeq
      state.loading = true
      state.error = null
      try {
        const result = await fetchData({
          current: state.pagination.current,
          pageSize: state.pagination.pageSize,
          sort: state.sort
        })
        // 丢弃过期响应：期间已有更新的 refresh 触发
        if (seq !== refreshSeq) return
        state.data = result.data
        state.pagination.total = result.total
      } catch (err) {
        if (seq !== refreshSeq) return
        state.error = err instanceof Error ? err.message : String(err)
      } finally {
        // 仅当前最新请求负责复位 loading，避免覆盖更新请求的 loading 状态
        if (seq === refreshSeq) {
          state.loading = false
        }
      }
    } else {
      applyLocalSort()
      state.pagination.total = state.data.length
    }
  }

  function goToPage(page: number): void {
    const total = totalPages.value as unknown as number
    const target = Math.max(1, Math.min(page, total))
    state.pagination.current = target
    if (serverSide) void refresh()
  }

  function nextPage(): void {
    goToPage(state.pagination.current + 1)
  }

  function prevPage(): void {
    goToPage(state.pagination.current - 1)
  }

  function toggleSelect(key: string | number): void {
    if (!enableSelectable) return
    const index = state.selectedKeys.indexOf(key)
    if (index >= 0) {
      state.selectedKeys.splice(index, 1)
    } else {
      state.selectedKeys.push(key)
    }
  }

  function toggleSelectAll(): void {
    if (!enableSelectable) return
    const pageData = getLocalPageData()
    const allKeys = pageData.map((row) => (row as Record<string, unknown>)[rowKey] as string | number)
    if (state.selectedKeys.length === allKeys.length) {
      state.selectedKeys = []
    } else {
      state.selectedKeys = allKeys
    }
  }

  function clearSelected(): void {
    state.selectedKeys = []
  }

  function setPageSize(size: number): void {
    state.pagination.pageSize = size
    state.pagination.current = 1
    if (serverSide) void refresh()
  }

  return {
    columns,
    data,
    loading,
    sort: state.sort,
    pagination: state.pagination,
    selectedKeys,
    hasSelected,
    totalPages,
    toggleSort,
    goToPage,
    nextPage,
    prevPage,
    toggleSelect,
    toggleSelectAll,
    clearSelected,
    refresh,
    setPageSize
  }
}
