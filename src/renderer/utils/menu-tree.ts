/**
 * @file 菜单树构建工具，从路由表自动生成多级菜单树。
 *
 * 支持：
 * 1. 从 Vue Router route meta 自动生成。
 * 2. 手动传入 menu tree 合并。
 * 3. 多级菜单（至少 3 级），通过 meta.parent 链接。
 * 4. 分组菜单（meta.group）。
 * 5. 权限过滤、windowRole 过滤、devOnly 过滤、disabled、hidden。
 * 6. badge、tag、shortcut、description、activeMenu、activeMatch。
 * 7. 外部链接安全打开。
 * 8. 路由不存在时过滤。
 * 9. 按 menuOrder 排序。
 *
 * 与 utils/menu.ts 兼容，但扩展为多级 + Fluent 字段。
 */

import type { RouteRecord, MenuItem } from '../router/types'
import { routes } from '../router/routes'
import { APP_INFO } from '../constants'

/**
 * 菜单过滤选项。
 */
export interface MenuTreeOptions {
  /** 当前用户权限列表 */
  permissions: string[]
  /** 当前窗口角色 */
  windowRole: string
  /** 是否开发环境（默认根据 APP_INFO 判断） */
  isDev?: boolean
  /** 当前用户角色列表（可选） */
  roles?: string[]
  /** 额外手动菜单项（与路由生成合并） */
  extraMenu?: MenuItem[]
}

/**
 * 判断路由是否满足权限要求（全部满足）。
 */
function matchPermissions(route: RouteRecord, permissions: string[]): boolean {
  if (!route.meta.permissions || route.meta.permissions.length === 0) {
    return true
  }
  return route.meta.permissions.every((p) => permissions.includes(p))
}

/**
 * 判断路由是否满足角色要求（满足其一）。
 */
function matchRoles(route: RouteRecord, roles: string[]): boolean {
  if (!route.meta.roles || route.meta.roles.length === 0) {
    return true
  }
  return route.meta.roles.some((r) => roles.includes(r))
}

/**
 * 判断路由是否允许在当前窗口角色下显示。
 *
 * 规则：
 * - meta.windowRoles 优先：声明了就按它判断（满足其一）。
 * - 子菜单（有 parent）允许跨角色，由父级控制。
 * - main 窗口作为主控台，显示所有顶层菜单。
 * - 其他窗口只显示与自身角色匹配的顶层路由。
 */
function matchWindowRole(route: RouteRecord, windowRole: string): boolean {
  // 显式声明的 windowRoles 优先
  if (route.meta.windowRoles && route.meta.windowRoles.length > 0) {
    return route.meta.windowRoles.includes(windowRole)
  }
  // 子菜单（有 parent）允许跨角色，由父级控制
  if (route.meta.parent !== undefined) {
    return true
  }
  // main 窗口作为主控台，显示所有顶层菜单
  if (windowRole === 'main') {
    return true
  }
  // 其他窗口只显示与自身角色匹配的顶层路由
  return route.meta.windowRole === windowRole
}

/**
 * 将路由记录转换为菜单项（携带 Fluent 扩展字段）。
 */
function routeToMenuItem(route: RouteRecord): MenuItem {
  return {
    id: route.name,
    name: route.name,
    title: route.meta.title,
    path: route.path,
    icon: route.meta.icon,
    order: route.meta.menuOrder ?? 999,
    group: route.meta.group,
    badge: route.meta.badge,
    tag: route.meta.tag,
    shortcut: route.meta.shortcut,
    description: route.meta.description,
    activeMenu: route.meta.activeMenu,
    activeMatch: route.meta.activeMatch,
    external: route.meta.external,
    permissions: route.meta.permissions,
    roles: route.meta.roles,
    windowRoles: route.meta.windowRoles,
    devOnly: route.meta.devOnly,
    disabled: false,
    hidden: route.meta.hidden,
    menu: route.meta.menu,
    parent: route.meta.parent
  }
}

/**
 * 按深度递归挂载子菜单。
 *
 * 使用 parent 字段构建任意深度的菜单树。一个路由的 parent 指向另一路由的 path，
 * 该路由会成为后者的子菜单。支持多级（3 级及以上）。
 */
function buildTree(items: MenuItem[]): MenuItem[] {
  const itemMap = new Map<string, MenuItem>()
  const roots: MenuItem[] = []

  // 第一遍：建立 id → item 索引（克隆避免污染）
  for (const item of items) {
    itemMap.set(item.id, { ...item, children: [] })
  }

  // 第二遍：按 parent 挂载
  for (const item of items) {
    const node = itemMap.get(item.id)!
    if (item.parent) {
      // 查找父节点：先按 path 匹配，再按 id 匹配
      let parent: MenuItem | undefined
      for (const candidate of itemMap.values()) {
        if (candidate.path === item.parent || candidate.id === item.parent) {
          parent = candidate
          break
        }
      }
      if (parent) {
        parent.children!.push(node)
      } else {
        // 父级不存在，作为顶层节点
        roots.push(node)
      }
    } else {
      roots.push(node)
    }
  }

  // 递归排序 + 清理空 children
  function sortAndClean(nodes: MenuItem[]): void {
    nodes.sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
    for (const node of nodes) {
      if (node.children && node.children.length > 0) {
        sortAndClean(node.children)
      } else {
        delete node.children
      }
    }
  }
  sortAndClean(roots)

  return roots
}

/**
 * 按分组组织顶层菜单。
 *
 * 同 group 的菜单项归为一组，组间用 divider 分隔。无 group 的归入默认组。
 */
function groupTopItems(items: MenuItem[]): MenuItem[] {
  const groupOrder: string[] = []
  const groupMap = new Map<string, MenuItem[]>()

  for (const item of items) {
    const group = item.group ?? ''
    if (!groupMap.has(group)) {
      groupMap.set(group, [])
      groupOrder.push(group)
    }
    groupMap.get(group)!.push(item)
  }

  const result: MenuItem[] = []
  groupOrder.forEach((group, index) => {
    const items = groupMap.get(group)!
    if (index > 0) {
      // 组间分隔线
      result.push({ id: `__divider_${group}`, title: '', divider: true })
    }
    result.push(...items)
  })

  return result
}

/**
 * 从路由表生成多级菜单树。
 *
 * @param options 过滤选项。
 * @returns 菜单树（含分组 divider）。
 */
export function generateMenuTree(options: MenuTreeOptions): MenuItem[] {
  const {
    permissions,
    windowRole,
    isDev = APP_INFO.ENVIRONMENT === 'development',
    roles = [],
    extraMenu = []
  } = options

  // 过滤可见路由
  const visibleRoutes = routes.filter((route) => {
    if (!route.meta.menu) return false
    if (route.meta.hidden) return false
    if (route.meta.devOnly && !isDev) return false
    if (!matchPermissions(route, permissions)) return false
    if (!matchRoles(route, roles)) return false
    return true
  })

  // 转换为菜单项
  const routeItems = visibleRoutes.map(routeToMenuItem)

  // 合并手动菜单
  const allItems = [...routeItems, ...extraMenu]

  // 顶层菜单需要 windowRole 过滤；子菜单由 buildTree 挂载
  const topLevelItems = allItems.filter((item) => {
    if (item.parent) return false // 子菜单由父级挂载
    // 顶层菜单的 windowRole 过滤
    if (item.windowRoles && item.windowRoles.length > 0) {
      return item.windowRoles.includes(windowRole)
    }
    if (windowRole === 'main') return true
    // 非 main 窗口：通过路由的 windowRole 判断
    const route = visibleRoutes.find((r) => r.name === item.name)
    if (route) {
      return route.meta.windowRole === windowRole
    }
    return true
  })

  // 子菜单（有 parent）全部参与构建
  const childItems = allItems.filter((item) => item.parent)

  // 构建多级树
  const tree = buildTree([...topLevelItems, ...childItems])

  // 顶层按分组组织
  return groupTopItems(tree)
}

/**
 * 扁平化菜单（用于 Command Palette 搜索、移动端列表）。
 */
export function flattenMenu(menu: MenuItem[]): MenuItem[] {
  const result: MenuItem[] = []
  for (const item of menu) {
    if (item.divider) continue
    result.push(item)
    if (item.children) {
      result.push(...flattenMenu(item.children))
    }
  }
  return result
}

/**
 * 根据当前路径查找高亮的菜单路径。
 *
 * 优先级：
 * 1. 精确匹配 item.path === currentPath
 * 2. item.activeMenu === currentPath
 * 3. item.activeMatch 命中
 * 4. 前缀匹配 currentPath.startsWith(item.path + '/')
 *
 * @returns 高亮菜单路径（命中的 item.path）。
 */
export function findActiveMenuPath(currentPath: string, menu: MenuItem[]): string {
  const flat = flattenMenu(menu)

  // 1. 精确匹配
  for (const item of flat) {
    if (item.path && item.path === currentPath) {
      return item.path
    }
  }

  // 2. activeMenu 匹配
  for (const item of flat) {
    if (item.activeMenu && item.activeMenu === currentPath) {
      return item.path ?? ''
    }
  }

  // 3. activeMatch 匹配
  for (const item of flat) {
    if (item.activeMatch && item.activeMatch.some((p) => currentPath.startsWith(p))) {
      return item.path ?? ''
    }
  }

  // 4. 前缀匹配
  for (const item of flat) {
    if (item.path && currentPath.startsWith(item.path + '/')) {
      return item.path
    }
  }

  return ''
}

/**
 * 查找当前路径的菜单祖先链（用于展开父级菜单）。
 *
 * @returns 从根到命中节点的路径，未命中返回空数组。
 */
export function findActiveMenuChain(currentPath: string, menu: MenuItem[]): MenuItem[] {
  const activePath = findActiveMenuPath(currentPath, menu)
  if (!activePath) return []

  function search(items: MenuItem[], chain: MenuItem[]): MenuItem[] | null {
    for (const item of items) {
      if (item.divider) continue
      const nextChain = [...chain, item]
      if (item.path === activePath) {
        return nextChain
      }
      if (item.children) {
        const found = search(item.children, nextChain)
        if (found) return found
      }
    }
    return null
  }

  return search(menu, []) ?? []
}

/**
 * 判断菜单项是否可点击导航。
 */
export function isNavigable(item: MenuItem): boolean {
  return !item.divider && !item.disabled && !!item.path
}
