/**
 * @file Context Menu 组合式函数，封装右键菜单的显示、隐藏与点击外部关闭。
 */

import { computedRef } from '../stores/base'
import { useUiStore } from '../stores/ui.store'
import type { ContextMenuItem } from '../stores/ui.store'

/**
 * useContextMenu 返回值。
 */
export interface UseContextMenuReturn {
  /** 是否可见 */
  visible: ReturnType<typeof Vue.computed>
  /** x 坐标 */
  x: ReturnType<typeof Vue.computed>
  /** y 坐标 */
  y: ReturnType<typeof Vue.computed>
  /** 菜单项 */
  items: ReturnType<typeof Vue.computed>
  /** 显示菜单 */
  show: (event: MouseEvent, items: ContextMenuItem[]) => void
  /** 显示菜单（指定坐标） */
  showAt: (x: number, y: number, items: ContextMenuItem[]) => void
  /** 隐藏菜单 */
  hide: () => void
  /** 注册全局点击/ESC 关闭 */
  registerAutoHide: () => () => void
}

/**
 * Context Menu 组合式函数。
 */
export function useContextMenu(): UseContextMenuReturn {
  const uiStore = useUiStore()

  const visible = computedRef<boolean>(() => uiStore.state.contextMenu.visible)
  const x = computedRef<number>(() => uiStore.state.contextMenu.x)
  const y = computedRef<number>(() => uiStore.state.contextMenu.y)
  const items = computedRef<ContextMenuItem[]>(() => uiStore.state.contextMenu.items)

  function show(event: MouseEvent, menuItems: ContextMenuItem[]): void {
    uiStore.showContextMenu(event.clientX, event.clientY, menuItems)
  }

  function showAt(xPos: number, yPos: number, menuItems: ContextMenuItem[]): void {
    uiStore.showContextMenu(xPos, yPos, menuItems)
  }

  function hide(): void {
    uiStore.hideContextMenu()
  }

  /**
   * 注册全局点击与 ESC 关闭。
   *
   * @returns 取消注册函数。
   */
  function registerAutoHide(): () => void {
    function clickHandler(): void {
      hide()
    }
    function keyHandler(e: KeyboardEvent): void {
      if (e.key === 'Escape') hide()
    }
    // 延迟绑定，避免触发当前右键事件的 click
    let registered = false
    let pending = true
    setTimeout(() => {
      // cleanup 在 setTimeout 触发前已调用，则取消绑定
      if (!pending) return
      window.addEventListener('click', clickHandler)
      window.addEventListener('keydown', keyHandler)
      registered = true
    }, 0)
    return () => {
      pending = false
      // 仅当 listener 已注册时移除，避免移除尚未加入的 listener（后续加入后永不移除）
      if (registered) {
        window.removeEventListener('click', clickHandler)
        window.removeEventListener('keydown', keyHandler)
        registered = false
      }
    }
  }

  return {
    visible,
    x,
    y,
    items,
    show,
    showAt,
    hide,
    registerAutoHide
  }
}
