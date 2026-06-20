"use strict";
/**
 * @file 窗口安全守卫函数，统一校验打开请求、权限、路由白名单与开发工具策略。
 *
 * 所有函数返回 { allowed, reason } 或抛出 WindowError，便于上层灵活处理。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateOpenRequest = validateOpenRequest;
exports.checkPermission = checkPermission;
exports.validateRouteForRole = validateRouteForRole;
exports.shouldAllowDevTools = shouldAllowDevTools;
exports.ensureAllowedOrThrow = ensureAllowedOrThrow;
const window_config_1 = require("../shared/window-config");
const window_errors_1 = require("../shared/window-errors");
const window_permissions_1 = require("../shared/window-permissions");
const window_routes_1 = require("../shared/window-routes");
const window_roles_1 = require("../shared/window-roles");
/** payload 最大字节数。 */
const MAX_PAYLOAD_BYTES = 256 * 1024;
/** 环境映射。 */
const ENVIRONMENT_MAP = {
    development: 'devOnly',
    production: 'prodOnly',
    test: null
};
/**
 * 计算值的近似字节大小。
 *
 * @param value 待计算值。
 * @returns 字节大小。
 */
function approximateByteSize(value) {
    if (value === undefined) {
        return 0;
    }
    try {
        return Buffer.byteLength(JSON.stringify(value), 'utf8');
    }
    catch {
        return Infinity;
    }
}
/**
 * 校验打开窗口请求。
 *
 * 校验内容：角色存在、环境允许、路由白名单、payload 大小、单例/多实例规则。
 * 发起方权限校验由调用方通过 checkPermission 完成。
 *
 * @param role 目标角色。
 * @param options 打开参数。
 * @param senderWindowId 发起方窗口 ID（仅用于日志上下文）。
 * @param environment 当前环境。
 * @param existingCount 已存在的同角色实例数。
 * @returns 校验结果。
 */
function validateOpenRequest(role, options, senderWindowId, environment, existingCount) {
    if (!(0, window_roles_1.isWindowRole)(role)) {
        return {
            allowed: false,
            reason: `Unknown window role: ${role}`
        };
    }
    const typedRole = role;
    void senderWindowId;
    let config;
    try {
        config = (0, window_config_1.getWindowConfig)(typedRole);
    }
    catch {
        return {
            allowed: false,
            reason: `Window role "${role}" is not configured.`
        };
    }
    if (config.environment !== 'all') {
        const expectedEnv = ENVIRONMENT_MAP[environment];
        if (expectedEnv !== null && config.environment !== expectedEnv) {
            return {
                allowed: false,
                reason: `Role "${role}" is only allowed in ${config.environment} environment.`
            };
        }
    }
    const routeToCheck = options.routeName ?? config.route;
    if (!(0, window_routes_1.isRouteAllowedForRole)(typedRole, routeToCheck)) {
        return {
            allowed: false,
            reason: `Route "${routeToCheck}" is not allowed for role "${role}".`
        };
    }
    if (options.payload !== undefined) {
        const size = approximateByteSize(options.payload);
        if (size > MAX_PAYLOAD_BYTES) {
            return {
                allowed: false,
                reason: `Payload size ${size} bytes exceeds limit ${MAX_PAYLOAD_BYTES} bytes.`
            };
        }
    }
    if (config.singleton && existingCount > 0) {
        return {
            allowed: false,
            reason: `Singleton role "${role}" already has an instance.`
        };
    }
    if (existingCount >= config.maxInstances) {
        return {
            allowed: false,
            reason: `Role "${role}" reached max instances ${config.maxInstances}.`
        };
    }
    return { allowed: true };
}
/**
 * 检查权限。
 *
 * 控制其他窗口需要 :any 权限，控制自身仅需 :self 权限。
 *
 * @param role 目标角色。
 * @param permission 权限名称。
 * @param senderRole 发起方角色（可选）。
 * @returns 校验结果。
 */
function checkPermission(role, permission, senderRole) {
    if (permission.endsWith(':any')) {
        if (senderRole === undefined) {
            return { allowed: false, reason: 'Sender role is required for :any permission.' };
        }
        if (!(0, window_permissions_1.hasPermission)(senderRole, permission)) {
            return {
                allowed: false,
                reason: `Sender role "${senderRole}" lacks ${permission} permission.`
            };
        }
        return { allowed: true };
    }
    if (permission.endsWith(':self')) {
        if (senderRole === undefined) {
            return { allowed: false, reason: 'Sender role is required for :self permission.' };
        }
        if (senderRole !== role) {
            const anyVariant = permission.replace(':self', ':any');
            if (!(0, window_permissions_1.hasPermission)(senderRole, anyVariant)) {
                return {
                    allowed: false,
                    reason: `Sender role "${senderRole}" cannot control role "${role}" (requires ${anyVariant}).`
                };
            }
            return { allowed: true };
        }
        if (!(0, window_permissions_1.hasPermission)(senderRole, permission)) {
            return {
                allowed: false,
                reason: `Sender role "${senderRole}" lacks ${permission} permission.`
            };
        }
        return { allowed: true };
    }
    if (senderRole !== undefined && !(0, window_permissions_1.hasPermission)(senderRole, permission)) {
        return {
            allowed: false,
            reason: `Sender role "${senderRole}" lacks ${permission} permission.`
        };
    }
    return { allowed: true };
}
/**
 * 校验路由是否允许在指定角色中打开。
 *
 * @param role 窗口角色。
 * @param route 路由路径。
 * @returns 校验结果。
 */
function validateRouteForRole(role, route) {
    if (!route || typeof route !== 'string') {
        return { allowed: false, reason: 'Route must be a non-empty string.' };
    }
    if (!(0, window_routes_1.isRouteAllowedForRole)(role, route)) {
        return {
            allowed: false,
            reason: `Route "${route}" is not allowed for role "${role}".`
        };
    }
    return { allowed: true };
}
/**
 * 判断是否允许打开 DevTools。
 *
 * @param role 窗口角色。
 * @param environment 当前环境。
 * @returns 校验结果。
 */
function shouldAllowDevTools(role, environment) {
    let config;
    try {
        config = (0, window_config_1.getWindowConfig)(role);
    }
    catch {
        return { allowed: false, reason: `Window role "${role}" is not configured.` };
    }
    if (!config.devTools) {
        return { allowed: false, reason: `Role "${role}" has devTools disabled in config.` };
    }
    if (environment === 'production') {
        return { allowed: true, reason: 'DevTools allowed in production by config.' };
    }
    return { allowed: true };
}
/**
 * 抛出 WindowError（用于需要中断流程的场景）。
 *
 * @param result 校验结果。
 * @param code 错误码。
 */
function ensureAllowedOrThrow(result, code = window_errors_1.WINDOW_ERROR_CODES.forbidden) {
    if (!result.allowed) {
        throw (0, window_errors_1.createWindowError)(code, result.reason ?? 'Guard rejected.');
    }
}
