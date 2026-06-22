/**
 * @file Fluent 风格页面容器组件。
 *
 * 统一页面布局：
 * - 页头：标题、描述、操作区（actions slot）
 * - 状态：loading / error / empty
 * - 内容区：带 padding，可滚动
 * - 可选：面包屑、标签页、页脚
 * - 页面过渡动画
 */

import type { ComponentOptions } from '../../vue-global'
import { cx } from '../../utils/fluent-class'
import { FluentLoading } from '../base/FluentLoading'
import { FluentError } from '../base/FluentError'
import { FluentEmpty } from '../base/FluentEmpty'

/** 组件 Props */
interface FluentPageProps {
  /** 页面标题 */
  title: string
  /** 页面描述 */
  description: string
  /** 是否加载中 */
  loading: boolean
  /** 错误信息 */
  error: string
  /** 是否空态 */
  empty: boolean
  /** 空态文本 */
  emptyText: string
  /** 内容区 class */
  contentClass: string
  /** 内容区 padding */
  padding: 'none' | 'sm' | 'md' | 'lg'
  /** 最大宽度 */
  maxWidth: string
  /** 是否显示页头 */
  showHeader: boolean
  /** 是否粘性页头 */
  stickyHeader: boolean
}

/** setup 上下文 */
interface SetupCtx {
  emit: (event: string, ...args: unknown[]) => void
  slots: Record<string, unknown>
}

/** padding 映射 */
const paddingMap: Record<'none' | 'sm' | 'md' | 'lg', string> = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-6',
  lg: 'p-8'
}

export const FluentPage: ComponentOptions = {
  name: 'FluentPage',
  components: { FluentLoading, FluentError, FluentEmpty },
  props: {
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    loading: { type: Boolean, default: false },
    error: { type: String, default: '' },
    empty: { type: Boolean, default: false },
    emptyText: { type: String, default: '暂无数据' },
    contentClass: { type: String, default: '' },
    padding: { type: String as () => 'none' | 'sm' | 'md' | 'lg', default: 'md' },
    maxWidth: { type: String, default: '' },
    showHeader: { type: Boolean, default: true },
    stickyHeader: { type: Boolean, default: false }
  },
  emits: ['retry'],
  setup(props, ctx) {
    const { emit } = ctx as unknown as SetupCtx
    const p = props as unknown as FluentPageProps

    const contentPadding = Vue.computed(() => paddingMap[p.padding] ?? paddingMap.md)

    const wrapperStyle = Vue.computed(() => {
      const style: Record<string, string> = {}
      if (p.maxWidth) style.maxWidth = p.maxWidth
      return style
    })

    function handleRetry(): void {
      emit('retry')
    }

    return { contentPadding, wrapperStyle, handleRetry, cx }
  },
  template: `
    <div class="xb-page min-h-full flex flex-col" style="animation: xb-page-enter var(--xb-motion-normal) var(--xb-ease);">
      <div class="w-full mx-auto flex-1 flex flex-col" :style="wrapperStyle">
        <!-- 面包屑插槽 -->
        <div v-if="$slots.breadcrumb" :class="contentPadding + ' pb-0'">
          <slot name="breadcrumb"></slot>
        </div>

        <!-- 页头 -->
        <div
          v-if="showHeader && (title || description || $slots.actions)"
          :class="[
            'flex items-start justify-between gap-4',
            contentPadding,
            stickyHeader ? 'sticky top-0 z-[var(--xb-z-header)] bg-[var(--xb-bg-app)]' : ''
          ]"
        >
          <div class="min-w-0 flex-1">
            <h1 v-if="title" class="text-xl font-semibold text-[var(--xb-text-primary)] truncate">{{ title }}</h1>
            <p v-if="description" class="text-sm text-[var(--xb-text-tertiary)] mt-1">{{ description }}</p>
          </div>
          <div v-if="$slots.actions" class="shrink-0 flex items-center gap-2">
            <slot name="actions"></slot>
          </div>
        </div>

        <!-- 标签页插槽 -->
        <div v-if="$slots.tabs" :class="contentPadding + ' py-0'">
          <slot name="tabs"></slot>
        </div>

        <!-- 内容区 -->
        <div :class="['flex-1', contentPadding, contentClass]">
          <FluentLoading v-if="loading" size="large" />
          <FluentError
            v-else-if="error"
            :description="error"
            show-retry
            @retry="handleRetry"
          />
          <FluentEmpty v-else-if="empty" :title="emptyText" />
          <slot v-else></slot>
        </div>

        <!-- 页脚插槽 -->
        <div v-if="$slots.footer" :class="contentPadding + ' pt-0'">
          <slot name="footer"></slot>
        </div>
      </div>
    </div>
  `
}
