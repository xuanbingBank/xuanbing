/**
 * @file 多行文本输入组件，基于 daisyUI textarea。
 */

import type { ComponentOptions } from '../../vue-global'

/** 缩放方向 */
type ResizeType = 'none' | 'vertical' | 'horizontal' | 'both'

/** 组件 Props */
interface FormTextareaProps {
  modelValue: string
  placeholder: string
  rows: number
  disabled: boolean
  readonly: boolean
  error: boolean
  resize: ResizeType
}

/** setup 上下文类型 */
interface SetupCtx {
  emit: (event: string, ...args: unknown[]) => void
  slots: Record<string, unknown>
}

export const FormTextarea: ComponentOptions = {
  name: 'FormTextarea',
  props: {
    modelValue: { type: String, default: '' },
    placeholder: { type: String, default: '' },
    rows: { type: Number, default: 3 },
    disabled: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
    error: { type: Boolean, default: false },
    resize: { type: String as () => ResizeType, default: 'vertical' }
  },
  emits: ['update:modelValue', 'blur'],
  setup(props, ctx) {
    const { emit } = ctx as unknown as SetupCtx

    // 输入事件处理
    function handleInput(event: Event): void {
      const target = event.target as HTMLTextAreaElement
      emit('update:modelValue', target.value)
    }

    return { handleInput }
  },
  template: `
    <textarea
      :value="modelValue"
      :placeholder="placeholder"
      :rows="rows"
      :disabled="disabled"
      :readonly="readonly"
      class="textarea textarea-bordered w-full"
      :class="{ 'textarea-error': error }"
      :style="{ resize }"
      @input="handleInput"
      @blur="$emit('blur', $event)"
    ></textarea>
  `
}
