/**
 * @file Fluent 风格表格工具栏组件。
 *
 * 用于表格上方操作区：
 * - 左侧：标题/描述、批量操作按钮
 * - 中间：搜索框
 * - 右侧：过滤、列设置、刷新、密度切换等
 */

import type { ComponentOptions } from '../../vue-global'
import { cx } from '../../utils/fluent-class'
import { FluentInput } from '../base/FluentInput'
import { FluentIconButton } from '../base/FluentIconButton'
import { FluentButton } from '../base/FluentButton'
import { FluentDropdown } from '../base/FluentDropdown'
import type { FluentDropdownItem } from '../base/FluentDropdown'

/** 密度选项 */
export type FluentTableDensity = 'compact' | 'comfortable' | 'spacious'

/** 组件 Props */
interface FluentTableToolbarProps {
  /** 标题 */
  title: string
  /** 描述 */
  description: string
  /** 搜索关键字 */
  searchValue: string
  /** 搜索占位符 */
  searchPlaceholder: string
  /** 是否显示搜索 */
  searchable: boolean
  /** 是否显示刷新 */
  showRefresh: boolean
  /** 是否显示密度切换 */
  showDensity: boolean
  /** 当前密度 */
  density: FluentTableDensity
  /** 是否显示列设置 */
  showColumnSettings: boolean
  /** 列设置项 */
  columns: FluentDropdownItem[]
  /** 选中行数 */
  selectedCount: number
  /** 加载中 */
  loading: boolean
}

/** setup 上下文 */
interface SetupCtx {
  emit: (event: string, ...args: unknown[]) => void
  slots: Record<string, unknown>
}

export const FluentTableToolbar: ComponentOptions = {
  name: 'FluentTableToolbar',
  components: { FluentInput, FluentIconButton, FluentButton, FluentDropdown },
  props: {
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    searchValue: { type: String, default: '' },
    searchPlaceholder: { type: String, default: '搜索...' },
    searchable: { type: Boolean, default: true },
    showRefresh: { type: Boolean, default: true },
    showDensity: { type: Boolean, default: true },
    density: { type: String as () => FluentTableDensity, default: 'comfortable' },
    showColumnSettings: { type: Boolean, default: false },
    columns: { type: Array, default: () => [] },
    selectedCount: { type: Number, default: 0 },
    loading: { type: Boolean, default: false }
  },
  emits: [
    'update:searchValue',
    'search',
    'refresh',
    'update:density',
    'density-change',
    'column-toggle'
  ],
  setup(props, ctx) {
    const { emit } = ctx as unknown as SetupCtx
    const p = props as unknown as FluentTableToolbarProps

    /** 密度下拉项 */
    const densityItems = Vue.computed<FluentDropdownItem[]>(() => [
      { id: 'compact', title: '紧凑', icon: p.density === 'compact' ? 'check' : '' },
      { id: 'comfortable', title: '舒适', icon: p.density === 'comfortable' ? 'check' : '' },
      { id: 'spacious', title: '宽松', icon: p.density === 'spacious' ? 'check' : '' }
    ])

    function handleSearch(value: string): void {
      emit('update:searchValue', value)
      emit('search', value)
    }

    function handleRefresh(): void {
      emit('refresh')
    }

    function handleDensitySelect(item: FluentDropdownItem): void {
      const density = item.id as FluentTableDensity
      emit('update:density', density)
      emit('density-change', density)
    }

    function handleColumnToggle(item: FluentDropdownItem): void {
      emit('column-toggle', item.id)
    }

    return {
      densityItems,
      handleSearch,
      handleRefresh,
      handleDensitySelect,
      handleColumnToggle,
      cx
    }
  },
  template: `
    <div class="flex items-center gap-3 flex-wrap p-3 bg-[var(--xb-bg-surface)] border-b border-[var(--xb-border-subtle)]">
      <!-- 左侧：标题与描述 -->
      <div v-if="title || description" class="flex flex-col min-w-0">
        <div v-if="title" class="text-sm font-semibold text-[var(--xb-text-primary)] truncate">{{ title }}</div>
        <div v-if="description" class="text-xs text-[var(--xb-text-tertiary)] truncate">{{ description }}</div>
      </div>

      <!-- 批量操作插槽 -->
      <div v-if="selectedCount > 0 || $slots.batch" class="flex items-center gap-2">
        <slot name="batch">
          <span v-if="selectedCount > 0" class="text-xs text-[var(--xb-text-secondary)]">
            已选 {{ selectedCount }} 项
          </span>
        </slot>
      </div>

      <!-- 弹性占位 -->
      <div class="flex-1"></div>

      <!-- 搜索框 -->
      <div v-if="searchable" class="w-64">
        <FluentInput
          :model-value="searchValue"
          :placeholder="searchPlaceholder"
          size="small"
          clearable
          @update:model-value="handleSearch"
        >
          <template #prefix>
            <span class="text-[var(--xb-text-tertiary)]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
            </span>
          </template>
        </FluentInput>
      </div>

      <!-- 右侧操作 -->
      <div class="flex items-center gap-1">
        <!-- 自定义操作插槽 -->
        <slot name="actions"></slot>

        <!-- 列设置 -->
        <FluentDropdown
          v-if="showColumnSettings"
          :items="columns"
          placement="bottom-end"
          @select="handleColumnToggle"
        >
          <FluentIconButton icon="columns" tooltip="列设置" size="small" />
        </FluentDropdown>

        <!-- 密度切换 -->
        <FluentDropdown
          v-if="showDensity"
          :items="densityItems"
          placement="bottom-end"
          @select="handleDensitySelect"
        >
          <FluentIconButton icon="list" tooltip="密度" size="small" />
        </FluentDropdown>

        <!-- 刷新 -->
        <FluentIconButton
          v-if="showRefresh"
          icon="refresh"
          tooltip="刷新"
          size="small"
          :loading="loading"
          @click="handleRefresh"
        />
      </div>
    </div>
  `
}
