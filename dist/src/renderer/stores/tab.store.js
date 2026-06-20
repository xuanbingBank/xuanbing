"use strict";
/**
 * @file 标签页 Store，管理多标签页与 keep-alive 缓存。
 *
 * 标签页按 windowRole 隔离，避免多窗口状态污染。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTabStore = createTabStore;
exports.useTabStore = useTabStore;
const base_1 = require("./base");
/** 标签页 Store 单例 */
let tabStoreInstance = null;
/**
 * 创建标签页 Store。
 */
function createTabStore() {
    if (tabStoreInstance)
        return tabStoreInstance;
    const state = (0, base_1.defineState)({
        tabs: [],
        activePath: '',
        cachedNames: [],
        windowRole: ''
    });
    const activeTab = (0, base_1.computedRef)(() => state.tabs.find((t) => t.path === state.activePath));
    function addTab(tab) {
        const exists = state.tabs.find((t) => t.path === tab.path);
        if (!exists) {
            state.tabs.push(tab);
        }
        else {
            // 更新查询参数
            exists.query = tab.query;
        }
        state.activePath = tab.path;
        if (!state.cachedNames.includes(tab.name)) {
            state.cachedNames.push(tab.name);
        }
    }
    function removeTab(path) {
        const index = state.tabs.findIndex((t) => t.path === path);
        if (index === -1)
            return null;
        const tab = state.tabs[index];
        if (tab.affix)
            return null;
        state.tabs.splice(index, 1);
        removeCache(tab.name);
        // 如果关闭的是当前激活标签，跳转到相邻标签
        if (state.activePath === path) {
            const next = state.tabs[index] || state.tabs[index - 1];
            if (next) {
                state.activePath = next.path;
                return next.path;
            }
            state.activePath = '';
            return '/';
        }
        return null;
    }
    function removeOthers(path) {
        state.tabs = state.tabs.filter((t) => t.path === path || t.affix);
        state.activePath = path;
        // 重建缓存
        state.cachedNames = state.tabs.map((t) => t.name);
    }
    function removeAll() {
        state.tabs = state.tabs.filter((t) => t.affix);
        state.cachedNames = state.tabs.map((t) => t.name);
        const first = state.tabs[0];
        state.activePath = first?.path ?? '/';
    }
    function setActive(path) {
        state.activePath = path;
    }
    function setWindowRole(role) {
        if (state.windowRole !== role) {
            state.windowRole = role;
            state.tabs = [];
            state.activePath = '';
            state.cachedNames = [];
        }
    }
    function addCache(name) {
        if (!state.cachedNames.includes(name)) {
            state.cachedNames.push(name);
        }
    }
    function removeCache(name) {
        const index = state.cachedNames.indexOf(name);
        if (index >= 0) {
            state.cachedNames.splice(index, 1);
        }
    }
    function clearAll() {
        state.tabs = [];
        state.activePath = '';
        state.cachedNames = [];
    }
    const store = {
        $id: 'tab',
        state,
        activeTab,
        addTab,
        removeTab,
        removeOthers,
        removeAll,
        setActive,
        setWindowRole,
        addCache,
        removeCache,
        clearAll,
        $reset: clearAll
    };
    (0, base_1.registerStore)(store);
    tabStoreInstance = store;
    return store;
}
/**
 * 获取标签页 Store 单例。
 */
function useTabStore() {
    if (!tabStoreInstance) {
        return createTabStore();
    }
    return tabStoreInstance;
}
