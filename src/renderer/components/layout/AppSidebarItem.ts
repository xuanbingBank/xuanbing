/**
 * @file 侧边栏菜单项组件（递归，支持多级）。
 *
 * 支持：
 * - 叶子节点：点击导航
 * - 父节点：展开/收起子菜单（手风琴由 store 控制）
 * - 折叠态：仅显示图标，hover 显示 tooltip
 * - 激活高亮、选中条
 * - badge、disabled
 * - 分组分隔符
 */

import type { ComponentOptions } from '../../vue-global'
import type { MenuItem } from '../../router/types'
import { useMenuStore } from '../../stores/menu.store'
import { FluentIcon } from '../base/FluentIcon'
import { FluentBadge } from '../base/FluentBadge'

/** 组件 Props */
interface AppSidebarItemProps {
  /** 菜单项 */
  item: MenuItem
  /** 层级 */
  level: number
  /** 是否折叠态（顶层） */
  collapsed: boolean
}

/** setup 上下文 */
interface SetupCtx {
  emit: (event: string, ...args: unknown[]) => void
}

export const AppSidebarItem: ComponentOptions = {
  name: 'AppSidebarItem',
  components: { FluentIcon, FluentBadge },
  props: {
    item: { type: Object, required: true },
    level: { type: Number, default: 0 },
    collapsed: { type: Boolean, default: false }
  },
  emits: ['navigate'],
  setup(props, ctx) {
    const { emit } = ctx as unknown as SetupCtx
    const p = props as unknown as AppSidebarItemProps
    const menuStore = useMenuStore()

    // 注入路由器
    const router = Vue.inject<{ navigate: (path: string) => void }>('router')
    const currentRoute = Vue.inject<{ value: { path: string } | null }>('currentRoute')

    const currentPath = Vue.computed(() => currentRoute?.value?.path ?? '')

    /** 是否有子菜单 */
    const hasChildren = Vue.computed(() => {
      const item = p.item as MenuItem
      return Boolean(item.children && item.children.length > 0)
    })

    /** 是否展开 */
    const expanded = Vue.computed(() => {
      const item = p.item as MenuItem
      if (!item.id) return false
      return menuStore.isExpanded(item.id)
    })

    /** 是否激活（当前路径命中） */
    const isActive = Vue.computed(() => {
      const item = p.item as MenuItem
      if (!item.path) return false
      const active = menuStore.activePath.value as string
      if (active) return active === item.path
      return currentPath.value === item.path
    })

    /** 是否选中（精确匹配当前路径） */
    const isSelected = Vue.computed(() => {
      const item = p.item as MenuItem
      return Boolean(item.path) && currentPath.value === item.path
    })

    /** 是否分组分隔符 */
    const isDivider = Vue.computed(() => (p.item as MenuItem).divider === true)

    /** 缩进 padding */
    const indentStyle = Vue.computed(() => ({
      paddingLeft: `${p.level * 12 + 12}px`
    }))

    /** 处理点击 */
    function handleClick(): void {
      const item = p.item as MenuItem
      if (item.disabled) return
      if (hasChildren.value && item.id) {
        menuStore.toggleExpand(item.id)
      } else if (item.path) {
        emit('navigate', item.path)
        if (router) router.navigate(item.path)
      }
    }

    /** 子项导航 */
    function handleChildNavigate(path: string): void {
      emit('navigate', path)
      if (router) router.navigate(path)
    }

    return {
      hasChildren,
      expanded,
      isActive,
      isSelected,
      isDivider,
      indentStyle,
      handleClick,
      handleChildNavigate
    }
  },
  template: `
    <div v-if="isDivider" class="my-2 border-t border-[var(--xb-border-subtle)]"></div>
    <template v-else>
      <!-- 菜单项按钮 -->
      <button
        type="button"
        :class="[
          'group relative w-full flex items-center gap-2.5 rounded-[var(--xb-radius-md)] text-sm transition-all duration-[var(--xb-motion-fast)] ease-[var(--xb-ease)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--xb-brand)]',
          level === 0 ? 'px-3 py-2' : 'py-1.5',
          collapsed && level === 0 ? 'justify-center px-0' : '',
          item.disabled
            ? 'text-[var(--xb-text-disabled)] cursor-not-allowed'
            : isActive
              ? 'bg-[var(--xb-brand-subtle)] text-[var(--xb-brand)] font-medium'
              : isSelected
                ? 'bg-[var(--xb-bg-hover)] text-[var(--xb-text-primary)] font-medium'
                : 'text-[var(--xb-text-secondary)] hover:bg-[var(--xb-bg-hover)] hover:text-[var(--xb-text-primary)]'
        ]"
        :style="level > 0 && !collapsed ? indentStyle : {}"
        :title="collapsed && level === 0 ? item.title : ''"
        :disabled="item.disabled"
        @click="handleClick"
      >
        <!-- 选中条 -->
        <span
          v-if="isActive"
          class="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[var(--xb-brand)]"
        ></span>

        <!-- 图标 -->
        <FluentIcon
          v-if="item.icon"
          :name="item.icon"
          :size="level === 0 ? 18 : 16"
          :class="['shrink-0', isActive ? 'text-[var(--xb-brand)]' : 'text-[var(--xb-text-tertiary)] group-hover:text-[var(--xb-text-secondary)]']"
        />

        <!-- 文本 + badge -->
        <template v-if="!collapsed || level > 0">
          <span class="flex-1 text-left truncate">{{ item.title }}</span>
          <FluentBadge
            v-if="item.badge"
            variant="brand"
            size="small"
          >{{ item.badge }}</FluentBadge>
          <span
            v-if="item.tag"
            class="text-[10px] px-1 py-0.5 rounded-[var(--xb-radius-sm)] bg-[var(--xb-bg-hover)] text-[var(--xb-text-tertiary)]"
          >{{ item.tag }}</span>
          <!-- 展开箭头 -->
          <FluentIcon
            v-if="hasChildren"
            name="chevronDown"
            :size="14"
            :class="[
              'shrink-0 transition-transform duration-[var(--xb-motion-fast)]',
              expanded ? 'rotate-180' : '',
              'text-[var(--xb-text-tertiary)]'
            ]"
          />
        </template>
      </button>

      <!-- 子菜单 -->
      <transition name="xb-menu-expand">
        <div v-if="hasChildren && expanded && (!collapsed || level > 0)" class="mt-0.5 flex flex-col gap-0.5">
          <AppSidebarItem
            v-for="child in item.children"
            :key="child.id || child.path"
            :item="child"
            :level="level + 1"
            :collapsed="false"
            @navigate="handleChildNavigate"
          />
        </div>
      </transition>
    </template>
  `
}
