"use strict";
/**
 * @file 窗口生命周期事件总线，提供去耦的事件订阅与发布能力。
 *
 * 高频事件（move/resize）会被去抖，避免渲染进程被淹没。
 * 已销毁窗口的事件不会被发出。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WindowEventBus = void 0;
const zod_1 = require("../../ipcBus/shared/zod");
const window_types_1 = require("../shared/window-types");
const window_errors_1 = require("../shared/window-errors");
/** 高频事件去抖时长（毫秒）。 */
const HIGH_FREQ_DEBOUNCE_MS = 150;
/** 需要去抖的事件类型集合。 */
const DEBOUNCED_EVENTS = new Set([
    'window:moved',
    'window:resized'
]);
/** 最近事件保留数量。 */
const RECENT_EVENTS_LIMIT = 100;
/** 事件 payload schema。 */
const eventPayloadSchema = zod_1.z.object({
    type: zod_1.z.enum([
        'window:created',
        'window:ready',
        'window:shown',
        'window:hidden',
        'window:focused',
        'window:blurred',
        'window:moved',
        'window:resized',
        'window:maximized',
        'window:unmaximized',
        'window:minimized',
        'window:restored',
        'window:closed',
        'window:destroyed',
        'window:route-changed',
        'window:title-changed',
        'window:crashed',
        'window:unresponsive',
        'window:responsive',
        'window:load-failed'
    ]),
    windowId: zod_1.z.number({ integer: true, min: 1 }),
    role: zod_1.z.enum(window_types_1.WINDOW_ROLES),
    timestamp: zod_1.z.number({ min: 0 }),
    data: zod_1.z.object({}).optional()
});
/**
 * 窗口事件总线。
 */
class WindowEventBus {
    constructor() {
        this.handlers = new Map();
        this.recentEvents = [];
        this.debounced = new Map();
        /** 已销毁窗口集合，用于阻止后续事件。 */
        this.destroyedWindowIds = new Set();
    }
    /**
     * 订阅事件。
     *
     * @param type 事件类型。
     * @param handler 处理器。
     * @returns 取消订阅函数。
     */
    on(type, handler) {
        let set = this.handlers.get(type);
        if (!set) {
            set = new Set();
            this.handlers.set(type, set);
        }
        set.add(handler);
        return () => this.off(type, handler);
    }
    /**
     * 取消订阅。
     *
     * @param type 事件类型。
     * @param handler 处理器。
     */
    off(type, handler) {
        const set = this.handlers.get(type);
        if (set) {
            set.delete(handler);
            if (set.size === 0) {
                this.handlers.delete(type);
            }
        }
    }
    /**
     * 发布事件。
     *
     * @param payload 事件负载。
     * @throws WindowError 校验失败时抛出。
     */
    emit(payload) {
        const result = eventPayloadSchema.safeParse(payload);
        if (!result.success) {
            throw (0, window_errors_1.createWindowError)(window_errors_1.WINDOW_ERROR_CODES.validationError, `Invalid window event payload: ${result.error.message}`);
        }
        const validated = result.data;
        if (validated.type === 'window:destroyed') {
            this.destroyedWindowIds.add(validated.windowId);
        }
        if (this.destroyedWindowIds.has(validated.windowId) && validated.type !== 'window:destroyed') {
            return;
        }
        if (DEBOUNCED_EVENTS.has(validated.type)) {
            this.scheduleDebounced(validated);
            return;
        }
        this.dispatch(validated);
    }
    /**
     * 标记窗口已销毁，阻止后续事件。
     *
     * @param windowId 窗口 ID。
     */
    markDestroyed(windowId) {
        this.destroyedWindowIds.add(windowId);
        this.cancelDebouncedForWindow(windowId);
    }
    /**
     * 清除窗口的销毁标记（用于复用 ID 等极端场景）。
     *
     * @param windowId 窗口 ID。
     */
    unmarkDestroyed(windowId) {
        this.destroyedWindowIds.delete(windowId);
    }
    /**
     * 获取最近事件列表（调试用）。
     *
     * @returns 事件副本。
     */
    getRecentEvents() {
        return this.recentEvents.map((event) => ({ ...event }));
    }
    /**
     * 清空全部订阅与缓存。
     */
    dispose() {
        for (const pending of this.debounced.values()) {
            if (pending.timer) {
                clearTimeout(pending.timer);
            }
        }
        this.debounced.clear();
        this.handlers.clear();
        this.recentEvents.length = 0;
        this.destroyedWindowIds.clear();
    }
    /**
     * 调度去抖事件。
     *
     * @param payload 事件负载。
     */
    scheduleDebounced(payload) {
        const key = `${payload.type}:${payload.windowId}`;
        const existing = this.debounced.get(key);
        if (existing) {
            existing.payload = payload;
            return;
        }
        const entry = {
            payload,
            timer: null
        };
        entry.timer = setTimeout(() => {
            this.debounced.delete(key);
            this.dispatch(entry.payload);
        }, HIGH_FREQ_DEBOUNCE_MS);
        this.debounced.set(key, entry);
    }
    /**
     * 取消指定窗口的全部去抖事件。
     *
     * @param windowId 窗口 ID。
     */
    cancelDebouncedForWindow(windowId) {
        for (const [key, entry] of this.debounced.entries()) {
            if (entry.payload.windowId === windowId) {
                if (entry.timer) {
                    clearTimeout(entry.timer);
                }
                this.debounced.delete(key);
            }
        }
    }
    /**
     * 实际派发事件给订阅者。
     *
     * @param payload 事件负载。
     */
    dispatch(payload) {
        this.recordRecent(payload);
        const set = this.handlers.get(payload.type);
        if (!set) {
            return;
        }
        for (const handler of set) {
            try {
                handler(payload);
            }
            catch (error) {
                console.error('[window-event-bus] handler error:', error);
            }
        }
    }
    /**
     * 记录最近事件。
     *
     * @param payload 事件负载。
     */
    recordRecent(payload) {
        this.recentEvents.push(payload);
        if (this.recentEvents.length > RECENT_EVENTS_LIMIT) {
            this.recentEvents.shift();
        }
    }
}
exports.WindowEventBus = WindowEventBus;
