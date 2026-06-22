/**
 * @file Fluent 风格卡片组件。
 *
 * 支持 title、subtitle、description、actions/header/footer slot、
 * hoverable、selected、loading。
 */

import type { ComponentOptions } from '../../vue-global'
import { cx } from '../../utils/fluent-class'

/** 组件 Props */
interface FluentCardProps {
  title: string
  subtitle: string
  description: string
  hoverable: boolean
  selected: boolean
  loading: boolean
  compact: boolean
  padding: boolean
}

export const FluentCard: ComponentOptions = {
  name: 'FluentCard',
  props: {
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    description: { type: String, default: '' },
    hoverable: { type: Boolean, default: false },
    selected: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    compact: { type: Boolean, default: false },
    padding: { type: Boolean, default: true }
  },
  setup(props) {
    const p = props as unknown as FluentCardProps

    const cardClass = Vue.computed(() =>
      cx(
        'xb-card relative',
        p.hoverable ? 'xb-card-hoverable cursor-pointer' : '',
        p.selected ? 'border-[var(--xb-brand)] ring-1 ring-[var(--xb-brand)]' : ''
      )
    )

    const bodyClass = Vue.computed(() =>
      cx(p.padding ? (p.compact ? 'p-3' : 'p-5') : '')
    )

    return { cardClass, bodyClass }
  },
  template: `
    <div :class="cardClass">
      <!-- 加载遮罩 -->
      <div
        v-if="loading"
        class="absolute inset-0 flex items-center justify-center bg-[var(--xb-bg-surface)]/60 z-10 rounded-[var(--xb-radius-lg)]"
      >
        <svg class="animate-spin h-6 w-6 text-[var(--xb-brand)]" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
      </div>

      <div :class="bodyClass">
        <!-- 自定义 header -->
        <div v-if="$slots.header">
          <slot name="header"></slot>
        </div>
        <!-- 默认 header：title + subtitle + actions -->
        <div v-else-if="title || subtitle || description || $slots.actions" class="flex items-start justify-between mb-4">
          <div class="min-w-0">
            <div v-if="title" class="text-base font-semibold text-[var(--xb-text-primary)] xb-truncate">{{ title }}</div>
            <div v-if="subtitle" class="text-xs text-[var(--xb-text-tertiary)] mt-0.5 xb-truncate">{{ subtitle }}</div>
            <p v-if="description" class="text-sm text-[var(--xb-text-secondary)] mt-2">{{ description }}</p>
          </div>
          <div v-if="$slots.actions" class="shrink-0 ml-3">
            <slot name="actions"></slot>
          </div>
        </div>

        <!-- 内容 -->
        <div>
          <slot></slot>
        </div>

        <!-- footer -->
        <div v-if="$slots.footer" class="mt-4 pt-4 border-t border-[var(--xb-border-subtle)]">
          <slot name="footer"></slot>
        </div>
      </div>
    </div>
  `
}
