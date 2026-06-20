"use strict";
/**
 * @file 窗口生命周期绑定，将 BrowserWindow 与 webContents 的事件桥接到事件总线。
 *
 * 高频事件（move/resize）由事件总线内部去抖，本模块只负责转发。
 * 窗口关闭时保存状态、反注册、清理初始化数据。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WindowLifecycle = void 0;
/**
 * 窗口生命周期绑定器。
 */
class WindowLifecycle {
    constructor(deps) {
        this.deps = deps;
    }
    /**
     * 绑定窗口全部生命周期事件。
     *
     * @param window 目标窗口。
     * @param windowId 窗口 ID。
     * @param role 窗口角色。
     * @param config 窗口配置。
     * @returns 清理函数，调用后移除全部监听器。
     */
    bind(window, windowId, role, config) {
        const { eventBus, registry, stateStore, initPayloadStore } = this.deps;
        const handlers = [];
        const register = (target, event, handler) => {
            target.on(event, handler);
            handlers.push({ event, handler, target });
        };
        const emit = (type, data) => {
            const payload = {
                type,
                windowId,
                role,
                timestamp: Date.now(),
                data
            };
            eventBus.emit(payload);
        };
        register(window, 'ready-to-show', () => {
            emit('window:ready');
        });
        register(window, 'show', () => {
            registry.markFocused(windowId);
            emit('window:shown');
        });
        register(window, 'hide', () => {
            emit('window:hidden');
        });
        register(window, 'focus', () => {
            registry.markFocused(windowId);
            emit('window:focused');
        });
        register(window, 'blur', () => {
            emit('window:blurred');
        });
        register(window, 'move', () => {
            if (window.isDestroyed()) {
                return;
            }
            const bounds = window.getBounds();
            emit('window:moved', { bounds });
        });
        register(window, 'resize', () => {
            if (window.isDestroyed()) {
                return;
            }
            const bounds = window.getBounds();
            emit('window:resized', { bounds });
        });
        register(window, 'maximize', () => {
            emit('window:maximized');
        });
        register(window, 'unmaximize', () => {
            emit('window:unmaximized');
        });
        register(window, 'minimize', () => {
            emit('window:minimized');
        });
        register(window, 'restore', () => {
            emit('window:restored');
        });
        register(window, 'close', () => {
            if (config.rememberBounds && !window.isDestroyed()) {
                const bounds = window.getBounds();
                stateStore.saveNow(this.stateKey(role, windowId, config), {
                    bounds,
                    isMaximized: window.isMaximized(),
                    isFullScreen: window.isFullScreen(),
                    displayId: 0,
                    lastRoute: registry.get(windowId)?.route ?? config.route,
                    lastFocusedAt: Date.now()
                });
            }
            emit('window:closed');
        });
        register(window, 'closed', () => {
            eventBus.markDestroyed(windowId);
            initPayloadStore.cleanupForWindow(windowId);
            registry.unregister(windowId);
            emit('window:destroyed');
        });
        register(window, 'unresponsive', () => {
            emit('window:unresponsive');
        });
        register(window, 'responsive', () => {
            emit('window:responsive');
        });
        const webContents = window.webContents;
        register(webContents, 'render-process-gone', () => {
            emit('window:crashed');
        });
        register(webContents, 'did-fail-load', () => {
            emit('window:load-failed');
        });
        return () => {
            for (const item of handlers) {
                try {
                    item.target.off(item.event, item.handler);
                }
                catch {
                    // 窗口已销毁时 off 可能失败，忽略。
                }
            }
            handlers.length = 0;
        };
    }
    /**
     * 计算状态存储键。
     *
     * 单例窗口按 role，多实例窗口按 instanceKey。
     *
     * @param role 窗口角色。
     * @param windowId 窗口 ID。
     * @param config 窗口配置。
     * @returns 状态键。
     */
    stateKey(role, windowId, config) {
        if (config.singleton) {
            return role;
        }
        const entry = this.deps.registry.get(windowId);
        return entry?.instanceKey ?? `${role}:${windowId}`;
    }
}
exports.WindowLifecycle = WindowLifecycle;
