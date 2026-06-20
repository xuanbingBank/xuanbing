"use strict";
/**
 * @file 窗口权限常量与默认角色权限映射。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_WINDOW_ROLE_PERMISSIONS = exports.WINDOW_PERMISSIONS = void 0;
exports.isWindowPermission = isWindowPermission;
exports.hasPermission = hasPermission;
const window_types_1 = require("./window-types");
Object.defineProperty(exports, "WINDOW_PERMISSIONS", { enumerable: true, get: function () { return window_types_1.WINDOW_PERMISSIONS; } });
/**
 * 判断字符串是否为合法窗口权限。
 *
 * @param value 待校验值。
 * @returns 是否合法。
 */
function isWindowPermission(value) {
    return typeof value === 'string' && window_types_1.WINDOW_PERMISSIONS.includes(value);
}
/**
 * 默认角色权限映射表。
 *
 * 权限默认 deny，只有在此表中显式声明的角色-权限组合才被允许。
 */
exports.DEFAULT_WINDOW_ROLE_PERMISSIONS = {
    main: [
        'window:open',
        'window:close:self',
        'window:focus',
        'window:list',
        'window:control:self',
        'app:read',
        'app:quit',
        'file:read',
        'file:write',
        'task:run',
        'task:cancel',
        'route:task-center',
        'route:detail'
    ],
    login: [
        'window:close:self',
        'window:control:self',
        'app:read'
    ],
    settings: [
        'window:close:self',
        'window:control:self',
        'window:focus',
        'app:read',
        'file:read',
        'route:settings'
    ],
    about: [
        'window:close:self',
        'window:control:self',
        'app:read'
    ],
    detail: [
        'window:close:self',
        'window:control:self',
        'app:read',
        'route:detail'
    ],
    editor: [
        'window:close:self',
        'window:control:self',
        'app:read'
    ],
    taskCenter: [
        'window:close:self',
        'window:control:self',
        'app:read',
        'task:run',
        'task:cancel',
        'route:task-center'
    ],
    logViewer: [
        'window:close:self',
        'window:control:self',
        'app:read'
    ],
    devtoolsPanel: [
        'window:close:self',
        'window:control:self',
        'window:devtools'
    ],
    floatingToolbox: [
        'window:close:self',
        'window:control:self',
        'app:read'
    ],
    trayPanel: [
        'window:close:self',
        'window:control:self',
        'app:read'
    ],
    modal: [
        'window:close:self',
        'window:control:self',
        'app:read'
    ],
    child: [
        'window:close:self',
        'window:control:self',
        'app:read'
    ],
    hiddenWorker: [
        'app:read'
    ]
};
/**
 * 检查角色是否拥有指定权限。
 *
 * @param role 窗口角色。
 * @param permission 权限名称。
 * @returns 是否拥有。
 */
function hasPermission(role, permission) {
    const permissions = exports.DEFAULT_WINDOW_ROLE_PERMISSIONS[role] ?? [];
    return permissions.includes(permission);
}
