/**
 * @file Fluent 风格表单操作按钮组组件。
 *
 * 用于表单底部提交/取消/重置等操作。
 * 支持：
 * - 主操作、次操作、危险操作
 * - 对齐方式
 * - 加载态
 * - 粘性底部
 */

import type { ComponentOptions } from '../../vue-global'
import { cx } from '../../utils/fluent-class'
import { FluentButton } from '../base/FluentButton'

/** 对齐方式 */
export type FluentFormActionsAlign = 'left' | 'center' | 'right' | 'between'

/** 组件 Props */
interface FluentFormActionsProps {
  /** 提交按钮文本 */
  submitText: string
  /** 取消按钮文本 */
  cancelText: string
  /** 重置按钮文本 */
  resetText: string
  /** 是否显示提交 */
  showSubmit: boolean
  /** 是否显示取消 */
  showCancel: boolean
  /** 是否显示重置 */
  showReset: boolean
  /** 提交按钮图标 */
  submitIcon: string
  /** 加载中 */
  loading: boolean
  /** 禁用提交 */
  submitDisabled: boolean
  /** 对齐方式 */
  align: FluentFormActionsAlign
  /** 粘性底部 */
  sticky: boolean
}

/** setup 上下文 */
interface SetupCtx {
  emit: (event: string, ...args: unknown[]) => void
  slots: Record<string, unknown>
}

/** 对齐映射 */
const alignMap: Record<FluentFormActionsAlign, string> = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end',
  between: 'justify-between'
}

export const FluentFormActions: ComponentOptions = {
  name: 'FluentFormActions',
  components: { FluentButton },
  props: {
    submitText: { type: String, default: '提交' },
    cancelText: { type: String, default: '取消' },
    resetText: { type: String, default: '重置' },
    showSubmit: { type: Boolean, default: true },
    showCancel: { type: Boolean, default: true },
    showReset: { type: Boolean, default: false },
    submitIcon: { type: String, default: 'check' },
    loading: { type: Boolean, default: false },
    submitDisabled: { type: Boolean, default: false },
    align: { type: String as () => FluentFormActionsAlign, default: 'right' },
    sticky: { type: Boolean, default: false }
  },
  emits: ['submit', 'cancel', 'reset'],
  setup(props) {
    const p = props as unknown as FluentFormActionsProps

    const alignClass = Vue.computed(() => alignMap[p.align] ?? alignMap.right)

    const wrapperClass = Vue.computed(() =>
      cx(
        'flex items-center gap-2 pt-4',
        p.sticky
          ? 'sticky bottom-0 bg-[var(--xb-bg-surface)] border-t border-[var(--xb-border-subtle)] -mx-4 px-4 py-3'
          : ''
      )
    )

    return { alignClass, wrapperClass }
  },
  template: `
    <div :class="[wrapperClass, alignClass]">
      <!-- 左侧插槽 -->
      <div v-if="$slots.leading" class="flex items-center gap-2 mr-auto">
        <slot name="leading"></slot>
      </div>

      <!-- 默认插槽：自定义按钮 -->
      <slot>
        <FluentButton
          v-if="showReset"
          variant="subtle"
          icon="refresh"
          @click="$emit('reset')"
        >
          {{ resetText }}
        </FluentButton>
        <FluentButton
          v-if="showCancel"
          variant="secondary"
          @click="$emit('cancel')"
        >
          {{ cancelText }}
        </FluentButton>
        <FluentButton
          v-if="showSubmit"
          variant="primary"
          :icon="submitIcon"
          :loading="loading"
          :disabled="submitDisabled"
          @click="$emit('submit')"
        >
          {{ submitText }}
        </FluentButton>
      </slot>

      <!-- 右侧插槽 -->
      <div v-if="$slots.trailing" class="flex items-center gap-2 ml-auto">
        <slot name="trailing"></slot>
      </div>
    </div>
  `
}
