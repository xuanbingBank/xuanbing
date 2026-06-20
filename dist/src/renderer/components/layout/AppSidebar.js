"use strict";
/**
 * @file 侧边栏菜单组件，根据权限与窗口角色生成菜单树，支持折叠与多级菜单。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppSidebar = void 0;
const useMenu_1 = require("../../composables/useMenu");
const layout_store_1 = require("../../stores/layout.store");
const permission_store_1 = require("../../stores/permission.store");
exports.AppSidebar = {
    name: 'AppSidebar',
    setup() {
        const layoutStore = (0, layout_store_1.useLayoutStore)();
        const permissionStore = (0, permission_store_1.usePermissionStore)();
        const { menu, activeMenuPath } = (0, useMenu_1.useMenu)();
        // 注入路由上下文
        const router = Vue.inject('router');
        const currentRoute = Vue.inject('currentRoute');
        // 菜单树
        const menuList = menu;
        // 侧栏是否折叠
        const sidebarCollapsed = Vue.computed(() => layoutStore.state.sidebarCollapsed);
        // 当前窗口角色
        const windowRole = Vue.computed(() => permissionStore.state.windowRole);
        // 当前路径
        const currentPath = Vue.computed(() => currentRoute?.value?.path ?? '');
        // 判断菜单项是否激活
        function isActive(item) {
            const active = activeMenuPath(currentPath.value);
            if (active)
                return active === item.path;
            return currentPath.value === item.path;
        }
        // 点击菜单项
        function handleClick(path) {
            if (router) {
                router.navigate(path);
            }
        }
        return {
            menuList,
            sidebarCollapsed,
            windowRole,
            currentPath,
            isActive,
            handleClick
        };
    },
    template: `
    <aside class="bg-base-100 border-r border-base-300 h-full flex flex-col">
      <ul class="menu menu-md w-full p-2 gap-1">
        <li v-for="item in menuList" :key="item.path">
          <!-- 有子菜单 -->
          <template v-if="item.children && item.children.length > 0">
            <a :class="{ active: isActive(item) }">
              <span v-if="item.icon" class="text-base">{{ item.icon }}</span>
              <span v-if="!sidebarCollapsed">{{ item.title }}</span>
            </a>
            <ul v-if="!sidebarCollapsed">
              <li v-for="child in item.children" :key="child.path">
                <a :class="{ active: isActive(child) }" @click="handleClick(child.path)">
                  <span v-if="child.icon" class="text-sm">{{ child.icon }}</span>
                  <span>{{ child.title }}</span>
                </a>
              </li>
            </ul>
          </template>
          <!-- 无子菜单 -->
          <a
            v-else
            :class="{ active: isActive(item) }"
            @click="handleClick(item.path)"
            :title="sidebarCollapsed ? item.title : ''"
          >
            <span v-if="item.icon" class="text-base">{{ item.icon }}</span>
            <span v-if="!sidebarCollapsed">{{ item.title }}</span>
          </a>
        </li>
      </ul>
    </aside>
  `
};
