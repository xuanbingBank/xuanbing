"use strict";
/**
 * @file 后台主布局，桌面端侧栏 + 内容区，移动端 drawer 侧栏。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BasicLayout = void 0;
const layout_store_1 = require("../stores/layout.store");
const AppSidebar_1 = require("../components/layout/AppSidebar");
const AppHeader_1 = require("../components/layout/AppHeader");
const AppTabs_1 = require("../components/layout/AppTabs");
const AppContent_1 = require("../components/layout/AppContent");
exports.BasicLayout = {
    name: 'BasicLayout',
    components: { AppSidebar: AppSidebar_1.AppSidebar, AppHeader: AppHeader_1.AppHeader, AppTabs: AppTabs_1.AppTabs, AppContent: AppContent_1.AppContent },
    setup() {
        const layoutStore = (0, layout_store_1.useLayoutStore)();
        // 侧栏是否折叠
        const sidebarCollapsed = Vue.computed(() => layoutStore.state.sidebarCollapsed);
        // 是否移动端
        const isMobile = Vue.computed(() => layoutStore.state.isMobile);
        // 移动端 drawer 是否打开
        const mobileDrawerOpen = Vue.computed(() => layoutStore.state.mobileDrawerOpen);
        // 侧栏宽度类名
        const sidebarWidthClass = layoutStore.sidebarWidthClass;
        // 切换移动端 drawer
        function toggleMobileDrawer() {
            layoutStore.toggleMobileDrawer();
        }
        // 关闭移动端 drawer
        function closeMobileDrawer() {
            layoutStore.closeMobileDrawer();
        }
        return {
            sidebarCollapsed,
            isMobile,
            mobileDrawerOpen,
            sidebarWidthClass,
            toggleMobileDrawer,
            closeMobileDrawer
        };
    },
    template: `
    <div class="h-screen flex">
      <template v-if="isMobile">
        <!-- 移动端 drawer 侧栏 -->
        <div class="drawer">
          <input
            type="checkbox"
            :checked="mobileDrawerOpen"
            @change="toggleMobileDrawer"
            class="drawer-toggle"
          />
          <div class="drawer-content flex flex-col w-full overflow-hidden">
            <AppHeader />
            <AppTabs />
            <AppContent />
          </div>
          <div class="drawer-side">
            <label class="drawer-overlay" @click="closeMobileDrawer"></label>
            <div class="w-64 bg-base-100">
              <AppSidebar />
            </div>
          </div>
        </div>
      </template>
      <template v-else>
        <!-- 桌面端固定侧栏 -->
        <AppSidebar :class="sidebarWidthClass" class="transition-all duration-200" />
        <div class="flex-1 flex flex-col overflow-hidden">
          <AppHeader />
          <AppTabs />
          <AppContent />
        </div>
      </template>
    </div>
  `
};
