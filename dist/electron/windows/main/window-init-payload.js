"use strict";
/**
 * @file 窗口初始化数据存储，使用一次性令牌在主进程与渲染进程间安全传递 payload。
 *
 * 渲染进程通过 token 拉取数据，仅允许对应 windowId 读取，且只能读一次。
 * 数据有过期时间，过期或被消费后自动清理。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WindowInitPayloadStore = void 0;
const crypto_1 = require("crypto");
const zod_1 = require("../../ipcBus/shared/zod");
const window_types_1 = require("../shared/window-types");
const window_errors_1 = require("../shared/window-errors");
/** 默认单条 payload 最大字节数。 */
const DEFAULT_MAX_PAYLOAD_BYTES = 256 * 1024;
/** 默认过期时间。 */
const DEFAULT_TTL_MS = 60000;
/** 清理周期。 */
const CLEANUP_INTERVAL_MS = 30000;
/** token schema。 */
const tokenSchema = zod_1.z.string({ minLength: 1 });
/** windowId schema。 */
const windowIdSchema = zod_1.z.number({ integer: true, min: 1 });
/** role schema。 */
const roleSchema = zod_1.z.enum(window_types_1.WINDOW_ROLES);
/**
 * 计算值的近似字节大小。
 *
 * @param value 待计算值。
 * @returns 字节大小。
 */
function approximateByteSize(value) {
    try {
        return Buffer.byteLength(JSON.stringify(value), 'utf8');
    }
    catch {
        return Infinity;
    }
}
/**
 * 窗口初始化数据存储。
 */
class WindowInitPayloadStore {
    constructor(options = {}) {
        this.entries = new Map();
        this.cleanupTimer = null;
        this.maxPayloadBytes = options.maxPayloadBytes ?? DEFAULT_MAX_PAYLOAD_BYTES;
        this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
    }
    /**
     * 启动过期清理定时器。
     */
    startCleanup() {
        if (this.cleanupTimer) {
            return;
        }
        this.cleanupTimer = setInterval(() => {
            this.purgeExpired();
        }, CLEANUP_INTERVAL_MS);
        if (this.cleanupTimer && typeof this.cleanupTimer === 'object' && 'unref' in this.cleanupTimer) {
            ;
            this.cleanupTimer.unref();
        }
    }
    /**
     * 停止过期清理定时器。
     */
    stopCleanup() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
    }
    /**
     * 为窗口生成一次性 token 并存储 payload。
     *
     * @param windowId 目标窗口 ID。
     * @param role 窗口角色。
     * @param payload 初始化数据。
     * @returns 一次性 token。
     * @throws WindowError payload 过大或参数非法时抛出。
     */
    create(windowId, role, payload) {
        const windowIdResult = windowIdSchema.safeParse(windowId);
        if (!windowIdResult.success) {
            throw (0, window_errors_1.createWindowError)(window_errors_1.WINDOW_ERROR_CODES.validationError, `Invalid windowId: ${windowIdResult.error.message}`);
        }
        const roleResult = roleSchema.safeParse(role);
        if (!roleResult.success) {
            throw (0, window_errors_1.createWindowError)(window_errors_1.WINDOW_ERROR_CODES.validationError, `Invalid role: ${roleResult.error.message}`);
        }
        const size = approximateByteSize(payload);
        if (size > this.maxPayloadBytes) {
            throw (0, window_errors_1.createWindowError)(window_errors_1.WINDOW_ERROR_CODES.payloadTooLarge, `Payload size ${size} bytes exceeds limit ${this.maxPayloadBytes} bytes.`);
        }
        const token = (0, crypto_1.randomUUID)();
        const now = Date.now();
        const entry = {
            token,
            windowId: windowIdResult.data,
            role: roleResult.data,
            payload,
            createdAt: now,
            expiresAt: now + this.ttlMs,
            consumed: false
        };
        this.entries.set(token, entry);
        return token;
    }
    /**
     * 读取并消费 payload（一次性）。
     *
     * @param token 令牌。
     * @param windowId 请求读取的窗口 ID，必须与存储时一致。
     * @returns payload 读取结果。
     * @throws WindowError token 不存在、过期、已被消费或 windowId 不匹配时抛出。
     */
    consume(token, windowId) {
        const tokenResult = tokenSchema.safeParse(token);
        if (!tokenResult.success) {
            throw (0, window_errors_1.createWindowError)(window_errors_1.WINDOW_ERROR_CODES.initPayloadNotFound, 'Token must be a non-empty string.');
        }
        const windowIdResult = windowIdSchema.safeParse(windowId);
        if (!windowIdResult.success) {
            throw (0, window_errors_1.createWindowError)(window_errors_1.WINDOW_ERROR_CODES.validationError, `Invalid windowId: ${windowIdResult.error.message}`);
        }
        const entry = this.entries.get(tokenResult.data);
        if (!entry) {
            throw (0, window_errors_1.createWindowError)(window_errors_1.WINDOW_ERROR_CODES.initPayloadNotFound, `Init payload token "${token}" not found.`);
        }
        if (entry.windowId !== windowIdResult.data) {
            throw (0, window_errors_1.createWindowError)(window_errors_1.WINDOW_ERROR_CODES.forbidden, `windowId ${windowIdResult.data} is not allowed to read payload for windowId ${entry.windowId}.`);
        }
        const now = Date.now();
        if (now >= entry.expiresAt) {
            this.entries.delete(token);
            throw (0, window_errors_1.createWindowError)(window_errors_1.WINDOW_ERROR_CODES.initPayloadExpired, `Init payload token "${token}" has expired.`);
        }
        if (entry.consumed) {
            this.entries.delete(token);
            throw (0, window_errors_1.createWindowError)(window_errors_1.WINDOW_ERROR_CODES.initPayloadNotFound, `Init payload token "${token}" has already been consumed.`);
        }
        entry.consumed = true;
        const result = {
            token: entry.token,
            payload: entry.payload,
            role: entry.role
        };
        this.entries.delete(token);
        return result;
    }
    /**
     * 仅查看 payload（不消费），用于调试。
     *
     * @param token 令牌。
     * @returns 存储条目（不含 payload 引用计数变化），未找到时返回 undefined。
     */
    peek(token) {
        const entry = this.entries.get(token);
        if (!entry) {
            return undefined;
        }
        return { ...entry, payload: entry.payload };
    }
    /**
     * 清理指定窗口的全部 payload。
     *
     * @param windowId 窗口 ID。
     */
    cleanupForWindow(windowId) {
        for (const [token, entry] of this.entries.entries()) {
            if (entry.windowId === windowId) {
                this.entries.delete(token);
            }
        }
    }
    /**
     * 清理全部已过期条目。
     */
    purgeExpired() {
        const now = Date.now();
        for (const [token, entry] of this.entries.entries()) {
            if (now >= entry.expiresAt || entry.consumed) {
                this.entries.delete(token);
            }
        }
    }
    /**
     * 清空全部存储。
     */
    clear() {
        this.entries.clear();
    }
    /**
     * 获取当前存储条目数量。
     *
     * @returns 条目数量。
     */
    size() {
        return this.entries.size;
    }
}
exports.WindowInitPayloadStore = WindowInitPayloadStore;
