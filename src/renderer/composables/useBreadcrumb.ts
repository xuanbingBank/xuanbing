/**
 * @file 面包屑组合式函数，从当前路由的 matchedChain 自动生成面包屑。
 */

import { computedRef } from '../stores/base'
import { buildBreadcrumbs } from '../utils/route'
import type { BreadcrumbItem, CurrentRoute } from '../router/types'

/**
 * 面包屑组合式函数返回值。
 */
export interface UseBreadcrumbReturn {
  /** 根据当前路由生成面包屑 */
  breadcrumbs: { value: BreadcrumbItem[] }
}

/**
 * 面包屑组合式函数。
 *
 * 需要传入当前路由的响应式引用。
 *
 * @param currentRoute 当前路由的响应式引用。
 * @returns 面包屑列表。
 */
export function useBreadcrumb(
  currentRoute: { value: CurrentRoute | null }
): UseBreadcrumbReturn {
  const breadcrumbs = computedRef<BreadcrumbItem[]>(() => {
    const route = currentRoute.value
    if (!route) return []
    return buildBreadcrumbs(route)
  })

  return { breadcrumbs }
}
