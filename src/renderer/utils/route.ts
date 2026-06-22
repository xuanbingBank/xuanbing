/**
 * @file 路由工具函数。
 */

import type { CurrentRoute, BreadcrumbItem } from '../router/types'

/**
 * 从当前路由的 matchedChain 构建面包屑。
 *
 * @param route 当前路由。
 * @returns 面包屑列表。
 */
export function buildBreadcrumbs(route: CurrentRoute): BreadcrumbItem[] {
  const breadcrumbs: BreadcrumbItem[] = []

  for (let i = 0; i < route.matchedChain.length; i++) {
    const record = route.matchedChain[i]
    // meta.breadcrumb !== false 才显示
    if (record.meta.breadcrumb === false) continue
    if (record.meta.hidden) continue

    breadcrumbs.push({
      name: record.name,
      path: record.path,
      title: record.meta.title,
      // 最后一个不可点击
      clickable: i < route.matchedChain.length - 1
    })
  }

  return breadcrumbs
}

/**
 * 构建页面标题（含应用名）。
 *
 * @param route 当前路由。
 * @param appName 应用名称。
 * @returns 完整标题。
 */
export function buildPageTitle(route: CurrentRoute, appName: string): string {
  const title = route.meta.title
  if (!title) return appName
  return `${title} - ${appName}`
}

/**
 * 判断两个路由是否相同（路径与查询一致）。
 *
 * @param a 路由 a。
 * @param b 路由 b。
 * @returns 是否相同。
 */
export function isSameRoute(a: CurrentRoute | null, b: CurrentRoute | null): boolean {
  if (!a || !b) return false
  if (a.path !== b.path) return false
  const aKeys = Object.keys(a.query).sort()
  const bKeys = Object.keys(b.query).sort()
  if (aKeys.length !== bKeys.length) return false
  return aKeys.every((key, i) => key === bKeys[i] && a.query[key] === b.query[bKeys[i]])
}
