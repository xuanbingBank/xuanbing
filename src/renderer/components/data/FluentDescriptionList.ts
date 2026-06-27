/**
 * @file Fluent 风格描述列表组件。
 *
 * 用于展示键值对信息（详情页常用）。
 * 支持：
 * - 横向/纵向布局
 * - 列数配置
 * - 自定义渲染
 * - 空值占位
 * - 标题
 */

import type { ComponentOptions } from '../../vue-global'
import { cx } from '../../utils/fluent-class'
import { escapeHtml } from '../../utils/escapeHtml'
import { FluentEmpty } from '../base/FluentEmpty'

/** 描述列表项 */
export interface FluentDescriptionItem {
  /** 字段 label */
  label: string
  /** 字段值 */
  value: string | number | null | undefined
  /** 自定义渲染（返回 HTML 字符串） */
  render?: (value: unknown) => string
  /** 跨列数 */
  span?: number
}

/** 组件 Props */
interface FluentDescriptionListProps {
  /** 标题 */
  title: string
  /** 列表项 */
  items: FluentDescriptionItem[]
  /** 列数 */
  columns: number
  /** 布局方向 */
  direction: 'horizontal' | 'vertical'
  /** 空值占位 */
  emptyText: string
  /** 是否边框 */
  bordered: boolean
  /** 是否紧凑 */
  compact: boolean
  /** label 宽度 */
  labelWidth: string
}

/** setup 上下文 */
interface SetupCtx {
  emit: (event: string, ...args: unknown[]) => void
  slots: Record<string, unknown>
}

export const FluentDescriptionList: ComponentOptions = {
  name: 'FluentDescriptionList',
  components: { FluentEmpty },
  props: {
    title: { type: String, default: '' },
    items: { type: Array, default: () => [] },
    columns: { type: Number, default: 2 },
    direction: { type: String as () => 'horizontal' | 'vertical', default: 'horizontal' },
    emptyText: { type: String, default: '-' },
    bordered: { type: Boolean, default: true },
    compact: { type: Boolean, default: false },
    labelWidth: { type: String, default: '120px' }
  },
  emits: [],
  setup(props) {
    const p = props as unknown as FluentDescriptionListProps

    /** 渲染值 */
    function renderValue(item: FluentDescriptionItem): string {
      if (item.render) {
        // render 语义为返回受信任 HTML 字符串，调用方需确保返回值已对动态内容转义
        return item.render(item.value)
      }
      const v = item.value
      if (v === null || v === undefined || v === '') return escapeHtml(p.emptyText)
      // 非 render 分支：对原始数据转义，避免 v-html XSS
      return escapeHtml(String(v))
    }

    /** 是否空值 */
    function isEmpty(item: FluentDescriptionItem): boolean {
      const v = item.value
      return v === null || v === undefined || v === ''
    }

    const cellPadding = Vue.computed(() => (p.compact ? 'px-3 py-1.5' : 'px-4 py-2.5'))

    return { renderValue, isEmpty, cellPadding, cx }
  },
  template: `
    <div class="w-full">
      <div v-if="title" class="text-sm font-semibold text-[var(--xb-text-primary)] mb-3">{{ title }}</div>

      <div v-if="items.length === 0">
        <FluentEmpty />
      </div>

      <!-- 横向布局：表格形式 -->
      <div
        v-else-if="direction === 'horizontal'"
        class="grid border border-[var(--xb-border-subtle)] rounded-[var(--xb-radius-lg)] overflow-hidden"
        :style="{ gridTemplateColumns: 'repeat(' + columns + ', minmax(0, 1fr))' }"
      >
        <div
          v-for="(item, index) in items"
          :key="item.label || index"
          class="flex border-b border-r border-[var(--xb-border-subtle)] last:border-r-0"
          :style="{ gridColumn: item.span ? 'span ' + item.span : undefined }"
        >
          <div
            :class="['text-xs font-medium text-[var(--xb-text-tertiary)] bg-[var(--xb-bg-subtle)] border-r border-[var(--xb-border-subtle)] flex items-center', cellPadding]"
            :style="{ width: labelWidth, minWidth: labelWidth }"
          >
            {{ item.label }}
          </div>
          <div
            :class="['flex-1 text-sm text-[var(--xb-text-primary)] flex items-center', cellPadding, isEmpty(item) ? 'text-[var(--xb-text-tertiary)]' : '']"
            v-html="renderValue(item)"
          ></div>
        </div>
      </div>

      <!-- 纵向布局：堆叠 -->
      <div v-else class="flex flex-col gap-3">
        <div
          v-for="(item, index) in items"
          :key="item.label || index"
          :class="[
            'flex flex-col gap-1',
            bordered ? 'border border-[var(--xb-border-subtle)] rounded-[var(--xb-radius-md)]' : ''
          ]"
        >
          <div :class="['text-xs font-medium text-[var(--xb-text-tertiary)]', cellPadding]">
            {{ item.label }}
          </div>
          <div
            :class="['text-sm text-[var(--xb-text-primary)]', cellPadding, isEmpty(item) ? 'text-[var(--xb-text-tertiary)]' : '']"
            v-html="renderValue(item)"
          ></div>
        </div>
      </div>
    </div>
  `
}
