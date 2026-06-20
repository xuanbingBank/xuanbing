"use strict";
/**
 * @file 窗口管理系统的 zod schema 定义，用于 IPC 请求/响应/事件校验。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentWindowResponseSchema = exports.getInitPayloadResponseSchema = exports.windowRouteChangedEventSchema = exports.windowStateChangedEventSchema = exports.setWindowTitleRequestSchema = exports.windowListResponseSchema = exports.windowRefSchema = exports.windowControlResponseSchema = exports.windowControlRequestSchema = exports.openWindowResponseSchema = exports.openWindowRequestSchema = void 0;
const zod_1 = require("../../ipcBus/shared/zod");
const window_types_1 = require("./window-types");
/**
 * 打开窗口请求 schema。
 */
exports.openWindowRequestSchema = zod_1.z.object({
    role: zod_1.z.enum(window_types_1.WINDOW_ROLES),
    routeName: zod_1.z.string({ minLength: 1 }).optional(),
    params: zod_1.z.object({}).optional(),
    query: zod_1.z.object({}).optional(),
    payload: zod_1.z.unknown().optional(),
    displayTarget: zod_1.z.enum(['primary', 'cursor', 'parent', 'last', 'explicit']).optional(),
    parentWindowId: zod_1.z.number({ integer: true, min: 1 }).optional(),
    title: zod_1.z.string({ minLength: 1, maxLength: 256 }).optional()
});
/**
 * 打开窗口响应 schema。
 */
exports.openWindowResponseSchema = zod_1.z.object({
    windowId: zod_1.z.number({ integer: true, min: 1 }),
    role: zod_1.z.enum(window_types_1.WINDOW_ROLES),
    instanceKey: zod_1.z.string({ minLength: 1 }),
    created: zod_1.z.boolean(),
    route: zod_1.z.string({ minLength: 1 })
});
/**
 * 窗口操作请求 schema（minimize/maximize/close/restore 等）。
 */
exports.windowControlRequestSchema = zod_1.z.object({
    windowId: zod_1.z.number({ integer: true, min: 1 }).optional(),
    role: zod_1.z.enum(window_types_1.WINDOW_ROLES).optional()
});
/**
 * 窗口操作响应 schema。
 */
exports.windowControlResponseSchema = zod_1.z.object({
    windowId: zod_1.z.number({ integer: true, min: 1 }),
    state: zod_1.z.enum(['minimized', 'maximized', 'unmaximized', 'normal', 'closed', 'hidden', 'shown', 'focused', 'restored'])
});
/**
 * 窗口引用 schema（对外安全结构）。
 */
exports.windowRefSchema = zod_1.z.object({
    id: zod_1.z.number({ integer: true, min: 1 }),
    role: zod_1.z.enum(window_types_1.WINDOW_ROLES),
    instanceKey: zod_1.z.string({ minLength: 1 }),
    title: zod_1.z.string(),
    route: zod_1.z.string(),
    createdAt: zod_1.z.number({ min: 0 }),
    focusedAt: zod_1.z.number({ min: 0 }),
    isFocused: zod_1.z.boolean(),
    isVisible: zod_1.z.boolean(),
    isDestroyed: zod_1.z.boolean(),
    isMaximized: zod_1.z.boolean(),
    isMinimized: zod_1.z.boolean(),
    isFullScreen: zod_1.z.boolean(),
    isAlwaysOnTop: zod_1.z.boolean(),
    bounds: zod_1.z.object({
        x: zod_1.z.number({ integer: true }),
        y: zod_1.z.number({ integer: true }),
        width: zod_1.z.number({ integer: true, min: 1 }),
        height: zod_1.z.number({ integer: true, min: 1 })
    }),
    parentId: zod_1.z.number({ integer: true, min: 1 }).optional()
});
/**
 * 窗口列表响应 schema。
 */
exports.windowListResponseSchema = zod_1.z.object({
    windows: zod_1.z.array(exports.windowRefSchema)
});
/**
 * 设置窗口标题请求 schema。
 */
exports.setWindowTitleRequestSchema = zod_1.z.object({
    title: zod_1.z.string({ minLength: 1, maxLength: 256 })
});
/**
 * 窗口状态变化事件 schema。
 */
exports.windowStateChangedEventSchema = zod_1.z.object({
    windowId: zod_1.z.number({ integer: true, min: 1 }),
    role: zod_1.z.enum(window_types_1.WINDOW_ROLES),
    state: zod_1.z.enum([
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
});
/**
 * 窗口路由变化事件 schema。
 */
exports.windowRouteChangedEventSchema = zod_1.z.object({
    windowId: zod_1.z.number({ integer: true, min: 1 }),
    role: zod_1.z.enum(window_types_1.WINDOW_ROLES),
    route: zod_1.z.string({ minLength: 1 })
});
/**
 * 获取初始化数据响应 schema。
 */
exports.getInitPayloadResponseSchema = zod_1.z.object({
    token: zod_1.z.string({ minLength: 1 }),
    payload: zod_1.z.unknown(),
    role: zod_1.z.enum(window_types_1.WINDOW_ROLES)
});
/**
 * 获取当前窗口信息响应 schema。
 */
exports.getCurrentWindowResponseSchema = zod_1.z.object({
    windowId: zod_1.z.number({ integer: true, min: 1 }),
    role: zod_1.z.enum(window_types_1.WINDOW_ROLES),
    instanceKey: zod_1.z.string({ minLength: 1 }),
    permissions: zod_1.z.array(zod_1.z.string({ minLength: 1 }))
});
