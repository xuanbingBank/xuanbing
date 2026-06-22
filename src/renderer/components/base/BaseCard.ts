/**
 * @file 基础卡片组件，基于 daisyUI card。
 */

import type { ComponentOptions } from '../../vue-global'

/** 组件 Props */
interface BaseCardProps {
  title: string
  subtitle: string
  loading: boolean
  bordered: boolean
  compact: boolean
}

export const BaseCard: ComponentOptions = {
  name: 'BaseCard',
  props: {
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    loading: { type: Boolean, default: false },
    bordered: { type: Boolean, default: true },
    compact: { type: Boolean, default: false }
  },
  setup(props) {
    const p = props as unknown as BaseCardProps
    return { p }
  },
  template: `
    <div
      class="card bg-base-100 shadow-lg relative"
      :class="{ 'border border-base-300': bordered, 'card-compact': compact }"
    >
      <div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-base-200/50 z-10">
        <span class="loading loading-spinner loading-lg"></span>
      </div>
      <div class="card-body">
        <div v-if="$slots.header">
          <slot name="header"></slot>
        </div>
        <div v-else-if="title || subtitle || $slots.actions" class="flex items-start justify-between">
          <div>
            <h2 v-if="title" class="card-title">{{ title }}</h2>
            <p v-if="subtitle" class="text-sm text-base-content/60">{{ subtitle }}</p>
          </div>
          <div v-if="$slots.actions">
            <slot name="actions"></slot>
          </div>
        </div>
        <div class="card-content">
          <slot></slot>
        </div>
        <div v-if="$slots.footer" class="mt-4 pt-4 border-t border-base-200">
          <slot name="footer"></slot>
        </div>
      </div>
    </div>
  `
}
