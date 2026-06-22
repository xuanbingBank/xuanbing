/**
 * @file 状态徽标业务组件。
 *
 * 用于统一展示任务/工单/流程等业务状态：
 * - 预设状态映射（pending/running/success/failed/warning/disabled/archived）
 * - 自定义状态
 * - 圆点 + 文本
 * - 大小、可点击
 */

import type { ComponentOptions } from '../../vue-global'
import { cx } from '../../utils/fluent-class'
import { FluentBadge } from '../base/FluentBadge'
import type { FluentBadgeVariant } from '../base/FluentBadge'

/** 预设状态类型 */
export type StatusType =
  | 'pending'
  | 'running'
  | 'success'
  | 'failed'
  | 'warning'
  | 'disabled'
  | 'archived'
  | 'info'

/** 状态映射项 */
export interface StatusMapItem {
  /** 显示文本 */
  label: string
  /** 徽标变体 */
  variant: FluentBadgeVariant
  /** 圆点图标 */
  icon?: string
}

/** 默认状态映射 */
export const DEFAULT_STATUS_MAP: Record<StatusType, StatusMapItem> = {
  pending: { label: '待处理', variant: 'warning', icon: 'clock' },
  running: { label: '进行中', variant: 'info', icon: 'refresh' },
  success: { label: '已完成', variant: 'success', icon: 'check' },
  failed: { label: '已失败', variant: 'error', icon: 'close' },
  warning: { label: '警告', variant: 'warning', icon: 'warning' },
  disabled: { label: '已禁用', variant: 'default', icon: 'close' },
  archived: { label: '已归档', variant: 'default', icon: 'folder' },
  info: { label: '信息', variant: 'info', icon: 'info' }
}

/** 组件 Props */
interface StatusBadgeProps {
  /** 状态类型 */
  status: StatusType | string
  /** 自定义状态映射 */
  statusMap: Record<string, StatusMapItem>
  /** 是否显示圆点 */
  dot: boolean
  /** 大小 */
  size: 'small' | 'medium'
  /** 自定义文本（覆盖映射中的 label） */
  text: string
  /** 可点击 */
  clickable: boolean
}

/** setup 上下文 */
interface SetupCtx {
  emit: (event: string, ...args: unknown[]) => void
}

export const StatusBadge: ComponentOptions = {
  name: 'StatusBadge',
  components: { FluentBadge },
  props: {
    status: { type: String, default: 'pending' },
    statusMap: { type: Object, default: () => ({}) },
    dot: { type: Boolean, default: true },
    size: { type: String as () => 'small' | 'medium', default: 'small' },
    text: { type: String, default: '' },
    clickable: { type: Boolean, default: false }
  },
  emits: ['click'],
  setup(props, ctx) {
    const { emit } = ctx as unknown as SetupCtx
    const p = props as unknown as StatusBadgeProps

    /** 合并后的状态映射 */
    const mergedMap = Vue.computed<Record<string, StatusMapItem>>(() => ({
      ...DEFAULT_STATUS_MAP,
      ...(p.statusMap || {})
    }))

    /** 当前状态项 */
    const statusItem = Vue.computed<StatusMapItem>(() => {
      const map = mergedMap.value
      return map[p.status] ?? { label: p.status, variant: 'default' as FluentBadgeVariant }
    })

    /** 显示文本 */
    const displayText = Vue.computed(() => p.text || statusItem.value.label || p.status)

    function handleClick(event: MouseEvent): void {
      if (!p.clickable) return
      emit('click', event)
    }

    return { statusItem, displayText, handleClick, cx }
  },
  template: `
    <FluentBadge
      :variant="statusItem.variant"
      :dot="dot"
      :size="size"
      :class="clickable ? 'cursor-pointer' : ''"
      @click="handleClick"
    >
      {{ displayText }}
    </FluentBadge>
  `
}
