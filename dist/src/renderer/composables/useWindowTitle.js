"use strict";
/**
 * @file 窗口标题同步组合式函数，在路由变更时自动同步页面标题到窗口标题。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.useWindowTitle = useWindowTitle;
/**
 * 窗口标题组合式函数，在组件 setup 中调用。
 *
 * - 挂载时设置初始标题为当前路由的 meta.title
 * - 订阅路由变更，每次变更时同步窗口标题
 * - 卸载时自动取消订阅
 *
 * @param router 哈希路由实例。
 * @returns 窗口标题 API。
 */
function useWindowTitle(router) {
    let routeUnsubscribe = null;
    Vue.onMounted(() => {
        // 设置初始标题
        const current = router.getCurrentRoute();
        void window.desktop.window.setTitle(current.meta.title);
        // 订阅路由变更，同步窗口标题
        routeUnsubscribe = router.onChange((route) => {
            void window.desktop.window.setTitle(route.meta.title);
        });
    });
    Vue.onBeforeUnmount(() => {
        routeUnsubscribe?.();
    });
    const setTitle = (title) => {
        void window.desktop.window.setTitle(title);
    };
    return { setTitle };
}
