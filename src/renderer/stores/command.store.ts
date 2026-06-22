/**
 * @file Command Store，管理 Command Palette 的命令注册、搜索与最近使用。
 *
 * 命令来源：
 * 1. 菜单项（自动从 menu.store 派生）。
 * 2. 手动注册的命令（通过 registerCommand）。
 * 3. 最近使用记录（持久化）。
 */

import { defineState, computedRef, storage, registerStore } from './base'
import type { StoreBase } from './base'
import { STORAGE_KEYS } from '../constants'
import type { MenuItem } from '../router/types'
import { flattenMenu } from '../utils/menu-tree'
import { useMenuStore } from './menu.store'

/**
 * 命令类型。
 */
export type CommandType = 'navigation' | 'action' | 'window'

/**
 * 命令定义。
 */
export interface Command {
  /** 唯一标识 */
  id: string
  /** 标题 */
  title: string
  /** 描述（副标题） */
  description?: string
  /** 图标 key */
  icon?: string
  /** 命令类型 */
  type: CommandType
  /** 关键词（用于搜索匹配） */
  keywords?: string[]
  /** 快捷键显示文本 */
  shortcut?: string
  /** 所需权限 */
  permissions?: string[]
  /** 允许的窗口角色 */
  windowRoles?: string[]
  /** 是否仅开发环境 */
  devOnly?: boolean
  /** 执行函数 */
  run: () => void | Promise<void>
  /** 分组（用于结果分组显示） */
  group?: string
}

/**
 * Command Store 状态。
 */
interface CommandState {
  /** 手动注册的命令 */
  commands: Command[]
  /** 最近使用的命令 id（最多 8 个） */
  recentIds: string[]
  /** 搜索关键词 */
  keyword: string
  /** 当前选中索引 */
  selectedIndex: number
}

/**
 * Command Store 实例类型。
 */
export interface CommandStore extends StoreBase {
  state: CommandState
  /** 全部可执行命令（菜单派生 + 手动注册） */
  allCommands: ReturnType<typeof Vue.computed>
  /** 过滤后的命令（按关键词） */
  filteredCommands: ReturnType<typeof Vue.computed>
  /** 最近使用的命令 */
  recentCommands: ReturnType<typeof Vue.computed>
  /** 注册命令 */
  registerCommand: (command: Command) => void
  /** 批量注册命令 */
  registerCommands: (commands: Command[]) => void
  /** 注销命令 */
  unregisterCommand: (id: string) => void
  /** 执行命令 */
  executeCommand: (command: Command) => Promise<void>
  /** 设置搜索关键词 */
  setKeyword: (keyword: string) => void
  /** 设置选中索引 */
  setSelectedIndex: (index: number) => void
  /** 移动选中（上/下） */
  moveSelection: (delta: number) => void
  /** 记录最近使用 */
  recordRecent: (id: string) => void
  /** 清空最近使用 */
  clearRecent: () => void
  $reset: () => void
}

/** Command Store 单例 */
let commandStoreInstance: CommandStore | null = null

/** 最近使用最大数量 */
const MAX_RECENT = 8

/**
 * 创建 Command Store。
 */
export function createCommandStore(): CommandStore {
  if (commandStoreInstance) return commandStoreInstance

  const state = defineState<CommandState>({
    commands: [],
    recentIds: storage.get<string[]>(STORAGE_KEYS.COMMAND_RECENT, []),
    keyword: '',
    selectedIndex: 0
  })

  const menuStore = useMenuStore()

  /**
   * 从菜单项派生命令。
   */
  function commandsFromMenu(): Command[] {
    const menu = menuStore.menu.value as unknown as MenuItem[]
    return flattenMenu(menu)
      .filter((item) => item.path && !item.disabled)
      .map((item) => ({
        id: `nav:${item.id}`,
        title: item.title,
        description: item.description ?? item.path,
        icon: item.icon,
        type: 'navigation' as CommandType,
        keywords: [item.title, item.path ?? ''],
        shortcut: item.shortcut,
        permissions: item.permissions,
        windowRoles: item.windowRoles,
        devOnly: item.devOnly,
        group: '导航',
        run: () => {
          const router = Vue.inject<{ navigate: (path: string) => void }>('router')
          if (router && item.path) {
            router.navigate(item.path)
          }
        }
      }))
  }

  // 全部命令 = 菜单派生 + 手动注册
  const allCommands = computedRef<Command[]>(() => {
    const navCommands = commandsFromMenu()
    return [...navCommands, ...state.commands]
  })

  // 过滤后的命令
  const filteredCommands = computedRef<Command[]>(() => {
    const keyword = state.keyword.trim().toLowerCase()
    const all = allCommands.value as unknown as Command[]
    if (!keyword) {
      // 无关键词时，优先显示最近使用
      const recent = recentCommands.value as unknown as Command[]
      const recentIds = state.recentIds
      const others = all.filter((cmd) => !recentIds.includes(cmd.id))
      return [...recent, ...others].slice(0, 20)
    }
    return all
      .filter((cmd) => {
        const title = cmd.title.toLowerCase()
        const desc = (cmd.description ?? '').toLowerCase()
        const keywords = (cmd.keywords ?? []).join(' ').toLowerCase()
        return title.includes(keyword) || desc.includes(keyword) || keywords.includes(keyword)
      })
      .slice(0, 20)
  })

  // 最近使用的命令
  const recentCommands = computedRef<Command[]>(() => {
    const all = allCommands.value as unknown as Command[]
    return state.recentIds
      .map((id) => all.find((cmd) => cmd.id === id))
      .filter((cmd): cmd is Command => cmd !== undefined)
  })

  function registerCommand(command: Command): void {
    // 去重
    const idx = state.commands.findIndex((cmd) => cmd.id === command.id)
    if (idx >= 0) {
      state.commands.splice(idx, 1, command)
    } else {
      state.commands.push(command)
    }
  }

  function registerCommands(commands: Command[]): void {
    for (const command of commands) {
      registerCommand(command)
    }
  }

  function unregisterCommand(id: string): void {
    const idx = state.commands.findIndex((cmd) => cmd.id === id)
    if (idx >= 0) {
      state.commands.splice(idx, 1)
    }
  }

  async function executeCommand(command: Command): Promise<void> {
    try {
      await command.run()
      recordRecent(command.id)
    } catch (err) {
      console.error('[CommandStore] execute failed:', err)
    }
  }

  function setKeyword(keyword: string): void {
    state.keyword = keyword
    state.selectedIndex = 0
  }

  function setSelectedIndex(index: number): void {
    const max = (filteredCommands.value as unknown as Command[]).length - 1
    state.selectedIndex = Math.max(0, Math.min(index, max))
  }

  function moveSelection(delta: number): void {
    const max = (filteredCommands.value as unknown as Command[]).length - 1
    let next = state.selectedIndex + delta
    if (next < 0) next = max
    if (next > max) next = 0
    state.selectedIndex = next
  }

  function recordRecent(id: string): void {
    const idx = state.recentIds.indexOf(id)
    if (idx >= 0) {
      state.recentIds.splice(idx, 1)
    }
    state.recentIds.unshift(id)
    if (state.recentIds.length > MAX_RECENT) {
      state.recentIds = state.recentIds.slice(0, MAX_RECENT)
    }
    storage.set(STORAGE_KEYS.COMMAND_RECENT, state.recentIds)
  }

  function clearRecent(): void {
    state.recentIds = []
    storage.set(STORAGE_KEYS.COMMAND_RECENT, [])
  }

  const store: CommandStore = {
    $id: 'command',
    state,
    allCommands,
    filteredCommands,
    recentCommands,
    registerCommand,
    registerCommands,
    unregisterCommand,
    executeCommand,
    setKeyword,
    setSelectedIndex,
    moveSelection,
    recordRecent,
    clearRecent,
    $reset: () => {
      state.keyword = ''
      state.selectedIndex = 0
    }
  }

  registerStore(store)
  commandStoreInstance = store
  return store
}

/**
 * 获取 Command Store 单例。
 */
export function useCommandStore(): CommandStore {
  if (!commandStoreInstance) {
    return createCommandStore()
  }
  return commandStoreInstance
}
