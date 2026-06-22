/**
 * @file Fluent 风格面包屑组件。
 */

import type { ComponentOptions } from '../../vue-global'
import { FluentIcon } from '../base/FluentIcon'

/** 面包屑项 */
export interface FluentBreadcrumbItem {
  title: string
  path?: string
  clickable: boolean
}

/** 组件 Props */
interface FluentBreadcrumbProps {
  items: FluentBreadcrumbItem[]
  separator: string
}

/** setup 上下文 */
interface SetupCtx {
  emit: (event: string, ...args: unknown[]) => void
}

export const FluentBreadcrumb: ComponentOptions = {
  name: 'FluentBreadcrumb',
  components: { FluentIcon },
  props: {
    items: { type: Array, default: () => [] },
    separator: { type: String, default: 'chevronRight' }
  },
  emits: ['navigate'],
  setup(props, ctx) {
    const { emit } = ctx as unknown as SetupCtx

    function handleNavigate(item: FluentBreadcrumbItem): void {
      if (!item.clickable || !item.path) return
      emit('navigate', item.path)
    }

    return { handleNavigate }
  },
  template: `
    <nav class="flex items-center text-sm" aria-label="面包屑">
      <ol class="flex items-center gap-1 flex-wrap">
        <li v-for="(item, index) in items" :key="index" class="flex items-center gap-1">
          <button
            v-if="item.clickable"
            type="button"
            class="text-[var(--xb-text-secondary)] hover:text-[var(--xb-text-primary)] transition-colors px-1 py-0.5 rounded-[var(--xb-radius-sm)] hover:bg-[var(--xb-bg-hover)]"
            @click="handleNavigate(item)"
          >
            {{ item.title }}
          </button>
          <span v-else class="text-[var(--xb-text-primary)] font-medium px-1 py-0.5">
            {{ item.title }}
          </span>
          <FluentIcon
            v-if="index < items.length - 1"
            :name="separator"
            :size="14"
            class="text-[var(--xb-text-tertiary)]"
          />
        </li>
      </ol>
    </nav>
  `
}
