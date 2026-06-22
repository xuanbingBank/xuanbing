/**
 * @file 基础抽屉组件，基于 daisyUI drawer 风格。
 */

import type { ComponentOptions } from '../../vue-global'

/** 抽屉方向 */
type DrawerSide = 'left' | 'right'

/** 抽屉尺寸 */
type DrawerSize = 'sm' | 'md' | 'lg'

/** 组件 Props */
interface BaseDrawerProps {
  modelValue: boolean
  side: DrawerSide
  title: string
  size: DrawerSize
  closeOnBackdrop: boolean
}

/** setup 上下文类型 */
interface SetupCtx {
  emit: (event: string, ...args: unknown[]) => void
  slots: Record<string, unknown>
}

/** 尺寸到宽度类名映射 */
const sizeMap: Record<DrawerSize, string> = {
  sm: 'w-80',
  md: 'w-96',
  lg: 'w-[32rem]'
}

export const BaseDrawer: ComponentOptions = {
  name: 'BaseDrawer',
  props: {
    modelValue: { type: Boolean, default: false },
    side: { type: Object as () => DrawerSide, default: 'right' },
    title: { type: String, default: '' },
    size: { type: Object as () => DrawerSize, default: 'md' },
    closeOnBackdrop: { type: Boolean, default: true }
  },
  emits: ['update:modelValue', 'close'],
  setup(props, ctx) {
    const { emit } = ctx as unknown as SetupCtx
    const p = props as unknown as BaseDrawerProps

    // 尺寸 class
    const sizeClass = Vue.computed(() => sizeMap[p.size] || 'w-96')

    // 方向 class
    const sideClass = Vue.computed(() => (p.side === 'left' ? 'left-0' : 'right-0'))

    // 过渡动画名称
    const transitionName = Vue.computed(() => (p.side === 'left' ? 'fade' : 'toast'))

    // 关闭抽屉
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

    return { sizeClass, sideClass, transitionName, close, handleBackdrop }
  },
  template: `
    <teleport to="body">
      <transition :name="transitionName">
        <div v-if="modelValue" class="fixed inset-0 z-50">
          <div class="absolute inset-0 bg-black/50" @click="handleBackdrop"></div>
          <div
            class="absolute top-0 h-full bg-base-100 shadow-xl flex flex-col"
            :class="[sizeClass, sideClass]"
          >
            <div class="flex items-center justify-between p-4 border-b border-base-300">
              <h3 v-if="title" class="text-lg font-semibold">{{ title }}</h3>
              <button class="btn btn-ghost btn-xs btn-circle ml-auto" @click="close">✕</button>
            </div>
            <div class="flex-1 overflow-auto p-4">
              <slot></slot>
            </div>
          </div>
        </div>
      </transition>
    </teleport>
  `
}
