"use strict";
/**
 * @file 顶部导航栏组件，包含折叠按钮、面包屑、主题切换、窗口控制与用户菜单。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppHeader = void 0;
const layout_store_1 = require("../../stores/layout.store");
const auth_store_1 = require("../../stores/auth.store");
const AppBreadcrumb_1 = require("./AppBreadcrumb");
const AppThemeToggle_1 = require("./AppThemeToggle");
const AppWindowControls_1 = require("./AppWindowControls");
exports.AppHeader = {
    name: 'AppHeader',
    components: { AppBreadcrumb: AppBreadcrumb_1.AppBreadcrumb, AppThemeToggle: AppThemeToggle_1.AppThemeToggle, AppWindowControls: AppWindowControls_1.AppWindowControls },
    setup() {
        const layoutStore = (0, layout_store_1.useLayoutStore)();
        const authStore = (0, auth_store_1.useAuthStore)();
        // 是否移动端视口
        const isMobile = Vue.computed(() => layoutStore.state.isMobile);
        // 侧栏是否折叠
        const sidebarCollapsed = Vue.computed(() => layoutStore.state.sidebarCollapsed);
        // 是否已登录
        const isLoggedIn = authStore.isLoggedIn;
        // 当前用户信息
        const user = Vue.computed(() => authStore.state.user);
        // 切换侧栏（桌面端折叠 / 移动端 drawer）
        function handleToggle() {
            if (isMobile.value) {
                layoutStore.toggleMobileDrawer();
            }
            else {
                layoutStore.toggleSidebar();
            }
        }
        // 登出
        async function handleLogout() {
            await authStore.logout();
        }
        return {
            isMobile,
            sidebarCollapsed,
            isLoggedIn,
            user,
            handleToggle,
            handleLogout
        };
    },
    template: `
    <header class="navbar bg-base-100 border-b border-base-300 min-h-14 px-4 gap-2">
      <!-- 左侧：折叠按钮 + 应用名称 -->
      <div class="flex items-center gap-2">
        <button class="btn btn-ghost btn-sm btn-circle" @click="handleToggle" aria-label="切换侧栏">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span class="text-lg font-bold hidden sm:inline">All In One</span>
      </div>

      <!-- 中间：面包屑 -->
      <div class="flex-1">
        <AppBreadcrumb />
      </div>

      <!-- 右侧：主题切换 + 窗口控制 + 用户菜单 -->
      <div class="flex items-center gap-1">
        <AppThemeToggle />
        <AppWindowControls />

        <!-- 用户菜单 -->
        <div v-if="isLoggedIn" class="dropdown dropdown-end">
          <div tabindex="0" role="button" class="btn btn-ghost btn-sm btn-circle avatar placeholder">
            <div class="bg-neutral text-neutral-content rounded-full w-8">
              <span class="text-xs">{{ user?.displayName?.charAt(0).toUpperCase() || 'U' }}</span>
            </div>
          </div>
          <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-[1] w-48 p-2 shadow-lg border border-base-300">
            <li class="menu-title">{{ user?.displayName || user?.username || '用户' }}</li>
            <li><a @click="handleLogout">登出</a></li>
          </ul>
        </div>
      </div>
    </header>
  `
};
