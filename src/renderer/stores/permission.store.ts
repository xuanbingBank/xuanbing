/**
 * @file 权限 Store，管理当前用户/窗口的权限与角色，提供权限判断能力。
 *
 * 权限来源：
 * 1. 登录后从后端/IPC 获取的用户权限
 * 2. Electron 窗口角色对应的窗口权限（来自 main 进程）
 *
 * 注意：权限 Store 仅用于 UI 体验控制（隐藏/禁用按钮），
 * 真实安全边界在 main 进程 IPC 守卫与路由守卫中强制校验。
 */

import { defineState, computedRef, storage, registerStore } from './base'
import type { StoreBase } from './base'
import { STORAGE_KEYS } from '../constants'

/**
 * 权限 Store 状态。
 */
interface PermissionState {
  /** 用户权限列表 */
  permissions: string[]
  /** 用户角色列表 */
  roles: string[]
  /** 当前 Electron 窗口角色 */
  windowRole: string
  /** 窗口权限列表（来自 main） */
  windowPermissions: string[]
  /** 是否已初始化 */
  initialized: boolean
}

/**
 * 权限 Store 实例类型。
 */
export interface PermissionStore extends StoreBase {
  state: PermissionState
  /** 合并后的全部权限（用户 + 窗口） */
  allPermissions: ReturnType<typeof Vue.computed>
  /** 设置用户权限 */
  setPermissions: (permissions: string[]) => void
  /** 设置用户角色 */
  setRoles: (roles: string[]) => void
  /** 设置窗口角色与权限 */
  setWindowContext: (role: string, permissions: string[]) => void
  /** 判断是否拥有指定权限 */
  hasPermission: (permission: string) => boolean
  /** 判断是否拥有任一权限 */
  hasAnyPermission: (permissions: string[]) => boolean
  /** 判断是否拥有全部权限 */
  hasAllPermissions: (permissions: string[]) => boolean
  /** 判断是否拥有指定角色 */
  hasRole: (role: string) => boolean
  /** 判断当前窗口角色是否匹配 */
  isWindowRole: (role: string) => boolean
  /** 清空权限 */
  clear: () => void
}

/** 权限 Store 单例 */
let permissionStoreInstance: PermissionStore | null = null

/**
 * 创建权限 Store。
 */
export function createPermissionStore(): PermissionStore {
  if (permissionStoreInstance) return permissionStoreInstance

  const state = defineState<PermissionState>({
    permissions: storage.get<string[]>(STORAGE_KEYS.PERMISSIONS, []),
    roles: [],
    windowRole: '',
    windowPermissions: [],
    initialized: false
  })

  /** 合并用户权限与窗口权限（去重） */
  const allPermissions = computedRef<string[]>(() => {
    const set = new Set<string>([...state.permissions, ...state.windowPermissions])
    return Array.from(set)
  })

  function setPermissions(permissions: string[]): void {
    state.permissions = permissions
    storage.set(STORAGE_KEYS.PERMISSIONS, permissions)
  }

  function setRoles(roles: string[]): void {
    state.roles = roles
  }

  function setWindowContext(role: string, permissions: string[]): void {
    state.windowRole = role
    state.windowPermissions = permissions
    state.initialized = true
  }

  function hasPermission(permission: string): boolean {
    return allPermissions.value.includes(permission)
  }

  function hasAnyPermission(permissions: string[]): boolean {
    if (permissions.length === 0) return true
    return permissions.some((p) => allPermissions.value.includes(p))
  }

  function hasAllPermissions(permissions: string[]): boolean {
    if (permissions.length === 0) return true
    return permissions.every((p) => allPermissions.value.includes(p))
  }

  function hasRole(role: string): boolean {
    return state.roles.includes(role)
  }

  function isWindowRole(role: string): boolean {
    return state.windowRole === role
  }

  function clear(): void {
    state.permissions = []
    state.roles = []
    state.windowPermissions = []
    storage.remove(STORAGE_KEYS.PERMISSIONS)
  }

  const store: PermissionStore = {
    $id: 'permission',
    state,
    allPermissions,
    setPermissions,
    setRoles,
    setWindowContext,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    isWindowRole,
    clear,
    $reset: () => {
      clear()
      state.windowRole = ''
      state.initialized = false
    }
  }

  registerStore(store)
  permissionStoreInstance = store
  return store
}

/**
 * 获取权限 Store 单例。
 */
export function usePermissionStore(): PermissionStore {
  if (!permissionStoreInstance) {
    return createPermissionStore()
  }
  return permissionStoreInstance
}
