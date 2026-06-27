/**
 * @file 实现 IPC 请求权限判断逻辑，默认拒绝未授权或未配置请求。
 */

export interface PermissionedContract {
  channel: string
  permission?: string
}

export interface PermissionCheckerOptions {
  environment: string
  rolePermissions: Record<string, string[]>
}

export interface PermissionDecisionInput {
  contract: PermissionedContract
  senderWindowId?: number
  windowRole?: string
}

export interface PermissionDecision {
  allowed: boolean
  reason?: string
}

/**
 * 默认窗口角色权限表。
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  main: ['public', 'app:read', 'file:read', 'window:control', 'task:run', 'task:cancel'],
  settings: ['public', 'app:read', 'file:read', 'window:control'],
  workerPanel: ['public', 'app:read', 'task:run', 'task:cancel']
}

/**
 * 创建一个用于窗口角色权限检查的函数。
 *
 * @param options 权限检查器配置。
 * @returns 权限判断函数。
 */
export function createPermissionChecker(options: PermissionCheckerOptions) {
  const rolePermissions = {
    ...DEFAULT_ROLE_PERMISSIONS,
    ...options.rolePermissions
  }

  /**
   * 判断给定契约是否允许在当前窗口调用。
   *
   * @param input 权限判断输入。
   * @returns 判断结果。
   */
  return function canAccess(input: PermissionDecisionInput): PermissionDecision {
    if (!input.contract.permission) {
      return { allowed: false, reason: 'missing-contract-permission' }
    }

    if (!input.windowRole) {
      return { allowed: false, reason: 'unknown-window-role' }
    }

    // devtools:open 强制只走环境开关校验，前置为独立分支，
    // 避免角色权限表中已含 devtools:open 时绕过环境开关。
    if (input.contract.permission === 'devtools:open') {
      return { allowed: process.env.XUANBING_DEVTOOLS === '1' }
    }

    const allowedPermissions = rolePermissions[input.windowRole] ?? []

    if (allowedPermissions.includes(input.contract.permission)) {
      return { allowed: true }
    }

    return { allowed: false, reason: 'missing-permission' }
  }
}
