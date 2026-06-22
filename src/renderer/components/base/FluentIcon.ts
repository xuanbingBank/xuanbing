/**
 * @file Fluent 风格图标组件。
 *
 * 通过 icon key 渲染对应的 SVG 线性图标（24x24 viewBox，stroke 风格）。
 * 所有图标统一来自 utils/icons.ts 的 ICON_PATHS 映射，避免散乱的 SVG。
 */

import type { ComponentOptions } from '../../vue-global'
import { getIconPath } from '../../utils/icons'

/** 组件 Props */
interface FluentIconProps {
  /** 图标 key（见 utils/icons.ts） */
  name: string
  /** 尺寸（px），默认 16 */
  size: number
  /** stroke 宽度，默认 2 */
  strokeWidth: number
}

export const FluentIcon: ComponentOptions = {
  name: 'FluentIcon',
  props: {
    name: { type: String, default: '' },
    size: { type: Number, default: 16 },
    strokeWidth: { type: Number, default: 2 }
  },
  setup(props) {
    const p = props as unknown as FluentIconProps
    const path = Vue.computed(() => getIconPath(p.name))
    return { path }
  },
  template: `
    <svg
      :width="size"
      :height="size"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      :stroke-width="strokeWidth"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="shrink-0"
      aria-hidden="true"
    >
      <path :d="path"></path>
    </svg>
  `
}
