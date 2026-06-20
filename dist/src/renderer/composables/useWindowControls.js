"use strict";
/**
 * @file 窗口控制组合式函数，封装 window.desktop.window 的全部控制方法。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.useWindowControls = useWindowControls;
/**
 * 窗口控制组合式函数，提供对 window.desktop.window API 的类型安全封装。
 *
 * 该函数不使用生命周期钩子，可在任意位置调用。
 *
 * @returns 窗口控制方法集合。
 */
function useWindowControls() {
    return {
        minimize: (windowId) => window.desktop.window.minimize(windowId),
        maximize: (windowId) => window.desktop.window.maximize(windowId),
        restore: (windowId) => window.desktop.window.restore(windowId),
        close: (windowId) => window.desktop.window.close(windowId),
        hide: (windowId) => window.desktop.window.hide(windowId),
        show: (windowId) => window.desktop.window.show(windowId),
        focus: (target) => window.desktop.window.focus(target),
        reload: (windowId) => window.desktop.window.reload(windowId),
        setTitle: (title, windowId) => window.desktop.window.setTitle(title, windowId),
        open: (role, options) => window.desktop.window.open(role, options),
        closeAll: () => window.desktop.window.closeAll(),
        closeByRole: (role) => window.desktop.window.closeByRole(role)
    };
}
