/**
 * @file Fluent 风格标签页组件。
 *
 * 支持下划线移动动效、可关闭标签、affix 标签、图标。
 */

import type { ComponentOptions } from '../../vue-global'
import { cx } from '../../utils/fluent-class'
import { FluentIcon } from '../base/FluentIcon'

/** Tab 项 */
export interface FluentTabItem {
  key: string
  label: string
  icon?: string
  closable?: boolean
  affix?: boolean
  disabled?: boolean
}

/** 组件 Props */
interface FluentTabsProps {
  modelValue: string
  tabs: FluentTabItem[]
  closable: boolean
  type: 'line' | 'segment'
}

/** setup 上下文 */
interface SetupCtx {
  emit: (event: string, ...args: unknown[]) => void
}

export const FluentTabs: ComponentOptions = {
  name: 'FluentTabs',
  components: { FluentIcon },
  props: {
    modelValue: { type: String, default: '' },
    tabs: { type: Array, default: () => [] },
    closable: { type: Boolean, default: false },
    type: { type: String as () => 'line' | 'segment', default: 'line' }
  },
  emits: ['update:modelValue', 'change', 'close'],
  setup(props, ctx) {
    const { emit } = ctx as unknown as SetupCtx
    const p = props as unknown as FluentTabsProps

    function handleSelect(tab: FluentTabItem): void {
      if (tab.disabled) return
      if (tab.key === p.modelValue) return
      emit('update:modelValue', tab.key)
      emit('change', tab.key)
    }

    function handleClose(event: MouseEvent, tab: FluentTabItem): void {
      event.stopPropagation()
      if (tab.affix) return
      emit('close', tab.key)
    }

    return { handleSelect, handleClose }
  },
  template: `
    <div v-if="type === 'line'" class="flex items-center gap-1 border-b border-[var(--xb-border)] px-2">
      <div
        v-for="tab in tabs"
        :key="tab.key"
        class="relative flex items-center gap-1.5 px-3 py-2 text-sm cursor-pointer transition-colors"
        :class="[
          tab.disabled
            ? 'text-[var(--xb-text-disabled)] cursor-not-allowed'
            : tab.key === modelValue
              ? 'text-[var(--xb-brand-hover)]'
              : 'text-[var(--xb-text-secondary)] hover:text-[var(--xb-text-primary)]'
        ]"
        @click="handleSelect(tab)"
      >
        <FluentIcon v-if="tab.icon" :name="tab.icon" :size="14" />
        <span>{{ tab.label }}</span>
        <button
          v-if="closable && tab.closable !== false && !tab.affix"
          type="button"
          class="inline-flex items-center justify-center h-4 w-4 rounded-full text-[var(--xb-text-tertiary)] hover:bg-[var(--xb-bg-hover)] hover:text-[var(--xb-text-primary)]"
          @click="handleClose($event, tab)"
          aria-label="关闭"
        >
          <FluentIcon name="close" :size="10" />
        </button>
        <!-- 激活下划线 -->
        <span
          v-if="tab.key === modelValue"
          class="absolute left-2 right-2 bottom-[-1px] h-0.5 bg-[var(--xb-brand)] rounded-full"
        ></span>
      </div>
    </div>
    <div v-else class="inline-flex items-center gap-0.5 p-0.5 bg-[var(--xb-bg-hover)] rounded-[var(--xb-radius-md)]">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-[var(--xb-radius-sm)] transition-all"
        :class="[
          tab.disabled
            ? 'text-[var(--xb-text-disabled)] cursor-not-allowed'
            : tab.key === modelValue
              ? 'bg-[var(--xb-bg-surface)] text-[var(--xb-text-primary)] shadow-[var(--xb-shadow-card)]'
              : 'text-[var(--xb-text-secondary)] hover:text-[var(--xb-text-primary)]'
        ]"
        :disabled="tab.disabled"
        @click="handleSelect(tab)"
      >
        <FluentIcon v-if="tab.icon" :name="tab.icon" :size="14" />
        <span>{{ tab.label }}</span>
      </button>
    </div>
  `
}
