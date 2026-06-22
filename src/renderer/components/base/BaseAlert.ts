/**
 * @file 基础告警组件，基于 daisyUI alert。
 */

import type { ComponentOptions } from '../../vue-global'

/** 告警类型 */
type AlertType = 'info' | 'success' | 'warning' | 'error'

/** 组件 Props */
interface BaseAlertProps {
  type: AlertType
  title: string
  description: string
  closable: boolean
  icon: string
}

/** 类型到 daisyUI alert 类名映射 */
const typeMap: Record<AlertType, string> = {
  info: 'alert-info',
  success: 'alert-success',
  warning: 'alert-warning',
  error: 'alert-error'
}

/** 默认图标映射 */
const defaultIconMap: Record<AlertType, string> = {
  info: 'ℹ️',
  success: '✅',
  warning: '⚠️',
  error: '❌'
}

export const BaseAlert: ComponentOptions = {
  name: 'BaseAlert',
  props: {
    type: { type: Object as () => AlertType, default: 'info' },
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    closable: { type: Boolean, default: false },
    icon: { type: String, default: '' }
  },
  emits: ['close'],
  setup(props) {
    const p = props as unknown as BaseAlertProps
    const typeClass = Vue.computed(() => typeMap[p.type] || 'alert-info')
    const defaultIcon = Vue.computed(() => defaultIconMap[p.type] || 'ℹ️')
    return { typeClass, defaultIcon }
  },
  template: `
    <div class="alert" :class="typeClass">
      <span class="text-xl">{{ icon || defaultIcon }}</span>
      <div class="flex-1">
        <h3 v-if="title" class="font-medium">{{ title }}</h3>
        <p v-if="description" class="text-sm opacity-80">{{ description }}</p>
      </div>
      <button v-if="closable" class="btn btn-ghost btn-xs" @click="$emit('close')">✕</button>
    </div>
  `
}
