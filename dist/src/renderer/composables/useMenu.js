"use strict";
/**
 * @file 菜单组合式函数，从路由表自动生成菜单，响应权限与窗口角色变化。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.useMenu = useMenu;
const base_1 = require("../stores/base");
const menu_1 = require("../utils/menu");
const permission_store_1 = require("../stores/permission.store");
const app_store_1 = require("../stores/app.store");
/**
 * 菜单组合式函数。
 *
 * 菜单根据当前权限与窗口角色自动生成，权限或角色变化时自动更新。
 *
 * @returns 菜单操作方法。
 */
function useMenu() {
    const permissionStore = (0, permission_store_1.usePermissionStore)();
    const appStore = (0, app_store_1.useAppStore)();
    const menu = (0, base_1.computedRef)(() => (0, menu_1.generateMenu)({
        permissions: permissionStore.allPermissions.value,
        windowRole: permissionStore.state.windowRole,
        isDev: appStore.isDev.value
    }));
    function activeMenuPath(currentPath) {
        return (0, menu_1.findActiveMenuPath)(currentPath, menu.value);
    }
    return {
        menu,
        activeMenuPath
    };
}
