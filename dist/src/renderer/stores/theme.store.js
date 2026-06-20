"use strict";
/**
 * @file 主题 Store，管理 daisyUI 主题切换、跟随系统、本地持久化。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createThemeStore = createThemeStore;
exports.useThemeStore = useThemeStore;
const base_1 = require("./base");
const constants_1 = require("../constants");
/** 默认主题 */
const DEFAULT_THEME = constants_1.THEMES.LIGHT;
/**
 * 判断主题是否为深色。
 */
function isDarkTheme(theme) {
    return theme === constants_1.THEMES.DARK || theme === constants_1.THEMES.BUSINESS;
}
/**
 * 读取系统颜色方案偏好。
 */
function readSystemPreference() {
    if (typeof window === 'undefined' || !window.matchMedia)
        return constants_1.THEMES.LIGHT;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? constants_1.THEMES.DARK : constants_1.THEMES.LIGHT;
}
/** 主题 Store 单例 */
let themeStoreInstance = null;
/**
 * 创建主题 Store。
 *
 * @returns 主题 Store 实例。
 */
function createThemeStore() {
    if (themeStoreInstance)
        return themeStoreInstance;
    const state = (0, base_1.defineState)({
        theme: base_1.storage.get(constants_1.STORAGE_KEYS.THEME, DEFAULT_THEME),
        followSystem: base_1.storage.get(constants_1.STORAGE_KEYS.FOLLOW_SYSTEM, true),
        systemPreference: readSystemPreference(),
        initialized: false
    });
    const currentTheme = (0, base_1.computedRef)(() => state.followSystem ? state.systemPreference : state.theme);
    const isDark = (0, base_1.computedRef)(() => isDarkTheme(currentTheme.value));
    /**
     * 应用当前主题到 document.documentElement。
     */
    function applyTheme() {
        if (typeof document === 'undefined')
            return;
        const theme = currentTheme.value;
        document.documentElement.setAttribute('data-theme', theme);
    }
    /**
     * 初始化主题：读取本地存储、监听系统偏好变化。
     */
    function initTheme() {
        if (state.initialized)
            return;
        // 监听系统主题变化
        if (typeof window !== 'undefined' && window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handler = (e) => {
                state.systemPreference = e.matches ? constants_1.THEMES.DARK : constants_1.THEMES.LIGHT;
                if (state.followSystem) {
                    applyTheme();
                }
            };
            // 兼容旧版 Safari
            if (mediaQuery.addEventListener) {
                mediaQuery.addEventListener('change', handler);
            }
            else if (mediaQuery.addListener) {
                mediaQuery.addListener(handler);
            }
        }
        applyTheme();
        state.initialized = true;
    }
    /**
     * 设置主题。
     */
    function setTheme(theme) {
        state.theme = theme;
        state.followSystem = false;
        base_1.storage.set(constants_1.STORAGE_KEYS.THEME, theme);
        base_1.storage.set(constants_1.STORAGE_KEYS.FOLLOW_SYSTEM, false);
        applyTheme();
    }
    /**
     * 切换深浅色。
     */
    function toggleDark() {
        const next = isDarkTheme(state.theme) ? constants_1.THEMES.LIGHT : constants_1.THEMES.DARK;
        setTheme(next);
    }
    /**
     * 设置是否跟随系统主题。
     */
    function setFollowSystem(follow) {
        state.followSystem = follow;
        base_1.storage.set(constants_1.STORAGE_KEYS.FOLLOW_SYSTEM, follow);
        if (follow) {
            state.systemPreference = readSystemPreference();
        }
        applyTheme();
    }
    const store = {
        $id: 'theme',
        state,
        currentTheme,
        availableThemes: constants_1.AVAILABLE_THEMES,
        isDark,
        initTheme,
        setTheme,
        toggleDark,
        setFollowSystem,
        applyTheme,
        $reset: () => {
            state.theme = DEFAULT_THEME;
            state.followSystem = true;
            state.systemPreference = readSystemPreference();
            base_1.storage.remove(constants_1.STORAGE_KEYS.THEME);
            base_1.storage.remove(constants_1.STORAGE_KEYS.FOLLOW_SYSTEM);
            applyTheme();
        }
    };
    (0, base_1.registerStore)(store);
    themeStoreInstance = store;
    return store;
}
/**
 * 获取主题 Store 单例（需先调用 createThemeStore）。
 */
function useThemeStore() {
    if (!themeStoreInstance) {
        return createThemeStore();
    }
    return themeStoreInstance;
}
