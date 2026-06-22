/**
 * @file Fluent 风格图标按钮组件。
 *
 * 纯图标按钮，支持 tooltip、active、danger、disabled、loading、aria-label。
 */

import type { ComponentOptions } from '../../vue-global'
import { cx, iconButtonSizeClass } from '../../utils/fluent-class'
import { FluentIcon } from './FluentIcon'

/** 按钮尺寸 */
export type FluentIconButtonSize = 'small' | 'medium' | 'large'

/** 组件 Props */
interface FluentIconButtonProps {
  /** 图标 key */
  icon: string
  /** 尺寸 */
  size: FluentIconButtonSize
  /** tooltip 文本 */
  tooltip: string
  /** 是否激活态 */
  active: boolean
  /** 是否危险态 */
  danger: boolean
  /** 是否禁用 */
  disabled: boolean
  /** 是否加载中 */
  loading: boolean
  /** 无障碍标签 */
  ariaLabel: string
}

/** setup 上下文 */
interface SetupCtx {
  emit: (event: string, ...args: unknown[]) => void
}

/** 图标尺寸映射 */
const iconSizeMap: Record<FluentIconButtonSize, number> = {
  small: 14,
  medium: 16,
  large: 18
}

export const FluentIconButton: ComponentOptions = {
  name: 'FluentIconButton',
  components: { FluentIcon },
  props: {
    icon: { type: String, required: true },
    size: { type: String as () => FluentIconButtonSize, default: 'medium' },
    tooltip: { type: String, default: '' },
    active: { type: Boolean, default: false },
    danger: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    ariaLabel: { type: String, default: '' }
  },
  emits: ['click'],
  setup(props, ctx) {
    const { emit } = ctx as unknown as SetupCtx
    const p = props as unknown as FluentIconButtonProps

    const btnClass = Vue.computed(() => {
      return cx(
        'inline-flex items-center justify-center rounded-[var(--xb-radius-md)]',
        'transition-all duration-[var(--xb-motion-fast)] ease-[var(--xb-ease)]',
        'focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed',
        'active:scale-[0.96]',
        iconButtonSizeClass[p.size] ?? iconButtonSizeClass.medium,
        p.danger
          ? 'text-[var(--xb-error)] hover:bg-[var(--xb-error-subtle)]'
          : p.active
            ? 'bg-[var(--xb-bg-active)] text-[var(--xb-brand-hover)]'
            : 'text-[var(--xb-text-secondary)] hover:bg-[var(--xb-bg-hover)] hover:text-[var(--xb-text-primary)]'
      )
    })

    const iconSize = Vue.computed(() => iconSizeMap[p.size] ?? 16)
    const ariaLabelComputed = Vue.computed(() => p.ariaLabel || p.tooltip || p.icon)

    function handleClick(event: MouseEvent): void {
      if (p.disabled || p.loading) return
      emit('click', event)
    }

    return { btnClass, iconSize, ariaLabelComputed, handleClick }
  },
  template: `
    <button
      :class="btnClass"
      :disabled="disabled || loading"
      :aria-label="ariaLabelComputed"
      :title="tooltip"
      @click="handleClick"
    >
      <svg v-if="loading" class="animate-spin" :width="iconSize" :height="iconSize" viewBox="0 0 24 24" fill="none">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
      <FluentIcon v-else :name="icon" :size="iconSize" />
    </button>
  `
}
