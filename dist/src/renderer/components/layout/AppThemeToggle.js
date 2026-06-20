"use strict";
/**
 * @file 主题切换组件，支持主题选择与深浅色快捷切换。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppThemeToggle = void 0;
const theme_store_1 = require("../../stores/theme.store");
exports.AppThemeToggle = {
    name: 'AppThemeToggle',
    setup() {
        const themeStore = (0, theme_store_1.useThemeStore)();
        // 当前主题
        const currentTheme = themeStore.currentTheme;
        // 是否深色
        const isDark = themeStore.isDark;
        // 可用主题列表
        const availableThemes = themeStore.availableThemes;
        // 设置主题
        function setTheme(value) {
            themeStore.setTheme(value);
        }
        // 快捷切换深浅色
        function toggleDark() {
            themeStore.toggleDark();
        }
        return {
            currentTheme,
            isDark,
            availableThemes,
            setTheme,
            toggleDark
        };
    },
    template: `
    <div class="dropdown dropdown-end">
      <div tabindex="0" role="button" class="btn btn-ghost btn-sm btn-circle">
        {{ isDark ? '🌙' : '☀️' }}
      </div>
      <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-[1] w-40 p-2 shadow-lg border border-base-300">
        <li v-for="theme in availableThemes" :key="theme.value">
          <a @click="setTheme(theme.value)" :class="{ active: theme.value === currentTheme }">{{ theme.label }}</a>
        </li>
      </ul>
    </div>
  `
};
