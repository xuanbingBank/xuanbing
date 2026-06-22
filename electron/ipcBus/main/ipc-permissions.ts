/**
 * @file 实现 IPC 请求的权限判定逻辑，默认拒绝未声明或未授权能力。
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
 * 定义默认窗口角色权限表。
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  main: ['public', 'app:read', 'file:read', 'window:control', 'task:run', 'task:cancel'],
  settings: ['public', 'app:read', 'file:read', 'window:control'],
  workerPanel: ['public', 'app:read', 'task:run', 'task:cancel']
}

/**
 * 创建一个基于窗口角色的权限检查器。
 *
 * @param options 权限检查器配置。
 * @returns 权限判定函数。
 */
export function createPermissionChecker(options: PermissionCheckerOptions) {
  const rolePermissions = {
    ...DEFAULT_ROLE_PERMISSIONS,
    ...options.rolePermissions
  }

  /**
   * 判断给定契约是否允许当前窗口调用。
   *
   * @param input 权限判定输入。
   * @returns 判定结果。
   */
  return function canAccess(input: PermissionDecisionInput): PermissionDecision {
    if (!input.contract.permission) {
      return { allowed: false, reason: 'missing-contract-permission' }
    }

    if (!input.windowRole) {
      return { allowed: false, reason: 'unknown-window-role' }
    }

    const allowedPermissions = rolePermissions[input.windowRole] ?? []

    if (allowedPermissions.includes(input.contract.permission)) {
      return { allowed: true }
    }

    if (options.environment !== 'production' && input.contract.permission === 'devtools:open') {
      return { allowed: true }
    }

    return { allowed: false, reason: 'missing-permission' }
  }
}
