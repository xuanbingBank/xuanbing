"use strict";
/**
 * @file 窗口角色组合式函数，封装 window store 的窗口角色判断能力。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.useWindowRole = useWindowRole;
const window_store_1 = require("../stores/window.store");
const base_1 = require("../stores/base");
/**
 * 窗口角色组合式函数。
 *
 * @returns 窗口角色判断方法。
 */
function useWindowRole() {
    const store = (0, window_store_1.useWindowStore)();
    const windowRole = (0, base_1.computedRef)(() => store.state.windowRole);
    const windowId = (0, base_1.computedRef)(() => store.state.windowId);
    const isElectron = store.isElectron;
    const isMaximized = (0, base_1.computedRef)(() => store.state.isMaximized);
    const isFocused = (0, base_1.computedRef)(() => store.state.isFocused);
    const isVisible = (0, base_1.computedRef)(() => store.state.isVisible);
    const initialized = (0, base_1.computedRef)(() => store.state.initialized);
    function isRole(role) {
        return store.state.windowRole === role;
    }
    function isRoleIn(roles) {
        return roles.includes(store.state.windowRole);
    }
    return {
        windowRole,
        windowId,
        isElectron,
        isMaximized,
        isFocused,
        isVisible,
        initialized,
        isRole,
        isRoleIn
    };
}
