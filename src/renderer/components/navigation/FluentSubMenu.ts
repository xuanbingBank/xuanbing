/**
 * @file Fluent 风格子菜单组件（可展开/收起）。
 *
 * 支持多级嵌套，展开/收起状态由外部控制（通过 expanded prop），
 * 箭头图标旋转动效，子菜单高度过渡。
 */

import type { ComponentOptions } from '../../vue-global'
import { cx, menuItemClass } from '../../utils/fluent-class'
import { FluentIcon } from '../base/FluentIcon'
import { FluentBadge } from '../base/FluentBadge'

/** 组件 Props */
interface FluentSubMenuProps {
  title: string
  icon: string
  badge: string | number
  disabled: boolean
  expanded: boolean
  selected: boolean
  active: boolean
  level: number
  collapsed: boolean
}

/** setup 上下文 */
interface SetupCtx {
  emit: (event: string, ...args: unknown[]) => void
}

export const FluentSubMenu: ComponentOptions = {
  name: 'FluentSubMenu',
  components: { FluentIcon, FluentBadge },
  props: {
    title: { type: String, required: true },
    icon: { type: String, default: '' },
    badge: { type: [String, Number], default: '' },
    disabled: { type: Boolean, default: false },
    expanded: { type: Boolean, default: false },
    selected: { type: Boolean, default: false },
    active: { type: Boolean, default: false },
    level: { type: Number, default: 0 },
    collapsed: { type: Boolean, default: false }
  },
  emits: ['toggle'],
  setup(props, ctx) {
    const { emit } = ctx as unknown as SetupCtx
    const p = props as unknown as FluentSubMenuProps

    const triggerClass = Vue.computed(() =>
      cx(
        'relative flex items-center gap-2.5 h-9 px-3 rounded-[var(--xb-radius-md)] text-sm font-medium',
        'transition-colors duration-[var(--xb-motion-fast)] ease-[var(--xb-ease)] select-none cursor-pointer',
        'focus-visible:outline-none',
        menuItemClass(p.active, p.selected, p.disabled),
        p.collapsed ? 'justify-center px-0' : ''
      )
    )

    const indentStyle = Vue.computed(() => ({
      paddingLeft: p.collapsed ? undefined : `${12 + p.level * 16}px`
    }))

    const arrowClass = Vue.computed(() =>
      cx(
        'transition-transform duration-[var(--xb-motion-normal)] ease-[var(--xb-ease)] text-[var(--xb-text-tertiary)]',
        p.expanded ? 'rotate-90' : 'rotate-0'
      )
    )

    function handleToggle(): void {
      if (p.disabled) return
      emit('toggle')
    }

    return { triggerClass, indentStyle, arrowClass, handleToggle }
  },
  template: `
    <div class="flex flex-col">
      <div
        :class="triggerClass"
        :style="indentStyle"
        :title="collapsed ? title : ''"
        role="menuitem"
        :aria-expanded="expanded"
        :aria-disabled="disabled"
        @click="handleToggle"
      >
        <FluentIcon v-if="icon" :name="icon" :size="18" />

        <template v-if="!collapsed">
          <span class="flex-1 xb-truncate">{{ title }}</span>
          <FluentBadge v-if="badge" variant="brand" size="small">{{ badge }}</FluentBadge>
          <FluentIcon name="chevronRight" :size="14" :class="arrowClass" />
        </template>
      </div>

      <!-- 子菜单内容 -->
      <transition v-if="!collapsed" name="xb-menu-expand">
        <div v-show="expanded" class="flex flex-col gap-0.5 mt-0.5">
          <slot></slot>
        </div>
      </transition>
    </div>
  `
}
