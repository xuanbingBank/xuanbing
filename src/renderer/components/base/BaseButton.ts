/**
 * @file 基础按钮组件，基于 daisyUI btn 类。
 */

import type { ComponentOptions } from '../../vue-global'

/** 按钮变体类型 */
type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'ghost'
  | 'link'
  | 'error'
  | 'warning'
  | 'success'
  | 'info'

/** 按钮尺寸 */
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg'

/** 按钮原生 type 属性 */
type ButtonType = 'button' | 'submit' | 'reset'

/** 组件 Props */
interface BaseButtonProps {
  variant: ButtonVariant
  size: ButtonSize
  loading: boolean
  disabled: boolean
  block: boolean
  outline: boolean
  leftIcon: string
  rightIcon: string
  type: ButtonType
}

/** setup 上下文类型 */
interface SetupCtx {
  emit: (event: string, ...args: unknown[]) => void
  slots: Record<string, unknown>
}

/** 变体到 daisyUI 类名映射 */
const variantMap: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  accent: 'btn-accent',
  ghost: 'btn-ghost',
  link: 'btn-link',
  error: 'btn-error',
  warning: 'btn-warning',
  success: 'btn-success',
  info: 'btn-info'
}

/** 尺寸到 daisyUI 类名映射 */
const sizeMap: Record<ButtonSize, string> = {
  xs: 'btn-xs',
  sm: 'btn-sm',
  md: '',
  lg: 'btn-lg'
}

export const BaseButton: ComponentOptions = {
  name: 'BaseButton',
  props: {
    variant: { type: Object as () => ButtonVariant, default: 'primary' },
    size: { type: Object as () => ButtonSize, default: 'md' },
    loading: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    block: { type: Boolean, default: false },
    outline: { type: Boolean, default: false },
    leftIcon: { type: String, default: '' },
    rightIcon: { type: String, default: '' },
    type: { type: Object as () => ButtonType, default: 'button' }
  },
  emits: ['click'],
  setup(props, ctx) {
    const { emit } = ctx as unknown as SetupCtx
    const p = props as unknown as BaseButtonProps

    // 计算按钮 class
    const btnClass = Vue.computed(() => {
      const classes: string[] = ['btn']
      if (p.outline && p.variant !== 'link') {
        classes.push('btn-outline')
      }
      classes.push(variantMap[p.variant] || 'btn-primary')
      if (sizeMap[p.size]) {
        classes.push(sizeMap[p.size])
      }
      if (p.block) {
        classes.push('w-full')
      }
      return classes.join(' ')
    })

    // 点击处理
    function handleClick(event: MouseEvent): void {
      if (p.disabled || p.loading) return
      emit('click', event)
    }

    return { btnClass, handleClick }
  },
  template: `
    <button :class="btnClass" :disabled="disabled || loading" :type="type" @click="handleClick">
      <span v-if="loading" class="loading loading-spinner loading-xs"></span>
      <span v-if="leftIcon" class="text-sm">{{ leftIcon }}</span>
      <slot></slot>
      <span v-if="rightIcon" class="text-sm">{{ rightIcon }}</span>
    </button>
  `
}
