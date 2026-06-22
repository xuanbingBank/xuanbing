/**
 * @file Fluent 风格菜单容器组件。
 *
 * 通用菜单容器，可纵向或横向排列菜单项。
 * 与 FluentMenuItem / FluentMenuGroup / FluentSubMenu 配合使用。
 */

import type { ComponentOptions } from '../../vue-global'
import { cx } from '../../utils/fluent-class'

/** 组件 Props */
interface FluentMenuProps {
  mode: 'vertical' | 'horizontal'
  compact: boolean
}

export const FluentMenu: ComponentOptions = {
  name: 'FluentMenu',
  props: {
    mode: { type: String as () => 'vertical' | 'horizontal', default: 'vertical' },
    compact: { type: Boolean, default: false }
  },
  setup(props) {
    const p = props as unknown as FluentMenuProps

    const menuClass = Vue.computed(() =>
      cx(
        'flex gap-0.5',
        p.mode === 'vertical' ? 'flex-col' : 'flex-row items-center',
        p.compact ? 'p-1' : 'p-2'
      )
    )

    return { menuClass }
  },
  template: `
    <div :class="menuClass" role="menu">
      <slot></slot>
    </div>
  `
}
