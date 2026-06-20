/**
 * @file 标签页 Store，管理多标签页与 keep-alive 缓存。
 *
 * 标签页按 windowRole 隔离，避免多窗口状态污染。
 */

import { defineState, computedRef, registerStore } from './base'
import type { StoreBase } from './base'

/**
 * 单个标签页信息。
 */
export interface TabItem {
  /** 路由名称 */
  name: string
  /** 路由路径 */
  path: string
  /** 标签标题 */
  title: string
  /** 图标 */
  icon?: string
  /** 是否固定（不可关闭） */
  affix: boolean
  /** 是否可关闭 */
  closable: boolean
  /** 查询参数 */
  query: Record<string, string>
}

/**
 * 标签页 Store 状态。
 */
interface TabState {
  /** 当前窗口的标签列表 */
  tabs: TabItem[]
  /** 当前激活的标签路径 */
  activePath: string
  /** keep-alive 缓存的路由名称列表 */
  cachedNames: string[]
  /** 当前窗口角色（用于隔离） */
  windowRole: string
}

/**
 * 标签页 Store 实例类型。
 */
export interface TabStore extends StoreBase {
  state: TabState
  /** 当前激活标签 */
  activeTab: ReturnType<typeof Vue.computed>
  /** 添加标签 */
  addTab: (tab: TabItem) => void
  /** 移除标签 */
  removeTab: (path: string) => string | null
  /** 移除其他标签 */
  removeOthers: (path: string) => void
  /** 移除全部可关闭标签 */
  removeAll: () => void
  /** 设置激活标签 */
  setActive: (path: string) => void
  /** 设置窗口角色（切换窗口时重置标签） */
  setWindowRole: (role: string) => void
  /** 添加缓存 */
  addCache: (name: string) => void
  /** 移除缓存 */
  removeCache: (name: string) => void
  /** 清空全部 */
  clearAll: () => void
}

/** 标签页 Store 单例 */
let tabStoreInstance: TabStore | null = null

/**
 * 创建标签页 Store。
 */
export function createTabStore(): TabStore {
  if (tabStoreInstance) return tabStoreInstance

  const state = defineState<TabState>({
    tabs: [],
    activePath: '',
    cachedNames: [],
    windowRole: ''
  })

  const activeTab = computedRef<TabItem | undefined>(() =>
    state.tabs.find((t) => t.path === state.activePath)
  )

  function addTab(tab: TabItem): void {
    const exists = state.tabs.find((t) => t.path === tab.path)
    if (!exists) {
      state.tabs.push(tab)
    } else {
      // 更新查询参数
      exists.query = tab.query
    }
    state.activePath = tab.path
    if (!state.cachedNames.includes(tab.name)) {
      state.cachedNames.push(tab.name)
    }
  }

  function removeTab(path: string): string | null {
    const index = state.tabs.findIndex((t) => t.path === path)
    if (index === -1) return null

    const tab = state.tabs[index]
    if (tab.affix) return null

    state.tabs.splice(index, 1)
    removeCache(tab.name)

    // 如果关闭的是当前激活标签，跳转到相邻标签
    if (state.activePath === path) {
      const next = state.tabs[index] || state.tabs[index - 1]
      if (next) {
        state.activePath = next.path
        return next.path
      }
      state.activePath = ''
      return '/'
    }
    return null
  }

  function removeOthers(path: string): void {
    state.tabs = state.tabs.filter((t) => t.path === path || t.affix)
    state.activePath = path
    // 重建缓存
    state.cachedNames = state.tabs.map((t) => t.name)
  }

  function removeAll(): void {
    state.tabs = state.tabs.filter((t) => t.affix)
    state.cachedNames = state.tabs.map((t) => t.name)
    const first = state.tabs[0]
    state.activePath = first?.path ?? '/'
  }

  function setActive(path: string): void {
    state.activePath = path
  }

  function setWindowRole(role: string): void {
    if (state.windowRole !== role) {
      state.windowRole = role
      state.tabs = []
      state.activePath = ''
      state.cachedNames = []
    }
  }

  function addCache(name: string): void {
    if (!state.cachedNames.includes(name)) {
      state.cachedNames.push(name)
    }
  }

  function removeCache(name: string): void {
    const index = state.cachedNames.indexOf(name)
    if (index >= 0) {
      state.cachedNames.splice(index, 1)
    }
  }

  function clearAll(): void {
    state.tabs = []
    state.activePath = ''
    state.cachedNames = []
  }

  const store: TabStore = {
    $id: 'tab',
    state,
    activeTab,
    addTab,
    removeTab,
    removeOthers,
    removeAll,
    setActive,
    setWindowRole,
    addCache,
    removeCache,
    clearAll,
    $reset: clearAll
  }

  registerStore(store)
  tabStoreInstance = store
  return store
}

/**
 * 获取标签页 Store 单例。
 */
export function useTabStore(): TabStore {
  if (!tabStoreInstance) {
    return createTabStore()
  }
  return tabStoreInstance
}
