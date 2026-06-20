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
 * 菜单项（从路由自动生成）。
 */
export interface MenuItem {
  /** 路由名称 */
  name: string
  /** 路由路径 */
  path: string
  /** 菜单标题 */
  title: string
  /** 图标 */
  icon?: string
  /** 排序权重 */
  order: number
  /** 子菜单 */
  children?: MenuItem[]
  /** 高亮路径（用于详情页） */
  activeMenu?: string
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
