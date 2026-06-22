/**
 * @file 权限组合式函数，封装 permission store 的权限判断能力。
 */

import { usePermissionStore } from '../stores/permission.store'

/**
 * 权限组合式函数返回值。
 */
export interface UsePermissionReturn {
  /** 当前全部权限 */
  permissions: ReturnType<typeof Vue.computed>
  /** 当前窗口角色 */
  windowRole: string
  /** 是否拥有指定权限 */
  hasPermission: (permission: string) => boolean
  /** 是否拥有任一权限 */
  hasAnyPermission: (permissions: string[]) => boolean
  /** 是否拥有全部权限 */
  hasAllPermissions: (permissions: string[]) => boolean
  /** 是否拥有指定角色 */
  hasRole: (role: string) => boolean
  /** 当前窗口角色是否匹配 */
  isWindowRole: (role: string) => boolean
}

/**
 * 权限组合式函数。
 *
 * 注意：权限判断仅用于 UI 体验控制（隐藏/禁用按钮），
 * 真实安全边界在 main 进程 IPC 守卫与路由守卫中强制校验。
 *
 * @returns 权限判断方法。
 */
export function usePermission(): UsePermissionReturn {
  const store = usePermissionStore()

  return {
    permissions: store.allPermissions,
    windowRole: store.state.windowRole,
    hasPermission: store.hasPermission,
    hasAnyPermission: store.hasAnyPermission,
    hasAllPermissions: store.hasAllPermissions,
    hasRole: store.hasRole,
    isWindowRole: store.isWindowRole
  }
}
