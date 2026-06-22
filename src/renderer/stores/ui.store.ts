/**
 * @file UI Store，管理全局 UI 状态：Command Palette、Context Menu、全局 loading。
 *
 * 不包含菜单与布局状态（分别由 menu.store / layout.store 管理）。
 */

import { defineState, computedRef, registerStore } from './base'
import type { StoreBase } from './base'

/**
 * Context Menu 状态。
 */
export interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  items: ContextMenuItem[]
}

/**
 * Context Menu 项。
 */
export interface ContextMenuItem {
  id: string
  title: string
  icon?: string
  shortcut?: string
  disabled?: boolean
  divider?: boolean
  danger?: boolean
  action?: () => void
  children?: ContextMenuItem[]
}

/**
 * UI Store 状态。
 */
interface UiState {
  /** Command Palette 是否打开 */
  commandPaletteOpen: boolean
  /** Context Menu 状态 */
  contextMenu: ContextMenuState
  /** 全局 loading（覆盖整页） */
  globalLoading: boolean
  /** 全局 loading 文本 */
  globalLoadingText: string
}

/**
 * UI Store 实例类型。
 */
export interface UiStore extends StoreBase {
  state: UiState
  /** 打开 Command Palette */
  openCommandPalette: () => void
  /** 关闭 Command Palette */
  closeCommandPalette: () => void
  /** 切换 Command Palette */
  toggleCommandPalette: () => void
  /** 显示 Context Menu */
  showContextMenu: (x: number, y: number, items: ContextMenuItem[]) => void
  /** 隐藏 Context Menu */
  hideContextMenu: () => void
  /** 设置全局 loading */
  setGlobalLoading: (loading: boolean, text?: string) => void
  $reset: () => void
}

/** UI Store 单例 */
let uiStoreInstance: UiStore | null = null

/**
 * 创建 UI Store。
 */
export function createUiStore(): UiStore {
  if (uiStoreInstance) return uiStoreInstance

  const state = defineState<UiState>({
    commandPaletteOpen: false,
    contextMenu: {
      visible: false,
      x: 0,
      y: 0,
      items: []
    },
    globalLoading: false,
    globalLoadingText: '加载中...'
  })

  function openCommandPalette(): void {
    state.commandPaletteOpen = true
  }

  function closeCommandPalette(): void {
    state.commandPaletteOpen = false
  }

  function toggleCommandPalette(): void {
    state.commandPaletteOpen = !state.commandPaletteOpen
  }

  function showContextMenu(x: number, y: number, items: ContextMenuItem[]): void {
    state.contextMenu = { visible: true, x, y, items }
  }

  function hideContextMenu(): void {
    state.contextMenu.visible = false
  }

  function setGlobalLoading(loading: boolean, text?: string): void {
    state.globalLoading = loading
    if (text !== undefined) {
      state.globalLoadingText = text
    }
  }

  const store: UiStore = {
    $id: 'ui',
    state,
    openCommandPalette,
    closeCommandPalette,
    toggleCommandPalette,
    showContextMenu,
    hideContextMenu,
    setGlobalLoading,
    $reset: () => {
      state.commandPaletteOpen = false
      state.contextMenu = { visible: false, x: 0, y: 0, items: [] }
      state.globalLoading = false
    }
  }

  registerStore(store)
  uiStoreInstance = store
  return store
}

/**
 * 获取 UI Store 单例。
 */
export function useUiStore(): UiStore {
  if (!uiStoreInstance) {
    return createUiStore()
  }
  return uiStoreInstance
}

// 保留 computedRef 引用以避免未使用警告
void computedRef
