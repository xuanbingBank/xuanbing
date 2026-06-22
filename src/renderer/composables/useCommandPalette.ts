/**
 * @file Command Palette 组合式函数，封装打开/关闭、搜索、键盘导航。
 */

import { computedRef } from '../stores/base'
import { useUiStore } from '../stores/ui.store'
import { useCommandStore } from '../stores/command.store'
import type { Command } from '../stores/command.store'

/**
 * useCommandPalette 返回值。
 */
export interface UseCommandPaletteReturn {
  /** 是否打开 */
  isOpen: ReturnType<typeof Vue.computed>
  /** 搜索关键词 */
  keyword: ReturnType<typeof Vue.computed>
  /** 过滤后的命令 */
  filteredCommands: ReturnType<typeof Vue.computed>
  /** 最近使用的命令 */
  recentCommands: ReturnType<typeof Vue.computed>
  /** 当前选中索引 */
  selectedIndex: ReturnType<typeof Vue.computed>
  /** 打开 */
  open: () => void
  /** 关闭 */
  close: () => void
  /** 切换 */
  toggle: () => void
  /** 设置关键词 */
  setKeyword: (keyword: string) => void
  /** 移动选中 */
  moveSelection: (delta: number) => void
  /** 执行当前选中命令 */
  executeSelected: () => Promise<void>
  /** 执行指定命令 */
  execute: (command: Command) => Promise<void>
  /** 注册全局快捷键（Ctrl/Cmd+K） */
  registerShortcut: () => () => void
}

/**
 * Command Palette 组合式函数。
 */
export function useCommandPalette(): UseCommandPaletteReturn {
  const uiStore = useUiStore()
  const commandStore = useCommandStore()

  const isOpen = computedRef<boolean>(() => uiStore.state.commandPaletteOpen)
  const keyword = computedRef<string>(() => commandStore.state.keyword)
  const filteredCommands = commandStore.filteredCommands
  const recentCommands = commandStore.recentCommands
  const selectedIndex = computedRef<number>(() => commandStore.state.selectedIndex)

  function open(): void {
    uiStore.openCommandPalette()
    commandStore.setKeyword('')
  }

  function close(): void {
    uiStore.closeCommandPalette()
    commandStore.setKeyword('')
  }

  function toggle(): void {
    if (isOpen.value) {
      close()
    } else {
      open()
    }
  }

  function setKeyword(kw: string): void {
    commandStore.setKeyword(kw)
  }

  function moveSelection(delta: number): void {
    commandStore.moveSelection(delta)
  }

  async function executeSelected(): Promise<void> {
    const commands = filteredCommands.value as unknown as Command[]
    const cmd = commands[selectedIndex.value as unknown as number]
    if (cmd) {
      await commandStore.executeCommand(cmd)
      close()
    }
  }

  async function execute(command: Command): Promise<void> {
    await commandStore.executeCommand(command)
    close()
  }

  /**
   * 注册全局快捷键 Ctrl/Cmd+K。
   *
   * @returns 取消注册函数。
   */
  function registerShortcut(): () => void {
    function handler(e: KeyboardEvent): void {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        toggle()
      }
      if (!isOpen.value) return
      if (e.key === 'Escape') {
        close()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        moveSelection(1)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        moveSelection(-1)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        void executeSelected()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }

  return {
    isOpen,
    keyword,
    filteredCommands,
    recentCommands,
    selectedIndex,
    open,
    close,
    toggle,
    setKeyword,
    moveSelection,
    executeSelected,
    execute,
    registerShortcut
  }
}
