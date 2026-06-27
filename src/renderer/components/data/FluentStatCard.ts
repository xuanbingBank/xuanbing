/**
 * @file Fluent 风格统计卡片组件。
 *
 * 用于仪表盘关键指标展示：
 * - 标签、数值、单位
 * - 趋势（上升/下降/持平）+ 百分比
 * - 图标、颜色主题
 * - 加载态
 * - 点击交互
 */

import type { ComponentOptions } from '../../vue-global'
import { cx } from '../../utils/fluent-class'
import { FluentIcon } from '../base/FluentIcon'
import { FluentSkeleton } from '../base/FluentSkeleton'

/** 趋势方向 */
export type FluentStatTrend = 'up' | 'down' | 'flat'

/** 颜色主题 */
export type FluentStatColor = 'brand' | 'success' | 'warning' | 'error' | 'info' | 'neutral'

/** 组件 Props */
interface FluentStatCardProps {
  /** 标签 */
  label: string
  /** 数值 */
  value: string | number
  /** 单位 */
  unit: string
  /** 图标 */
  icon: string
  /** 颜色主题 */
  color: FluentStatColor
  /** 趋势 */
  trend: FluentStatTrend
  /** 趋势百分比 */
  trendValue: string | number
  /** 趋势描述 */
  trendLabel: string
  /** 加载中 */
  loading: boolean
  /** 可点击 */
  clickable: boolean
  /** 选中 */
  selected: boolean
  /** 副标题 */
  subtitle: string
}

/** setup 上下文 */
interface SetupCtx {
  emit: (event: string, ...args: unknown[]) => void
}

/** 颜色映射 */
const colorMap: Record<FluentStatColor, { bg: string; text: string; ring: string }> = {
  brand: {
    bg: 'bg-[var(--xb-brand-subtle)]',
    text: 'text-[var(--xb-brand)]',
    ring: 'ring-[var(--xb-brand)]'
  },
  success: {
    bg: 'bg-[var(--xb-success-subtle)]',
    text: 'text-[var(--xb-success)]',
    ring: 'ring-[var(--xb-success)]'
  },
  warning: {
    bg: 'bg-[var(--xb-warning-subtle)]',
    text: 'text-[var(--xb-warning)]',
    ring: 'ring-[var(--xb-warning)]'
  },
  error: {
    bg: 'bg-[var(--xb-error-subtle)]',
    text: 'text-[var(--xb-error)]',
    ring: 'ring-[var(--xb-error)]'
  },
  info: {
    bg: 'bg-[var(--xb-info-subtle)]',
    text: 'text-[var(--xb-info)]',
    ring: 'ring-[var(--xb-info)]'
  },
  neutral: {
    bg: 'bg-[var(--xb-bg-hover)]',
    text: 'text-[var(--xb-text-secondary)]',
    ring: 'ring-[var(--xb-border-strong)]'
  }
}

export const FluentStatCard: ComponentOptions = {
  name: 'FluentStatCard',
  components: { FluentIcon, FluentSkeleton },
  props: {
    label: { type: String, default: '' },
    value: { type: [String, Number], default: '' },
    unit: { type: String, default: '' },
    icon: { type: String, default: '' },
    color: { type: String as () => FluentStatColor, default: 'brand' },
    trend: { type: String as () => FluentStatTrend, default: 'flat' },
    trendValue: { type: [String, Number], default: '' },
    trendLabel: { type: String, default: '' },
    loading: { type: Boolean, default: false },
    clickable: { type: Boolean, default: false },
    selected: { type: Boolean, default: false },
    subtitle: { type: String, default: '' }
  },
  emits: ['click'],
  setup(props, ctx) {
    const { emit } = ctx as unknown as SetupCtx
    const p = props as unknown as FluentStatCardProps

    const colorClass = Vue.computed(() => colorMap[p.color] ?? colorMap.brand)

    const trendIcon = Vue.computed(() => {
      if (p.trend === 'up') return 'chevronUp'
      if (p.trend === 'down') return 'chevronDown'
      return 'arrowRight'
    })

    const trendClass = Vue.computed(() => {
      if (p.trend === 'up') return 'text-[var(--xb-success)]'
      if (p.trend === 'down') return 'text-[var(--xb-error)]'
      return 'text-[var(--xb-text-tertiary)]'
    })

    function handleClick(event: MouseEvent): void {
      if (!p.clickable) return
      emit('click', event)
    }

    return { colorClass, trendIcon, trendClass, handleClick, cx }
  },
  template: `
    <div
      :class="[
        'relative bg-[var(--xb-bg-surface)] rounded-[var(--xb-radius-lg)] border border-[var(--xb-border-subtle)] p-4 transition-all',
        clickable ? 'cursor-pointer hover:shadow-[var(--xb-shadow-card-hover)] hover:border-[var(--xb-border-strong)]' : '',
        selected ? 'ring-2 ' + colorClass.ring : ''
      ]"
      @click="handleClick"
    >
      <!-- 顶部：图标 + 标签 -->
      <div class="flex items-start justify-between mb-3">
        <div class="flex flex-col gap-0.5 min-w-0">
          <div class="text-xs font-medium text-[var(--xb-text-tertiary)] truncate">{{ label }}</div>
          <div v-if="subtitle" class="text-[10px] text-[var(--xb-text-tertiary)] truncate">{{ subtitle }}</div>
        </div>
        <div
          v-if="icon"
          :class="['w-9 h-9 rounded-[var(--xb-radius-md)] flex items-center justify-center shrink-0', colorClass.bg, colorClass.text]"
        >
          <FluentIcon :name="icon" :size="18" />
        </div>
      </div>

      <!-- 数值 -->
      <div class="flex items-baseline gap-1 mb-2">
        <FluentSkeleton v-if="loading" width="80px" height="28px" />
        <span v-else class="text-2xl font-semibold text-[var(--xb-text-primary)] tabular-nums">
          {{ value }}
        </span>
        <span v-if="unit && !loading" class="text-sm text-[var(--xb-text-tertiary)]">{{ unit }}</span>
      </div>

      <!-- 趋势 -->
      <div v-if="trend !== 'flat' || trendValue || trendLabel" class="flex items-center gap-1.5 text-xs">
        <div v-if="loading">
          <FluentSkeleton width="60px" height="14px" />
        </div>
        <template v-else>
          <span
            v-if="trendValue"
            :class="['inline-flex items-center gap-0.5 font-medium', trendClass]"
          >
            <FluentIcon :name="trendIcon" :size="12" />
            {{ trendValue }}
          </span>
          <span v-if="trendLabel" class="text-[var(--xb-text-tertiary)]">{{ trendLabel }}</span>
        </template>
      </div>
    </div>
  `
}
