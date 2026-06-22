/**
 * @file Fluent 风格加载组件。
 *
 * 支持 spinner、skeleton、text 三种模式，支持 inline。
 */

import type { ComponentOptions } from '../../vue-global'
import { FluentSkeleton } from './FluentSkeleton'

/** 加载类型 */
export type FluentLoadingType = 'spinner' | 'skeleton' | 'text'

/** 加载尺寸 */
export type FluentLoadingSize = 'small' | 'medium' | 'large'

/** 组件 Props */
interface FluentLoadingProps {
  type: FluentLoadingType
  size: FluentLoadingSize
  text: string
  inline: boolean
}

const spinnerSizeMap: Record<FluentLoadingSize, number> = {
  small: 14,
  medium: 20,
  large: 28
}

export const FluentLoading: ComponentOptions = {
  name: 'FluentLoading',
  components: { FluentSkeleton },
  props: {
    type: { type: String as () => FluentLoadingType, default: 'spinner' },
    size: { type: String as () => FluentLoadingSize, default: 'medium' },
    text: { type: String, default: '加载中...' },
    inline: { type: Boolean, default: false }
  },
  setup(props) {
    const p = props as unknown as FluentLoadingProps
    const spinnerSize = Vue.computed(() => spinnerSizeMap[p.size] ?? 20)
    return { spinnerSize }
  },
  template: `
    <div v-if="!inline" class="w-full">
      <div v-if="type === 'spinner'" class="flex items-center justify-center py-8">
        <svg class="animate-spin text-[var(--xb-brand)]" :width="spinnerSize" :height="spinnerSize" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
      </div>
      <div v-else-if="type === 'skeleton'" class="space-y-2 py-2">
        <FluentSkeleton :rows="3" />
      </div>
      <div v-else class="flex items-center justify-center gap-2 py-8 text-[var(--xb-text-tertiary)]">
        <svg class="animate-spin" :width="14" :height="14" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        <span class="text-sm">{{ text }}</span>
      </div>
    </div>
    <template v-else>
      <svg v-if="type === 'spinner'" class="animate-spin text-[var(--xb-brand)]" :width="spinnerSize" :height="spinnerSize" viewBox="0 0 24 24" fill="none">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
      <FluentSkeleton v-else-if="type === 'skeleton'" />
      <div v-else class="flex items-center gap-1.5">
        <svg class="animate-spin" :width="12" :height="12" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        <span class="text-xs">{{ text }}</span>
      </div>
    </template>
  `
}
