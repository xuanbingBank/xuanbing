/**
 * @file Fluent 风格模态框组件。
 *
 * 支持 v-model、title、description、size、confirm/cancel、loading、
 * closeOnEsc、closeOnBackdrop、beforeClose、动效（淡入 + scale 0.98→1）。
 */

import type { ComponentOptions } from '../../vue-global'
import { cx, modalSizeClass } from '../../utils/fluent-class'
import { FluentIconButton } from './FluentIconButton'
import { FluentButton } from './FluentButton'

/** Modal 尺寸 */
export type FluentModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full'

/** 组件 Props */
interface FluentModalProps {
  modelValue: boolean
  title: string
  description: string
  size: FluentModalSize
  loading: boolean
  confirmText: string
  cancelText: string
  closeOnEsc: boolean
  closeOnBackdrop: boolean
  showConfirm: boolean
  showCancel: boolean
  showClose: boolean
  beforeClose: (() => boolean) | null
}

/** setup 上下文 */
interface SetupCtx {
  emit: (event: string, ...args: unknown[]) => void
  slots: Record<string, unknown>
}

export const FluentModal: ComponentOptions = {
  name: 'FluentModal',
  components: { FluentIconButton, FluentButton },
  props: {
    modelValue: { type: Boolean, default: false },
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    size: { type: String as () => FluentModalSize, default: 'md' },
    loading: { type: Boolean, default: false },
    confirmText: { type: String, default: '确认' },
    cancelText: { type: String, default: '取消' },
    closeOnEsc: { type: Boolean, default: true },
    closeOnBackdrop: { type: Boolean, default: true },
    showConfirm: { type: Boolean, default: true },
    showCancel: { type: Boolean, default: true },
    showClose: { type: Boolean, default: true },
    beforeClose: { type: Object as () => (() => boolean) | null, default: null }
  },
  emits: ['update:modelValue', 'confirm', 'cancel', 'close'],
  setup(props, ctx) {
    const { emit } = ctx as unknown as SetupCtx
    const p = props as unknown as FluentModalProps

    const sizeCls = Vue.computed(() => modalSizeClass[p.size] ?? modalSizeClass.md)

    function close(): void {
      if (p.beforeClose && typeof p.beforeClose === 'function') {
        if (!p.beforeClose()) return
      }
      emit('update:modelValue', false)
      emit('close')
    }

    function handleBackdrop(): void {
      if (p.closeOnBackdrop) close()
    }

    function handleConfirm(): void {
      emit('confirm')
    }

    function handleCancel(): void {
      emit('cancel')
      close()
    }

    function handleKeydown(event: KeyboardEvent): void {
      if (event.key === 'Escape' && p.closeOnEsc && p.modelValue) {
        close()
      }
    }

    Vue.onMounted(() => {
      window.addEventListener('keydown', handleKeydown)
    })
    Vue.onBeforeUnmount(() => {
      window.removeEventListener('keydown', handleKeydown)
    })

    return { sizeCls, close, handleBackdrop, handleConfirm, handleCancel }
  },
  template: `
    <teleport to="body">
      <transition name="xb-modal">
        <div
          v-if="modelValue"
          class="fixed inset-0 z-[var(--xb-z-modal)] flex items-center justify-center p-4"
          @click.self="handleBackdrop"
        >
          <!-- 遮罩 -->
          <div class="absolute inset-0 bg-black/40 backdrop-blur-[1px]"></div>
          <!-- 模态框 -->
          <div
            class="xb-modal-box relative bg-[var(--xb-bg-surface)] rounded-[var(--xb-radius-xl)] shadow-[var(--xb-shadow-dialog)] w-full max-h-[90vh] flex flex-col overflow-hidden"
            :class="sizeCls"
          >
            <!-- 加载遮罩 -->
            <div
              v-if="loading"
              class="absolute inset-0 flex items-center justify-center bg-[var(--xb-bg-surface)]/60 z-20"
            >
              <svg class="animate-spin h-8 w-8 text-[var(--xb-brand)]" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            </div>

            <!-- header -->
            <div v-if="title || description || showClose || $slots.header" class="px-6 pt-5 pb-4 border-b border-[var(--xb-border-subtle)]">
              <slot name="header">
                <div class="flex items-start justify-between gap-4">
                  <div class="min-w-0">
                    <h3 v-if="title" class="text-base font-semibold text-[var(--xb-text-primary)]">{{ title }}</h3>
                    <p v-if="description" class="text-sm text-[var(--xb-text-secondary)] mt-1">{{ description }}</p>
                  </div>
                  <FluentIconButton
                    v-if="showClose"
                    icon="close"
                    size="small"
                    aria-label="关闭"
                    @click="close"
                  />
                </div>
              </slot>
            </div>

            <!-- body -->
            <div class="flex-1 overflow-auto px-6 py-5">
              <slot></slot>
            </div>

            <!-- footer -->
            <div v-if="$slots.footer || showConfirm || showCancel" class="px-6 py-4 border-t border-[var(--xb-border-subtle)] flex items-center justify-end gap-2">
              <slot name="footer">
                <FluentButton v-if="showCancel" variant="subtle" size="medium" @click="handleCancel">{{ cancelText }}</FluentButton>
                <FluentButton v-if="showConfirm" variant="primary" size="medium" :loading="loading" @click="handleConfirm">{{ confirmText }}</FluentButton>
              </slot>
            </div>
          </div>
        </div>
      </transition>
    </teleport>
  `
}
