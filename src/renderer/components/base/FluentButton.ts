/**
 * @file Fluent 风格按钮组件。
 *
 * 变体：primary / secondary / subtle / transparent / danger / success
 * 尺寸：small / medium / large
 * 形状：rounded / circular / square
 * 支持 loading、disabled、icon、iconPosition、block。
 */

import type { ComponentOptions } from '../../vue-global'
import { cx, buttonVariantClass, buttonSizeClass } from '../../utils/fluent-class'
import { FluentIcon } from './FluentIcon'

/** 按钮变体 */
export type FluentButtonVariant =
  | 'primary'
  | 'secondary'
  | 'subtle'
  | 'transparent'
  | 'danger'
  | 'success'

/** 按钮尺寸 */
export type FluentButtonSize = 'small' | 'medium' | 'large'

/** 按钮形状 */
export type FluentButtonShape = 'rounded' | 'circular' | 'square'

/** 按钮原生 type */
export type FluentButtonType = 'button' | 'submit' | 'reset'

/** 组件 Props */
interface FluentButtonProps {
  variant: FluentButtonVariant
  size: FluentButtonSize
  shape: FluentButtonShape
  loading: boolean
  disabled: boolean
  block: boolean
  icon: string
  iconPosition: 'left' | 'right'
  type: FluentButtonType
}

/** setup 上下文 */
interface SetupCtx {
  emit: (event: string, ...args: unknown[]) => void
  slots: Record<string, unknown>
}

/** 图标尺寸映射 */
const iconSizeMap: Record<FluentButtonSize, number> = {
  small: 14,
  medium: 16,
  large: 18
}

export const FluentButton: ComponentOptions = {
  name: 'FluentButton',
  components: { FluentIcon },
  props: {
    variant: { type: String as () => FluentButtonVariant, default: 'secondary' },
    size: { type: String as () => FluentButtonSize, default: 'medium' },
    shape: { type: String as () => FluentButtonShape, default: 'rounded' },
    loading: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    block: { type: Boolean, default: false },
    icon: { type: String, default: '' },
    iconPosition: { type: String as () => 'left' | 'right', default: 'left' },
    type: { type: String as () => FluentButtonType, default: 'button' }
  },
  emits: ['click'],
  setup(props, ctx) {
    const { emit } = ctx as unknown as SetupCtx
    const p = props as unknown as FluentButtonProps

    const btnClass = Vue.computed(() => {
      const shapeRadius =
        p.shape === 'circular'
          ? 'rounded-full'
          : p.shape === 'square'
            ? 'rounded-none'
            : 'rounded-[var(--xb-radius-md)]'
      return cx(
        'inline-flex items-center justify-center font-medium select-none transition-all',
        'duration-[var(--xb-motion-fast)] ease-[var(--xb-ease)]',
        'focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed',
        'active:scale-[0.98]',
        buttonVariantClass[p.variant] ?? buttonVariantClass.secondary,
        buttonSizeClass[p.size] ?? buttonSizeClass.medium,
        shapeRadius,
        p.block ? 'w-full' : '',
        p.shape === 'circular' ? 'px-0' : ''
      )
    })

    const iconSize = Vue.computed(() => iconSizeMap[p.size] ?? 16)

    function handleClick(event: MouseEvent): void {
      if (p.disabled || p.loading) return
      emit('click', event)
    }

    return { btnClass, iconSize, handleClick }
  },
  template: `
    <button :class="btnClass" :disabled="disabled || loading" :type="type" @click="handleClick">
      <svg v-if="loading" class="animate-spin -ml-1" :width="iconSize" :height="iconSize" viewBox="0 0 24 24" fill="none">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
      <FluentIcon
        v-else-if="icon && iconPosition === 'left'"
        :name="icon"
        :size="iconSize"
      />
      <span v-if="$slots.default" class="xb-truncate"><slot></slot></span>
      <FluentIcon
        v-if="icon && iconPosition === 'right' && !loading"
        :name="icon"
        :size="iconSize"
      />
    </button>
  `
}
