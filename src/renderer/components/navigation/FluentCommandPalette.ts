/**
 * @file Fluent 风格命令面板组件。
 *
 * Ctrl/Cmd+K 打开，搜索菜单项与命令，支持键盘上下选择与回车执行。
 * 从 command.store 读取命令列表，从 ui.store 读取打开状态。
 */

import type { ComponentOptions } from '../../vue-global'
import { useCommandPalette } from '../../composables/useCommandPalette'
import { FluentIcon } from '../base/FluentIcon'

export const FluentCommandPalette: ComponentOptions = {
  name: 'FluentCommandPalette',
  components: { FluentIcon },
  setup() {
    const palette = useCommandPalette()

    const isOpen = palette.isOpen
    const keyword = palette.keyword
    const filteredCommands = palette.filteredCommands
    const recentCommands = palette.recentCommands
    const selectedIndex = palette.selectedIndex

    function handleEnter(): void {
      void palette.executeSelected()
    }

    function handleCommandClick(commandId: string): void {
      const commands = filteredCommands.value as unknown as Array<{
        id: string
        title: string
        run: () => void | Promise<void>
      }>
      const cmd = commands.find((c) => c.id === commandId)
      if (cmd) {
        void palette.execute(cmd as never)
      }
    }

    return {
      isOpen,
      keyword,
      filteredCommands,
      recentCommands,
      selectedIndex,
      setKeyword: palette.setKeyword,
      moveSelection: palette.moveSelection,
      close: palette.close,
      handleEnter,
      handleCommandClick
    }
  },
  template: `
    <teleport to="body">
      <transition name="xb-modal">
        <div
          v-if="isOpen"
          class="fixed inset-0 z-[var(--xb-z-command-palette)] flex items-start justify-center pt-[15vh] p-4"
          @click.self="close"
        >
          <div class="absolute inset-0 bg-black/40 backdrop-blur-[1px]"></div>
          <div
            class="xb-modal-box relative w-full max-w-xl bg-[var(--xb-bg-surface)] rounded-[var(--xb-radius-xl)] shadow-[var(--xb-shadow-dialog)] overflow-hidden flex flex-col max-h-[60vh]"
          >
            <!-- 搜索框 -->
            <div class="flex items-center gap-3 px-4 py-3 border-b border-[var(--xb-border-subtle)]">
              <FluentIcon name="search" :size="18" class="text-[var(--xb-text-tertiary)]" />
              <input
                type="text"
                :value="keyword"
                placeholder="搜索菜单或命令..."
                class="flex-1 bg-transparent border-none outline-none text-sm text-[var(--xb-text-primary)] placeholder:text-[var(--xb-text-tertiary)]"
                @input="setKeyword(($event.target as HTMLInputElement).value)"
                @keydown.down.prevent="moveSelection(1)"
                @keydown.up.prevent="moveSelection(-1)"
                @keydown.enter.prevent="handleEnter"
                @keydown.esc.prevent="close"
                autofocus
              />
              <kbd class="px-1.5 py-0.5 text-[10px] text-[var(--xb-text-tertiary)] bg-[var(--xb-bg-hover)] rounded border border-[var(--xb-border)]">ESC</kbd>
            </div>

            <!-- 结果列表 -->
            <div class="flex-1 overflow-auto py-2">
              <div v-if="filteredCommands.length === 0" class="px-4 py-8 text-center text-sm text-[var(--xb-text-tertiary)]">
                未找到匹配的命令
              </div>
              <template v-else>
                <!-- 最近使用分组 -->
                <div v-if="!keyword && recentCommands.length > 0" class="px-2 mb-2">
                  <div class="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--xb-text-tertiary)]">
                    最近使用
                  </div>
                  <button
                    v-for="cmd in recentCommands"
                    :key="'recent-' + cmd.id"
                    type="button"
                    class="w-full flex items-center gap-3 px-3 py-2 rounded-[var(--xb-radius-md)] text-sm text-left transition-colors"
                    :class="selectedIndex === filteredCommands.findIndex(c => c.id === cmd.id) ? 'bg-[var(--xb-bg-active)] text-[var(--xb-brand-hover)]' : 'text-[var(--xb-text-primary)] hover:bg-[var(--xb-bg-hover)]'"
                    @click="handleCommandClick(cmd.id)"
                    @mouseenter="selectedIndex = filteredCommands.findIndex(c => c.id === cmd.id)"
                  >
                    <FluentIcon v-if="cmd.icon" :name="cmd.icon" :size="16" />
                    <div class="flex-1 min-w-0">
                      <div class="xb-truncate">{{ cmd.title }}</div>
                      <div v-if="cmd.description" class="text-xs text-[var(--xb-text-tertiary)] xb-truncate">{{ cmd.description }}</div>
                    </div>
                    <span v-if="cmd.shortcut" class="text-xs text-[var(--xb-text-tertiary)]">{{ cmd.shortcut }}</span>
                  </button>
                </div>

                <!-- 全部结果 -->
                <div class="px-2">
                  <div v-if="!keyword && recentCommands.length > 0" class="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--xb-text-tertiary)]">
                    全部命令
                  </div>
                  <button
                    v-for="(cmd, index) in filteredCommands"
                    :key="cmd.id"
                    type="button"
                    class="w-full flex items-center gap-3 px-3 py-2 rounded-[var(--xb-radius-md)] text-sm text-left transition-colors"
                    :class="index === selectedIndex ? 'bg-[var(--xb-bg-active)] text-[var(--xb-brand-hover)]' : 'text-[var(--xb-text-primary)] hover:bg-[var(--xb-bg-hover)]'"
                    @click="handleCommandClick(cmd.id)"
                    @mouseenter="selectedIndex = index"
                  >
                    <FluentIcon v-if="cmd.icon" :name="cmd.icon" :size="16" />
                    <div class="flex-1 min-w-0">
                      <div class="xb-truncate">{{ cmd.title }}</div>
                      <div v-if="cmd.description" class="text-xs text-[var(--xb-text-tertiary)] xb-truncate">{{ cmd.description }}</div>
                    </div>
                    <span v-if="cmd.shortcut" class="text-xs text-[var(--xb-text-tertiary)]">{{ cmd.shortcut }}</span>
                  </button>
                </div>
              </template>
            </div>

            <!-- 底部提示 -->
            <div class="flex items-center justify-between px-4 py-2 border-t border-[var(--xb-border-subtle)] text-[11px] text-[var(--xb-text-tertiary)]">
              <div class="flex items-center gap-3">
                <span class="flex items-center gap-1">
                  <kbd class="px-1 py-0.5 bg-[var(--xb-bg-hover)] rounded border border-[var(--xb-border)]">↑</kbd>
                  <kbd class="px-1 py-0.5 bg-[var(--xb-bg-hover)] rounded border border-[var(--xb-border)]">↓</kbd>
                  导航
                </span>
                <span class="flex items-center gap-1">
                  <kbd class="px-1 py-0.5 bg-[var(--xb-bg-hover)] rounded border border-[var(--xb-border)]">↵</kbd>
                  执行
                </span>
              </div>
              <span>Fluent Command Palette</span>
            </div>
          </div>
        </div>
      </transition>
    </teleport>
  `
}
