/**
 * @file Fluent 风格表单字段容器组件。
 *
 * 统一 label、必填标记、错误、提示、描述的布局。
 * 提供 labelWidth、orientation、tooltip 等扩展能力。
 */

import type { ComponentOptions } from '../../vue-global'
import { cx } from '../../utils/fluent-class'
import { FluentIcon } from '../base/FluentIcon'

/** 标签方向 */
export type FluentFieldOrientation = 'horizontal' | 'vertical'

/** 组件 Props */
interface FluentFormFieldProps {
  /** 标签 */
  label: string
  /** 是否必填 */
  required: boolean
  /** 错误信息 */
  error: string
  /** 提示信息 */
  hint: string
  /** 描述信息（在 label 下方） */
  description: string
  /** 标签宽度（horizontal 模式） */
  labelWidth: string
  /** 布局方向 */
  orientation: FluentFieldOrientation
  /** tooltip 内容 */
  tooltip: string
  /** 是否显示冒号 */
  colon: boolean
}

/** setup 上下文 */
interface SetupCtx {
  emit: (event: string, ...args: unknown[]) => void
  slots: Record<string, unknown>
}

export const FluentFormField: ComponentOptions = {
  name: 'FluentFormField',
  components: { FluentIcon },
  props: {
    label: { type: String, default: '' },
    required: { type: Boolean, default: false },
    error: { type: String, default: '' },
    hint: { type: String, default: '' },
    description: { type: String, default: '' },
    labelWidth: { type: String, default: '120px' },
    orientation: { type: String as () => FluentFieldOrientation, default: 'vertical' },
    tooltip: { type: String, default: '' },
    colon: { type: Boolean, default: false }
  },
  setup(props) {
    const p = props as unknown as FluentFormFieldProps

    const isError = Vue.computed(() => Boolean(p.error))

    return { isError, cx }
  },
  template: `
    <div :class="['w-full', orientation === 'horizontal' ? 'flex items-start gap-3' : 'flex flex-col gap-1.5']">
      <!-- 标签 -->
      <div
        v-if="label"
        :class="[
          'flex items-center gap-1 text-sm font-medium',
          isError ? 'text-[var(--xb-error)]' : 'text-[var(--xb-text-primary)]'
        ]"
        :style="orientation === 'horizontal' ? { width: labelWidth, minWidth: labelWidth, paddingTop: '6px' } : {}"
      >
        <span>{{ label }}</span>
        <span v-if="colon" class="text-[var(--xb-text-tertiary)]">:</span>
        <span v-if="required" class="text-[var(--xb-error)]">*</span>
        <FluentIcon v-if="tooltip" name="info" :size="14" class="text-[var(--xb-text-tertiary)] cursor-help" />
        <div v-if="description" class="text-xs text-[var(--xb-text-tertiary)] font-normal">{{ description }}</div>
      </div>

      <!-- 控件 + 提示/错误 -->
      <div class="flex-1 min-w-0 flex flex-col gap-1">
        <slot></slot>
        <div v-if="hint && !error" class="text-xs text-[var(--xb-text-tertiary)]">{{ hint }}</div>
        <div v-if="error" class="text-xs text-[var(--xb-error)] flex items-center gap-1">
          <FluentIcon name="warning" :size="12" />
          <span>{{ error }}</span>
        </div>
      </div>
    </div>
  `
}
