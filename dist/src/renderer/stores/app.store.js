"use strict";
/**
 * @file 应用 Store，管理应用级状态（名称、版本、环境、就绪状态）。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAppStore = createAppStore;
exports.useAppStore = useAppStore;
const base_1 = require("./base");
const constants_1 = require("../constants");
/** 应用 Store 单例 */
let appStoreInstance = null;
/**
 * 创建应用 Store。
 */
function createAppStore() {
    if (appStoreInstance)
        return appStoreInstance;
    const state = (0, base_1.defineState)({
        appName: constants_1.APP_INFO.NAME,
        version: constants_1.APP_INFO.VERSION,
        environment: constants_1.APP_INFO.ENVIRONMENT,
        isReady: false,
        platform: 'unknown',
        isElectron: typeof window !== 'undefined' && !!window.desktop
    });
    const isDev = (0, base_1.computedRef)(() => state.environment === 'development');
    const isProd = (0, base_1.computedRef)(() => state.environment === 'production');
    function setReady(ready) {
        state.isReady = ready;
    }
    function setPlatform(platform) {
        state.platform = platform;
    }
    function initApp() {
        // 从 navigator 获取平台信息
        if (typeof navigator !== 'undefined') {
            state.platform = navigator.platform || 'unknown';
        }
    }
    const store = {
        $id: 'app',
        state,
        isDev,
        isProd,
        setReady,
        setPlatform,
        initApp,
        $reset: () => {
            state.isReady = false;
        }
    };
    (0, base_1.registerStore)(store);
    appStoreInstance = store;
    return store;
}
/**
 * 获取应用 Store 单例。
 */
function useAppStore() {
    if (!appStoreInstance) {
        return createAppStore();
    }
    return appStoreInstance;
}
