/**
 * @file Fluent 风格菜单分组组件。
 *
 * 带标题的菜单分组，组内可包含多个菜单项或子菜单。
 */

import type { ComponentOptions } from '../../vue-global'
import { cx } from '../../utils/fluent-class'

/** 组件 Props */
interface FluentMenuGroupProps {
  title: string
  collapsed: boolean
}

export const FluentMenuGroup: ComponentOptions = {
  name: 'FluentMenuGroup',
  props: {
    title: { type: String, default: '' },
    collapsed: { type: Boolean, default: false }
  },
  setup(props) {
    const p = props as unknown as FluentMenuGroupProps
    return { p }
  },
  template: `
    <div class="flex flex-col">
      <div
        v-if="title && !collapsed"
        class="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--xb-text-tertiary)]"
      >
        {{ title }}
      </div>
      <div class="flex flex-col gap-0.5">
        <slot></slot>
      </div>
    </div>
  `
}
