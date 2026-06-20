"use strict";
/**
 * @file 渲染层入口，创建哈希路由、注册路由守卫、初始化 stores、挂载 Vue 应用。
 *
 * 渲染层只通过 `window.desktop` 与主进程通信，不直接接触 Electron 或 Node API。
 * Vue 通过 CDN 全局脚本加载，全部 Composition API 通过 `Vue.xxx` 访问。
 *
 * 启动流程：
 * 1. 初始化全部 stores（theme/auth/permission/layout/window/tab/notification）
 * 2. 初始化主题（应用 data-theme 到 <html>）
 * 3. 初始化窗口上下文（从 main 获取 windowId/role/permissions）
 * 4. 创建哈希路由
 * 5. 注册路由守卫
 * 6. 挂载 Vue 应用（根据 route.meta.layout 选择布局）
 */
Object.defineProperty(exports, "__esModule", { value: true });
const router_1 = require("./renderer/router");
const guards_1 = require("./renderer/router/guards");
const pages_1 = require("./renderer/pages");
const useCurrentWindow_1 = require("./renderer/composables/useCurrentWindow");
const useWindowTitle_1 = require("./renderer/composables/useWindowTitle");
/* ───────────────────────── Stores 初始化 ───────────────────────── */
const stores_1 = require("./renderer/stores");
const theme_store_1 = require("./renderer/stores/theme.store");
const auth_store_1 = require("./renderer/stores/auth.store");
const permission_store_1 = require("./renderer/stores/permission.store");
const layout_store_1 = require("./renderer/stores/layout.store");
const window_store_1 = require("./renderer/stores/window.store");
const tab_store_1 = require("./renderer/stores/tab.store");
const app_store_1 = require("./renderer/stores/app.store");
/* ───────────────────────── 布局组件 ───────────────────────── */
const layouts_1 = require("./renderer/layouts");
/* ───────────────────────── 全局组件 ───────────────────────── */
const BaseToast_1 = require("./renderer/components/base/BaseToast");
/* ───────────────────────── 路由工具 ───────────────────────── */
const route_1 = require("./renderer/utils/route");
const constants_1 = require("./renderer/constants");
/**
 * 根据路由 meta.layout 选择布局组件。
 *
 * @param route 当前路由。
 * @returns 布局组件。
 */
function resolveLayout(route) {
    const layout = route.meta.layout;
    switch (layout) {
        case 'basic':
            return layouts_1.BasicLayout;
        case 'blank':
            return layouts_1.BlankLayout;
        case 'auth':
            return layouts_1.AuthLayout;
        case 'window':
            return layouts_1.WindowLayout;
        case 'default':
            return layouts_1.BasicLayout;
        case 'modal':
            return layouts_1.BlankLayout;
        default:
            return layouts_1.BasicLayout;
    }
}
/**
 * 创建并挂载 Vue 应用。
 */
function bootstrap() {
    // 1. 初始化全部 stores
    (0, stores_1.initStores)();
    // 2. 初始化主题
    const themeStore = (0, theme_store_1.useThemeStore)();
    themeStore.initTheme();
    // 3. 初始化应用信息
    const appStore = (0, app_store_1.useAppStore)();
    appStore.initApp();
    // 4. 初始化认证状态恢复
    const authStore = (0, auth_store_1.useAuthStore)();
    authStore.restoreSession();
    // 5. 初始化布局响应式监听
    const cleanupResize = (0, layout_store_1.initLayoutResizeListener)();
    // 6. 获取窗口/权限/tab store
    const windowStore = (0, window_store_1.useWindowStore)();
    const permissionStore = (0, permission_store_1.usePermissionStore)();
    const tabStore = (0, tab_store_1.useTabStore)();
    // 7. 创建哈希路由
    const router = (0, router_1.createHashRouter)();
    // 8. 根组件选项
    const rootComponent = {
        setup() {
            // 获取当前窗口的响应式状态
            const currentWindow = (0, useCurrentWindow_1.useCurrentWindow)();
            // 同步路由标题到窗口标题
            (0, useWindowTitle_1.useWindowTitle)(router);
            // 当前路由状态
            const currentRoute = Vue.ref(router.getCurrentRoute());
            let routerUnsubscribe = null;
            let guardsInitialized = false;
            /**
             * 执行路由守卫，根据结果更新当前路由或重定向。
             *
             * @param route 目标路由。
             */
            const runGuards = (route) => {
                // 同步窗口角色到 permission store
                if (currentWindow.role.value) {
                    permissionStore.setWindowContext(currentWindow.role.value, currentWindow.permissions.value);
                    tabStore.setWindowRole(currentWindow.role.value);
                }
                // 同步窗口信息到 window store
                if (currentWindow.windowId.value) {
                    windowStore.setWindowInfo({
                        windowId: currentWindow.windowId.value,
                        windowRole: currentWindow.role.value,
                        instanceKey: currentWindow.instanceKey.value
                    });
                    windowStore.setInitialized();
                }
                const result = (0, guards_1.executeGuards)(route, currentRoute.value, {
                    windowRole: currentWindow.role.value,
                    permissions: currentWindow.permissions.value,
                    isAuthenticated: authStore.isLoggedIn.value
                });
                if (result.redirect) {
                    router.navigate(result.redirect);
                }
                else {
                    currentRoute.value = route;
                    // 更新页面标题
                    const title = (0, route_1.buildPageTitle)(route, constants_1.APP_INFO.NAME);
                    if (typeof document !== 'undefined') {
                        document.title = title;
                    }
                    // 添加标签页
                    if (!route.meta.hidden) {
                        tabStore.addTab({
                            name: route.name,
                            path: route.path,
                            title: route.meta.title,
                            icon: route.meta.icon,
                            affix: route.meta.affixTab ?? false,
                            closable: route.meta.closableTab ?? true,
                            query: route.query
                        });
                    }
                }
            };
            Vue.onMounted(() => {
                // 订阅路由变更
                routerUnsubscribe = router.onChange((route) => {
                    runGuards(route);
                });
                // 标记应用就绪
                appStore.setReady(true);
            });
            // 监听窗口角色加载完成，执行初始路由守卫
            Vue.watch(() => currentWindow.role.value, ((newRole) => {
                if (typeof newRole === 'string' && newRole !== '' && !guardsInitialized) {
                    guardsInitialized = true;
                    runGuards(router.getCurrentRoute());
                }
            }));
            Vue.onBeforeUnmount(() => {
                routerUnsubscribe?.();
                routerUnsubscribe = null;
                cleanupResize();
            });
            /**
             * 根据当前路由获取页面组件。
             */
            const pageComponent = Vue.computed(() => {
                const name = currentRoute.value.matched.component;
                return pages_1.PAGES[name] || pages_1.PAGES.notFound;
            });
            /**
             * 构造传递给当前页面的属性对象。
             */
            const pageProps = Vue.computed(() => {
                return {
                    params: currentRoute.value.params,
                    query: currentRoute.value.query,
                    meta: currentRoute.value.meta,
                    route: currentRoute.value
                };
            });
            /**
             * 根据当前路由选择布局组件。
             */
            const currentLayout = Vue.computed(() => resolveLayout(currentRoute.value));
            return {
                currentRoute,
                router,
                currentLayout,
                pageComponent,
                pageProps,
                windowId: currentWindow.windowId,
                role: currentWindow.role,
                isMaximized: currentWindow.isMaximized,
                isFocused: currentWindow.isFocused,
                isVisible: currentWindow.isVisible,
                permissions: currentWindow.permissions
            };
        },
        computed: {
            /**
             * 根据当前路由的 component 字段返回对应的页面组件。
             */
            currentPage() {
                return this.pageComponent;
            },
            /**
             * 构造传递给当前页面的属性对象。
             */
            currentPageProps() {
                return this.pageProps;
            }
        },
        methods: {
            /**
             * 导航到指定路径。
             *
             * @param path 目标路径。
             */
            navigate(path) {
                this.router.navigate(path);
            }
        },
        template: `
      <div id="app-root" class="min-h-screen">
        <component :is="currentLayout" />
        <BaseToast />
      </div>
    `
    };
    // 注册全局组件
    const app = Vue.createApp(rootComponent);
    app.component('BaseToast', BaseToast_1.BaseToast);
    // 提供全局上下文（供子组件 inject）
    app.provide('router', router);
    app.provide('currentRoute', Vue.ref(null));
    app.provide('getPageComponent', () => pages_1.PAGES);
    app.provide('getPageProps', () => ({}));
    app.provide('cachedNames', []);
    app.mount('#app');
}
// 启动应用
bootstrap();
