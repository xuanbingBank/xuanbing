"use strict";
/**
 * @file 窗口 URL 解析器，根据角色、路由、参数与查询串生成最终加载地址。
 *
 * 仅允许内部路由（来自 WINDOW_ROUTE_MAP 白名单），禁止任何外部 URL。
 * 开发环境使用 Vite dev server，生产环境使用 file:// + hash 路由。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WindowUrlResolver = void 0;
const zod_1 = require("../../ipcBus/shared/zod");
const window_routes_1 = require("../shared/window-routes");
const window_errors_1 = require("../shared/window-errors");
/**
 * 路由参数与查询串的 schema 形状。
 */
const paramsSchema = zod_1.z.object({}).optional();
/**
 * 校验参数对象是否为简单的字符串字典。
 *
 * @param value 待校验值。
 * @returns 是否合法。
 */
function isStringRecord(value) {
    if (value === undefined || value === null) {
        return false;
    }
    if (typeof value !== 'object' || Array.isArray(value)) {
        return false;
    }
    const record = value;
    return Object.values(record).every((item) => typeof item === 'string');
}
/**
 * 将参数对象填充到带 :param 的路由模式中。
 *
 * @param pattern 路由模式，如 /detail/:id。
 * @param params 参数对象。
 * @returns 填充后的具体路由。
 */
function fillRouteParams(pattern, params) {
    const segments = pattern.split('/').map((segment) => {
        if (segment.startsWith(':')) {
            const key = segment.slice(1);
            const value = params[key];
            if (value === undefined) {
                throw (0, window_errors_1.createWindowError)(window_errors_1.WINDOW_ERROR_CODES.validationError, `Missing route param "${key}" for pattern "${pattern}".`);
            }
            return encodeURIComponent(value);
        }
        return segment;
    });
    return segments.join('/');
}
/**
 * 将查询串对象编码为 URL 查询字符串。
 *
 * @param query 查询串对象。
 * @returns 以 ? 开头的查询字符串，无参数时返回空字符串。
 */
function encodeQuery(query) {
    const keys = Object.keys(query);
    if (keys.length === 0) {
        return '';
    }
    const parts = keys.map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`);
    return `?${parts.join('&')}`;
}
/**
 * 将本地 index.html 路径转换为 Electron 可加载的 file URL。
 *
 * @param indexHtmlPath 本地 index.html 绝对路径。
 * @returns 标准 file URL。
 */
function buildFileUrl(indexHtmlPath) {
    const base = indexHtmlPath.replace(/\\/g, '/');
    return base.startsWith('/') ? `file://${base}` : `file:///${base}`;
}
/**
 * 窗口 URL 解析器。
 */
class WindowUrlResolver {
    constructor(options) {
        this.isPackaged = options.isPackaged;
        this.devServerUrl = options.devServerUrl;
        this.indexHtmlPath = options.indexHtmlPath;
        if (!this.indexHtmlPath) {
            throw (0, window_errors_1.createWindowError)(window_errors_1.WINDOW_ERROR_CODES.validationError, 'indexHtmlPath is required for local renderer fallback.');
        }
    }
    /**
     * 解析窗口加载 URL。
     *
     * @param role 窗口角色。
     * @param route 路由路径（来自配置）。
     * @param params 路由参数。
     * @param query 查询串。
     * @returns 最终 URL。
     * @throws WindowError 路由不在白名单或参数缺失时抛出。
     */
    resolveUrl(role, route, params, query) {
        if (!route || typeof route !== 'string') {
            throw (0, window_errors_1.createWindowError)(window_errors_1.WINDOW_ERROR_CODES.routeNotAllowed, `Route must be a non-empty string for role "${role}".`);
        }
        if (!(0, window_routes_1.isRouteAllowedForRole)(role, route)) {
            throw (0, window_errors_1.createWindowError)(window_errors_1.WINDOW_ERROR_CODES.routeNotAllowed, `Route "${route}" is not allowed for role "${role}".`);
        }
        if (params !== undefined && !isStringRecord(params)) {
            throw (0, window_errors_1.createWindowError)(window_errors_1.WINDOW_ERROR_CODES.validationError, 'Route params must be a Record<string, string>.');
        }
        if (query !== undefined && !isStringRecord(query)) {
            throw (0, window_errors_1.createWindowError)(window_errors_1.WINDOW_ERROR_CODES.validationError, 'Query must be a Record<string, string>.');
        }
        const paramsValidation = paramsSchema.safeParse(params ?? {});
        if (!paramsValidation.success) {
            throw (0, window_errors_1.createWindowError)(window_errors_1.WINDOW_ERROR_CODES.validationError, `Invalid params shape: ${paramsValidation.error.message}`);
        }
        let resolvedRoute = route;
        if (route.includes(':')) {
            resolvedRoute = fillRouteParams(route, params ?? {});
        }
        const queryString = encodeQuery(query ?? {});
        if (!this.isPackaged && this.devServerUrl) {
            return `${this.devServerUrl}/#${resolvedRoute}${queryString}`;
        }
        const fileUrl = buildFileUrl(this.indexHtmlPath);
        return `${fileUrl}#${resolvedRoute}${queryString}`;
    }
    /**
     * 获取指定角色的默认路由（用于无显式路由时的回退）。
     *
     * @param role 窗口角色。
     * @returns 默认路由。
     */
    getDefaultRouteForRole(role) {
        return (0, window_routes_1.getDefaultRoute)(role);
    }
    /**
     * 判断路由是否允许在指定角色中打开。
     *
     * @param role 窗口角色。
     * @param route 路由路径。
     * @returns 是否允许。
     */
    isRouteAllowed(role, route) {
        return (0, window_routes_1.isRouteAllowedForRole)(role, route);
    }
    /**
     * 判断给定 URL 是否为内部 URL（dev server 或 file:// + index.html）。
     *
     * @param url 待判断 URL。
     * @returns 是否为内部 URL。
     */
    isInternalUrl(url) {
        if (!url || typeof url !== 'string') {
            return false;
        }
        if (!this.isPackaged && this.devServerUrl) {
            return url === this.devServerUrl || url.startsWith(`${this.devServerUrl}/`);
        }
        const fileUrl = buildFileUrl(this.indexHtmlPath);
        return url === fileUrl || url.startsWith(`${fileUrl}#`);
    }
    /**
     * 获取指定角色的路由白名单。
     *
     * @param role 窗口角色。
     * @returns 允许的路由列表。
     */
    getAllowedRoutes(role) {
        return window_routes_1.WINDOW_ROUTE_MAP[role]?.allowedRoutes ?? [];
    }
    /**
     * 判断路由模式是否匹配具体路径。
     *
     * @param pattern 路由模式。
     * @param actualPath 实际路径。
     * @returns 是否匹配。
     */
    matchRoute(pattern, actualPath) {
        return (0, window_routes_1.matchRoutePattern)(pattern, actualPath);
    }
}
exports.WindowUrlResolver = WindowUrlResolver;
