/**
 * @file 窗口管理系统的 zod schema 定义，用于 IPC 请求/响应/事件校验。
 */

import { z } from '../../ipcBus/shared/zod'
import { WINDOW_ROLES } from './window-types'
import type { WindowRef } from './window-types'

/**
 * 打开窗口请求 schema。
 */
export const openWindowRequestSchema = z.object({
  role: z.enum(WINDOW_ROLES),
  routeName: z.string({ minLength: 1 }).optional(),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
  payload: z.unknown().optional(),
  displayTarget: z.enum(['primary', 'cursor', 'parent', 'last', 'explicit']).optional(),
  parentWindowId: z.number({ integer: true, min: 1 }).optional(),
  title: z.string({ minLength: 1, maxLength: 256 }).optional()
})

/**
 * 打开窗口响应 schema。
 */
export const openWindowResponseSchema = z.object({
  windowId: z.number({ integer: true, min: 1 }),
  role: z.enum(WINDOW_ROLES),
  instanceKey: z.string({ minLength: 1 }),
  created: z.boolean(),
  route: z.string({ minLength: 1 })
})

/**
 * 窗口操作请求 schema（minimize/maximize/close/restore 等）。
 */
export const windowControlRequestSchema = z.object({
  windowId: z.number({ integer: true, min: 1 }).optional(),
  role: z.enum(WINDOW_ROLES).optional()
})

/**
 * 窗口操作响应 schema。
 */
export const windowControlResponseSchema = z.object({
  windowId: z.number({ integer: true, min: 1 }),
  state: z.enum(['minimized', 'maximized', 'unmaximized', 'normal', 'closed', 'hidden', 'shown', 'focused', 'restored'])
})

/**
 * 窗口引用 schema（对外安全结构）。
 */
export const windowRefSchema = z.object({
  id: z.number({ integer: true, min: 1 }),
  role: z.enum(WINDOW_ROLES),
  instanceKey: z.string({ minLength: 1 }),
  title: z.string(),
  route: z.string(),
  createdAt: z.number({ min: 0 }),
  focusedAt: z.number({ min: 0 }),
  isFocused: z.boolean(),
  isVisible: z.boolean(),
  isDestroyed: z.boolean(),
  isMaximized: z.boolean(),
  isMinimized: z.boolean(),
  isFullScreen: z.boolean(),
  isAlwaysOnTop: z.boolean(),
  bounds: z.object({
    x: z.number({ integer: true }),
    y: z.number({ integer: true }),
    width: z.number({ integer: true, min: 1 }),
    height: z.number({ integer: true, min: 1 })
  }),
  parentId: z.number({ integer: true, min: 1 }).optional()
})

/**
 * 窗口列表响应 schema。
 */
export const windowListResponseSchema = z.object({
  windows: z.array(windowRefSchema)
})

/**
 * 设置窗口标题请求 schema。
 */
export const setWindowTitleRequestSchema = z.object({
  title: z.string({ minLength: 1, maxLength: 256 })
})

/**
 * 窗口状态变化事件 schema。
 */
export const windowStateChangedEventSchema = z.object({
  windowId: z.number({ integer: true, min: 1 }),
  role: z.enum(WINDOW_ROLES),
  state: z.enum([
    'focused',
    'blurred',
    'minimized',
    'maximized',
    'unmaximized',
    'restored',
    'shown',
    'hidden',
    'closed'
  ])
})

/**
 * 窗口路由变化事件 schema。
 */
export const windowRouteChangedEventSchema = z.object({
  windowId: z.number({ integer: true, min: 1 }),
  role: z.enum(WINDOW_ROLES),
  route: z.string({ minLength: 1 })
})

/**
 * 获取初始化数据响应 schema。
 */
export const getInitPayloadResponseSchema = z.object({
  token: z.string({ minLength: 1 }),
  payload: z.unknown(),
  role: z.enum(WINDOW_ROLES)
})

/**
 * 获取当前窗口信息响应 schema。
 */
export const getCurrentWindowResponseSchema = z.object({
  windowId: z.number({ integer: true, min: 1 }),
  role: z.enum(WINDOW_ROLES),
  instanceKey: z.string({ minLength: 1 }),
  permissions: z.array(z.string({ minLength: 1 }))
})

export type OpenWindowRequestInput = { role: string; routeName?: string; params?: Record<string, string>; query?: Record<string, string>; payload?: unknown; displayTarget?: string; parentWindowId?: number; title?: string }
export type OpenWindowResponseOutput = { windowId: number; role: string; instanceKey: string; created: boolean; route: string }
export type WindowControlRequestInput = { windowId?: number; role?: string }
export type WindowControlResponseOutput = { windowId: number; state: string }
export type WindowListResponseOutput = { windows: WindowRef[] }
export type SetWindowTitleRequestInput = { title: string }
export type GetInitPayloadResponseOutput = { token: string; payload: unknown; role: string }
export type GetCurrentWindowResponseOutput = { windowId: number; role: string; instanceKey: string; permissions: string[] }
