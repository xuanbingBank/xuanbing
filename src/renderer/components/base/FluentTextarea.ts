/**
 * @file Fluent 风格多行文本输入组件。
 */

import type { ComponentOptions } from '../../vue-global'
import { cx } from '../../utils/fluent-class'

/** 组件 Props */
interface FluentTextareaProps {
  modelValue: string
  placeholder: string
  disabled: boolean
  readonly: boolean
  rows: number
  error: boolean
  label: string
  hint: string
  resize: boolean
}

/** setup 上下文 */
interface SetupCtx {
  emit: (event: string, ...args: unknown[]) => void
}

export const FluentTextarea: ComponentOptions = {
  name: 'FluentTextarea',
  props: {
    modelValue: { type: String, default: '' },
    placeholder: { type: String, default: '' },
    disabled: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
    rows: { type: Number, default: 4 },
    error: { type: Boolean, default: false },
    label: { type: String, default: '' },
    hint: { type: String, default: '' },
    resize: { type: Boolean, default: true }
  },
  emits: ['update:modelValue', 'blur', 'focus'],
  setup(props, ctx) {
    const { emit } = ctx as unknown as SetupCtx
    const p = props as unknown as FluentTextareaProps

    const textareaClass = Vue.computed(() =>
      cx(
        'xb-input py-2 leading-relaxed',
        p.error ? 'xb-input-error' : '',
        p.resize ? '' : 'resize-none'
      )
    )

    function handleInput(event: Event): void {
      const target = event.target as HTMLTextAreaElement
      emit('update:modelValue', target.value)
    }

    return { textareaClass, handleInput }
  },
  template: `
    <div>
      <label v-if="label" class="block text-sm font-medium text-[var(--xb-text-primary)] mb-1.5">{{ label }}</label>
      <textarea
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :rows="rows"
        :class="textareaClass"
        @input="handleInput"
        @blur="$emit('blur', $event)"
        @focus="$emit('focus', $event)"
      ></textarea>
      <p v-if="hint && !error" class="mt-1 text-xs text-[var(--xb-text-tertiary)]">{{ hint }}</p>
      <p v-if="error" class="mt-1 text-xs text-[var(--xb-error)]">{{ hint || '输入有误' }}</p>
    </div>
  `
}
