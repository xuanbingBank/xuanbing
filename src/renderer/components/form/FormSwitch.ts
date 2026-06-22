/**
 * @file 开关组件，基于 daisyUI toggle。
 */

import type { ComponentOptions } from '../../vue-global'

/** 开关尺寸 */
type SwitchSize = 'sm' | 'md' | 'lg'

/** 组件 Props */
interface FormSwitchProps {
  modelValue: boolean
  disabled: boolean
  label: string
  size: SwitchSize
}

/** setup 上下文类型 */
interface SetupCtx {
  emit: (event: string, ...args: unknown[]) => void
  slots: Record<string, unknown>
}

export const FormSwitch: ComponentOptions = {
  name: 'FormSwitch',
  props: {
    modelValue: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    label: { type: String, default: '' },
    size: { type: Object as () => SwitchSize, default: 'md' }
  },
  emits: ['update:modelValue', 'change'],
  setup(props, ctx) {
    const { emit } = ctx as unknown as SetupCtx

    // 切换处理
    function handleChange(event: Event): void {
      const target = event.target as HTMLInputElement
      emit('update:modelValue', target.checked)
      emit('change', target.checked)
    }

    return { handleChange }
  },
  template: `
    <label class="label cursor-pointer justify-start gap-3">
      <input
        type="checkbox"
        :checked="modelValue"
        :disabled="disabled"
        class="toggle"
        :class="{ 'toggle-sm': size === 'sm', 'toggle-lg': size === 'lg' }"
        @change="handleChange"
      >
      <span v-if="label" class="label-text">{{ label }}</span>
    </label>
  `
}
