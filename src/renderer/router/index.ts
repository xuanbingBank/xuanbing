/**
 * @file 轻量哈希路由实现，不依赖 vue-router，通过 window.location.hash 管理路由状态。
 *
 * 支持：
 * - 路径参数提取（:param）
 * - 查询字符串解析
 * - catch-all 通配匹配（:pathMatch(.*)*）
 * - matchedChain 构建（用于面包屑）
 */

import type { DesktopUnsubscribe } from '../../../electron/ipcBus/renderer'
import type { CurrentRoute, RouteRecord } from './types'
import { routes } from './routes'

/**
 * 解析后的哈希片段，包含路径与查询参数。
 */
export interface ParsedHash {
  path: string
  query: Record<string, string>
}

/**
 * 路由匹配结果，包含匹配到的记录与提取的路径参数。
 */
export interface RouteMatch {
  record: RouteRecord
  params: Record<string, string>
}

/**
 * 哈希路由类，提供路径解析、路由匹配、导航与变更订阅能力。
 */
export class HashRouter {
  private readonly routeList: RouteRecord[]
  private readonly listeners: Set<(route: CurrentRoute) => void>
  private readonly hashChangeHandler: () => void

  /**
   * @param routeList 路由记录列表，默认使用 routes.ts 中声明的全部路由。
   */
  constructor(routeList: RouteRecord[] = routes) {
    this.routeList = routeList
    this.listeners = new Set()

    // 初始化时读取当前哈希，若为空则默认跳转到 '/'
    if (!window.location.hash || window.location.hash === '#') {
      window.location.hash = '#/'
    }

    // 绑定 hashchange 事件处理器
    this.hashChangeHandler = () => {
      const route = this.getCurrentRoute()
      for (const listener of this.listeners) {
        listener(route)
      }
    }
    window.addEventListener('hashchange', this.hashChangeHandler)
  }

  /**
   * 解析哈希字符串，提取路径与查询参数。
   *
   * @param hash 哈希字符串，例如 '#/detail/42?tab=info'。
   * @returns 解析结果，包含 path 与 query。
   */
  parseHash(hash: string): ParsedHash {
    let raw = hash
    if (raw.startsWith('#')) {
      raw = raw.slice(1)
    }

    const questionIndex = raw.indexOf('?')
    const pathPart = questionIndex >= 0 ? raw.slice(0, questionIndex) : raw
    const queryPart = questionIndex >= 0 ? raw.slice(questionIndex + 1) : ''

    const path = pathPart || '/'
    const query: Record<string, string> = {}

    if (queryPart) {
      for (const pair of queryPart.split('&')) {
        if (!pair) {
          continue
        }
        const equalIndex = pair.indexOf('=')
        const key = equalIndex >= 0 ? pair.slice(0, equalIndex) : pair
        const value = equalIndex >= 0 ? pair.slice(equalIndex + 1) : ''
        if (key) {
          query[decodeURIComponent(key)] = decodeURIComponent(value)
        }
      }
    }

    return { path, query }
  }

  /**
   * 将实际路径与路由模式匹配，支持 `:param` 参数提取与 `:pathMatch(.*)*` 通配。
   *
   * @param path 实际路径，例如 '/detail/42'。
   * @returns 匹配结果，未匹配时返回 null。
   */
  matchRoute(path: string): RouteMatch | null {
    const pathParts = path.split('/').filter(Boolean)

    // 优先匹配非通配路由
    for (const record of this.routeList) {
      // 跳过 catch-all 路由，最后处理
      if (record.path.includes(':pathMatch')) {
        continue
      }

      const patternParts = record.path.split('/').filter(Boolean)

      if (patternParts.length !== pathParts.length) {
        continue
      }

      const params: Record<string, string> = {}
      let matched = true

      for (let i = 0; i < patternParts.length; i++) {
        const patternSegment = patternParts[i]
        const pathSegment = pathParts[i]

        if (patternSegment.startsWith(':')) {
          params[patternSegment.slice(1)] = decodeURIComponent(pathSegment)
        } else if (patternSegment !== pathSegment) {
          matched = false
          break
        }
      }

      if (matched) {
        return { record, params }
      }
    }

    // 匹配 catch-all 路由
    const catchAll = this.routeList.find((r) => r.path.includes(':pathMatch'))
    if (catchAll) {
      return {
        record: catchAll,
        params: { pathMatch: pathParts.join('/') }
      }
    }

    return null
  }

  /**
   * 构建匹配链（用于面包屑）。
   *
   * 根据当前路由的 meta.parent 字段向上回溯，构建从根到当前的完整链路。
   *
   * @param record 当前匹配的路由记录。
   * @returns 匹配链。
   */
  buildMatchedChain(record: RouteRecord): RouteRecord[] {
    const chain: RouteRecord[] = [record]
    let current = record

    // 向上查找父级路由
    while (current.meta.parent) {
      const parent = this.routeList.find((r) => r.path === current.meta.parent)
      if (!parent || chain.includes(parent)) {
        break
      }
      chain.unshift(parent)
      current = parent
    }

    return chain
  }

  /**
   * 获取当前路由的完整状态。
   *
   * @returns 当前路由对象。
   */
  getCurrentRoute(): CurrentRoute {
    const { path, query } = this.parseHash(window.location.hash)
    const match = this.matchRoute(path)

    if (!match) {
      // 未匹配到路由时，返回 notFound 兜底路由
      const notFound = this.routeList.find((route) => route.name === 'notFound')
      if (notFound) {
        return {
          path,
          name: 'notFound',
          params: {},
          query,
          meta: notFound.meta,
          matched: notFound,
          matchedChain: [notFound]
        }
      }
      // 无 notFound 兜底路由时，返回一个空对象避免崩溃
      throw new Error('Route not found and no fallback route configured')
    }

    const matchedChain = this.buildMatchedChain(match.record)

    return {
      path,
      name: match.record.name,
      params: match.params,
      query,
      meta: match.record.meta,
      matched: match.record,
      matchedChain
    }
  }

  /**
   * 导航到指定路径，通过设置 window.location.hash 触发路由变更。
   *
   * @param path 目标路径，例如 '/settings' 或 '/detail/42?tab=info'。
   */
  navigate(path: string): void {
    const target = path.startsWith('#') ? path : '#' + path
    if (window.location.hash === target) {
      // 哈希未变化时手动触发一次，确保回调执行
      this.hashChangeHandler()
    } else {
      window.location.hash = target
    }
  }

  /**
   * 订阅路由变更事件。
   *
   * @param callback 路由变更回调。
   * @returns 取消订阅函数。
   */
  onChange(callback: (route: CurrentRoute) => void): DesktopUnsubscribe {
    this.listeners.add(callback)
    return () => {
      this.listeners.delete(callback)
    }
  }

  /**
   * 根据路由名称与参数构建完整路径字符串。
   *
   * @param name 路由名称。
   * @param params 路径参数。
   * @param query 查询参数。
   * @returns 构建出的路径，例如 '/detail/42?tab=info'。
   */
  buildPath(
    name: string,
    params?: Record<string, string>,
    query?: Record<string, string>
  ): string {
    const record = this.routeList.find((route) => route.name === name)
    if (!record) {
      return '/'
    }

    let path = record.path
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        path = path.replace(`:${key}`, encodeURIComponent(value))
      }
    }

    if (query && Object.keys(query).length > 0) {
      const queryString = Object.entries(query)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&')
      path += `?${queryString}`
    }

    return path
  }

  /**
   * 销毁路由器，移除全部事件监听。
   */
  destroy(): void {
    window.removeEventListener('hashchange', this.hashChangeHandler)
    this.listeners.clear()
  }
}

/**
 * 创建哈希路由实例的工厂函数。
 *
 * @param routeList 可选的自定义路由列表。
 * @returns 哈希路由实例。
 */
export function createHashRouter(routeList?: RouteRecord[]): HashRouter {
  return new HashRouter(routeList)
}
