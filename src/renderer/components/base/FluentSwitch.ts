/**
 * @file Fluent 风格开关组件。
 */

import type { ComponentOptions } from '../../vue-global'
import { cx } from '../../utils/fluent-class'

/** 组件 Props */
interface FluentSwitchProps {
  modelValue: boolean
  disabled: boolean
  label: string
  size: 'small' | 'medium'
}

/** setup 上下文 */
interface SetupCtx {
  emit: (event: string, ...args: unknown[]) => void
}

export const FluentSwitch: ComponentOptions = {
  name: 'FluentSwitch',
  props: {
    modelValue: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    label: { type: String, default: '' },
    size: { type: String as () => 'small' | 'medium', default: 'medium' }
  },
  emits: ['update:modelValue', 'change'],
  setup(props, ctx) {
    const { emit } = ctx as unknown as SetupCtx
    const p = props as unknown as FluentSwitchProps

    const trackClass = Vue.computed(() =>
      cx(
        'relative inline-flex items-center rounded-full transition-colors duration-[var(--xb-motion-fast)] ease-[var(--xb-ease)]',
        p.size === 'small' ? 'h-4 w-7' : 'h-5 w-9',
        p.modelValue
          ? 'bg-[var(--xb-brand)]'
          : 'bg-[var(--xb-border-strong)]',
        p.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      )
    )

    const thumbClass = Vue.computed(() =>
      cx(
        'inline-block rounded-full bg-white shadow-sm transition-transform duration-[var(--xb-motion-fast)] ease-[var(--xb-ease)]',
        p.size === 'small' ? 'h-3 w-3' : 'h-4 w-4',
        p.modelValue
          ? p.size === 'small'
            ? 'translate-x-3.5'
            : 'translate-x-4'
          : 'translate-x-0.5'
      )
    )

    function handleClick(): void {
      if (p.disabled) return
      const next = !p.modelValue
      emit('update:modelValue', next)
      emit('change', next)
    }

    return { trackClass, thumbClass, handleClick }
  },
  template: `
    <div class="inline-flex items-center gap-2" @click="handleClick">
      <span :class="trackClass" role="switch" :aria-checked="modelValue">
        <span :class="thumbClass"></span>
      </span>
      <span v-if="label" class="text-sm text-[var(--xb-text-primary)] select-none">{{ label }}</span>
    </div>
  `
}
