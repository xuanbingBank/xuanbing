"use strict";
/**
 * @file 权限 Store，管理当前用户/窗口的权限与角色，提供权限判断能力。
 *
 * 权限来源：
 * 1. 登录后从后端/IPC 获取的用户权限
 * 2. Electron 窗口角色对应的窗口权限（来自 main 进程）
 *
 * 注意：权限 Store 仅用于 UI 体验控制（隐藏/禁用按钮），
 * 真实安全边界在 main 进程 IPC 守卫与路由守卫中强制校验。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPermissionStore = createPermissionStore;
exports.usePermissionStore = usePermissionStore;
const base_1 = require("./base");
const constants_1 = require("../constants");
/** 权限 Store 单例 */
let permissionStoreInstance = null;
/**
 * 创建权限 Store。
 */
function createPermissionStore() {
    if (permissionStoreInstance)
        return permissionStoreInstance;
    const state = (0, base_1.defineState)({
        permissions: base_1.storage.get(constants_1.STORAGE_KEYS.PERMISSIONS, []),
        roles: [],
        windowRole: '',
        windowPermissions: [],
        initialized: false
    });
    /** 合并用户权限与窗口权限（去重） */
    const allPermissions = (0, base_1.computedRef)(() => {
        const set = new Set([...state.permissions, ...state.windowPermissions]);
        return Array.from(set);
    });
    function setPermissions(permissions) {
        state.permissions = permissions;
        base_1.storage.set(constants_1.STORAGE_KEYS.PERMISSIONS, permissions);
    }
    function setRoles(roles) {
        state.roles = roles;
    }
    function setWindowContext(role, permissions) {
        state.windowRole = role;
        state.windowPermissions = permissions;
        state.initialized = true;
    }
    function hasPermission(permission) {
        return allPermissions.value.includes(permission);
    }
    function hasAnyPermission(permissions) {
        if (permissions.length === 0)
            return true;
        return permissions.some((p) => allPermissions.value.includes(p));
    }
    function hasAllPermissions(permissions) {
        if (permissions.length === 0)
            return true;
        return permissions.every((p) => allPermissions.value.includes(p));
    }
    function hasRole(role) {
        return state.roles.includes(role);
    }
    function isWindowRole(role) {
        return state.windowRole === role;
    }
    function clear() {
        state.permissions = [];
        state.roles = [];
        state.windowPermissions = [];
        base_1.storage.remove(constants_1.STORAGE_KEYS.PERMISSIONS);
    }
    const store = {
        $id: 'permission',
        state,
        allPermissions,
        setPermissions,
        setRoles,
        setWindowContext,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        hasRole,
        isWindowRole,
        clear,
        $reset: () => {
            clear();
            state.windowRole = '';
            state.initialized = false;
        }
    };
    (0, base_1.registerStore)(store);
    permissionStoreInstance = store;
    return store;
}
/**
 * 获取权限 Store 单例。
 */
function usePermissionStore() {
    if (!permissionStoreInstance) {
        return createPermissionStore();
    }
    return permissionStoreInstance;
}
