/**
 * @file Fluent 风格标签组件（轻量、可关闭）。
 */

import type { ComponentOptions } from '../../vue-global'
import { cx } from '../../utils/fluent-class'
import { FluentIcon } from './FluentIcon'

/** 组件 Props */
interface FluentTagProps {
  closable: boolean
  color: 'default' | 'brand' | 'success' | 'warning' | 'error'
}

/** setup 上下文 */
interface SetupCtx {
  emit: (event: string, ...args: unknown[]) => void
}

const colorClassMap: Record<string, string> = {
  default: 'bg-[var(--xb-bg-hover)] text-[var(--xb-text-secondary)] border-[var(--xb-border)]',
  brand: 'bg-[var(--xb-brand-subtle)] text-[var(--xb-brand-hover)] border-transparent',
  success: 'bg-[var(--xb-success-subtle)] text-[var(--xb-success)] border-transparent',
  warning: 'bg-[var(--xb-warning-subtle)] text-[var(--xb-warning)] border-transparent',
  error: 'bg-[var(--xb-error-subtle)] text-[var(--xb-error)] border-transparent'
}

export const FluentTag: ComponentOptions = {
  name: 'FluentTag',
  components: { FluentIcon },
  props: {
    closable: { type: Boolean, default: false },
    color: { type: String as () => 'default' | 'brand' | 'success' | 'warning' | 'error', default: 'default' }
  },
  emits: ['close'],
  setup(props, ctx) {
    const { emit } = ctx as unknown as SetupCtx
    const p = props as unknown as FluentTagProps

    const tagClass = Vue.computed(() =>
      cx(
        'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-[var(--xb-radius-sm)] border',
        colorClassMap[p.color] ?? colorClassMap.default
      )
    )

    function handleClose(): void {
      emit('close')
    }

    return { tagClass, handleClose }
  },
  template: `
    <span :class="tagClass">
      <slot></slot>
      <button
        v-if="closable"
        type="button"
        class="inline-flex items-center justify-center hover:opacity-70"
        @click="handleClose"
        aria-label="关闭标签"
      >
        <FluentIcon name="close" :size="12" />
      </button>
    </span>
  `
}
