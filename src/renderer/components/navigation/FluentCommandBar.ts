/**
 * @file Fluent 风格命令栏组件。
 *
 * 用于页面顶部操作栏：主操作、次操作、更多操作、搜索、权限控制。
 * - primary: 主操作按钮（primary 变体）
 * - secondary: 次操作按钮列表（secondary/subtle 变体）
 * - more: 折叠到"更多"下拉菜单中的项
 * - 支持 disabled、loading、permission
 */

import type { ComponentOptions } from '../../vue-global'
import { cx } from '../../utils/fluent-class'
import { FluentButton } from '../base/FluentButton'
import { FluentIconButton } from '../base/FluentIconButton'
import { FluentDropdown } from '../base/FluentDropdown'
import type { FluentDropdownItem } from '../base/FluentDropdown'

/** 命令栏操作项 */
export interface FluentCommandBarItem {
  /** 唯一 id */
  id: string
  /** 显示文本 */
  title: string
  /** 图标 key */
  icon?: string
  /** 快捷键文本 */
  shortcut?: string
  /** 是否禁用 */
  disabled?: boolean
  /** 是否加载中 */
  loading?: boolean
  /** 是否分隔符 */
  divider?: boolean
  /** 是否危险操作 */
  danger?: boolean
  /** 权限标识，需要校验时使用 */
  permission?: string
  /** 所需角色 */
  roles?: string[]
  /** 仅开发模式可见 */
  devOnly?: boolean
  /** 隐藏 */
  hidden?: boolean
}

/** 组件 Props */
interface FluentCommandBarProps {
  /** 主操作（最多一个） */
  primary?: FluentCommandBarItem | null
  /** 次操作列表 */
  secondary?: FluentCommandBarItem[]
  /** 折叠到"更多"中的项 */
  more?: FluentCommandItem[]
  /** 是否显示更多按钮（即使 more 为空也显示） */
  showMore?: boolean
  /** 更多按钮文本 */
  moreText?: string
  /** 是否紧凑模式 */
  compact?: boolean
  /** 权限校验函数，返回 false 则隐藏该项 */
  hasPermission?: (item: FluentCommandBarItem) => boolean
}

/** 别名，便于内部复用 */
type FluentCommandItem = FluentCommandBarItem

/** setup 上下文 */
interface SetupCtx {
  emit: (event: string, ...args: unknown[]) => void
  slots: Record<string, unknown>
}

export const FluentCommandBar: ComponentOptions = {
  name: 'FluentCommandBar',
  components: { FluentButton, FluentIconButton, FluentDropdown },
  props: {
    primary: { type: Object, default: null },
    secondary: { type: Array, default: () => [] },
    more: { type: Array, default: () => [] },
    showMore: { type: Boolean, default: true },
    moreText: { type: String, default: '更多' },
    compact: { type: Boolean, default: false },
    hasPermission: { type: Function, default: null }
  },
  emits: ['action', 'more'],
  setup(props, ctx) {
    const { emit } = ctx as unknown as SetupCtx
    const p = props as unknown as FluentCommandBarProps

    /** 权限过滤后的次操作 */
    const visibleSecondary = Vue.computed<FluentCommandBarItem[]>(() => {
      const list = (p.secondary ?? []) as FluentCommandBarItem[]
      return list.filter((item) => {
        if (item.hidden) return false
        if (p.hasPermission && !p.hasPermission(item)) return false
        return true
      })
    })

    /** 权限过滤后的主操作 */
    const visiblePrimary = Vue.computed<FluentCommandBarItem | null>(() => {
      const item = p.primary as FluentCommandBarItem | null
      if (!item || item.hidden) return null
      if (p.hasPermission && !p.hasPermission(item)) return null
      return item
    })

    /** more 列表转换为下拉项 */
    const moreDropdownItems = Vue.computed<FluentDropdownItem[]>(() => {
      const list = (p.more ?? []) as FluentCommandBarItem[]
      const result: FluentDropdownItem[] = []
      for (const item of list) {
        if (item.hidden) continue
        if (p.hasPermission && !p.hasPermission(item)) continue
        result.push({
          id: item.id,
          title: item.title,
          icon: item.icon,
          shortcut: item.shortcut,
          disabled: item.disabled,
          divider: item.divider,
          danger: item.danger
        })
      }
      return result
    })

    /** 是否显示更多按钮 */
    const showMoreButton = Vue.computed(() => {
      if (!p.showMore) return false
      return moreDropdownItems.value.length > 0
    })

    function handlePrimary(): void {
      const item = visiblePrimary.value
      if (!item || item.disabled || item.loading) return
      emit('action', item)
    }

    function handleSecondary(item: FluentCommandBarItem): void {
      if (item.disabled || item.loading) return
      emit('action', item)
    }

    function handleMoreSelect(item: FluentDropdownItem): void {
      const original = (p.more ?? []).find((m) => m.id === item.id)
      if (!original) return
      emit('more', original)
      emit('action', original)
    }

    return {
      visiblePrimary,
      visibleSecondary,
      moreDropdownItems,
      showMoreButton,
      handlePrimary,
      handleSecondary,
      handleMoreSelect,
      cx
    }
  },
  template: `
    <div class="flex items-center gap-2 flex-wrap">
      <!-- 左侧插槽：面包屑、标题等 -->
      <div v-if="$slots.leading" class="flex items-center gap-2 mr-2">
        <slot name="leading"></slot>
      </div>

      <!-- 主操作 -->
      <FluentButton
        v-if="visiblePrimary"
        variant="primary"
        :size="compact ? 'small' : 'medium'"
        :icon="visiblePrimary.icon || ''"
        :disabled="visiblePrimary.disabled"
        :loading="visiblePrimary.loading"
        @click="handlePrimary"
      >
        {{ visiblePrimary.title }}
      </FluentButton>

      <!-- 次操作 -->
      <template v-for="item in visibleSecondary" :key="item.id">
        <div v-if="item.divider" class="w-px h-5 bg-[var(--xb-border-subtle)] mx-1"></div>
        <FluentButton
          v-else
          variant="secondary"
          :size="compact ? 'small' : 'medium'"
          :icon="item.icon || ''"
          :disabled="item.disabled"
          :loading="item.loading"
          @click="handleSecondary(item)"
        >
          {{ item.title }}
        </FluentButton>
      </template>

      <!-- 弹性占位，把右侧推到末尾 -->
      <div class="flex-1"></div>

      <!-- 右侧插槽：搜索、过滤等 -->
      <div v-if="$slots.trailing" class="flex items-center gap-2">
        <slot name="trailing"></slot>
      </div>

      <!-- 更多操作下拉 -->
      <FluentDropdown
        v-if="showMoreButton"
        :items="moreDropdownItems"
        placement="bottom-end"
        @select="handleMoreSelect"
      >
        <FluentButton variant="subtle" :size="compact ? 'small' : 'medium'" icon="more">
          {{ moreText }}
        </FluentButton>
      </FluentDropdown>
    </div>
  `
}
