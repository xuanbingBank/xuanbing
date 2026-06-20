/**
 * @file 基础模态框组件，基于 daisyUI modal。
 */

import type { ComponentOptions } from '../../vue-global'

/** 模态框尺寸 */
type ModalSize = 'sm' | 'md' | 'lg' | 'xl'

/** 组件 Props */
interface BaseModalProps {
  modelValue: boolean
  title: string
  size: ModalSize
  loading: boolean
  confirmText: string
  cancelText: string
  closeOnEsc: boolean
  closeOnBackdrop: boolean
  showConfirm: boolean
  showCancel: boolean
}

/** setup 上下文类型 */
interface SetupCtx {
  emit: (event: string, ...args: unknown[]) => void
  slots: Record<string, unknown>
}

/** 尺寸到 max-width 类名映射 */
const sizeMap: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl'
}

export const BaseModal: ComponentOptions = {
  name: 'BaseModal',
  props: {
    modelValue: { type: Boolean, default: false },
    title: { type: String, default: '' },
    size: { type: Object as () => ModalSize, default: 'md' },
    loading: { type: Boolean, default: false },
    confirmText: { type: String, default: '确认' },
    cancelText: { type: String, default: '取消' },
    closeOnEsc: { type: Boolean, default: true },
    closeOnBackdrop: { type: Boolean, default: true },
    showConfirm: { type: Boolean, default: true },
    showCancel: { type: Boolean, default: true }
  },
  emits: ['update:modelValue', 'confirm', 'cancel', 'close'],
  setup(props, ctx) {
    const { emit } = ctx as unknown as SetupCtx
    const p = props as unknown as BaseModalProps

    // 尺寸 class
    const sizeClass = Vue.computed(() => sizeMap[p.size] || 'max-w-md')

    // 关闭模态框
    function close(): void {
      emit('update:modelValue', false)
      emit('close')
    }

    // 背景点击处理
    function handleBackdrop(): void {
      if (p.closeOnBackdrop) {
        close()
      }
    }

    // 确认按钮处理
    function handleConfirm(): void {
      emit('confirm')
    }

    // 取消按钮处理
    function handleCancel(): void {
      emit('cancel')
      close()
    }

    // ESC 键处理
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

    return { sizeClass, close, handleBackdrop, handleConfirm, handleCancel }
  },
  template: `
    <teleport to="body">
      <transition name="modal">
        <div v-if="modelValue" class="modal modal-open" @click.self="handleBackdrop">
          <div class="modal-box relative" :class="sizeClass">
            <div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-base-100/60 z-20 rounded-box">
              <span class="loading loading-spinner loading-lg"></span>
            </div>
            <div class="flex items-center justify-between mb-4">
              <h3 v-if="title" class="text-lg font-semibold">{{ title }}</h3>
              <button class="btn btn-ghost btn-xs btn-circle ml-auto" @click="close">✕</button>
            </div>
            <div class="py-2">
              <slot></slot>
            </div>
            <div v-if="$slots.footer" class="modal-action">
              <slot name="footer"></slot>
            </div>
            <div v-else-if="showConfirm || showCancel" class="modal-action">
              <button v-if="showCancel" class="btn btn-ghost" @click="handleCancel">{{ cancelText }}</button>
              <button v-if="showConfirm" class="btn btn-primary" @click="handleConfirm">{{ confirmText }}</button>
            </div>
          </div>
        </div>
      </transition>
    </teleport>
  `
}
