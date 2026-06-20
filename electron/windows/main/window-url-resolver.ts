/**
 * @file 窗口 URL 解析器，根据角色、路由、参数与查询串生成最终加载地址。
 *
 * 仅允许内部路由（来自 WINDOW_ROUTE_MAP 白名单），禁止任何外部 URL。
 * 开发环境使用 Vite dev server，生产环境使用 file:// + hash 路由。
 */

import { z } from '../../ipcBus/shared/zod'
import {
  WINDOW_ROUTE_MAP,
  getDefaultRoute,
  isRouteAllowedForRole,
  matchRoutePattern
} from '../shared/window-routes'
import { WINDOW_ERROR_CODES, createWindowError } from '../shared/window-errors'
import type { WindowError } from '../shared/window-errors'
import type { WindowRole } from '../shared/window-types'

/**
 * 解析器构造参数。
 */
export interface WindowUrlResolverOptions {
  /** 是否为打包后的生产环境。 */
  isPackaged: boolean
  /** 开发环境 Vite dev server 地址（如 http://localhost:5173）。 */
  devServerUrl?: string
  /** 生产环境 index.html 的绝对路径。 */
  indexHtmlPath: string
}

/**
 * 路由参数与查询串的 schema 形状。
 */
const paramsSchema = z.object({}).optional()

/**
 * 校验参数对象是否为简单的字符串字典。
 *
 * @param value 待校验值。
 * @returns 是否合法。
 */
function isStringRecord(value: unknown): value is Record<string, string> {
  if (value === undefined || value === null) {
    return false
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    return false
  }
  const record = value as Record<string, unknown>
  return Object.values(record).every((item) => typeof item === 'string')
}

/**
 * 将参数对象填充到带 :param 的路由模式中。
 *
 * @param pattern 路由模式，如 /detail/:id。
 * @param params 参数对象。
 * @returns 填充后的具体路由。
 */
function fillRouteParams(pattern: string, params: Record<string, string>): string {
  const segments = pattern.split('/').map((segment) => {
    if (segment.startsWith(':')) {
      const key = segment.slice(1)
      const value = params[key]
      if (value === undefined) {
        throw createWindowError(
          WINDOW_ERROR_CODES.validationError,
          `Missing route param "${key}" for pattern "${pattern}".`
        )
      }
      return encodeURIComponent(value)
    }
    return segment
  })
  return segments.join('/')
}

/**
 * 将查询串对象编码为 URL 查询字符串。
 *
 * @param query 查询串对象。
 * @returns 以 ? 开头的查询字符串，无参数时返回空字符串。
 */
function encodeQuery(query: Record<string, string>): string {
  const keys = Object.keys(query)
  if (keys.length === 0) {
    return ''
  }
  const parts = keys.map(
    (key) => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`
  )
  return `?${parts.join('&')}`
}

/**
 * 将本地 index.html 路径转换为 Electron 可加载的 file URL。
 *
 * @param indexHtmlPath 本地 index.html 绝对路径。
 * @returns 标准 file URL。
 */
function buildFileUrl(indexHtmlPath: string): string {
  const base = indexHtmlPath.replace(/\\/g, '/')
  return base.startsWith('/') ? `file://${base}` : `file:///${base}`
}

/**
 * 窗口 URL 解析器。
 */
export class WindowUrlResolver {
  private readonly isPackaged: boolean

  private readonly devServerUrl: string | undefined

  private readonly indexHtmlPath: string

  public constructor(options: WindowUrlResolverOptions) {
    this.isPackaged = options.isPackaged
    this.devServerUrl = options.devServerUrl
    this.indexHtmlPath = options.indexHtmlPath

    if (!this.indexHtmlPath) {
      throw createWindowError(
        WINDOW_ERROR_CODES.validationError,
        'indexHtmlPath is required for local renderer fallback.'
      )
    }
  }

  /**
   * 解析窗口加载 URL。
   *
   * @param role 窗口角色。
   * @param route 路由路径（来自配置）。
   * @param params 路由参数。
   * @param query 查询串。
   * @returns 最终 URL。
   * @throws WindowError 路由不在白名单或参数缺失时抛出。
   */
  public resolveUrl(
    role: WindowRole,
    route: string,
    params?: Record<string, string>,
    query?: Record<string, string>
  ): string {
    if (!route || typeof route !== 'string') {
      throw createWindowError(
        WINDOW_ERROR_CODES.routeNotAllowed,
        `Route must be a non-empty string for role "${role}".`
      )
    }

    if (!isRouteAllowedForRole(role, route)) {
      throw createWindowError(
        WINDOW_ERROR_CODES.routeNotAllowed,
        `Route "${route}" is not allowed for role "${role}".`
      )
    }

    if (params !== undefined && !isStringRecord(params)) {
      throw createWindowError(
        WINDOW_ERROR_CODES.validationError,
        'Route params must be a Record<string, string>.'
      )
    }

    if (query !== undefined && !isStringRecord(query)) {
      throw createWindowError(
        WINDOW_ERROR_CODES.validationError,
        'Query must be a Record<string, string>.'
      )
    }

    const paramsValidation = paramsSchema.safeParse(params ?? {})
    if (!paramsValidation.success) {
      throw createWindowError(
        WINDOW_ERROR_CODES.validationError,
        `Invalid params shape: ${paramsValidation.error.message}`
      )
    }

    let resolvedRoute = route
    if (route.includes(':')) {
      resolvedRoute = fillRouteParams(route, params ?? {})
    }

    const queryString = encodeQuery(query ?? {})

    if (!this.isPackaged && this.devServerUrl) {
      return `${this.devServerUrl}/#${resolvedRoute}${queryString}`
    }

    const fileUrl = buildFileUrl(this.indexHtmlPath)
    return `${fileUrl}#${resolvedRoute}${queryString}`
  }

  /**
   * 获取指定角色的默认路由（用于无显式路由时的回退）。
   *
   * @param role 窗口角色。
   * @returns 默认路由。
   */
  public getDefaultRouteForRole(role: WindowRole): string {
    return getDefaultRoute(role)
  }

  /**
   * 判断路由是否允许在指定角色中打开。
   *
   * @param role 窗口角色。
   * @param route 路由路径。
   * @returns 是否允许。
   */
  public isRouteAllowed(role: WindowRole, route: string): boolean {
    return isRouteAllowedForRole(role, route)
  }

  /**
   * 判断给定 URL 是否为内部 URL（dev server 或 file:// + index.html）。
   *
   * @param url 待判断 URL。
   * @returns 是否为内部 URL。
   */
  public isInternalUrl(url: string): boolean {
    if (!url || typeof url !== 'string') {
      return false
    }
    if (!this.isPackaged && this.devServerUrl) {
      return url === this.devServerUrl || url.startsWith(`${this.devServerUrl}/`)
    }

    const fileUrl = buildFileUrl(this.indexHtmlPath)
    return url === fileUrl || url.startsWith(`${fileUrl}#`)
  }

  /**
   * 获取指定角色的路由白名单。
   *
   * @param role 窗口角色。
   * @returns 允许的路由列表。
   */
  public getAllowedRoutes(role: WindowRole): string[] {
    return WINDOW_ROUTE_MAP[role]?.allowedRoutes ?? []
  }

  /**
   * 判断路由模式是否匹配具体路径。
   *
   * @param pattern 路由模式。
   * @param actualPath 实际路径。
   * @returns 是否匹配。
   */
  public matchRoute(pattern: string, actualPath: string): boolean {
    return matchRoutePattern(pattern, actualPath)
  }
}

export type { WindowError }
