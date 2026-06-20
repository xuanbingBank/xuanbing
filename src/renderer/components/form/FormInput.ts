/**
 * @file 文本输入框组件，基于 daisyUI input。
 */

import type { ComponentOptions } from '../../vue-global'

/** 输入框类型 */
type InputType = 'text' | 'password' | 'email' | 'number' | 'tel' | 'url'

/** 输入框尺寸 */
type InputSize = 'sm' | 'md' | 'lg'

/** 组件 Props */
interface FormInputProps {
  modelValue: string | number
  type: InputType
  placeholder: string
  disabled: boolean
  readonly: boolean
  size: InputSize
  error: boolean
}

/** setup 上下文类型 */
interface SetupCtx {
  emit: (event: string, ...args: unknown[]) => void
  slots: Record<string, unknown>
}

export const FormInput: ComponentOptions = {
  name: 'FormInput',
  props: {
    modelValue: { type: [String, Number], default: '' },
    type: { type: Object as () => InputType, default: 'text' },
    placeholder: { type: String, default: '' },
    disabled: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
    size: { type: Object as () => InputSize, default: 'md' },
    error: { type: Boolean, default: false }
  },
  emits: ['update:modelValue', 'blur', 'focus'],
  setup(props, ctx) {
    const { emit } = ctx as unknown as SetupCtx
    const p = props as unknown as FormInputProps

    // 输入事件处理，number 类型自动转为数值
    function handleInput(event: Event): void {
      const target = event.target as HTMLInputElement
      const value = p.type === 'number' ? Number(target.value) : target.value
      emit('update:modelValue', value)
    }

    return { handleInput }
  },
  template: `
    <input
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      class="input input-bordered w-full"
      :class="{ 'input-error': error, 'input-sm': size === 'sm', 'input-lg': size === 'lg' }"
      @input="handleInput"
      @blur="$emit('blur', $event)"
      @focus="$emit('focus', $event)"
    >
  `
}
