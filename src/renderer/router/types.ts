/**
 * @file 路由元信息类型定义，扩展自原有 RouteMeta，新增 layout/menu/breadcrumb 等字段。
 */

import type { LayoutType } from '../constants'

/**
 * 页面组件标识符，与 pages/index.ts 中的页面映射键一一对应。
 */
export type PageComponentName =
  | 'home'
  | 'dashboard'
  | 'settings'
  | 'settingsProfile'
  | 'settingsSecurity'
  | 'about'
  | 'detail'
  | 'taskCenter'
  | 'taskDetail'
  | 'logViewer'
  | 'modal'
  | 'componentDemo'
  | 'fluentUiDemo'
  | 'forbidden'
  | 'notFound'
  | 'serverError'
  | 'login'

/**
 * 路由元信息，描述路由的标题、窗口角色、权限要求、布局、菜单等。
 */
export interface RouteMeta {
  /** 页面标题，会同步到窗口标题与浏览器标签 */
  title: string
  /** 该路由对应的窗口角色 */
  windowRole: string
  /** 是否需要登录认证 */
  requiresAuth: boolean
  /** 进入该路由所需的权限列表（全部满足） */
  permissions: string[]
  /** 进入该路由所需的角色列表（满足其一） */
  roles?: string[]
  /** 是否启用 keepAlive 缓存 */
  keepAlive: boolean
  /** 布局类型 */
  layout: LayoutType | 'default' | 'modal'
  /** 是否允许直接打开（跳过窗口角色白名单校验，用于错误页等兜底路由） */
  allowDirectOpen: boolean
  /** 关闭行为 */
  closeBehavior: string
  /** 是否仅在开发环境可用 */
  devOnly: boolean
  /* ── 新增字段 ── */
  /** 菜单图标（daisyUI/heroicons 类名或 emoji） */
  icon?: string
  /** 是否在菜单中显示 */
  menu?: boolean
  /** 菜单排序权重（越小越靠前） */
  menuOrder?: number
  /** 是否隐藏（不在菜单、面包屑中显示） */
  hidden?: boolean
  /** 是否在面包屑中显示 */
  breadcrumb?: boolean
  /** 是否固定标签页（不可关闭） */
  affixTab?: boolean
  /** 标签页是否可关闭 */
  closableTab?: boolean
  /** 高亮的菜单项路径（用于详情页高亮列表页） */
  activeMenu?: string
  /** 父级路由路径（用于构建多级菜单） */
  parent?: string
  /* ── Fluent 菜单扩展字段 ── */
  /** 菜单分组标识（同 group 的菜单项归为一组显示） */
  group?: string
  /** 允许的窗口角色列表（满足其一即显示，未声明则继承 windowRole） */
  windowRoles?: string[]
  /** 菜单徽标（数字或文本，如 "new" / 5） */
  badge?: string | number
  /** 菜单标签（右侧小标签，如 "Beta"） */
  tag?: string
  /** 快捷键显示文本（如 "Ctrl+K"） */
  shortcut?: string
  /** 额外的路径匹配规则（命中则高亮当前菜单） */
  activeMatch?: string[]
  /** 是否外部链接（新窗口打开） */
  external?: boolean
  /** 菜单描述（用于 tooltip / Command Palette） */
  description?: string
}

/**
 * 单条路由记录，包含路径模式、名称、组件标识与元信息。
 */
export interface RouteRecord {
  /** 路径模式，例如 '/', '/settings', '/detail/:id' */
  path: string
  /** 路由名称，例如 'home', 'settings', 'detail' */
  name: string
  /** 页面组件标识符 */
  component: PageComponentName
  /** 路由元信息 */
  meta: RouteMeta
  /** 子路由（用于嵌套菜单） */
  children?: RouteRecord[]
}

/**
 * 当前路由的完整状态，包含解析后的路径、参数、查询与匹配到的记录。
 */
export interface CurrentRoute {
  /** 实际路径（不含查询字符串） */
  path: string
  /** 路由名称 */
  name: string
  /** 路径参数，例如 { id: '42' } */
  params: Record<string, string>
  /** 查询参数，例如 { tab: 'info' } */
  query: Record<string, string>
  /** 路由元信息 */
  meta: RouteMeta
  /** 匹配到的路由记录 */
  matched: RouteRecord
  /** 匹配链（从根到当前，用于面包屑） */
  matchedChain: RouteRecord[]
}

/**
 * 菜单项（从路由自动生成或手动传入）。
 *
 * 支持多级菜单、分组、权限过滤、windowRole 过滤、badge、tag、shortcut、
 * activeMenu 高亮、外部链接、禁用、隐藏等。
 */
export interface MenuItem {
  /** 唯一标识（默认取路由 name，手动菜单可自定义） */
  id: string
  /** 菜单标题 */
  title: string
  /** 路由路径（叶子节点必填，父级可空） */
  path?: string
  /** 路由名称（从路由生成时填充） */
  name?: string
  /** 图标（emoji 或图标 key，由图标映射层统一渲染） */
  icon?: string
  /** 子菜单 */
  children?: MenuItem[]
  /** 徽标（数字或文本，如 "new" / 5） */
  badge?: string | number
  /** 标签（右侧小标签，如 "Beta"） */
  tag?: string
  /** 是否禁用 */
  disabled?: boolean
  /** 是否隐藏 */
  hidden?: boolean
  /** 是否为分隔线 */
  divider?: boolean
  /** 分组标识（同 group 的菜单项归为一组） */
  group?: string
  /** 排序权重（越小越靠前） */
  order?: number
  /** 进入所需权限列表（全部满足） */
  permissions?: string[]
  /** 进入所需角色列表（满足其一） */
  roles?: string[]
  /** 允许的窗口角色列表（满足其一） */
  windowRoles?: string[]
  /** 是否仅开发环境可见 */
  devOnly?: boolean
  /** 是否外部链接（新窗口打开） */
  external?: boolean
  /** 快捷键显示文本（如 "Ctrl+K"） */
  shortcut?: string
  /** 描述文本（用于 tooltip / Command Palette） */
  description?: string
  /** 高亮路径（用于详情页高亮父菜单） */
  activeMenu?: string
  /** 额外的路径匹配规则（命中则高亮当前菜单） */
  activeMatch?: string[]
  /** 是否在菜单中显示（默认 true） */
  menu?: boolean
  /** 父级路径（用于构建多级菜单） */
  parent?: string
}

/**
 * 面包屑项。
 */
export interface BreadcrumbItem {
  /** 路由名称 */
  name: string
  /** 路由路径 */
  path: string
  /** 标题 */
  title: string
  /** 是否可点击 */
  clickable: boolean
}
