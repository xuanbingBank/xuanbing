/**
 * @file 数据表格组件，支持排序、选择、分页、自定义渲染。
 */

import type { ComponentOptions } from '../../vue-global'
import { BaseLoading } from '../base/BaseLoading'
import { BaseEmpty } from '../base/BaseEmpty'
import { BaseError } from '../base/BaseError'
import { escapeHtml } from '../../utils/escapeHtml'

/** 列对齐方式 */
type ColumnAlign = 'left' | 'center' | 'right'

/** 列固定方向 */
type ColumnFixed = 'left' | 'right'

/** 表格列定义 */
interface TableColumn {
  key: string
  title: string
  width?: string
  sortable?: boolean
  render?: (row: Record<string, unknown>, index: number) => string
  align?: ColumnAlign
  fixed?: ColumnFixed
}

/** 分页配置 */
interface Pagination {
  current: number
  pageSize: number
  total: number
}

/** 组件 Props */
interface DataTableProps {
  columns: TableColumn[]
  data: Array<Record<string, unknown>>
  loading: boolean
  rowKey: string
  selectable: boolean
  showIndex: boolean
  emptyText: string
  errorText: string
  error: string
  pagination: Pagination | null
  selectedKeys: Array<string | number>
}

/** setup 上下文类型 */
interface SetupCtx {
  emit: (event: string, ...args: unknown[]) => void
  slots: Record<string, unknown>
}

/** 对齐方式到 class 映射 */
const alignMap: Record<ColumnAlign, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right'
}

export const DataTable: ComponentOptions = {
  name: 'DataTable',
  components: { BaseLoading, BaseEmpty, BaseError },
  props: {
    columns: { type: Array, default: () => [] },
    data: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    rowKey: { type: String, default: 'id' },
    selectable: { type: Boolean, default: false },
    showIndex: { type: Boolean, default: false },
    emptyText: { type: String, default: '暂无数据' },
    errorText: { type: String, default: '加载失败' },
    error: { type: String, default: '' },
    pagination: { type: Object, default: () => null },
    selectedKeys: { type: Array, default: () => [] }
  },
  emits: ['sort', 'pageChange', 'pageSizeChange', 'select', 'selectAll', 'refresh'],
  setup(props, ctx) {
    const { emit } = ctx as unknown as SetupCtx
    const p = props as unknown as DataTableProps

    // 是否全选
    const isAllSelected = Vue.computed(() => {
      if (!p.selectable || p.data.length === 0) return false
      return p.data.every((row) => {
        const key = String(row[p.rowKey])
        return p.selectedKeys.includes(key)
      })
    })

    // 是否半选
    const isIndeterminate = Vue.computed(() => {
      if (!p.selectable || p.data.length === 0) return false
      const selectedCount = p.data.filter((row) => {
        const key = String(row[p.rowKey])
        return p.selectedKeys.includes(key)
      }).length
      return selectedCount > 0 && selectedCount < p.data.length
    })

    // 是否为空数据
    const isEmpty = Vue.computed(() => !p.loading && !p.error && p.data.length === 0)

    // 获取行的 key
    function getRowKey(row: Record<string, unknown>): string {
      return String(row[p.rowKey])
    }

    // 判断行是否选中
    function isRowSelected(row: Record<string, unknown>): boolean {
      return p.selectedKeys.includes(getRowKey(row))
    }

    // 获取列对齐 class
    function getAlignClass(align?: ColumnAlign): string {
      return align ? alignMap[align] : 'text-left'
    }

    // 获取单元格内容（支持自定义渲染）
    function getCellContent(col: TableColumn, row: Record<string, unknown>, index: number): string {
      if (col.render) {
        // render 语义为返回受信任 HTML 字符串，调用方需确保返回值已对动态内容转义
        return col.render(row, index)
      }
      const val = row[col.key]
      // 非 render 分支：对原始数据转义，避免 v-html XSS
      return val == null ? '' : escapeHtml(String(val))
    }

    // 全选切换
    function handleSelectAll(event: Event): void {
      const target = event.target as HTMLInputElement
      if (target.checked) {
        const keys = p.data.map((row) => getRowKey(row))
        emit('selectAll', keys)
      } else {
        emit('selectAll', [])
      }
    }

    // 单行选择
    function handleSelectRow(row: Record<string, unknown>, event: Event): void {
      const target = event.target as HTMLInputElement
      const key = getRowKey(row)
      emit('select', { key, selected: target.checked, row })
    }

    return {
      isAllSelected,
      isIndeterminate,
      isEmpty,
      getRowKey,
      isRowSelected,
      getAlignClass,
      getCellContent,
      handleSelectAll,
      handleSelectRow
    }
  },
  template: `
    <div class="data-table">
      <!-- 加载中 -->
      <BaseLoading v-if="loading" type="spinner" size="lg" />
      <!-- 错误状态 -->
      <BaseError
        v-else-if="error"
        :title="errorText"
        :description="error"
        :show-back="false"
        :show-home="false"
        @retry="$emit('refresh')"
      />
      <!-- 空数据 -->
      <BaseEmpty v-else-if="isEmpty" :title="emptyText" />
      <!-- 表格主体 -->
      <div v-else class="overflow-x-auto">
        <table class="table table-zebra">
          <thead>
            <tr>
              <th v-if="selectable" class="w-12">
                <input
                  type="checkbox"
                  class="checkbox checkbox-sm"
                  :checked="isAllSelected"
                  :indeterminate.prop="isIndeterminate"
                  @change="handleSelectAll"
                >
              </th>
              <th v-if="showIndex" class="w-16">#</th>
              <th
                v-for="col in columns"
                :key="col.key"
                :style="{ width: col.width }"
                :class="[getAlignClass(col.align), col.sortable ? 'cursor-pointer select-none' : '']"
                @click="col.sortable && $emit('sort', col.key)"
              >
                {{ col.title }}
                <span v-if="col.sortable" class="opacity-50 text-xs ml-1">⇅</span>
              </th>
              <th v-if="$slots.action" class="text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in data" :key="getRowKey(row)">
              <td v-if="selectable" class="w-12">
                <input
                  type="checkbox"
                  class="checkbox checkbox-sm"
                  :checked="isRowSelected(row)"
                  @change="handleSelectRow(row, $event)"
                >
              </td>
              <td v-if="showIndex">{{ index + 1 }}</td>
              <td
                v-for="col in columns"
                :key="col.key"
                :class="getAlignClass(col.align)"
                v-html="getCellContent(col, row, index)"
              ></td>
              <td v-if="$slots.action" class="text-right">
                <slot name="action" :row="row" :index="index"></slot>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
}
