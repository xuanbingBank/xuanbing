/**
 * @file Fluent 风格错误状态组件。
 */

import type { ComponentOptions } from '../../vue-global'
import { FluentButton } from './FluentButton'
import { FluentIcon } from './FluentIcon'

/** 组件 Props */
interface FluentErrorProps {
  title: string
  description: string
  showRetry: boolean
  showBack: boolean
  showHome: boolean
  error: unknown
}

export const FluentError: ComponentOptions = {
  name: 'FluentError',
  components: { FluentButton, FluentIcon },
  props: {
    title: { type: String, default: '出错了' },
    description: { type: String, default: '' },
    showRetry: { type: Boolean, default: true },
    showBack: { type: Boolean, default: true },
    showHome: { type: Boolean, default: true },
    error: { type: Object, default: () => null }
  },
  emits: ['retry', 'back', 'home'],
  setup(props) {
    const p = props as unknown as FluentErrorProps

    const errorText = Vue.computed(() => {
      if (!p.error) return ''
      if (p.error instanceof Error) return p.error.message
      if (typeof p.error === 'string') return p.error
      try {
        return JSON.stringify(p.error, null, 2)
      } catch {
        return String(p.error)
      }
    })

    return { errorText }
  },
  template: `
    <div class="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div class="flex items-center justify-center h-12 w-12 rounded-full bg-[var(--xb-error-subtle)] text-[var(--xb-error)] mb-3">
        <FluentIcon name="warning" :size="24" />
      </div>
      <h3 class="text-base font-semibold text-[var(--xb-text-primary)]">{{ title }}</h3>
      <p v-if="description" class="text-sm text-[var(--xb-text-secondary)] mt-1.5 max-w-md">{{ description }}</p>
      <div v-if="error" class="mt-3 p-3 bg-[var(--xb-bg-hover)] rounded-[var(--xb-radius-md)] text-xs text-left max-w-lg overflow-auto max-h-40">
        <pre class="text-[var(--xb-text-tertiary)] whitespace-pre-wrap">{{ errorText }}</pre>
      </div>
      <div class="flex gap-2 mt-5">
        <FluentButton v-if="showRetry" variant="primary" size="small" icon="refresh" @click="$emit('retry')">重试</FluentButton>
        <FluentButton v-if="showBack" variant="subtle" size="small" icon="arrowLeft" @click="$emit('back')">返回</FluentButton>
        <FluentButton v-if="showHome" variant="subtle" size="small" icon="home" @click="$emit('home')">首页</FluentButton>
      </div>
    </div>
  `
}
