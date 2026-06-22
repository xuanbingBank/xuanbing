/**
 * @file Store 统一导出与初始化入口。
 */

import { createAppStore, useAppStore } from './app.store'
import { createAuthStore, useAuthStore } from './auth.store'
import { createPermissionStore, usePermissionStore } from './permission.store'
import { createThemeStore, useThemeStore } from './theme.store'
import { createLayoutStore, useLayoutStore, initLayoutResizeListener } from './layout.store'
import { createWindowStore, useWindowStore } from './window.store'
import { createTabStore, useTabStore } from './tab.store'
import { createNotificationStore, useNotificationStore } from './notification.store'
import { createMenuStore, useMenuStore } from './menu.store'
import { createUiStore, useUiStore } from './ui.store'
import { createCommandStore, useCommandStore } from './command.store'

export {
  createAppStore,
  useAppStore,
  createAuthStore,
  useAuthStore,
  createPermissionStore,
  usePermissionStore,
  createThemeStore,
  useThemeStore,
  createLayoutStore,
  useLayoutStore,
  initLayoutResizeListener,
  createWindowStore,
  useWindowStore,
  createTabStore,
  useTabStore,
  createNotificationStore,
  useNotificationStore,
  createMenuStore,
  useMenuStore,
  createUiStore,
  useUiStore,
  createCommandStore,
  useCommandStore
}

export type { AppStore } from './app.store'
export type { AuthStore, AuthUser } from './auth.store'
export type { PermissionStore } from './permission.store'
export type { ThemeStore } from './theme.store'
export type { LayoutStore } from './layout.store'
export type { WindowStore } from './window.store'
export type { TabStore, TabItem } from './tab.store'
export type { NotificationStore, ToastItem, ToastType } from './notification.store'
export type { MenuStore } from './menu.store'
export type { UiStore, ContextMenuItem, ContextMenuState } from './ui.store'
export type { CommandStore, Command, CommandType } from './command.store'

export { defineState, computedRef, storage, registerStore, getStore } from './base'
export type { StoreBase } from './base'

/**
 * 初始化全部 Store（在应用启动时调用）。
 *
 * 注意创建顺序：menu.store 依赖 permission.store 与 app.store，
 * command.store 依赖 menu.store，需按依赖顺序创建。
 */
export function initStores(): void {
  createAppStore()
  createAuthStore()
  createPermissionStore()
  createThemeStore()
  createLayoutStore()
  createWindowStore()
  createTabStore()
  createNotificationStore()
  createMenuStore()
  createUiStore()
  createCommandStore()
}
