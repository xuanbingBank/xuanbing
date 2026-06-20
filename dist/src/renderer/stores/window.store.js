"use strict";
/**
 * @file 窗口 Store，管理当前 Electron 窗口上下文（windowId、role、状态）。
 *
 * 与 useCurrentWindow composable 配合使用：
 * - useCurrentWindow 负责订阅 IPC 事件并更新 store
 * - 其他组件通过 useWindowStore 读取响应式状态
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWindowStore = createWindowStore;
exports.useWindowStore = useWindowStore;
const base_1 = require("./base");
/** 窗口 Store 单例 */
let windowStoreInstance = null;
/**
 * 创建窗口 Store。
 */
function createWindowStore() {
    if (windowStoreInstance)
        return windowStoreInstance;
    const state = (0, base_1.defineState)({
        windowId: 0,
        windowRole: '',
        instanceKey: '',
        isMaximized: false,
        isFocused: false,
        isVisible: true,
        isFullScreen: false,
        isAlwaysOnTop: false,
        initialized: false
    });
    const isElectron = (0, base_1.computedRef)(() => typeof window !== 'undefined' && !!window.desktop);
    function setWindowInfo(info) {
        if (info.windowId !== undefined)
            state.windowId = info.windowId;
        if (info.windowRole !== undefined)
            state.windowRole = info.windowRole;
        if (info.instanceKey !== undefined)
            state.instanceKey = info.instanceKey;
    }
    function updateState(update) {
        Object.assign(state, update);
    }
    function setInitialized() {
        state.initialized = true;
    }
    function reset() {
        state.windowId = 0;
        state.windowRole = '';
        state.instanceKey = '';
        state.isMaximized = false;
        state.isFocused = false;
        state.isVisible = true;
        state.isFullScreen = false;
        state.isAlwaysOnTop = false;
        state.initialized = false;
    }
    const store = {
        $id: 'window',
        state,
        isElectron,
        setWindowInfo,
        updateState,
        setInitialized,
        reset,
        $reset: reset
    };
    (0, base_1.registerStore)(store);
    windowStoreInstance = store;
    return store;
}
/**
 * 获取窗口 Store 单例。
 */
function useWindowStore() {
    if (!windowStoreInstance) {
        return createWindowStore();
    }
    return windowStoreInstance;
}
