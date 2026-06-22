/**
 * @file Fluent 风格分段控制器组件。
 *
 * 用于在几个选项间切换，类似 SegmentedControl / Tab 头部。
 */

import type { ComponentOptions } from '../../vue-global'
import { cx } from '../../utils/fluent-class'
import { FluentIcon } from './FluentIcon'

/** 选项 */
export interface FluentSegmentedOption {
  label: string
  value: string | number
  icon?: string
  disabled?: boolean
}

/** 组件 Props */
interface FluentSegmentedProps {
  modelValue: string | number
  options: FluentSegmentedOption[]
  size: 'small' | 'medium'
  block: boolean
}

/** setup 上下文 */
interface SetupCtx {
  emit: (event: string, ...args: unknown[]) => void
}

export const FluentSegmented: ComponentOptions = {
  name: 'FluentSegmented',
  components: { FluentIcon },
  props: {
    modelValue: { type: [String, Number], default: '' },
    options: { type: Array, default: () => [] },
    size: { type: String as () => 'small' | 'medium', default: 'medium' },
    block: { type: Boolean, default: false }
  },
  emits: ['update:modelValue', 'change'],
  setup(props, ctx) {
    const { emit } = ctx as unknown as SetupCtx
    const p = props as unknown as FluentSegmentedProps

    const containerClass = Vue.computed(() =>
      cx(
        'inline-flex items-center gap-0.5 p-0.5 bg-[var(--xb-bg-hover)] rounded-[var(--xb-radius-md)]',
        p.block ? 'w-full' : ''
      )
    )

    const iconSize = Vue.computed(() => (p.size === 'small' ? 14 : 16))

    function handleSelect(option: FluentSegmentedOption): void {
      if (option.disabled) return
      if (option.value === p.modelValue) return
      emit('update:modelValue', option.value)
      emit('change', option.value)
    }

    function optionClass(option: FluentSegmentedOption): string {
      const isActive = option.value === p.modelValue
      return cx(
        'inline-flex items-center justify-center gap-1.5 rounded-[var(--xb-radius-sm)] font-medium transition-all',
        'duration-[var(--xb-motion-fast)] ease-[var(--xb-ease)] select-none',
        p.size === 'small' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm',
        p.block ? 'flex-1' : '',
        option.disabled
          ? 'text-[var(--xb-text-disabled)] cursor-not-allowed'
          : isActive
            ? 'bg-[var(--xb-bg-surface)] text-[var(--xb-text-primary)] shadow-[var(--xb-shadow-card)]'
            : 'text-[var(--xb-text-secondary)] hover:text-[var(--xb-text-primary)] cursor-pointer'
      )
    }

    return { containerClass, iconSize, handleSelect, optionClass }
  },
  template: `
    <div :class="containerClass">
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        :class="optionClass(option)"
        :disabled="option.disabled"
        @click="handleSelect(option)"
      >
        <FluentIcon v-if="option.icon" :name="option.icon" :size="iconSize" />
        <span>{{ option.label }}</span>
      </button>
    </div>
  `
}
