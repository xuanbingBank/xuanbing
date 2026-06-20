"use strict";
/**
 * @file 窗口角色常量与辅助函数。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WINDOW_ROLES = void 0;
exports.isWindowRole = isWindowRole;
const window_types_1 = require("./window-types");
Object.defineProperty(exports, "WINDOW_ROLES", { enumerable: true, get: function () { return window_types_1.WINDOW_ROLES; } });
/**
 * 判断字符串是否为合法窗口角色。
 *
 * @param value 待校验值。
 * @returns 是否合法。
 */
function isWindowRole(value) {
    return typeof value === 'string' && window_types_1.WINDOW_ROLES.includes(value);
}
