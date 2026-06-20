"use strict";
/**
 * @file 窗口状态持久化存储，将边界、最大化、全屏、显示器、最近路由等保存到 JSON 文件。
 *
 * 单例窗口按 role 存储，多实例窗口按 instanceKey 存储。
 * 保存操作去抖（300ms），关闭前与退出前强制保存。
 * 恢复时校验显示器是否存在，并自动校正离屏与过小尺寸。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.stateMapSchema = exports.DEFAULT_BOUNDS = exports.WindowStateStore = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const zod_1 = require("../../ipcBus/shared/zod");
const window_display_1 = require("./window-display");
/** 保存去抖时长（毫秒）。 */
const SAVE_DEBOUNCE_MS = 300;
/** 默认窗口边界。 */
const DEFAULT_BOUNDS = { x: 0, y: 0, width: 1024, height: 768 };
exports.DEFAULT_BOUNDS = DEFAULT_BOUNDS;
/** 状态记录 schema。 */
const stateRecordSchema = zod_1.z.object({
    bounds: zod_1.z.object({
        x: zod_1.z.number({ integer: true }),
        y: zod_1.z.number({ integer: true }),
        width: zod_1.z.number({ integer: true, min: 1 }),
        height: zod_1.z.number({ integer: true, min: 1 })
    }),
    isMaximized: zod_1.z.boolean(),
    isFullScreen: zod_1.z.boolean(),
    displayId: zod_1.z.number({ integer: true }),
    lastRoute: zod_1.z.string(),
    lastFocusedAt: zod_1.z.number({ min: 0 })
});
/** 状态映射 schema。 */
const stateMapSchema = zod_1.z.object({});
exports.stateMapSchema = stateMapSchema;
/**
 * 窗口状态存储。
 */
class WindowStateStore {
    constructor(options) {
        /** 内存中的状态映射，key 为 role 或 instanceKey。 */
        this.stateMap = {};
        /** 去抖保存队列。 */
        this.pending = new Map();
        /** 是否已从磁盘加载。 */
        this.loaded = false;
        this.filePath = options.filePath;
        this.screen = options.screen;
    }
    /**
     * 从磁盘加载状态。损坏文件时回退到空映射。
     */
    load() {
        this.loaded = true;
        if (!(0, fs_1.existsSync)(this.filePath)) {
            return;
        }
        try {
            const raw = (0, fs_1.readFileSync)(this.filePath, 'utf8');
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                return;
            }
            const source = parsed;
            const result = {};
            for (const key of Object.keys(source)) {
                const recordResult = stateRecordSchema.safeParse(source[key]);
                if (recordResult.success) {
                    result[key] = recordResult.data;
                }
            }
            for (const key of Object.keys(result)) {
                this.stateMap[key] = result[key];
            }
        }
        catch {
            // 损坏文件回退到空映射。
        }
    }
    /**
     * 保存窗口状态（去抖）。
     *
     * @param key 状态键（role 或 instanceKey）。
     * @param record 状态记录。
     */
    save(key, record) {
        const existing = this.pending.get(key);
        if (existing) {
            existing.record = record;
            return;
        }
        const entry = {
            record,
            timer: null
        };
        entry.timer = setTimeout(() => {
            this.pending.delete(key);
            this.stateMap[key] = record;
            this.flushToDisk();
        }, SAVE_DEBOUNCE_MS);
        this.pending.set(key, entry);
    }
    /**
     * 立即保存指定键（关闭前调用）。
     *
     * @param key 状态键。
     * @param record 状态记录。
     */
    saveNow(key, record) {
        const pending = this.pending.get(key);
        if (pending && pending.timer) {
            clearTimeout(pending.timer);
        }
        this.pending.delete(key);
        this.stateMap[key] = record;
        this.flushToDisk();
    }
    /**
     * 保存全部待写入与内存中的状态（退出前调用）。
     */
    saveAllNow() {
        for (const [key, pending] of this.pending.entries()) {
            if (pending.timer) {
                clearTimeout(pending.timer);
            }
            this.stateMap[key] = pending.record;
        }
        this.pending.clear();
        this.flushToDisk();
    }
    /**
     * 读取窗口状态，并校正显示器与边界。
     *
     * @param key 状态键。
     * @param minWidth 最小宽度。
     * @param minHeight 最小高度。
     * @param maxWidth 最大宽度（可选）。
     * @param maxHeight 最大高度（可选）。
     * @returns 状态记录，未找到时返回 undefined。
     */
    restore(key, minWidth, minHeight, maxWidth, maxHeight) {
        if (!this.loaded) {
            this.load();
        }
        const record = this.stateMap[key];
        if (!record) {
            return undefined;
        }
        const displays = this.screen.getAllDisplays();
        const displayExists = displays.some((display) => display.id === record.displayId);
        if (!displayExists) {
            const primary = (0, window_display_1.getPrimaryDisplay)(this.screen);
            const centered = {
                x: primary.bounds.x + Math.max(0, Math.floor((primary.bounds.width - record.bounds.width) / 2)),
                y: primary.bounds.y + Math.max(0, Math.floor((primary.bounds.height - record.bounds.height) / 2)),
                width: record.bounds.width,
                height: record.bounds.height
            };
            const corrected = (0, window_display_1.autoCorrectBounds)(this.screen, centered, minWidth, minHeight, maxWidth, maxHeight);
            return {
                ...record,
                displayId: primary.id,
                bounds: corrected
            };
        }
        const corrected = (0, window_display_1.autoCorrectBounds)(this.screen, record.bounds, minWidth, minHeight, maxWidth, maxHeight);
        return {
            ...record,
            bounds: corrected
        };
    }
    /**
     * 获取默认状态（无历史记录时使用）。
     *
     * @param width 默认宽度。
     * @param height 默认高度。
     * @param route 初始路由。
     * @returns 默认状态记录。
     */
    getDefaultState(width, height, route) {
        const primary = (0, window_display_1.getPrimaryDisplay)(this.screen);
        return {
            bounds: {
                x: primary.bounds.x + Math.max(0, Math.floor((primary.bounds.width - width) / 2)),
                y: primary.bounds.y + Math.max(0, Math.floor((primary.bounds.height - height) / 2)),
                width,
                height
            },
            isMaximized: false,
            isFullScreen: false,
            displayId: primary.id,
            lastRoute: route,
            lastFocusedAt: Date.now()
        };
    }
    /**
     * 清除指定角色的状态。
     *
     * @param key 状态键。
     */
    clearWindowState(key) {
        const pending = this.pending.get(key);
        if (pending && pending.timer) {
            clearTimeout(pending.timer);
        }
        this.pending.delete(key);
        if (key in this.stateMap) {
            delete this.stateMap[key];
            this.flushToDisk();
        }
    }
    /**
     * 清空全部状态。
     */
    clearAll() {
        for (const pending of this.pending.values()) {
            if (pending.timer) {
                clearTimeout(pending.timer);
            }
        }
        this.pending.clear();
        for (const key of Object.keys(this.stateMap)) {
            delete this.stateMap[key];
        }
        this.flushToDisk();
    }
    /**
     * 销毁存储，取消全部去抖定时器。
     */
    dispose() {
        for (const pending of this.pending.values()) {
            if (pending.timer) {
                clearTimeout(pending.timer);
            }
        }
        this.pending.clear();
    }
    /**
     * 将内存中的状态写入磁盘。
     */
    flushToDisk() {
        try {
            const dir = (0, path_1.dirname)(this.filePath);
            if (!(0, fs_1.existsSync)(dir)) {
                (0, fs_1.mkdirSync)(dir, { recursive: true });
            }
            (0, fs_1.writeFileSync)(this.filePath, JSON.stringify(this.stateMap, null, 2), 'utf8');
        }
        catch (error) {
            console.error('[window-state-store] failed to persist state:', error);
        }
    }
}
exports.WindowStateStore = WindowStateStore;
