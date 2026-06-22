/**
 * @file 路由守卫函数，在路由变更前校验窗口角色白名单、认证状态、权限、devOnly 等。
 *
 * 守卫执行顺序：
 * 1. 路由是否存在 → 不存在则重定向到 /404
 * 2. devOnly 守卫 → 生产环境禁止 devOnly 页面
 * 3. 窗口角色白名单 → 不允许则重定向到 /403
 * 4. 认证状态 → 未认证则重定向到 /login
 * 5. 登录后访问 /login → 重定向到 /dashboard
 * 6. 权限检查 → 权限不足则重定向到 /403
 */

import { isRouteAllowedForRole } from '../../../electron/windows/shared/window-routes'
import type { CurrentRoute } from './types'
import { ROUTE_PATHS, APP_INFO } from '../constants'

/**
 * 守卫执行上下文，包含当前窗口角色、权限列表与认证状态。
 */
export interface GuardContext {
  /** 当前窗口角色 */
  windowRole: string
  /** 当前窗口拥有的权限列表 */
  permissions: string[]
  /** 是否已认证 */
  isAuthenticated: boolean
}

/**
 * 守卫执行结果。
 */
export interface GuardResult {
  /** 是否允许通过 */
  allowed: boolean
  /** 需要重定向的路径，allowed 为 false 时提供 */
  redirect?: string
}

/**
 * 检查路由是否允许在当前窗口角色中打开。
 *
 * 对于 allowDirectOpen 为 true 的兜底路由（如 /403、/404），跳过白名单校验。
 *
 * @param route 当前路由。
 * @param currentWindowRole 当前窗口角色。
 * @returns 是否允许。
 */
export function checkRouteAllowed(route: CurrentRoute, currentWindowRole: string): boolean {
  if (route.meta.allowDirectOpen) {
    return true
  }
  return isRouteAllowedForRole(currentWindowRole as never, route.matched.path)
}

/**
 * 检查认证状态是否满足路由要求。
 *
 * @param route 当前路由。
 * @param isAuthenticated 是否已认证。
 * @returns 是否允许。
 */
export function checkAuth(route: CurrentRoute, isAuthenticated: boolean): boolean {
  if (!route.meta.requiresAuth) {
    return true
  }
  return isAuthenticated
}

/**
 * 检查当前窗口是否拥有路由所需的全部权限。
 *
 * @param route 当前路由。
 * @param permissions 当前窗口拥有的权限列表。
 * @returns 是否允许。
 */
export function checkPermission(route: CurrentRoute, permissions: string[]): boolean {
  if (route.meta.permissions.length === 0) {
    return true
  }
  return route.meta.permissions.every((permission) => permissions.includes(permission))
}

/**
 * 检查路由是否存在（是否匹配到了有效记录）。
 *
 * 当路由名称为 notFound 且实际路径不等于 /404 时，说明是未匹配到的路径。
 *
 * @param route 当前路由。
 * @returns 是否存在。
 */
export function checkRouteExists(route: CurrentRoute): boolean {
  // 如果匹配到的路由是 notFound，但实际路径不是 /404，说明是未匹配的路径
  if (route.name === 'notFound' && route.path !== ROUTE_PATHS.NOT_FOUND) {
    return false
  }
  return true
}

/**
 * 检查 devOnly 路由在生产环境是否被禁止。
 *
 * @param route 当前路由。
 * @param isDev 是否开发环境。
 * @returns 是否允许。
 */
export function checkDevOnly(route: CurrentRoute, isDev: boolean): boolean {
  if (!route.meta.devOnly) {
    return true
  }
  return isDev
}

/**
 * 检查登录后访问登录页是否需要重定向到 dashboard。
 *
 * @param route 当前路由。
 * @param isAuthenticated 是否已认证。
 * @returns 是否需要重定向到 dashboard。
 */
export function shouldRedirectFromLogin(
  route: CurrentRoute,
  isAuthenticated: boolean
): boolean {
  return route.path === ROUTE_PATHS.LOGIN && isAuthenticated
}

/**
 * 按顺序执行全部守卫，返回最终结果。
 *
 * 守卫执行顺序：
 * 1. 路由是否存在 → 不存在则重定向到 /404
 * 2. devOnly 守卫 → 生产环境禁止 devOnly 页面，重定向到 /404
 * 3. 窗口角色白名单 → 不允许则重定向到 /403
 * 4. 认证状态 → 未认证则重定向到 /login
 * 5. 登录后访问 /login → 重定向到 /dashboard
 * 6. 权限检查 → 权限不足则重定向到 /403
 *
 * 防止无限重定向：目标为错误页或登录页时不再触发重定向。
 *
 * @param to 目标路由。
 * @param from 来源路由（保留参数，当前未使用）。
 * @param context 守卫上下文。
 * @returns 守卫执行结果。
 */
export function executeGuards(
  to: CurrentRoute,
  from: CurrentRoute | null,
  context: GuardContext
): GuardResult {
  void from

  const isDev = APP_INFO.ENVIRONMENT === 'development'

  // 防止无限重定向：目标本身是错误页或登录页时，直接放行
  const isRedirectTarget =
    to.path === ROUTE_PATHS.NOT_FOUND ||
    to.path === ROUTE_PATHS.FORBIDDEN ||
    to.path === ROUTE_PATHS.SERVER_ERROR ||
    to.path === ROUTE_PATHS.LOGIN

  // 1. 路由是否存在
  if (!checkRouteExists(to)) {
    return { allowed: false, redirect: ROUTE_PATHS.NOT_FOUND }
  }

  // 2. devOnly 守卫
  if (!checkDevOnly(to, isDev)) {
    return { allowed: false, redirect: ROUTE_PATHS.NOT_FOUND }
  }

  // 如果已经是重定向目标页面，直接放行
  if (isRedirectTarget) {
    return { allowed: true }
  }

  // 3. 窗口角色白名单
  if (!checkRouteAllowed(to, context.windowRole)) {
    return { allowed: false, redirect: ROUTE_PATHS.FORBIDDEN }
  }

  // 4. 认证状态
  if (!checkAuth(to, context.isAuthenticated)) {
    return { allowed: false, redirect: ROUTE_PATHS.LOGIN }
  }

  // 5. 登录后访问 /login → 重定向到 /dashboard
  if (shouldRedirectFromLogin(to, context.isAuthenticated)) {
    return { allowed: false, redirect: ROUTE_PATHS.DASHBOARD }
  }

  // 6. 权限检查
  if (!checkPermission(to, context.permissions)) {
    return { allowed: false, redirect: ROUTE_PATHS.FORBIDDEN }
  }

  return { allowed: true }
}
