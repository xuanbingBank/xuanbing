/**
 * @file Fluent 风格空状态组件。
 */

import type { ComponentOptions } from '../../vue-global'
import { FluentIcon } from './FluentIcon'

/** 组件 Props */
interface FluentEmptyProps {
  title: string
  description: string
  icon: string
}

export const FluentEmpty: ComponentOptions = {
  name: 'FluentEmpty',
  components: { FluentIcon },
  props: {
    title: { type: String, default: '暂无数据' },
    description: { type: String, default: '' },
    icon: { type: String, default: 'folder' }
  },
  template: `
    <div class="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div class="flex items-center justify-center h-12 w-12 rounded-full bg-[var(--xb-bg-hover)] text-[var(--xb-text-tertiary)] mb-3">
        <FluentIcon :name="icon" :size="24" />
      </div>
      <h3 class="text-sm font-medium text-[var(--xb-text-primary)]">{{ title }}</h3>
      <p v-if="description" class="text-xs text-[var(--xb-text-tertiary)] mt-1 max-w-xs">{{ description }}</p>
      <div v-if="$slots.action" class="mt-4">
        <slot name="action"></slot>
      </div>
    </div>
  `
}
