/**
 * @file 主题切换组件（Fluent 风格），支持主题选择与深浅色快捷切换。
 */

import type { ComponentOptions } from '../../vue-global'
import { useThemeStore } from '../../stores/theme.store'
import type { ThemeName } from '../../constants'
import { FluentDropdown } from '../base/FluentDropdown'
import type { FluentDropdownItem } from '../base/FluentDropdown'
import { FluentIconButton } from '../base/FluentIconButton'

export const AppThemeToggle: ComponentOptions = {
  name: 'AppThemeToggle',
  components: { FluentDropdown, FluentIconButton },
  setup() {
    const themeStore = useThemeStore()

    const currentTheme = themeStore.currentTheme as { value: ThemeName }
    const isDark = themeStore.isDark as { value: boolean }
    const availableThemes = themeStore.availableThemes

    /** 下拉菜单项 */
    const menuItems = Vue.computed<FluentDropdownItem[]>(() =>
      availableThemes.map((theme: { value: ThemeName; label: string }) => ({
        id: theme.value,
        title: theme.label,
        icon: theme.value === currentTheme.value ? 'check' : ''
      }))
    )

    function setTheme(value: string): void {
      themeStore.setTheme(value as ThemeName)
    }

    function handleSelect(item: FluentDropdownItem): void {
      setTheme(item.id)
    }

    function toggleDark(): void {
      themeStore.toggleDark()
    }

    return {
      currentTheme,
      isDark,
      menuItems,
      handleSelect,
      toggleDark
    }
  },
  template: `
    <FluentDropdown :items="menuItems" placement="bottom-end" @select="handleSelect">
      <FluentIconButton
        :icon="isDark ? 'moon' : 'sun'"
        size="medium"
        :tooltip="'切换主题'"
      />
    </FluentDropdown>
  `
}
