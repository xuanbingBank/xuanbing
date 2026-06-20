"use strict";
/**
 * @file 主题组合式函数，封装 theme store 的常用操作。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.useTheme = useTheme;
const theme_store_1 = require("../stores/theme.store");
const base_1 = require("../stores/base");
/**
 * 主题组合式函数。
 *
 * @returns 主题操作方法。
 */
function useTheme() {
    const store = (0, theme_store_1.useThemeStore)();
    const followSystem = (0, base_1.computedRef)(() => store.state.followSystem);
    return {
        currentTheme: store.currentTheme,
        isDark: store.isDark,
        availableThemes: store.availableThemes,
        followSystem,
        setTheme: store.setTheme,
        toggleDark: store.toggleDark,
        setFollowSystem: store.setFollowSystem,
        initTheme: store.initTheme
    };
}
