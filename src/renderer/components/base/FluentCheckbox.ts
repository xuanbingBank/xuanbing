/**
 * @file Fluent 风格复选框组件。
 */

import type { ComponentOptions } from '../../vue-global'
import { cx } from '../../utils/fluent-class'
import { FluentIcon } from './FluentIcon'

/** 组件 Props */
interface FluentCheckboxProps {
  modelValue: boolean
  indeterminate: boolean
  disabled: boolean
  label: string
}

/** setup 上下文 */
interface SetupCtx {
  emit: (event: string, ...args: unknown[]) => void
}

export const FluentCheckbox: ComponentOptions = {
  name: 'FluentCheckbox',
  components: { FluentIcon },
  props: {
    modelValue: { type: Boolean, default: false },
    indeterminate: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    label: { type: String, default: '' }
  },
  emits: ['update:modelValue', 'change'],
  setup(props, ctx) {
    const { emit } = ctx as unknown as SetupCtx
    const p = props as unknown as FluentCheckboxProps

    const boxClass = Vue.computed(() =>
      cx(
        'inline-flex items-center justify-center h-4 w-4 rounded-[var(--xb-radius-sm)] border transition-all duration-[var(--xb-motion-fast)] ease-[var(--xb-ease)]',
        p.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        p.modelValue || p.indeterminate
          ? 'bg-[var(--xb-brand)] border-[var(--xb-brand)] text-white'
          : 'bg-[var(--xb-bg-surface)] border-[var(--xb-border-strong)] hover:border-[var(--xb-brand)]'
      )
    )

    function handleClick(): void {
      if (p.disabled) return
      const next = !p.modelValue
      emit('update:modelValue', next)
      emit('change', next)
    }

    return { boxClass, handleClick }
  },
  template: `
    <div class="inline-flex items-center gap-2" @click="handleClick">
      <span :class="boxClass" role="checkbox" :aria-checked="indeterminate ? 'mixed' : modelValue">
        <FluentIcon v-if="indeterminate" name="minus" :size="12" :stroke-width="3" />
        <FluentIcon v-else-if="modelValue" name="check" :size="12" :stroke-width="3" />
      </span>
      <span v-if="label" class="text-sm text-[var(--xb-text-primary)] select-none">{{ label }}</span>
    </div>
  `
}
