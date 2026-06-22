/**
 * @file Fluent 风格右键菜单组件。
 *
 * 全局单例，从 ui.store 读取 ContextMenuState。
 * 支持多级、icon、shortcut、disabled、divider、danger、click outside 关闭、ESC 关闭。
 */

import type { ComponentOptions } from '../../vue-global'
import { useUiStore } from '../../stores/ui.store'
import type { ContextMenuItem } from '../../stores/ui.store'
import { FluentIcon } from './FluentIcon'

export const FluentContextMenu: ComponentOptions = {
  name: 'FluentContextMenu',
  components: { FluentIcon },
  setup() {
    const uiStore = useUiStore()

    const visible = Vue.computed(() => uiStore.state.contextMenu.visible)
    const x = Vue.computed(() => uiStore.state.contextMenu.x)
    const y = Vue.computed(() => uiStore.state.contextMenu.y)
    const items = Vue.computed(() => uiStore.state.contextMenu.items)

    function handleSelect(item: ContextMenuItem): void {
      if (item.disabled || item.divider) return
      if (item.children && item.children.length > 0) return
      if (item.action) {
        item.action()
      }
      uiStore.hideContextMenu()
    }

    // 边界检测：避免菜单超出窗口
    const adjustedX = Vue.computed(() => {
      const menuWidth = 200
      return Math.min(x.value, window.innerWidth - menuWidth - 8)
    })
    const adjustedY = Vue.computed(() => {
      const menuHeight = items.value.length * 32 + 16
      return Math.min(y.value, window.innerHeight - menuHeight - 8)
    })

    return { visible, adjustedX, adjustedY, items, handleSelect }
  },
  template: `
    <teleport to="body">
      <transition name="xb-fade-slide">
        <div
          v-if="visible"
          class="fixed z-[var(--xb-z-popover)] min-w-[180px] py-1 bg-[var(--xb-bg-surface)] rounded-[var(--xb-radius-lg)] shadow-[var(--xb-shadow-popover)] border border-[var(--xb-border-subtle)]"
          :style="{ left: adjustedX + 'px', top: adjustedY + 'px' }"
          @click.stop
          @contextmenu.prevent
        >
          <template v-for="item in items" :key="item.id">
            <div v-if="item.divider" class="my-1 border-t border-[var(--xb-border-subtle)]"></div>
            <button
              v-else
              type="button"
              class="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-left transition-colors"
              :class="[
                item.disabled
                  ? 'text-[var(--xb-text-disabled)] cursor-not-allowed'
                  : item.danger
                    ? 'text-[var(--xb-error)] hover:bg-[var(--xb-error-subtle)]'
                    : 'text-[var(--xb-text-primary)] hover:bg-[var(--xb-bg-hover)]'
              ]"
              :disabled="item.disabled"
              @click="handleSelect(item)"
            >
              <FluentIcon v-if="item.icon" :name="item.icon" :size="16" />
              <span class="flex-1">{{ item.title }}</span>
              <span v-if="item.shortcut" class="text-xs text-[var(--xb-text-tertiary)]">{{ item.shortcut }}</span>
            </button>
          </template>
        </div>
      </transition>
    </teleport>
  `
}
