/**
 * @file Fluent 风格下拉选择组件。
 *
 * 支持 v-model、label、options、disabled、error、hint、size、placeholder。
 */

import type { ComponentOptions } from '../../vue-global'
import { cx, inputSizeClass } from '../../utils/fluent-class'
import { FluentIcon } from './FluentIcon'

/** 选项类型 */
export interface FluentSelectOption {
  label: string
  value: string | number
  disabled?: boolean
}

/** 输入框尺寸 */
export type FluentSelectSize = 'small' | 'medium' | 'large'

/** 组件 Props */
interface FluentSelectProps {
  modelValue: string | number
  options: FluentSelectOption[]
  placeholder: string
  disabled: boolean
  size: FluentSelectSize
  error: boolean
  label: string
  hint: string
}

/** setup 上下文 */
interface SetupCtx {
  emit: (event: string, ...args: unknown[]) => void
}

export const FluentSelect: ComponentOptions = {
  name: 'FluentSelect',
  components: { FluentIcon },
  props: {
    modelValue: { type: [String, Number], default: '' },
    options: { type: Array, default: () => [] },
    placeholder: { type: String, default: '请选择' },
    disabled: { type: Boolean, default: false },
    size: { type: String as () => FluentSelectSize, default: 'medium' },
    error: { type: Boolean, default: false },
    label: { type: String, default: '' },
    hint: { type: String, default: '' }
  },
  emits: ['update:modelValue', 'change'],
  setup(props, ctx) {
    const { emit } = ctx as unknown as SetupCtx
    const p = props as unknown as FluentSelectProps

    const selectClass = Vue.computed(() =>
      cx(
        'xb-input appearance-none cursor-pointer pr-9',
        p.error ? 'xb-input-error' : '',
        inputSizeClass[p.size] ?? inputSizeClass.medium
      )
    )

    function handleChange(event: Event): void {
      const target = event.target as HTMLSelectElement
      const value = target.value
      emit('update:modelValue', value)
      emit('change', value)
    }

    return { selectClass, handleChange }
  },
  template: `
    <div>
      <label v-if="label" class="block text-sm font-medium text-[var(--xb-text-primary)] mb-1.5">{{ label }}</label>
      <div class="relative">
        <select
          :value="modelValue"
          :disabled="disabled"
          :class="selectClass"
          @change="handleChange"
        >
          <option value="" disabled>{{ placeholder }}</option>
          <option
            v-for="opt in options"
            :key="opt.value"
            :value="opt.value"
            :disabled="opt.disabled"
          >{{ opt.label }}</option>
        </select>
        <div class="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--xb-text-tertiary)]">
          <FluentIcon name="chevronDown" :size="16" />
        </div>
      </div>
      <p v-if="hint && !error" class="mt-1 text-xs text-[var(--xb-text-tertiary)]">{{ hint }}</p>
      <p v-if="error" class="mt-1 text-xs text-[var(--xb-error)]">{{ hint || '选择有误' }}</p>
    </div>
  `
}
