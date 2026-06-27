/**
 * @file 窗口安全守卫函数，统一校验打开请求、权限、路由白名单与开发工具策略。
 *
 * 所有函数返回 { allowed, reason } 或抛出 WindowError，便于上层灵活处理。
 */

import { getWindowConfig } from '../shared/window-config'
import {
  WINDOW_ERROR_CODES,
  createWindowError
} from '../shared/window-errors'
import type {
  WindowErrorCode,
  WindowError
} from '../shared/window-errors'
import type {
  WindowRole,
  OpenWindowOptions
} from '../shared/window-types'
import { hasPermission } from '../shared/window-permissions'
import { isRouteAllowedForRole } from '../shared/window-routes'
import { isWindowRole } from '../shared/window-roles'

/**
 * 环境标识。
 */
export type WindowEnvironment = 'development' | 'production' | 'test'

/**
 * 校验结果。
 */
export interface GuardResult {
  allowed: boolean
  reason?: string
}

/** payload 最大字节数。 */
const MAX_PAYLOAD_BYTES = 256 * 1024

/** 环境映射。 */
const ENVIRONMENT_MAP: Record<WindowEnvironment, 'devOnly' | 'prodOnly' | null> = {
  development: 'devOnly',
  production: 'prodOnly',
  test: null
}

/**
 * 计算值的近似字节大小。
 *
 * @param value 待计算值。
 * @returns 字节大小。
 */
function approximateByteSize(value: unknown): number {
  if (value === undefined) {
    return 0
  }
  try {
    return Buffer.byteLength(JSON.stringify(value), 'utf8')
  } catch {
    return Infinity
  }
}

/**
 * 校验打开窗口请求。
 *
 * 校验内容：角色存在、环境允许、路由白名单、payload 大小、单例/多实例规则。
 * 发起方权限校验由调用方通过 checkPermission 完成。
 *
 * @param role 目标角色。
 * @param options 打开参数。
 * @param senderWindowId 发起方窗口 ID（仅用于日志上下文）。
 * @param environment 当前环境。
 * @param existingCount ???????????
 * @param allowExistingInstance ?????????????????????
 * @returns 校验结果。
 */
export function validateOpenRequest(
  role: string,
  options: OpenWindowOptions,
  senderWindowId: number | undefined,
  environment: WindowEnvironment,
  existingCount: number,
  allowExistingInstance = false
): GuardResult {
  if (!isWindowRole(role)) {
    return {
      allowed: false,
      reason: `Unknown window role: ${role}`
    }
  }

  const typedRole = role as WindowRole
  void senderWindowId

  let config
  try {
    config = getWindowConfig(typedRole)
  } catch {
    return {
      allowed: false,
      reason: `Window role "${role}" is not configured.`
    }
  }

  if (config.environment !== 'all') {
    const expectedEnv = ENVIRONMENT_MAP[environment]
    if (expectedEnv !== null && config.environment !== expectedEnv) {
      return {
        allowed: false,
        reason: `Role "${role}" is only allowed in ${config.environment} environment.`
      }
    }
  }

  const routeToCheck = options.routeName ?? config.route
  if (!isRouteAllowedForRole(typedRole, routeToCheck)) {
    return {
      allowed: false,
      reason: `Route "${routeToCheck}" is not allowed for role "${role}".`
    }
  }

  if (options.payload !== undefined) {
    const size = approximateByteSize(options.payload)
    if (size > MAX_PAYLOAD_BYTES) {
      return {
        allowed: false,
        reason: `Payload size ${size} bytes exceeds limit ${MAX_PAYLOAD_BYTES} bytes.`
      }
    }
  }

  if (!allowExistingInstance && config.singleton && existingCount > 0) {
    return {
      allowed: false,
      reason: `Singleton role "${role}" already has an instance.`
    }
  }

  if (!allowExistingInstance && existingCount >= config.maxInstances) {
    return {
      allowed: false,
      reason: `Role "${role}" reached max instances ${config.maxInstances}.`
    }
  }

  return { allowed: true }
}

/**
 * 检查权限。
 *
 * 控制其他窗口需要 :any 权限，控制自身仅需 :self 权限。
 *
 * @param role 目标角色。
 * @param permission 权限名称。
 * @param senderRole 发起方角色（可选）。
 * @returns 校验结果。
 */
export function checkPermission(
  role: WindowRole,
  permission: string,
  senderRole?: WindowRole
): GuardResult {
  if (permission.endsWith(':any')) {
    if (senderRole === undefined) {
      return { allowed: false, reason: 'Sender role is required for :any permission.' }
    }
    if (!hasPermission(senderRole, permission as never)) {
      return {
        allowed: false,
        reason: `Sender role "${senderRole}" lacks ${permission} permission.`
      }
    }
    return { allowed: true }
  }

  if (permission.endsWith(':self')) {
    if (senderRole === undefined) {
      return { allowed: false, reason: 'Sender role is required for :self permission.' }
    }
    if (senderRole !== role) {
      const anyVariant = permission.replace(':self', ':any')
      if (!hasPermission(senderRole, anyVariant as never)) {
        return {
          allowed: false,
          reason: `Sender role "${senderRole}" cannot control role "${role}" (requires ${anyVariant}).`
        }
      }
      return { allowed: true }
    }
    if (!hasPermission(senderRole, permission as never)) {
      return {
        allowed: false,
        reason: `Sender role "${senderRole}" lacks ${permission} permission.`
      }
    }
    return { allowed: true }
  }

  if (senderRole !== undefined && !hasPermission(senderRole, permission as never)) {
    return {
      allowed: false,
      reason: `Sender role "${senderRole}" lacks ${permission} permission.`
    }
  }

  return { allowed: true }
}

/**
 * 校验路由是否允许在指定角色中打开。
 *
 * @param role 窗口角色。
 * @param route 路由路径。
 * @returns 校验结果。
 */
export function validateRouteForRole(role: WindowRole, route: string): GuardResult {
  if (!route || typeof route !== 'string') {
    return { allowed: false, reason: 'Route must be a non-empty string.' }
  }
  if (!isRouteAllowedForRole(role, route)) {
    return {
      allowed: false,
      reason: `Route "${route}" is not allowed for role "${role}".`
    }
  }
  return { allowed: true }
}

/**
 * 判断是否允许打开 DevTools。
 *
 * @param role 窗口角色。
 * @param environment 当前环境。
 * @returns 校验结果。
 */
export function shouldAllowDevTools(
  role: WindowRole,
  environment: WindowEnvironment
): GuardResult {
  let config
  try {
    config = getWindowConfig(role)
  } catch {
    return { allowed: false, reason: `Window role "${role}" is not configured.` }
  }

  if (!config.devTools) {
    return { allowed: false, reason: `Role "${role}" has devTools disabled in config.` }
  }

  if (environment === 'production') {
    return { allowed: false, reason: 'DevTools are disabled in production.' }
  }

  return { allowed: true }
}

/**
 * 抛出 WindowError（用于需要中断流程的场景）。
 *
 * @param result 校验结果。
 * @param code 错误码。
 */
export function ensureAllowedOrThrow(
  result: GuardResult,
  code: WindowErrorCode = WINDOW_ERROR_CODES.forbidden
): void {
  if (!result.allowed) {
    throw createWindowError(code, result.reason ?? 'Guard rejected.')
  }
}

export type { WindowError }
