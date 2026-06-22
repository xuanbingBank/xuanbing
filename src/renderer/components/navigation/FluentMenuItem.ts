/**
 * @file Fluent 风格菜单项组件。
 *
 * 叶子菜单项，支持 icon、badge、shortcut、disabled、selected、active。
 */

import type { ComponentOptions } from '../../vue-global'
import { cx, menuItemClass } from '../../utils/fluent-class'
import { FluentIcon } from '../base/FluentIcon'
import { FluentBadge } from '../base/FluentBadge'

/** 组件 Props */
interface FluentMenuItemProps {
  title: string
  icon: string
  badge: string | number
  shortcut: string
  disabled: boolean
  selected: boolean
  active: boolean
  level: number
  collapsed: boolean
}

/** setup 上下文 */
interface SetupCtx {
  emit: (event: string, ...args: unknown[]) => void
}

export const FluentMenuItem: ComponentOptions = {
  name: 'FluentMenuItem',
  components: { FluentIcon, FluentBadge },
  props: {
    title: { type: String, required: true },
    icon: { type: String, default: '' },
    badge: { type: [String, Number], default: '' },
    shortcut: { type: String, default: '' },
    disabled: { type: Boolean, default: false },
    selected: { type: Boolean, default: false },
    active: { type: Boolean, default: false },
    level: { type: Number, default: 0 },
    collapsed: { type: Boolean, default: false }
  },
  emits: ['click'],
  setup(props, ctx) {
    const { emit } = ctx as unknown as SetupCtx
    const p = props as unknown as FluentMenuItemProps

    const itemClass = Vue.computed(() =>
      cx(
        'relative flex items-center gap-2.5 h-9 px-3 rounded-[var(--xb-radius-md)] text-sm font-medium',
        'transition-colors duration-[var(--xb-motion-fast)] ease-[var(--xb-ease)] select-none',
        'focus-visible:outline-none',
        menuItemClass(p.active, p.selected, p.disabled),
        p.collapsed ? 'justify-center px-0' : ''
      )
    )

    const indentStyle = Vue.computed(() => ({
      paddingLeft: p.collapsed ? undefined : `${12 + p.level * 16}px`
    }))

    function handleClick(event: MouseEvent): void {
      if (p.disabled) return
      emit('click', event)
    }

    return { itemClass, indentStyle, handleClick }
  },
  template: `
    <div
      :class="itemClass"
      :style="indentStyle"
      :title="collapsed ? title : ''"
      role="menuitem"
      :aria-disabled="disabled"
      @click="handleClick"
    >
      <!-- 选中指示条 -->
      <span v-if="selected" class="xb-selected-bar"></span>

      <FluentIcon v-if="icon" :name="icon" :size="18" />

      <template v-if="!collapsed">
        <span class="flex-1 xb-truncate">{{ title }}</span>
        <FluentBadge v-if="badge" variant="brand" size="small">{{ badge }}</FluentBadge>
        <span v-if="shortcut" class="text-xs text-[var(--xb-text-tertiary)]">{{ shortcut }}</span>
      </template>
    </div>
  `
}
