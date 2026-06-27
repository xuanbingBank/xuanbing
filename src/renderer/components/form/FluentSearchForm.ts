/**
 * @file Fluent 风格搜索表单组件。
 *
 * 提供：
 * - 搜索/重置按钮
 * - 展开/收起
 * - 列数自适应
 * - 加载态
 * - 自定义操作插槽
 */

import type { ComponentOptions } from '../../vue-global'
import { cx } from '../../utils/fluent-class'
import { FluentButton } from '../base/FluentButton'

/** 组件 Props */
interface FluentSearchFormProps {
  /** 是否可折叠 */
  collapsible: boolean
  /** 默认折叠 */
  defaultCollapsed: boolean
  /** 加载中 */
  loading: boolean
  /** 列数 */
  columns: number
  /** 搜索按钮文本 */
  searchText: string
  /** 重置按钮文本 */
  resetText: string
  /** 是否内嵌（无背景） */
  inline: boolean
}

/** setup 上下文 */
interface SetupCtx {
  emit: (event: string, ...args: unknown[]) => void
  slots: Record<string, unknown>
}

export const FluentSearchForm: ComponentOptions = {
  name: 'FluentSearchForm',
  components: { FluentButton },
  props: {
    collapsible: { type: Boolean, default: true },
    defaultCollapsed: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    columns: { type: Number, default: 3 },
    searchText: { type: String, default: '搜索' },
    resetText: { type: String, default: '重置' },
    inline: { type: Boolean, default: false }
  },
  emits: ['search', 'reset'],
  setup(props) {
    const p = props as unknown as FluentSearchFormProps

    const collapsed = Vue.ref(p.defaultCollapsed)

    function toggleCollapse(): void {
      collapsed.value = !collapsed.value
    }

    return { collapsed, toggleCollapse, cx }
  },
  template: `
    <div :class="inline ? '' : 'bg-[var(--xb-bg-surface)] rounded-[var(--xb-radius-lg)] border border-[var(--xb-border-subtle)] p-4 mb-4'">
      <div class="flex flex-wrap items-end gap-3">
        <div
          class="flex-1 grid gap-3"
          :style="{ gridTemplateColumns: 'repeat(' + (collapsed ? 1 : columns) + ', minmax(0, 1fr))' }"
        >
          <slot></slot>
        </div>
        <div class="flex items-center gap-2 pb-0.5">
          <slot name="actions">
            <FluentButton variant="primary" icon="search" :loading="loading" @click="$emit('search')">
              {{ searchText }}
            </FluentButton>
            <FluentButton variant="secondary" icon="refresh" @click="$emit('reset')">
              {{ resetText }}
            </FluentButton>
          </slot>
          <slot name="extra"></slot>
          <FluentButton
            v-if="collapsible"
            variant="subtle"
            :icon="collapsed ? 'chevronDown' : 'chevronUp'"
            @click="toggleCollapse"
          >
            {{ collapsed ? '展开' : '收起' }}
          </FluentButton>
        </div>
      </div>
    </div>
  `
}
