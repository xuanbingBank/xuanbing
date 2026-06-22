/**
 * @file Electron 窗口控制按钮组件（Fluent 风格）。
 *
 * 最小化/最大化/关闭，仅 Electron 环境显示。
 * 使用 Fluent 风格图标与 hover 效果。
 */

import type { ComponentOptions } from '../../vue-global'
import { useWindowStore } from '../../stores/window.store'
import { useWindowControls } from '../../composables/useWindowControls'
import { FluentIcon } from '../base/FluentIcon'

export const AppWindowControls: ComponentOptions = {
  name: 'AppWindowControls',
  components: { FluentIcon },
  setup() {
    const windowStore = useWindowStore()
    const controls = useWindowControls()

    const isElectron = windowStore.isElectron
    const isMaximized = Vue.computed(() => windowStore.state.isMaximized)

    function minimize(): void {
      controls.minimize()
    }

    function toggleMaximize(): void {
      if (isMaximized.value) {
        controls.restore()
      } else {
        controls.maximize()
      }
    }

    function close(): void {
      controls.close()
    }

    return { isElectron, isMaximized, minimize, toggleMaximize, close }
  },
  template: `
    <div v-if="isElectron" class="flex items-center gap-0.5 ml-1">
      <button
        type="button"
        class="inline-flex items-center justify-center w-9 h-9 rounded-[var(--xb-radius-sm)] text-[var(--xb-text-secondary)] hover:bg-[var(--xb-bg-hover)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--xb-brand)]"
        aria-label="最小化"
        @click="minimize"
      >
        <FluentIcon name="minus" :size="16" />
      </button>
      <button
        type="button"
        class="inline-flex items-center justify-center w-9 h-9 rounded-[var(--xb-radius-sm)] text-[var(--xb-text-secondary)] hover:bg-[var(--xb-bg-hover)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--xb-brand)]"
        :aria-label="isMaximized ? '还原' : '最大化'"
        @click="toggleMaximize"
      >
        <svg :width="14" :height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect v-if="!isMaximized" x="4" y="4" width="16" height="16" rx="1"/>
          <path v-else d="M8 3v3a2 2 0 002 2h8a2 2 0 002-2V3M3 8h3a2 2 0 012 2v8a2 2 0 01-2 2H3"/>
        </svg>
      </button>
      <button
        type="button"
        class="inline-flex items-center justify-center w-9 h-9 rounded-[var(--xb-radius-sm)] text-[var(--xb-text-secondary)] hover:bg-[var(--xb-error)] hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--xb-error)]"
        aria-label="关闭"
        @click="close"
      >
        <FluentIcon name="close" :size="16" />
      </button>
    </div>
  `
}
