/**
 * @file Fluent 风格 Toast 容器组件。
 *
 * 从 notification store 读取消息队列，以 Fluent 风格渲染。
 * 支持 success / error / warning / info / loading，最大数量限制，动效（slide）。
 */

import type { ComponentOptions } from '../../vue-global'
import { useNotificationStore } from '../../stores/notification.store'
import type { ToastType } from '../../stores/notification.store'
import { FluentIcon } from './FluentIcon'
import { cx } from '../../utils/fluent-class'

/** Toast 类型 → 图标 key */
const iconMap: Record<ToastType, string> = {
  success: 'check',
  error: 'error',
  warning: 'warning',
  info: 'info',
  loading: ''
}

/** Toast 类型 → 强调色 */
const accentColorMap: Record<ToastType, string> = {
  success: 'text-[var(--xb-success)]',
  error: 'text-[var(--xb-error)]',
  warning: 'text-[var(--xb-warning)]',
  info: 'text-[var(--xb-info)]',
  loading: 'text-[var(--xb-brand)]'
}

export const FluentToast: ComponentOptions = {
  name: 'FluentToast',
  components: { FluentIcon },
  setup() {
    const store = useNotificationStore()
    const toasts = Vue.computed(() => store.state.toasts)

    function iconFor(type: ToastType): string {
      return iconMap[type] || ''
    }

    function accentClass(type: ToastType): string {
      return accentColorMap[type] || ''
    }

    function removeToast(id: string): void {
      store.removeToast(id)
    }

    return { toasts, iconFor, accentClass, removeToast }
  },
  template: `
    <teleport to="body">
      <div class="fixed top-4 right-4 z-[var(--xb-z-toast)] flex flex-col gap-2 pointer-events-none">
        <transition-group name="xb-toast">
          <div
            v-for="toast in toasts"
            :key="toast.id"
            class="pointer-events-auto flex items-start gap-3 min-w-[280px] max-w-[400px] p-3.5 bg-[var(--xb-bg-surface)] rounded-[var(--xb-radius-lg)] shadow-[var(--xb-shadow-popover)] border border-[var(--xb-border-subtle)]"
          >
            <!-- 图标 -->
            <div class="shrink-0 mt-0.5" :class="accentClass(toast.type)">
              <svg v-if="toast.type === 'loading'" class="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              <FluentIcon v-else :name="iconFor(toast.type)" :size="18" :stroke-width="2.5" />
            </div>
            <!-- 内容 -->
            <div class="flex-1 min-w-0">
              <h4 class="text-sm font-medium text-[var(--xb-text-primary)]">{{ toast.title }}</h4>
              <p v-if="toast.description" class="text-xs text-[var(--xb-text-secondary)] mt-0.5">{{ toast.description }}</p>
            </div>
            <!-- 关闭按钮 -->
            <button
              class="shrink-0 text-[var(--xb-text-tertiary)] hover:text-[var(--xb-text-primary)] transition-colors"
              @click="removeToast(toast.id)"
              aria-label="关闭"
            >
              <FluentIcon name="close" :size="14" />
            </button>
          </div>
        </transition-group>
      </div>
    </teleport>
  `
}
