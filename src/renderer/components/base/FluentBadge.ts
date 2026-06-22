/**
 * @file Fluent 风格徽标组件。
 *
 * 变体：default / brand / success / warning / error / info
 */

import type { ComponentOptions } from '../../vue-global'
import { cx, badgeVariantClass } from '../../utils/fluent-class'

/** 徽标变体 */
export type FluentBadgeVariant = 'default' | 'brand' | 'success' | 'warning' | 'error' | 'info'

/** 组件 Props */
interface FluentBadgeProps {
  variant: FluentBadgeVariant
  dot: boolean
  size: 'small' | 'medium'
}

export const FluentBadge: ComponentOptions = {
  name: 'FluentBadge',
  props: {
    variant: { type: String as () => FluentBadgeVariant, default: 'default' },
    dot: { type: Boolean, default: false },
    size: { type: String as () => 'small' | 'medium', default: 'medium' }
  },
  setup(props) {
    const p = props as unknown as FluentBadgeProps

    const badgeClass = Vue.computed(() =>
      cx(
        'inline-flex items-center gap-1 font-medium rounded-[var(--xb-radius-pill)]',
        p.size === 'small' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs',
        badgeVariantClass[p.variant] ?? badgeVariantClass.default
      )
    )

    const dotColorClass = Vue.computed(() => {
      switch (p.variant) {
        case 'brand':
          return 'bg-[var(--xb-brand)]'
        case 'success':
          return 'bg-[var(--xb-success)]'
        case 'warning':
          return 'bg-[var(--xb-warning)]'
        case 'error':
          return 'bg-[var(--xb-error)]'
        case 'info':
          return 'bg-[var(--xb-info)]'
        default:
          return 'bg-[var(--xb-text-tertiary)]'
      }
    })

    return { badgeClass, dotColorClass }
  },
  template: `
    <span :class="badgeClass">
      <span v-if="dot" :class="['inline-block rounded-full', size === 'small' ? 'h-1 w-1' : 'h-1.5 w-1.5', dotColorClass]"></span>
      <slot></slot>
    </span>
  `
}
