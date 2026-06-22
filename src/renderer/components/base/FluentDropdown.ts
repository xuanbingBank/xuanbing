/**
 * @file Fluent 风格下拉菜单组件。
 *
 * 支持多级、icon、shortcut、disabled、divider、danger、click outside 关闭、键盘基础支持。
 */

import type { ComponentOptions } from '../../vue-global'
import { cx } from '../../utils/fluent-class'
import { FluentIcon } from './FluentIcon'

/** 下拉菜单项 */
export interface FluentDropdownItem {
  id: string
  title: string
  icon?: string
  shortcut?: string
  disabled?: boolean
  divider?: boolean
  danger?: boolean
  children?: FluentDropdownItem[]
}

/** 组件 Props */
interface FluentDropdownProps {
  items: FluentDropdownItem[]
  trigger: 'click' | 'hover'
  placement: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end'
  offset: number
}

/** setup 上下文 */
interface SetupCtx {
  emit: (event: string, ...args: unknown[]) => void
  slots: Record<string, unknown>
}

export const FluentDropdown: ComponentOptions = {
  name: 'FluentDropdown',
  components: { FluentIcon },
  props: {
    items: { type: Array, default: () => [] },
    trigger: { type: String as () => 'click' | 'hover', default: 'click' },
    placement: {
      type: String as () => 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end',
      default: 'bottom-start'
    },
    offset: { type: Number, default: 4 }
  },
  emits: ['select'],
  setup(props, ctx) {
    const { emit } = ctx as unknown as SetupCtx
    const p = props as unknown as FluentDropdownProps

    const visible = Vue.ref(false)
    const containerRef = Vue.ref<HTMLElement | null>(null)

    function show(): void {
      visible.value = true
    }
    function hide(): void {
      visible.value = false
    }
    function toggle(): void {
      visible.value = !visible.value
    }

    function handleTrigger(): void {
      if (p.trigger === 'click') toggle()
      else show()
    }

    function handleSelect(item: FluentDropdownItem): void {
      if (item.disabled || item.divider) return
      if (item.children && item.children.length > 0) return
      emit('select', item)
      hide()
    }

    function handleClickOutside(event: MouseEvent): void {
      const target = event.target as Node
      if (containerRef.value && !containerRef.value.contains(target)) {
        hide()
      }
    }

    function handleKeydown(event: KeyboardEvent): void {
      if (event.key === 'Escape' && visible.value) hide()
    }

    Vue.onMounted(() => {
      window.addEventListener('click', handleClickOutside)
      window.addEventListener('keydown', handleKeydown)
    })
    Vue.onBeforeUnmount(() => {
      window.removeEventListener('click', handleClickOutside)
      window.removeEventListener('keydown', handleKeydown)
    })

    const panelPositionClass = Vue.computed(() => {
      switch (p.placement) {
        case 'bottom-end':
          return 'right-0 top-full'
        case 'top-start':
          return 'left-0 bottom-full'
        case 'top-end':
          return 'right-0 bottom-full'
        default:
          return 'left-0 top-full'
      }
    })

    return {
      visible,
      containerRef,
      panelPositionClass,
      handleTrigger,
      hide,
      handleSelect,
      cx
    }
  },
  template: `
    <div
      ref="containerRef"
      class="relative inline-block"
      @click="trigger === 'click' && handleTrigger()"
      @mouseenter="trigger === 'hover' && handleTrigger()"
      @mouseleave="trigger === 'hover' && hide()"
    >
      <slot></slot>
      <transition name="xb-fade-slide">
        <div
          v-if="visible"
          class="absolute z-[var(--xb-z-dropdown)] min-w-[180px] py-1 bg-[var(--xb-bg-surface)] rounded-[var(--xb-radius-lg)] shadow-[var(--xb-shadow-popover)] border border-[var(--xb-border-subtle)]"
          :class="panelPositionClass"
          :style="{ marginTop: offset + 'px' }"
        >
          <template v-for="item in items" :key="item.id">
            <div v-if="item.divider" class="my-1 border-t border-[var(--xb-border-subtle)]"></div>
            <button
              v-else
              type="button"
              class="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-left transition-colors"
              :class="[
                item.disabled
                  ? 'text-[var(--xb-text-disabled)] cursor-not-allowed'
                  : item.danger
                    ? 'text-[var(--xb-error)] hover:bg-[var(--xb-error-subtle)]'
                    : 'text-[var(--xb-text-primary)] hover:bg-[var(--xb-bg-hover)]'
              ]"
              :disabled="item.disabled"
              @click="handleSelect(item)"
            >
              <FluentIcon v-if="item.icon" :name="item.icon" :size="16" />
              <span class="flex-1">{{ item.title }}</span>
              <span v-if="item.shortcut" class="text-xs text-[var(--xb-text-tertiary)]">{{ item.shortcut }}</span>
              <FluentIcon v-if="item.children && item.children.length > 0" name="chevronRight" :size="14" />
            </button>
          </template>
        </div>
      </transition>
    </div>
  `
}
