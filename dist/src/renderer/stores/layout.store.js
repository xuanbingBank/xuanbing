"use strict";
/**
 * @file 布局 Store，管理侧栏折叠、移动端 drawer、布局模式。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLayoutStore = createLayoutStore;
exports.useLayoutStore = useLayoutStore;
exports.initLayoutResizeListener = initLayoutResizeListener;
const base_1 = require("./base");
const constants_1 = require("../constants");
/** 布局 Store 单例 */
let layoutStoreInstance = null;
/** 移动端断点（px） */
const MOBILE_BREAKPOINT = 768;
/**
 * 创建布局 Store。
 */
function createLayoutStore() {
    if (layoutStoreInstance)
        return layoutStoreInstance;
    const state = (0, base_1.defineState)({
        sidebarCollapsed: base_1.storage.get(constants_1.STORAGE_KEYS.SIDEBAR_COLLAPSED, false),
        mobileDrawerOpen: false,
        layoutMode: constants_1.LAYOUTS.BASIC,
        isMobile: typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false
    });
    const sidebarWidthClass = (0, base_1.computedRef)(() => state.sidebarCollapsed ? 'w-16' : 'w-60');
    function toggleSidebar() {
        state.sidebarCollapsed = !state.sidebarCollapsed;
        base_1.storage.set(constants_1.STORAGE_KEYS.SIDEBAR_COLLAPSED, state.sidebarCollapsed);
    }
    function setSidebarCollapsed(collapsed) {
        state.sidebarCollapsed = collapsed;
        base_1.storage.set(constants_1.STORAGE_KEYS.SIDEBAR_COLLAPSED, collapsed);
    }
    function toggleMobileDrawer() {
        state.mobileDrawerOpen = !state.mobileDrawerOpen;
    }
    function closeMobileDrawer() {
        state.mobileDrawerOpen = false;
    }
    function setLayoutMode(mode) {
        state.layoutMode = mode;
    }
    function setIsMobile(isMobile) {
        state.isMobile = isMobile;
        if (!isMobile) {
            state.mobileDrawerOpen = false;
        }
    }
    const store = {
        $id: 'layout',
        state,
        sidebarWidthClass,
        toggleSidebar,
        setSidebarCollapsed,
        toggleMobileDrawer,
        closeMobileDrawer,
        setLayoutMode,
        setIsMobile,
        $reset: () => {
            state.sidebarCollapsed = false;
            state.mobileDrawerOpen = false;
            state.layoutMode = constants_1.LAYOUTS.BASIC;
        }
    };
    (0, base_1.registerStore)(store);
    layoutStoreInstance = store;
    return store;
}
/**
 * 获取布局 Store 单例。
 */
function useLayoutStore() {
    if (!layoutStoreInstance) {
        return createLayoutStore();
    }
    return layoutStoreInstance;
}
/**
 * 初始化窗口尺寸监听，自动更新 isMobile 状态。
 */
function initLayoutResizeListener() {
    const handler = () => {
        const store = useLayoutStore();
        store.setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
}
