/**
 * @file 下拉选择组件，基于 daisyUI select。
 */

import type { ComponentOptions } from '../../vue-global'

/** 选项类型 */
interface SelectOption {
  label: string
  value: string | number
  disabled?: boolean
}

/** 选择框尺寸 */
type SelectSize = 'sm' | 'md' | 'lg'

/** 组件 Props */
interface FormSelectProps {
  modelValue: string | number
  options: SelectOption[]
  placeholder: string
  disabled: boolean
  size: SelectSize
  error: boolean
}

/** setup 上下文类型 */
interface SetupCtx {
  emit: (event: string, ...args: unknown[]) => void
  slots: Record<string, unknown>
}

export const FormSelect: ComponentOptions = {
  name: 'FormSelect',
  props: {
    modelValue: { type: [String, Number], default: '' },
    options: { type: Array, default: () => [] },
    placeholder: { type: String, default: '' },
    disabled: { type: Boolean, default: false },
    size: { type: Object as () => SelectSize, default: 'md' },
    error: { type: Boolean, default: false }
  },
  emits: ['update:modelValue', 'change'],
  setup(props, ctx) {
    const { emit } = ctx as unknown as SetupCtx

    // 选择变更处理
    function handleChange(event: Event): void {
      const target = event.target as HTMLSelectElement
      emit('update:modelValue', target.value)
      emit('change', target.value)
    }

    return { handleChange }
  },
  template: `
    <select
      class="select select-bordered w-full"
      :class="{ 'select-error': error, 'select-sm': size === 'sm', 'select-lg': size === 'lg' }"
      :value="modelValue"
      :disabled="disabled"
      @change="handleChange"
    >
      <option value="" v-if="placeholder" :selected="!modelValue" disabled>{{ placeholder }}</option>
      <option v-for="opt in options" :key="opt.value" :value="opt.value" :disabled="opt.disabled">{{ opt.label }}</option>
    </select>
  `
}
