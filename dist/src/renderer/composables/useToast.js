"use strict";
/**
 * @file Toast 组合式函数，封装 notification store 的便捷方法。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.useToast = useToast;
const notification_store_1 = require("../stores/notification.store");
const base_1 = require("../stores/base");
/**
 * Toast 组合式函数。
 *
 * @returns Toast 操作方法。
 */
function useToast() {
    const store = (0, notification_store_1.useNotificationStore)();
    const toasts = (0, base_1.computedRef)(() => store.state.toasts);
    return {
        toasts,
        success: store.success,
        error: store.error,
        warning: store.warning,
        info: store.info,
        loading: store.loading,
        update: (id, update) => store.updateToast(id, update),
        close: store.removeToast,
        closeAll: store.clearToasts
    };
}
