/**
 * @file Fluent 风格分页组件。
 *
 * 支持：
 * - 上一页/下一页
 * - 页码显示与跳转
 * - 每页条数切换
 * - 快速跳转
 * - 总数显示
 * - 紧凑模式
 * - 禁用态
 */

import type { ComponentOptions } from '../../vue-global'
import { cx } from '../../utils/fluent-class'
import { FluentIconButton } from '../base/FluentIconButton'
import { FluentSelect } from '../base/FluentSelect'
import type { FluentSelectOption } from '../base/FluentSelect'

/** 组件 Props */
interface FluentPaginationProps {
  /** 当前页 */
  current: number
  /** 每页条数 */
  pageSize: number
  /** 总数 */
  total: number
  /** 可选每页条数 */
  pageSizes: number[]
  /** 是否显示总数 */
  showTotal: boolean
  /** 是否显示页码选择器 */
  showSizeChanger: boolean
  /** 是否显示快速跳转 */
  showQuickJumper: boolean
  /** 紧凑模式 */
  compact: boolean
  /** 禁用 */
  disabled: boolean
}

/** setup 上下文 */
interface SetupCtx {
  emit: (event: string, ...args: unknown[]) => void
}

/** 最大显示页码数 */
const MAX_PAGES = 7

export const FluentPagination: ComponentOptions = {
  name: 'FluentPagination',
  components: { FluentIconButton, FluentSelect },
  props: {
    current: { type: Number, default: 1 },
    pageSize: { type: Number, default: 20 },
    total: { type: Number, default: 0 },
    pageSizes: { type: Array, default: () => [10, 20, 50, 100] },
    showTotal: { type: Boolean, default: true },
    showSizeChanger: { type: Boolean, default: true },
    showQuickJumper: { type: Boolean, default: false },
    compact: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false }
  },
  emits: ['update:current', 'update:pageSize', 'change', 'size-change'],
  setup(props, ctx) {
    const { emit } = ctx as unknown as SetupCtx
    const p = props as unknown as FluentPaginationProps

    /** 总页数 */
    const totalPages = Vue.computed(() => {
      if (p.total <= 0) return 0
      return Math.ceil(p.total / p.pageSize)
    })

    /** 起始序号 */
    const startIdx = Vue.computed(() => {
      if (p.total === 0) return 0
      return (p.current - 1) * p.pageSize + 1
    })

    /** 结束序号 */
    const endIdx = Vue.computed(() => {
      const end = p.current * p.pageSize
      return end > p.total ? p.total : end
    })

    /** 页码列表 */
    const pages = Vue.computed(() => {
      const total = totalPages.value
      const current = p.current
      if (total === 0) return [] as number[]
      if (total <= MAX_PAGES) {
        return Array.from({ length: total }, (_, i) => i + 1)
      }
      const result: number[] = []
      const left = Math.max(2, current - 2)
      const right = Math.min(total - 1, current + 2)
      result.push(1)
      if (left > 2) result.push(-1) // 省略号
      for (let i = left; i <= right; i++) result.push(i)
      if (right < total - 1) result.push(-2) // 省略号
      result.push(total)
      return result
    })

    /** 每页条数选项 */
    const pageSizeOptions = Vue.computed<FluentSelectOption[]>(() => {
      return (p.pageSizes as number[]).map((size) => ({
        label: `${size} 条/页`,
        value: String(size)
      }))
    })

    /** 是否首页 */
    const isFirst = Vue.computed(() => p.current <= 1)
    /** 是否末页 */
    const isLast = Vue.computed(() => p.current >= totalPages.value || totalPages.value === 0)

    function handlePageChange(page: number): void {
      if (p.disabled) return
      if (page < 1 || page > totalPages.value || page === p.current) return
      emit('update:current', page)
      emit('change', page, p.pageSize)
    }

    function handlePrev(): void {
      handlePageChange(p.current - 1)
    }

    function handleNext(): void {
      handlePageChange(p.current + 1)
    }

    function handleSizeChange(value: string): void {
      if (p.disabled) return
      const size = Number(value)
      emit('update:pageSize', size)
      emit('size-change', size)
      // 调整当前页
      const newTotal = Math.ceil(p.total / size)
      if (p.current > newTotal) {
        emit('update:current', newTotal || 1)
        emit('change', newTotal || 1, size)
      }
    }

    function handleQuickJump(event: Event): void {
      const target = event.target as HTMLInputElement
      const page = parseInt(target.value, 10)
      if (!isNaN(page)) handlePageChange(page)
      target.value = ''
    }

    return {
      totalPages,
      startIdx,
      endIdx,
      pages,
      pageSizeOptions,
      isFirst,
      isLast,
      handlePageChange,
      handlePrev,
      handleNext,
      handleSizeChange,
      handleQuickJump,
      cx
    }
  },
  template: `
    <div class="flex items-center gap-2 text-sm text-[var(--xb-text-secondary)] flex-wrap">
      <!-- 总数 -->
      <span v-if="showTotal" class="text-xs">
        {{ total === 0 ? '共 0 条' : '第 ' + startIdx + '-' + endIdx + ' 条 / 共 ' + total + ' 条' }}
      </span>

      <div class="flex-1"></div>

      <!-- 每页条数 -->
      <div v-if="showSizeChanger" class="w-32">
        <FluentSelect
          :model-value="String(pageSize)"
          :options="pageSizeOptions"
          size="small"
          :disabled="disabled"
          @update:model-value="handleSizeChange"
        />
      </div>

      <!-- 上一页 -->
      <FluentIconButton
        icon="chevronLeft"
        :disabled="isFirst || disabled"
        size="small"
        @click="handlePrev"
      />

      <!-- 页码 -->
      <div class="flex items-center gap-1">
        <template v-for="page in pages" :key="page">
          <span v-if="page < 0" class="px-1 text-[var(--xb-text-tertiary)]">...</span>
          <button
            v-else
            type="button"
            :class="[
              'min-w-[28px] h-7 px-2 rounded-[var(--xb-radius-sm)] text-xs font-medium transition-colors',
              page === current
                ? 'bg-[var(--xb-brand)] text-white'
                : disabled
                  ? 'text-[var(--xb-text-disabled)] cursor-not-allowed'
                  : 'text-[var(--xb-text-secondary)] hover:bg-[var(--xb-bg-hover)] hover:text-[var(--xb-text-primary)]'
            ]"
            :disabled="disabled"
            @click="handlePageChange(page)"
          >
            {{ page }}
          </button>
        </template>
      </div>

      <!-- 下一页 -->
      <FluentIconButton
        icon="chevronRight"
        :disabled="isLast || disabled"
        size="small"
        @click="handleNext"
      />

      <!-- 快速跳转 -->
      <div v-if="showQuickJumper" class="flex items-center gap-1 text-xs">
        <span>跳至</span>
        <input
          type="number"
          class="w-12 h-7 px-2 text-center text-xs rounded-[var(--xb-radius-sm)] border border-[var(--xb-border-strong)] bg-[var(--xb-bg-surface)] text-[var(--xb-text-primary)] focus:outline-none focus:border-[var(--xb-brand)]"
          :disabled="disabled"
          @keydown.enter="handleQuickJump"
        />
        <span>页</span>
      </div>
    </div>
  `
}
