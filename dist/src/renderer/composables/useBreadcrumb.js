"use strict";
/**
 * @file 面包屑组合式函数，从当前路由的 matchedChain 自动生成面包屑。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.useBreadcrumb = useBreadcrumb;
const base_1 = require("../stores/base");
const route_1 = require("../utils/route");
/**
 * 面包屑组合式函数。
 *
 * 需要传入当前路由的响应式引用。
 *
 * @param currentRoute 当前路由的响应式引用。
 * @returns 面包屑列表。
 */
function useBreadcrumb(currentRoute) {
    const breadcrumbs = (0, base_1.computedRef)(() => {
        const route = currentRoute.value;
        if (!route)
            return [];
        return (0, route_1.buildBreadcrumbs)(route);
    });
    return { breadcrumbs };
}
