/**
 * @file Fluent 风格骨架屏组件。
 */

import type { ComponentOptions } from '../../vue-global'

/** 组件 Props */
interface FluentSkeletonProps {
  width: string
  height: string
  rounded: string
  rows: number
}

export const FluentSkeleton: ComponentOptions = {
  name: 'FluentSkeleton',
  props: {
    width: { type: String, default: '100%' },
    height: { type: String, default: '16px' },
    rounded: { type: String, default: 'var(--xb-radius-sm)' },
    rows: { type: Number, default: 1 }
  },
  setup(props) {
    const p = props as unknown as FluentSkeletonProps
    return { p }
  },
  template: `
    <div v-if="rows > 1" class="space-y-2">
      <div
        v-for="(_, index) in rows"
        :key="index"
        class="xb-skeleton"
        :style="{ width: index === rows - 1 ? '60%' : width, height: height, borderRadius: rounded }"
      ></div>
    </div>
    <div
      v-else
      class="xb-skeleton"
      :style="{ width: width, height: height, borderRadius: rounded }"
    ></div>
  `
}
