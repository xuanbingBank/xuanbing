/**
 * @file Fluent 风格数据表格组件。
 *
 * 支持：
 * - 列定义（key/title/width/align/sortable/fixed/render）
 * - 行选择（单选/多选）
 * - 列排序
 * - 加载/空态/错误态
 * - 自定义单元格渲染（render 函数返回 HTML 字符串）
 * - 行点击、行操作
 * - 粘性表头
 * - 斑马纹、边框、紧凑模式
 */

import type { ComponentOptions } from '../../vue-global'
import { cx } from '../../utils/fluent-class'
import { FluentCheckbox } from '../base/FluentCheckbox'
import { FluentLoading } from '../base/FluentLoading'
import { FluentEmpty } from '../base/FluentEmpty'
import { FluentError } from '../base/FluentError'
import { FluentIcon } from '../base/FluentIcon'

/** 列对齐方式 */
export type FluentColumnAlign = 'left' | 'center' | 'right'

/** 列固定方向 */
export type FluentColumnFixed = 'left' | 'right'

/** 排序方向 */
export type FluentSortOrder = 'asc' | 'desc' | null

/** 表格列定义 */
export interface FluentTableColumn {
  /** 列唯一 key */
  key: string
  /** 列标题 */
  title: string
  /** 列宽 */
  width?: string
  /** 是否可排序 */
  sortable?: boolean
  /** 对齐方式 */
  align?: FluentColumnAlign
  /** 固定列 */
  fixed?: FluentColumnFixed
  /** 自定义渲染函数，返回 HTML 字符串 */
  render?: (row: Record<string, unknown>, index: number) => string
  /** 是否隐藏 */
  hidden?: boolean
  /** 单元格 class */
  className?: string
}

/** 排序状态 */
export interface FluentTableSort {
  key: string
  order: FluentSortOrder
}

/** 组件 Props */
interface FluentTableProps {
  columns: FluentTableColumn[]
  data: Array<Record<string, unknown>>
  loading: boolean
  rowKey: string
  selectable: boolean
  selectedKeys: Array<string | number>
  showIndex: boolean
  stickyHeader: boolean
  striped: boolean
  bordered: boolean
  compact: boolean
  emptyText: string
  error: string
  sort: FluentTableSort | null
  hoverable: boolean
}

/** setup 上下文 */
interface SetupCtx {
  emit: (event: string, ...args: unknown[]) => void
  slots: Record<string, unknown>
}

/** 对齐方式映射 */
const alignMap: Record<FluentColumnAlign, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right'
}

export const FluentTable: ComponentOptions = {
  name: 'FluentTable',
  components: { FluentCheckbox, FluentLoading, FluentEmpty, FluentError, FluentIcon },
  props: {
    columns: { type: Array, default: () => [] },
    data: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    rowKey: { type: String, default: 'id' },
    selectable: { type: Boolean, default: false },
    selectedKeys: { type: Array, default: () => [] },
    showIndex: { type: Boolean, default: false },
    stickyHeader: { type: Boolean, default: true },
    striped: { type: Boolean, default: false },
    bordered: { type: Boolean, default: true },
    compact: { type: Boolean, default: false },
    emptyText: { type: String, default: '暂无数据' },
    error: { type: String, default: '' },
    sort: { type: Object, default: null },
    hoverable: { type: Boolean, default: true }
  },
  emits: ['sort', 'select', 'select-all', 'row-click', 'refresh'],
  setup(props, ctx) {
    const { emit } = ctx as unknown as SetupCtx
    const p = props as unknown as FluentTableProps

    /** 可见列 */
    const visibleColumns = Vue.computed(() => {
      return (p.columns ?? []).filter((c) => !c.hidden)
    })

    /** 是否全选 */
    const allSelected = Vue.computed(() => {
      const keys = p.selectedKeys as Array<string | number>
      const data = p.data as Array<Record<string, unknown>>
      if (data.length === 0) return false
      return data.every((row) => keys.includes(row[p.rowKey] as string | number))
    })

    /** 是否部分选中 */
    const someSelected = Vue.computed(() => {
      const keys = p.selectedKeys as Array<string | number>
      const data = p.data as Array<Record<string, unknown>>
      if (data.length === 0) return false
      const selected = data.filter((row) => keys.includes(row[p.rowKey] as string | number))
      return selected.length > 0 && selected.length < data.length
    })

    /** 行是否选中 */
    function isRowSelected(row: Record<string, unknown>): boolean {
      const keys = p.selectedKeys as Array<string | number>
      return keys.includes(row[p.rowKey] as string | number)
    }

    /** 获取列排序图标 */
    function getSortIcon(key: string): string {
      const sort = p.sort as FluentTableSort | null
      if (!sort || sort.key !== key) return 'sort'
      return sort.order === 'asc' ? 'chevronUp' : 'chevronDown'
    }

    /** 处理表头排序点击 */
    function handleSort(column: FluentTableColumn): void {
      if (!column.sortable) return
      const current = p.sort as FluentTableSort | null
      let nextOrder: FluentSortOrder = 'asc'
      if (current && current.key === column.key) {
        if (current.order === 'asc') nextOrder = 'desc'
        else if (current.order === 'desc') nextOrder = null
      }
      emit('sort', { key: column.key, order: nextOrder })
    }

    /** 全选切换 */
    function handleSelectAll(): void {
      if (allSelected.value) {
        emit('select-all', [])
      } else {
        const data = p.data as Array<Record<string, unknown>>
        const keys = data.map((row) => row[p.rowKey] as string | number)
        emit('select-all', keys)
      }
    }

    /** 单行选择 */
    function handleRowSelect(row: Record<string, unknown>): void {
      const keys = [...(p.selectedKeys as Array<string | number>)]
      const key = row[p.rowKey] as string | number
      const idx = keys.indexOf(key)
      if (idx >= 0) keys.splice(idx, 1)
      else keys.push(key)
      emit('select', keys, row)
    }

    /** 行点击 */
    function handleRowClick(row: Record<string, unknown>, event: MouseEvent): void {
      emit('row-click', row, event)
    }

    /** 渲染单元格内容 */
    function renderCell(column: FluentTableColumn, row: Record<string, unknown>, index: number): string {
      if (column.render) return column.render(row, index)
      const value = row[column.key]
      return value === null || value === undefined ? '-' : String(value)
    }

    const tableClass = Vue.computed(() =>
      cx(
        'w-full border-collapse',
        p.bordered ? 'border border-[var(--xb-border-subtle)]' : ''
      )
    )

    const cellPadding = Vue.computed(() => (p.compact ? 'px-3 py-1.5' : 'px-4 py-2.5'))

    return {
      visibleColumns,
      allSelected,
      someSelected,
      isRowSelected,
      getSortIcon,
      handleSort,
      handleSelectAll,
      handleRowSelect,
      handleRowClick,
      renderCell,
      tableClass,
      cellPadding,
      alignMap,
      cx
    }
  },
  template: `
    <div class="relative w-full overflow-hidden rounded-[var(--xb-radius-lg)] border border-[var(--xb-border-subtle)] bg-[var(--xb-bg-surface)]">
      <div class="overflow-x-auto xb-scroll-y">
        <table :class="tableClass">
          <thead :class="stickyHeader ? 'sticky top-0 z-10 bg-[var(--xb-bg-subtle)]' : 'bg-[var(--xb-bg-subtle)]'">
            <tr>
              <th v-if="selectable" :class="['border-b border-[var(--xb-border-subtle)]', cellPadding]">
                <FluentCheckbox
                  :model-value="allSelected"
                  :indeterminate="someSelected"
                  @update:model-value="handleSelectAll"
                />
              </th>
              <th v-if="showIndex" :class="['border-b border-[var(--xb-border-subtle)] text-[var(--xb-text-secondary)] font-medium text-xs uppercase tracking-wide', cellPadding, 'text-center']" style="width: 56px;">
                #
              </th>
              <th
                v-for="column in visibleColumns"
                :key="column.key"
                :class="[
                  'border-b border-[var(--xb-border-subtle)] text-[var(--xb-text-secondary)] font-medium text-xs uppercase tracking-wide whitespace-nowrap',
                  cellPadding,
                  alignMap[column.align || 'left'],
                  column.sortable ? 'cursor-pointer hover:text-[var(--xb-text-primary)] select-none' : ''
                ]"
                :style="{ width: column.width }"
                @click="column.sortable && handleSort(column)"
              >
                <div class="inline-flex items-center gap-1">
                  <span>{{ column.title }}</span>
                  <FluentIcon
                    v-if="column.sortable"
                    :name="getSortIcon(column.key)"
                    :size="12"
                    class="text-[var(--xb-text-tertiary)]"
                  />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, index) in data"
              :key="row[rowKey]"
              :class="[
                'transition-colors',
                striped && index % 2 === 1 ? 'bg-[var(--xb-bg-subtle)]' : '',
                hoverable ? 'hover:bg-[var(--xb-bg-hover)]' : '',
                isRowSelected(row) ? 'bg-[var(--xb-brand-subtle)]' : ''
              ]"
              @click="handleRowClick(row, $event)"
            >
              <td v-if="selectable" :class="['border-b border-[var(--xb-border-subtle)]', cellPadding]" @click.stop>
                <FluentCheckbox
                  :model-value="isRowSelected(row)"
                  @update:model-value="handleRowSelect(row)"
                />
              </td>
              <td v-if="showIndex" :class="['border-b border-[var(--xb-border-subtle)] text-[var(--xb-text-tertiary)] text-sm', cellPadding, 'text-center']">
                {{ index + 1 }}
              </td>
              <td
                v-for="column in visibleColumns"
                :key="column.key"
                :class="[
                  'border-b border-[var(--xb-border-subtle)] text-sm text-[var(--xb-text-primary)]',
                  cellPadding,
                  alignMap[column.align || 'left'],
                  column.className || ''
                ]"
                v-html="renderCell(column, row, index)"
              ></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 加载态 -->
      <div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-[var(--xb-bg-surface)]/60 backdrop-blur-sm">
        <FluentLoading size="large" />
      </div>

      <!-- 空态 -->
      <div v-if="!loading && data.length === 0 && !error" class="py-12">
        <FluentEmpty :title="emptyText" />
      </div>

      <!-- 错误态 -->
      <div v-if="error" class="py-12">
        <FluentError
          :description="error"
          show-retry
          @retry="$emit('refresh')"
        />
      </div>
    </div>
  `
}
