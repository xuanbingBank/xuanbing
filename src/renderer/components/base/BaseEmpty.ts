/**
 * @file 空状态组件，用于列表或页面无数据时展示。
 */

import type { ComponentOptions } from '../../vue-global'

/** 组件 Props */
interface BaseEmptyProps {
  title: string
  description: string
  icon: string
}

export const BaseEmpty: ComponentOptions = {
  name: 'BaseEmpty',
  props: {
    title: { type: String, default: '暂无数据' },
    description: { type: String, default: '' },
    icon: { type: String, default: '📭' }
  },
  setup(props) {
    const p = props as unknown as BaseEmptyProps
    return { p }
  },
  template: `
    <div class="flex flex-col items-center justify-center py-12 text-center">
      <div class="text-6xl mb-4">{{ icon }}</div>
      <h3 class="text-lg font-medium">{{ title }}</h3>
      <p v-if="description" class="text-sm text-base-content/60 mt-1">{{ description }}</p>
      <div class="mt-4">
        <slot name="action"></slot>
      </div>
    </div>
  `
}
