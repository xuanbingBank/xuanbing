/**
 * @file 顶部搜索框组件，点击或 Ctrl/Cmd+K 打开命令面板。
 */

import type { ComponentOptions } from '../../vue-global'
import { useCommandPalette } from '../../composables/useCommandPalette'
import { FluentIcon } from '../base/FluentIcon'

/** 组件 Props */
interface AppSearchBoxProps {
  /** 占位符 */
  placeholder: string
  /** 宽度 */
  width: string
}

export const AppSearchBox: ComponentOptions = {
  name: 'AppSearchBox',
  components: { FluentIcon },
  props: {
    placeholder: { type: String, default: '搜索或运行命令...' },
    width: { type: String, default: '320px' }
  },
  setup(props) {
    const p = props as unknown as AppSearchBoxProps
    const { open } = useCommandPalette()

    function handleClick(): void {
      open()
    }

    return { p, handleClick }
  },
  template: `
    <button
      type="button"
      class="flex items-center gap-2 h-9 px-3 rounded-[var(--xb-radius-md)] border border-[var(--xb-border-subtle)] bg-[var(--xb-bg-subtle)] text-sm text-[var(--xb-text-tertiary)] hover:bg-[var(--xb-bg-hover)] hover:border-[var(--xb-border-strong)] hover:text-[var(--xb-text-secondary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--xb-brand)]"
      :style="{ width: width }"
      @click="handleClick"
    >
      <FluentIcon name="search" :size="16" />
      <span class="flex-1 text-left truncate">{{ placeholder }}</span>
      <kbd class="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded-[var(--xb-radius-sm)] bg-[var(--xb-bg-surface)] border border-[var(--xb-border-subtle)] text-[var(--xb-text-tertiary)]">
        <span>Ctrl</span>
        <span>K</span>
      </kbd>
    </button>
  `
}
