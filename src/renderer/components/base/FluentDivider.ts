/**
 * @file Fluent 风格分割线组件。
 */

import type { ComponentOptions } from '../../vue-global'

/** 组件 Props */
interface FluentDividerProps {
  direction: 'horizontal' | 'vertical'
  label: string
  dashed: boolean
}

export const FluentDivider: ComponentOptions = {
  name: 'FluentDivider',
  props: {
    direction: { type: String as () => 'horizontal' | 'vertical', default: 'horizontal' },
    label: { type: String, default: '' },
    dashed: { type: Boolean, default: false }
  },
  setup(props) {
    const p = props as unknown as FluentDividerProps
    return { p }
  },
  template: `
    <div v-if="direction === 'horizontal'" class="flex items-center my-4">
      <div
        v-if="label"
        class="flex-1 border-t"
        :class="dashed ? 'border-dashed' : ''"
        style="border-color: var(--xb-border)"
      ></div>
      <span v-if="label" class="px-3 text-xs text-[var(--xb-text-tertiary)]">{{ label }}</span>
      <div
        class="flex-1 border-t"
        :class="dashed ? 'border-dashed' : ''"
        style="border-color: var(--xb-border)"
      ></div>
    </div>
    <div
      v-else
      class="inline-block self-stretch border-l mx-2"
      :class="dashed ? 'border-dashed' : ''"
      style="border-color: var(--xb-border)"
    ></div>
  `
}
