/**
 * @file 基础加载组件，支持 spinner、skeleton、text 三种模式。
 */

import type { ComponentOptions } from '../../vue-global'

/** 加载类型 */
type LoadingType = 'spinner' | 'skeleton' | 'text'

/** 加载尺寸 */
type LoadingSize = 'xs' | 'sm' | 'md' | 'lg'

/** 组件 Props */
interface BaseLoadingProps {
  type: LoadingType
  size: LoadingSize
  text: string
  inline: boolean
}

/** 尺寸到 daisyUI loading 类名映射 */
const sizeMap: Record<LoadingSize, string> = {
  xs: 'loading-xs',
  sm: 'loading-sm',
  md: '',
  lg: 'loading-lg'
}

export const BaseLoading: ComponentOptions = {
  name: 'BaseLoading',
  props: {
    type: { type: String as () => LoadingType, default: 'spinner' },
    size: { type: String as () => LoadingSize, default: 'md' },
    text: { type: String, default: '加载中...' },
    inline: { type: Boolean, default: false }
  },
  setup(props) {
    const p = props as unknown as BaseLoadingProps
    const sizeClass = Vue.computed(() => sizeMap[p.size] || '')
    return { sizeClass }
  },
  template: `
    <div v-if="!inline" class="w-full">
      <div v-if="type === 'spinner'" class="flex items-center justify-center py-4">
        <span class="loading loading-spinner" :class="sizeClass"></span>
      </div>
      <div v-else-if="type === 'skeleton'" class="skeleton h-4 w-full"></div>
      <div v-else class="flex items-center justify-center gap-2 py-4">
        <span class="loading loading-spinner loading-sm"></span>
        <span>{{ text }}</span>
      </div>
    </div>
    <template v-else>
      <span v-if="type === 'spinner'" class="loading loading-spinner" :class="sizeClass"></span>
      <div v-else-if="type === 'skeleton'" class="skeleton h-4 w-full"></div>
      <div v-else class="flex items-center gap-2">
        <span class="loading loading-spinner loading-sm"></span>
        <span>{{ text }}</span>
      </div>
    </template>
  `
}
