/**
 * @file 用户菜单组件（Fluent 风格下拉）。
 *
 * 显示用户头像，下拉展示用户信息与操作（个人中心、设置、登出）。
 */

import type { ComponentOptions } from '../../vue-global'
import { useAuthStore } from '../../stores/auth.store'
import { FluentDropdown } from '../base/FluentDropdown'
import type { FluentDropdownItem } from '../base/FluentDropdown'
import { FluentIcon } from '../base/FluentIcon'

/** 组件 Props */
interface AppUserMenuProps {
  /** 是否显示用户名 */
  showName: boolean
}

/** setup 上下文 */
interface SetupCtx {
  emit: (event: string, ...args: unknown[]) => void
}

export const AppUserMenu: ComponentOptions = {
  name: 'AppUserMenu',
  components: { FluentDropdown, FluentIcon },
  props: {
    showName: { type: Boolean, default: true }
  },
  emits: ['navigate', 'logout'],
  setup(props, ctx) {
    const { emit } = ctx as unknown as SetupCtx
    const p = props as unknown as AppUserMenuProps
    const authStore = useAuthStore()

    const isLoggedIn = authStore.isLoggedIn
    const user = Vue.computed(() => authStore.state.user)

    const avatarText = Vue.computed(() => {
      const name = user.value?.displayName || user.value?.username || 'U'
      return name.charAt(0).toUpperCase()
    })

    const displayName = Vue.computed(
      () => user.value?.displayName || user.value?.username || '用户'
    )

    /** 下拉菜单项 */
    const menuItems = Vue.computed<FluentDropdownItem[]>(() => [
      { id: 'profile', title: '个人中心', icon: 'profile' },
      { id: 'settings', title: '设置', icon: 'settings' },
      { id: 'divider', title: '', divider: true },
      { id: 'logout', title: '登出', icon: 'logout', danger: true }
    ])

    function handleSelect(item: FluentDropdownItem): void {
      if (item.id === 'logout') {
        emit('logout')
      } else if (item.id === 'profile') {
        emit('navigate', '/profile')
      } else if (item.id === 'settings') {
        emit('navigate', '/settings')
      }
    }

    return {
      isLoggedIn,
      user,
      avatarText,
      displayName,
      menuItems,
      handleSelect,
      p
    }
  },
  template: `
    <FluentDropdown
      v-if="isLoggedIn"
      :items="menuItems"
      placement="bottom-end"
      @select="handleSelect"
    >
      <button
        type="button"
        class="flex items-center gap-2 h-9 px-2 rounded-[var(--xb-radius-md)] hover:bg-[var(--xb-bg-hover)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--xb-brand)]"
      >
        <div class="w-7 h-7 rounded-full bg-[var(--xb-brand)] flex items-center justify-center text-white text-xs font-medium shrink-0">
          {{ avatarText }}
        </div>
        <span v-if="showName" class="text-sm text-[var(--xb-text-primary)] hidden md:inline">{{ displayName }}</span>
        <FluentIcon name="chevronDown" :size="14" class="text-[var(--xb-text-tertiary)] hidden md:inline" />
      </button>
    </FluentDropdown>
  `
}
