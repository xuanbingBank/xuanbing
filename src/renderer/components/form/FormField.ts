/**
 * @file 表单字段容器组件，统一 label、错误、提示的布局。
 */

import type { ComponentOptions } from '../../vue-global'

/** 组件 Props */
interface FormFieldProps {
  label: string
  required: boolean
  error: string
  hint: string
  description: string
}

export const FormField: ComponentOptions = {
  name: 'FormField',
  props: {
    label: { type: String, default: '' },
    required: { type: Boolean, default: false },
    error: { type: String, default: '' },
    hint: { type: String, default: '' },
    description: { type: String, default: '' }
  },
  setup(props) {
    const p = props as unknown as FormFieldProps
    return { p }
  },
  template: `
    <div class="form-control w-full">
      <label v-if="label" class="label">
        <span class="label-text">{{ label }}<span v-if="required" class="text-error ml-1">*</span></span>
      </label>
      <slot></slot>
      <label v-if="hint && !error" class="label">
        <span class="label-text-alt text-base-content/50">{{ hint }}</span>
      </label>
      <label v-if="error" class="label">
        <span class="label-text-alt text-error">{{ error }}</span>
      </label>
    </div>
  `
}
