"use strict";
/**
 * @file 权限组合式函数，封装 permission store 的权限判断能力。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.usePermission = usePermission;
const permission_store_1 = require("../stores/permission.store");
/**
 * 权限组合式函数。
 *
 * 注意：权限判断仅用于 UI 体验控制（隐藏/禁用按钮），
 * 真实安全边界在 main 进程 IPC 守卫与路由守卫中强制校验。
 *
 * @returns 权限判断方法。
 */
function usePermission() {
    const store = (0, permission_store_1.usePermissionStore)();
    return {
        permissions: store.allPermissions,
        windowRole: store.state.windowRole,
        hasPermission: store.hasPermission,
        hasAnyPermission: store.hasAnyPermission,
        hasAllPermissions: store.hasAllPermissions,
        hasRole: store.hasRole,
        isWindowRole: store.isWindowRole
    };
}
