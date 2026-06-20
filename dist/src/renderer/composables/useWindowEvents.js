"use strict";
/**
 * @file 窗口事件订阅组合式函数，提供统一的事件订阅与取消能力。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.useWindowEvents = useWindowEvents;
/**
 * 窗口事件组合式函数。
 *
 * 该函数不使用生命周期钩子，返回的 subscribe 方法可在任意位置调用，
 * 调用方需自行在合适的时机（如 beforeUnmount）调用返回的取消订阅函数。
 *
 * @returns 窗口事件订阅 API。
 */
function useWindowEvents() {
    const subscribe = (handlers) => {
        const unsubscribers = [];
        if (handlers.onStateChanged) {
            unsubscribers.push(window.desktop.window.onStateChanged(handlers.onStateChanged));
        }
        if (handlers.onRouteChanged) {
            unsubscribers.push(window.desktop.window.onRouteChanged(handlers.onRouteChanged));
        }
        if (handlers.onFocusChanged) {
            unsubscribers.push(window.desktop.window.onFocusChanged(handlers.onFocusChanged));
        }
        let disposed = false;
        return () => {
            if (disposed) {
                return;
            }
            disposed = true;
            for (const unsubscribe of unsubscribers) {
                unsubscribe();
            }
        };
    };
    return { subscribe };
}
