/**
 * @file Fluent 风格输入框组件。
 *
 * 支持 v-model、label、placeholder、disabled、error、hint、clearable、
 * prefix/suffix slot、size。
 */

import type { ComponentOptions } from '../../vue-global'
import { cx, inputSizeClass } from '../../utils/fluent-class'
import { FluentIcon } from './FluentIcon'

/** 输入框类型 */
export type FluentInputType = 'text' | 'password' | 'email' | 'number' | 'tel' | 'url' | 'search'

/** 输入框尺寸 */
export type FluentInputSize = 'small' | 'medium' | 'large'

/** 组件 Props */
interface FluentInputProps {
  modelValue: string | number
  type: FluentInputType
  placeholder: string
  disabled: boolean
  readonly: boolean
  size: FluentInputSize
  error: boolean
  clearable: boolean
  label: string
  hint: string
}

/** setup 上下文 */
interface SetupCtx {
  emit: (event: string, ...args: unknown[]) => void
  slots: Record<string, unknown>
}

export const FluentInput: ComponentOptions = {
  name: 'FluentInput',
  components: { FluentIcon },
  props: {
    modelValue: { type: [String, Number], default: '' },
    type: { type: String as () => FluentInputType, default: 'text' },
    placeholder: { type: String, default: '' },
    disabled: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
    size: { type: String as () => FluentInputSize, default: 'medium' },
    error: { type: Boolean, default: false },
    clearable: { type: Boolean, default: false },
    label: { type: String, default: '' },
    hint: { type: String, default: '' }
  },
  emits: ['update:modelValue', 'blur', 'focus', 'enter'],
  setup(props, ctx) {
    const { emit } = ctx as unknown as SetupCtx
    const p = props as unknown as FluentInputProps

    const inputClass = Vue.computed(() =>
      cx(
        'xb-input',
        p.error ? 'xb-input-error' : '',
        inputSizeClass[p.size] ?? inputSizeClass.medium
      )
    )

    const showClear = Vue.computed(() => p.clearable && !p.disabled && !p.readonly && String(p.modelValue).length > 0)

    function handleInput(event: Event): void {
      const target = event.target as HTMLInputElement
      const value = p.type === 'number' ? Number(target.value) : target.value
      emit('update:modelValue', value)
    }

    function handleClear(): void {
      emit('update:modelValue', p.type === 'number' ? 0 : '')
    }

    function handleKeydown(event: KeyboardEvent): void {
      if (event.key === 'Enter') {
        emit('enter', event)
      }
    }

    return { inputClass, showClear, handleInput, handleClear, handleKeydown }
  },
  template: `
    <div>
      <label v-if="label" class="block text-sm font-medium text-[var(--xb-text-primary)] mb-1.5">{{ label }}</label>
      <div class="relative flex items-center">
        <div v-if="$slots.prefix" class="absolute left-3 flex items-center text-[var(--xb-text-tertiary)] pointer-events-none">
          <slot name="prefix"></slot>
        </div>
        <input
          :type="type"
          :value="modelValue"
          :placeholder="placeholder"
          :disabled="disabled"
          :readonly="readonly"
          :class="[inputClass, $slots.prefix ? 'pl-9' : '', ($slots.suffix || showClear) ? 'pr-9' : '']"
          @input="handleInput"
          @blur="$emit('blur', $event)"
          @focus="$emit('focus', $event)"
          @keydown="handleKeydown"
        />
        <button
          v-if="showClear"
          type="button"
          class="absolute right-2 flex items-center justify-center h-5 w-5 rounded-full text-[var(--xb-text-tertiary)] hover:bg-[var(--xb-bg-hover)] hover:text-[var(--xb-text-primary)]"
          @click="handleClear"
          aria-label="清除"
        >
          <FluentIcon name="close" :size="12" />
        </button>
        <div v-else-if="$slots.suffix" class="absolute right-3 flex items-center text-[var(--xb-text-tertiary)] pointer-events-none">
          <slot name="suffix"></slot>
        </div>
      </div>
      <p v-if="hint && !error" class="mt-1 text-xs text-[var(--xb-text-tertiary)]">{{ hint }}</p>
      <p v-if="error" class="mt-1 text-xs text-[var(--xb-error)]">{{ hint || '输入有误' }}</p>
    </div>
  `
}
