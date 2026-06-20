"use strict";
/**
 * @file 通知 Store，管理全局 Toast 消息队列。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNotificationStore = createNotificationStore;
exports.useNotificationStore = useNotificationStore;
const base_1 = require("./base");
/** 最大 Toast 数量 */
const MAX_TOASTS = 5;
/** 通知 Store 单例 */
let notificationStoreInstance = null;
/** Toast ID 计数器 */
let toastIdCounter = 0;
/**
 * 生成 Toast ID。
 */
function generateToastId() {
    toastIdCounter += 1;
    return `toast-${Date.now()}-${toastIdCounter}`;
}
/**
 * 创建通知 Store。
 */
function createNotificationStore() {
    if (notificationStoreInstance)
        return notificationStoreInstance;
    const state = (0, base_1.defineState)({
        toasts: [],
        unreadCount: 0
    });
    const hasToasts = (0, base_1.computedRef)(() => state.toasts.length > 0);
    function addToast(toast) {
        const id = generateToastId();
        const item = {
            ...toast,
            id,
            createdAt: Date.now()
        };
        state.toasts.push(item);
        // 超出最大数量时移除最早的
        while (state.toasts.length > MAX_TOASTS) {
            state.toasts.shift();
        }
        // 自动关闭
        if (toast.duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, toast.duration);
        }
        return id;
    }
    function updateToast(id, update) {
        const toast = state.toasts.find((t) => t.id === id);
        if (toast) {
            Object.assign(toast, update);
        }
    }
    function removeToast(id) {
        const index = state.toasts.findIndex((t) => t.id === id);
        if (index >= 0) {
            state.toasts.splice(index, 1);
        }
    }
    function clearToasts() {
        state.toasts = [];
    }
    function success(title, description, duration = 3000) {
        return addToast({ type: 'success', title, description, duration });
    }
    function error(title, description, duration = 5000) {
        return addToast({ type: 'error', title, description, duration });
    }
    function warning(title, description, duration = 4000) {
        return addToast({ type: 'warning', title, description, duration });
    }
    function info(title, description, duration = 3000) {
        return addToast({ type: 'info', title, description, duration });
    }
    function loading(title, description) {
        return addToast({ type: 'loading', title, description, duration: 0 });
    }
    const store = {
        $id: 'notification',
        state,
        hasToasts,
        addToast,
        updateToast,
        removeToast,
        clearToasts,
        success,
        error,
        warning,
        info,
        loading,
        $reset: () => {
            state.toasts = [];
            state.unreadCount = 0;
        }
    };
    (0, base_1.registerStore)(store);
    notificationStoreInstance = store;
    return store;
}
/**
 * 获取通知 Store 单例。
 */
function useNotificationStore() {
    if (!notificationStoreInstance) {
        return createNotificationStore();
    }
    return notificationStoreInstance;
}
