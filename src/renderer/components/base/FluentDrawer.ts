/**
 * @file Fluent 风格抽屉组件。
 *
 * 支持 v-model、side（left/right）、size、title、footer、closeOnBackdrop、动效（滑入）。
 */

import type { ComponentOptions } from '../../vue-global'
import { cx, drawerSizeClass } from '../../utils/fluent-class'
import { FluentIconButton } from './FluentIconButton'

/** 抽屉方向 */
export type FluentDrawerSide = 'left' | 'right'

/** 抽屉尺寸 */
export type FluentDrawerSize = 'sm' | 'md' | 'lg' | 'xl' | 'full'

/** 组件 Props */
interface FluentDrawerProps {
  modelValue: boolean
  side: FluentDrawerSide
  size: FluentDrawerSize
  title: string
  description: string
  closeOnBackdrop: boolean
  closeOnEsc: boolean
}

/** setup 上下文 */
interface SetupCtx {
  emit: (event: string, ...args: unknown[]) => void
  slots: Record<string, unknown>
}

export const FluentDrawer: ComponentOptions = {
  name: 'FluentDrawer',
  components: { FluentIconButton },
  props: {
    modelValue: { type: Boolean, default: false },
    side: { type: String as () => FluentDrawerSide, default: 'right' },
    size: { type: String as () => FluentDrawerSize, default: 'md' },
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    closeOnBackdrop: { type: Boolean, default: true },
    closeOnEsc: { type: Boolean, default: true }
  },
  emits: ['update:modelValue', 'close'],
  setup(props, ctx) {
    const { emit } = ctx as unknown as SetupCtx
    const p = props as unknown as FluentDrawerProps

    const sizeCls = Vue.computed(() => drawerSizeClass[p.size] ?? drawerSizeClass.md)
    const sideClass = Vue.computed(() => (p.side === 'left' ? 'xb-drawer-left' : 'xb-drawer-right'))
    const panelPositionClass = Vue.computed(() =>
      p.side === 'left' ? 'left-0' : 'right-0'
    )

    function close(): void {
      emit('update:modelValue', false)
      emit('close')
    }

    function handleBackdrop(): void {
      if (p.closeOnBackdrop) close()
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

    return { sizeCls, sideClass, panelPositionClass, close, handleBackdrop }
  },
  template: `
    <teleport to="body">
      <transition name="xb-drawer">
        <div
          v-if="modelValue"
          :class="['fixed inset-0 z-[var(--xb-z-modal)]', sideClass]"
        >
          <!-- 遮罩 -->
          <div class="absolute inset-0 bg-black/40" @click="handleBackdrop"></div>
          <!-- 抽屉面板 -->
          <div
            class="xb-drawer-panel absolute top-0 h-full bg-[var(--xb-bg-surface)] shadow-[var(--xb-shadow-dialog)] flex flex-col"
            :class="[sizeCls, panelPositionClass]"
          >
            <!-- header -->
            <div v-if="title || description || $slots.header" class="px-5 pt-4 pb-3 border-b border-[var(--xb-border-subtle)]">
              <slot name="header">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <h3 v-if="title" class="text-base font-semibold text-[var(--xb-text-primary)]">{{ title }}</h3>
                    <p v-if="description" class="text-xs text-[var(--xb-text-tertiary)] mt-0.5">{{ description }}</p>
                  </div>
                  <FluentIconButton icon="close" size="small" aria-label="关闭" @click="close" />
                </div>
              </slot>
            </div>
            <!-- body -->
            <div class="flex-1 overflow-auto p-5">
              <slot></slot>
            </div>
            <!-- footer -->
            <div v-if="$slots.footer" class="px-5 py-3 border-t border-[var(--xb-border-subtle)]">
              <slot name="footer"></slot>
            </div>
          </div>
        </div>
      </transition>
    </teleport>
  `
}
