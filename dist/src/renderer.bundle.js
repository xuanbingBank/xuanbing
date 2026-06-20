/**
 * @file renderer bundle，由 scripts/build-renderer-bundle.js 自动生成。
 */
;(function () {
  var __rendererModules = {
"src/renderer.js": [function(require, module, exports) {
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
        render: (function () {
const { resolveDynamicComponent: _resolveDynamicComponent, openBlock: _openBlock, createBlock: _createBlock, resolveComponent: _resolveComponent, createVNode: _createVNode, createElementBlock: _createElementBlock } = Vue

return function render(_ctx, _cache) {
  const _component_BaseToast = _resolveComponent("BaseToast")

  return (_openBlock(), _createElementBlock("div", {
    id: "app-root",
    class: "min-h-screen"
  }, [
    (_openBlock(), _createBlock(_resolveDynamicComponent(_ctx.currentLayout))),
    _createVNode(_component_BaseToast)
  ]))
}
})()
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

}, {"./renderer/router":"src/renderer/router/index.js","./renderer/router/guards":"src/renderer/router/guards.js","./renderer/pages":"src/renderer/pages/index.js","./renderer/composables/useCurrentWindow":"src/renderer/composables/useCurrentWindow.js","./renderer/composables/useWindowTitle":"src/renderer/composables/useWindowTitle.js","./renderer/stores":"src/renderer/stores/index.js","./renderer/stores/theme.store":"src/renderer/stores/theme.store.js","./renderer/stores/auth.store":"src/renderer/stores/auth.store.js","./renderer/stores/permission.store":"src/renderer/stores/permission.store.js","./renderer/stores/layout.store":"src/renderer/stores/layout.store.js","./renderer/stores/window.store":"src/renderer/stores/window.store.js","./renderer/stores/tab.store":"src/renderer/stores/tab.store.js","./renderer/stores/app.store":"src/renderer/stores/app.store.js","./renderer/layouts":"src/renderer/layouts/index.js","./renderer/components/base/BaseToast":"src/renderer/components/base/BaseToast.js","./renderer/utils/route":"src/renderer/utils/route.js","./renderer/constants":"src/renderer/constants/index.js"}],
"src/renderer/router/index.js": [function(require, module, exports) {
"use strict";
/**
 * @file 轻量哈希路由实现，不依赖 vue-router，通过 window.location.hash 管理路由状态。
 *
 * 支持：
 * - 路径参数提取（:param）
 * - 查询字符串解析
 * - catch-all 通配匹配（:pathMatch(.*)*）
 * - matchedChain 构建（用于面包屑）
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HashRouter = void 0;
exports.createHashRouter = createHashRouter;
const routes_1 = require("./routes");
/**
 * 哈希路由类，提供路径解析、路由匹配、导航与变更订阅能力。
 */
class HashRouter {
    /**
     * @param routeList 路由记录列表，默认使用 routes.ts 中声明的全部路由。
     */
    constructor(routeList = routes_1.routes) {
        this.routeList = routeList;
        this.listeners = new Set();
        // 初始化时读取当前哈希，若为空则默认跳转到 '/'
        if (!window.location.hash || window.location.hash === '#') {
            window.location.hash = '#/';
        }
        // 绑定 hashchange 事件处理器
        this.hashChangeHandler = () => {
            const route = this.getCurrentRoute();
            for (const listener of this.listeners) {
                listener(route);
            }
        };
        window.addEventListener('hashchange', this.hashChangeHandler);
    }
    /**
     * 解析哈希字符串，提取路径与查询参数。
     *
     * @param hash 哈希字符串，例如 '#/detail/42?tab=info'。
     * @returns 解析结果，包含 path 与 query。
     */
    parseHash(hash) {
        let raw = hash;
        if (raw.startsWith('#')) {
            raw = raw.slice(1);
        }
        const questionIndex = raw.indexOf('?');
        const pathPart = questionIndex >= 0 ? raw.slice(0, questionIndex) : raw;
        const queryPart = questionIndex >= 0 ? raw.slice(questionIndex + 1) : '';
        const path = pathPart || '/';
        const query = {};
        if (queryPart) {
            for (const pair of queryPart.split('&')) {
                if (!pair) {
                    continue;
                }
                const equalIndex = pair.indexOf('=');
                const key = equalIndex >= 0 ? pair.slice(0, equalIndex) : pair;
                const value = equalIndex >= 0 ? pair.slice(equalIndex + 1) : '';
                if (key) {
                    query[decodeURIComponent(key)] = decodeURIComponent(value);
                }
            }
        }
        return { path, query };
    }
    /**
     * 将实际路径与路由模式匹配，支持 `:param` 参数提取与 `:pathMatch(.*)*` 通配。
     *
     * @param path 实际路径，例如 '/detail/42'。
     * @returns 匹配结果，未匹配时返回 null。
     */
    matchRoute(path) {
        const pathParts = path.split('/').filter(Boolean);
        // 优先匹配非通配路由
        for (const record of this.routeList) {
            // 跳过 catch-all 路由，最后处理
            if (record.path.includes(':pathMatch')) {
                continue;
            }
            const patternParts = record.path.split('/').filter(Boolean);
            if (patternParts.length !== pathParts.length) {
                continue;
            }
            const params = {};
            let matched = true;
            for (let i = 0; i < patternParts.length; i++) {
                const patternSegment = patternParts[i];
                const pathSegment = pathParts[i];
                if (patternSegment.startsWith(':')) {
                    params[patternSegment.slice(1)] = decodeURIComponent(pathSegment);
                }
                else if (patternSegment !== pathSegment) {
                    matched = false;
                    break;
                }
            }
            if (matched) {
                return { record, params };
            }
        }
        // 匹配 catch-all 路由
        const catchAll = this.routeList.find((r) => r.path.includes(':pathMatch'));
        if (catchAll) {
            return {
                record: catchAll,
                params: { pathMatch: pathParts.join('/') }
            };
        }
        return null;
    }
    /**
     * 构建匹配链（用于面包屑）。
     *
     * 根据当前路由的 meta.parent 字段向上回溯，构建从根到当前的完整链路。
     *
     * @param record 当前匹配的路由记录。
     * @returns 匹配链。
     */
    buildMatchedChain(record) {
        const chain = [record];
        let current = record;
        // 向上查找父级路由
        while (current.meta.parent) {
            const parent = this.routeList.find((r) => r.path === current.meta.parent);
            if (!parent || chain.includes(parent)) {
                break;
            }
            chain.unshift(parent);
            current = parent;
        }
        return chain;
    }
    /**
     * 获取当前路由的完整状态。
     *
     * @returns 当前路由对象。
     */
    getCurrentRoute() {
        const { path, query } = this.parseHash(window.location.hash);
        const match = this.matchRoute(path);
        if (!match) {
            // 未匹配到路由时，返回 notFound 兜底路由
            const notFound = this.routeList.find((route) => route.name === 'notFound');
            if (notFound) {
                return {
                    path,
                    name: 'notFound',
                    params: {},
                    query,
                    meta: notFound.meta,
                    matched: notFound,
                    matchedChain: [notFound]
                };
            }
            // 无 notFound 兜底路由时，返回一个空对象避免崩溃
            throw new Error('Route not found and no fallback route configured');
        }
        const matchedChain = this.buildMatchedChain(match.record);
        return {
            path,
            name: match.record.name,
            params: match.params,
            query,
            meta: match.record.meta,
            matched: match.record,
            matchedChain
        };
    }
    /**
     * 导航到指定路径，通过设置 window.location.hash 触发路由变更。
     *
     * @param path 目标路径，例如 '/settings' 或 '/detail/42?tab=info'。
     */
    navigate(path) {
        const target = path.startsWith('#') ? path : '#' + path;
        if (window.location.hash === target) {
            // 哈希未变化时手动触发一次，确保回调执行
            this.hashChangeHandler();
        }
        else {
            window.location.hash = target;
        }
    }
    /**
     * 订阅路由变更事件。
     *
     * @param callback 路由变更回调。
     * @returns 取消订阅函数。
     */
    onChange(callback) {
        this.listeners.add(callback);
        return () => {
            this.listeners.delete(callback);
        };
    }
    /**
     * 根据路由名称与参数构建完整路径字符串。
     *
     * @param name 路由名称。
     * @param params 路径参数。
     * @param query 查询参数。
     * @returns 构建出的路径，例如 '/detail/42?tab=info'。
     */
    buildPath(name, params, query) {
        const record = this.routeList.find((route) => route.name === name);
        if (!record) {
            return '/';
        }
        let path = record.path;
        if (params) {
            for (const [key, value] of Object.entries(params)) {
                path = path.replace(`:${key}`, encodeURIComponent(value));
            }
        }
        if (query && Object.keys(query).length > 0) {
            const queryString = Object.entries(query)
                .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
                .join('&');
            path += `?${queryString}`;
        }
        return path;
    }
    /**
     * 销毁路由器，移除全部事件监听。
     */
    destroy() {
        window.removeEventListener('hashchange', this.hashChangeHandler);
        this.listeners.clear();
    }
}
exports.HashRouter = HashRouter;
/**
 * 创建哈希路由实例的工厂函数。
 *
 * @param routeList 可选的自定义路由列表。
 * @returns 哈希路由实例。
 */
function createHashRouter(routeList) {
    return new HashRouter(routeList);
}

}, {"./routes":"src/renderer/router/routes.js"}],
"src/renderer/router/routes.js": [function(require, module, exports) {
"use strict";
/**
 * @file 全部路由记录的集中声明，每条路由包含路径、名称、组件标识与元信息。
 *
 * 菜单、面包屑、标签页均从此路由表自动生成，禁止手写第二套菜单。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.routes = void 0;
exports.findRouteByName = findRouteByName;
exports.findRouteByPath = findRouteByPath;
const constants_1 = require("../constants");
/**
 * 全部路由记录列表。
 *
 * 顺序不影响匹配结果，匹配时按精确路径优先（无参数的路由自然优先匹配）。
 */
exports.routes = [
    /* ── 首页 / 仪表盘 ── */
    {
        path: constants_1.ROUTE_PATHS.HOME,
        name: constants_1.ROUTE_NAMES.HOME,
        component: 'home',
        meta: {
            title: '首页',
            windowRole: 'main',
            requiresAuth: false,
            permissions: [],
            keepAlive: true,
            layout: constants_1.LAYOUTS.BASIC,
            allowDirectOpen: true,
            closeBehavior: 'close',
            devOnly: false,
            icon: '🏠',
            menu: true,
            menuOrder: 1,
            breadcrumb: true,
            affixTab: true,
            closableTab: false
        }
    },
    {
        path: constants_1.ROUTE_PATHS.DASHBOARD,
        name: constants_1.ROUTE_NAMES.DASHBOARD,
        component: 'dashboard',
        meta: {
            title: '仪表盘',
            windowRole: 'main',
            requiresAuth: false,
            permissions: [],
            keepAlive: true,
            layout: constants_1.LAYOUTS.BASIC,
            allowDirectOpen: true,
            closeBehavior: 'close',
            devOnly: false,
            icon: '📊',
            menu: true,
            menuOrder: 2,
            breadcrumb: true,
            affixTab: false,
            closableTab: true
        }
    },
    /* ── 登录 ── */
    {
        path: constants_1.ROUTE_PATHS.LOGIN,
        name: constants_1.ROUTE_NAMES.LOGIN,
        component: 'login',
        meta: {
            title: '登录',
            windowRole: 'login',
            requiresAuth: false,
            permissions: [],
            keepAlive: false,
            layout: constants_1.LAYOUTS.AUTH,
            allowDirectOpen: true,
            closeBehavior: 'close',
            devOnly: false,
            hidden: true
        }
    },
    /* ── 设置（含子页） ── */
    {
        path: constants_1.ROUTE_PATHS.SETTINGS,
        name: constants_1.ROUTE_NAMES.SETTINGS,
        component: 'settings',
        meta: {
            title: '设置',
            windowRole: 'settings',
            requiresAuth: true,
            permissions: [constants_1.PERMISSIONS.ROUTE_SETTINGS],
            keepAlive: false,
            layout: constants_1.LAYOUTS.BASIC,
            allowDirectOpen: false,
            closeBehavior: 'close',
            devOnly: false,
            icon: '⚙️',
            menu: true,
            menuOrder: 90,
            breadcrumb: true,
            closableTab: true
        }
    },
    {
        path: constants_1.ROUTE_PATHS.SETTINGS_PROFILE,
        name: constants_1.ROUTE_NAMES.SETTINGS_PROFILE,
        component: 'settingsProfile',
        meta: {
            title: '个人资料',
            windowRole: 'settings',
            requiresAuth: true,
            permissions: [constants_1.PERMISSIONS.ROUTE_SETTINGS],
            keepAlive: false,
            layout: constants_1.LAYOUTS.BASIC,
            allowDirectOpen: false,
            closeBehavior: 'close',
            devOnly: false,
            icon: '👤',
            menu: true,
            menuOrder: 91,
            breadcrumb: true,
            parent: constants_1.ROUTE_PATHS.SETTINGS,
            closableTab: true
        }
    },
    {
        path: constants_1.ROUTE_PATHS.SETTINGS_SECURITY,
        name: constants_1.ROUTE_NAMES.SETTINGS_SECURITY,
        component: 'settingsSecurity',
        meta: {
            title: '安全设置',
            windowRole: 'settings',
            requiresAuth: true,
            permissions: [constants_1.PERMISSIONS.ROUTE_SETTINGS],
            keepAlive: false,
            layout: constants_1.LAYOUTS.BASIC,
            allowDirectOpen: false,
            closeBehavior: 'close',
            devOnly: false,
            icon: '🔒',
            menu: true,
            menuOrder: 92,
            breadcrumb: true,
            parent: constants_1.ROUTE_PATHS.SETTINGS,
            closableTab: true
        }
    },
    /* ── 任务中心 ── */
    {
        path: constants_1.ROUTE_PATHS.TASK_CENTER,
        name: constants_1.ROUTE_NAMES.TASK_CENTER,
        component: 'taskCenter',
        meta: {
            title: '任务中心',
            windowRole: 'taskCenter',
            requiresAuth: true,
            permissions: [constants_1.PERMISSIONS.ROUTE_TASK_CENTER],
            keepAlive: false,
            layout: constants_1.LAYOUTS.BASIC,
            allowDirectOpen: false,
            closeBehavior: 'hide',
            devOnly: false,
            icon: '📋',
            menu: true,
            menuOrder: 50,
            breadcrumb: true,
            closableTab: true
        }
    },
    {
        path: constants_1.ROUTE_PATHS.TASK_DETAIL,
        name: constants_1.ROUTE_NAMES.TASK_DETAIL,
        component: 'taskDetail',
        meta: {
            title: '任务详情',
            windowRole: 'taskCenter',
            requiresAuth: true,
            permissions: [constants_1.PERMISSIONS.ROUTE_TASK_CENTER],
            keepAlive: false,
            layout: constants_1.LAYOUTS.BASIC,
            allowDirectOpen: false,
            closeBehavior: 'close',
            devOnly: false,
            hidden: true,
            breadcrumb: true,
            activeMenu: constants_1.ROUTE_PATHS.TASK_CENTER,
            closableTab: true
        }
    },
    /* ── 关于 ── */
    {
        path: constants_1.ROUTE_PATHS.ABOUT,
        name: constants_1.ROUTE_NAMES.ABOUT,
        component: 'about',
        meta: {
            title: '关于',
            windowRole: 'about',
            requiresAuth: false,
            permissions: [],
            keepAlive: false,
            layout: constants_1.LAYOUTS.BASIC,
            allowDirectOpen: false,
            closeBehavior: 'close',
            devOnly: false,
            icon: 'ℹ️',
            menu: true,
            menuOrder: 100,
            breadcrumb: true,
            closableTab: true
        }
    },
    /* ── 组件演示（仅开发环境） ── */
    {
        path: constants_1.ROUTE_PATHS.COMPONENT_DEMO,
        name: constants_1.ROUTE_NAMES.COMPONENT_DEMO,
        component: 'componentDemo',
        meta: {
            title: '组件演示',
            windowRole: 'main',
            requiresAuth: false,
            permissions: [],
            keepAlive: false,
            layout: constants_1.LAYOUTS.BASIC,
            allowDirectOpen: true,
            closeBehavior: 'close',
            devOnly: true,
            icon: '🧪',
            menu: true,
            menuOrder: 999,
            breadcrumb: true,
            closableTab: true
        }
    },
    /* ── 详情页（独立窗口） ── */
    {
        path: '/detail/:id',
        name: 'detail',
        component: 'detail',
        meta: {
            title: '详情',
            windowRole: 'detail',
            requiresAuth: true,
            permissions: [constants_1.PERMISSIONS.ROUTE_DETAIL],
            keepAlive: false,
            layout: constants_1.LAYOUTS.BASIC,
            allowDirectOpen: false,
            closeBehavior: 'close',
            devOnly: false,
            hidden: true,
            breadcrumb: true
        }
    },
    /* ── 日志查看器 ── */
    {
        path: '/log-viewer',
        name: 'logViewer',
        component: 'logViewer',
        meta: {
            title: '日志查看器',
            windowRole: 'logViewer',
            requiresAuth: true,
            permissions: [],
            keepAlive: false,
            layout: constants_1.LAYOUTS.BASIC,
            allowDirectOpen: false,
            closeBehavior: 'close',
            devOnly: false,
            icon: '📜',
            menu: true,
            menuOrder: 60,
            breadcrumb: true,
            closableTab: true
        }
    },
    /* ── 弹窗页 ── */
    {
        path: '/modal/:type',
        name: 'modal',
        component: 'modal',
        meta: {
            title: '弹窗',
            windowRole: 'modal',
            requiresAuth: false,
            permissions: [],
            keepAlive: false,
            layout: 'modal',
            allowDirectOpen: false,
            closeBehavior: 'close',
            devOnly: false,
            hidden: true
        }
    },
    /* ── 错误页 ── */
    {
        path: constants_1.ROUTE_PATHS.FORBIDDEN,
        name: constants_1.ROUTE_NAMES.FORBIDDEN,
        component: 'forbidden',
        meta: {
            title: '无权访问',
            windowRole: 'main',
            requiresAuth: false,
            permissions: [],
            keepAlive: false,
            layout: constants_1.LAYOUTS.BLANK,
            allowDirectOpen: true,
            closeBehavior: 'close',
            devOnly: false,
            hidden: true
        }
    },
    {
        path: constants_1.ROUTE_PATHS.NOT_FOUND,
        name: constants_1.ROUTE_NAMES.NOT_FOUND,
        component: 'notFound',
        meta: {
            title: '页面不存在',
            windowRole: 'main',
            requiresAuth: false,
            permissions: [],
            keepAlive: false,
            layout: constants_1.LAYOUTS.BLANK,
            allowDirectOpen: true,
            closeBehavior: 'close',
            devOnly: false,
            hidden: true
        }
    },
    {
        path: constants_1.ROUTE_PATHS.SERVER_ERROR,
        name: constants_1.ROUTE_NAMES.SERVER_ERROR,
        component: 'serverError',
        meta: {
            title: '服务器错误',
            windowRole: 'main',
            requiresAuth: false,
            permissions: [],
            keepAlive: false,
            layout: constants_1.LAYOUTS.BLANK,
            allowDirectOpen: true,
            closeBehavior: 'close',
            devOnly: false,
            hidden: true
        }
    },
    /* ── catch-all 404 ── */
    {
        path: '/:pathMatch(.*)*',
        name: 'catchAll',
        component: 'notFound',
        meta: {
            title: '页面不存在',
            windowRole: 'main',
            requiresAuth: false,
            permissions: [],
            keepAlive: false,
            layout: constants_1.LAYOUTS.BLANK,
            allowDirectOpen: true,
            closeBehavior: 'close',
            devOnly: false,
            hidden: true
        }
    }
];
/**
 * 按路由名称查找路由记录。
 *
 * @param name 路由名称。
 * @returns 路由记录，未找到时返回 undefined。
 */
function findRouteByName(name) {
    return exports.routes.find((route) => route.name === name);
}
/**
 * 按路由路径查找路由记录（精确匹配，不含参数）。
 *
 * @param path 路由路径。
 * @returns 路由记录，未找到时返回 undefined。
 */
function findRouteByPath(path) {
    return exports.routes.find((route) => route.path === path);
}

}, {"../constants":"src/renderer/constants/index.js"}],
"src/renderer/constants/index.js": [function(require, module, exports) {
"use strict";
/**
 * @file 全局常量定义，包含路由名称、权限、主题、存储键等。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.APP_INFO = exports.STORAGE_KEYS = exports.PERMISSIONS = exports.AVAILABLE_THEMES = exports.THEMES = exports.LAYOUTS = exports.ROUTE_PATHS = exports.ROUTE_NAMES = void 0;
/* ───────────────────────── 路由名称 ───────────────────────── */
exports.ROUTE_NAMES = {
    HOME: 'home',
    DASHBOARD: 'dashboard',
    LOGIN: 'login',
    SETTINGS: 'settings',
    SETTINGS_PROFILE: 'settingsProfile',
    SETTINGS_SECURITY: 'settingsSecurity',
    TASK_CENTER: 'taskCenter',
    TASK_DETAIL: 'taskDetail',
    ABOUT: 'about',
    COMPONENT_DEMO: 'componentDemo',
    FORBIDDEN: 'forbidden',
    NOT_FOUND: 'notFound',
    SERVER_ERROR: 'serverError'
};
/* ───────────────────────── 路由路径 ───────────────────────── */
exports.ROUTE_PATHS = {
    HOME: '/',
    DASHBOARD: '/dashboard',
    LOGIN: '/login',
    SETTINGS: '/settings',
    SETTINGS_PROFILE: '/settings/profile',
    SETTINGS_SECURITY: '/settings/security',
    TASK_CENTER: '/task-center',
    TASK_DETAIL: '/task/:id',
    ABOUT: '/about',
    COMPONENT_DEMO: '/demo/components',
    FORBIDDEN: '/403',
    NOT_FOUND: '/404',
    SERVER_ERROR: '/500'
};
/* ───────────────────────── 布局类型 ───────────────────────── */
exports.LAYOUTS = {
    BASIC: 'basic',
    BLANK: 'blank',
    AUTH: 'auth',
    WINDOW: 'window'
};
/* ───────────────────────── 主题 ───────────────────────── */
exports.THEMES = {
    LIGHT: 'light',
    DARK: 'dark',
    BUSINESS: 'business',
    CORPORATE: 'corporate'
};
exports.AVAILABLE_THEMES = [
    { value: 'light', label: '浅色' },
    { value: 'dark', label: '深色' },
    { value: 'business', label: '商务' },
    { value: 'corporate', label: '企业' }
];
/* ───────────────────────── 权限 ───────────────────────── */
exports.PERMISSIONS = {
    // 窗口权限
    WINDOW_OPEN: 'window:open',
    WINDOW_CLOSE_SELF: 'window:close:self',
    WINDOW_CLOSE_ANY: 'window:close:any',
    WINDOW_FOCUS: 'window:focus',
    WINDOW_LIST: 'window:list',
    WINDOW_CONTROL_SELF: 'window:control:self',
    WINDOW_CONTROL_ANY: 'window:control:any',
    WINDOW_DEVTOOLS: 'window:devtools',
    // 路由权限
    ROUTE_SETTINGS: 'route:settings',
    ROUTE_DETAIL: 'route:detail',
    ROUTE_TASK_CENTER: 'route:task-center',
    ROUTE_LOG_VIEWER: 'route:log-viewer',
    ROUTE_ADMIN: 'route:admin',
    // 应用权限
    APP_READ: 'app:read',
    APP_QUIT: 'app:quit',
    // 业务权限（示例）
    USER_CREATE: 'user:create',
    USER_READ: 'user:read',
    USER_UPDATE: 'user:update',
    USER_DELETE: 'user:delete'
};
/* ───────────────────────── 存储键 ───────────────────────── */
exports.STORAGE_KEYS = {
    THEME: 'app:theme',
    FOLLOW_SYSTEM: 'app:follow-system',
    SIDEBAR_COLLAPSED: 'app:sidebar-collapsed',
    AUTH_TOKEN: 'app:auth-token',
    AUTH_USER: 'app:auth-user',
    PERMISSIONS: 'app:permissions'
};
/* ───────────────────────── 应用信息 ───────────────────────── */
exports.APP_INFO = {
    NAME: 'All In One',
    VERSION: '1.0.0',
    ENVIRONMENT: (typeof process !== 'undefined' && process.env && process.env.NODE_ENV) || 'development'
};

}, {}],
"src/renderer/router/guards.js": [function(require, module, exports) {
"use strict";
/**
 * @file 路由守卫函数，在路由变更前校验窗口角色白名单、认证状态、权限、devOnly 等。
 *
 * 守卫执行顺序：
 * 1. 路由是否存在 → 不存在则重定向到 /404
 * 2. devOnly 守卫 → 生产环境禁止 devOnly 页面
 * 3. 窗口角色白名单 → 不允许则重定向到 /403
 * 4. 认证状态 → 未认证则重定向到 /login
 * 5. 登录后访问 /login → 重定向到 /dashboard
 * 6. 权限检查 → 权限不足则重定向到 /403
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRouteAllowed = checkRouteAllowed;
exports.checkAuth = checkAuth;
exports.checkPermission = checkPermission;
exports.checkRouteExists = checkRouteExists;
exports.checkDevOnly = checkDevOnly;
exports.shouldRedirectFromLogin = shouldRedirectFromLogin;
exports.executeGuards = executeGuards;
const window_routes_1 = require("../../../electron/windows/shared/window-routes");
const constants_1 = require("../constants");
/**
 * 检查路由是否允许在当前窗口角色中打开。
 *
 * 对于 allowDirectOpen 为 true 的兜底路由（如 /403、/404），跳过白名单校验。
 *
 * @param route 当前路由。
 * @param currentWindowRole 当前窗口角色。
 * @returns 是否允许。
 */
function checkRouteAllowed(route, currentWindowRole) {
    if (route.meta.allowDirectOpen) {
        return true;
    }
    return (0, window_routes_1.isRouteAllowedForRole)(currentWindowRole, route.matched.path);
}
/**
 * 检查认证状态是否满足路由要求。
 *
 * @param route 当前路由。
 * @param isAuthenticated 是否已认证。
 * @returns 是否允许。
 */
function checkAuth(route, isAuthenticated) {
    if (!route.meta.requiresAuth) {
        return true;
    }
    return isAuthenticated;
}
/**
 * 检查当前窗口是否拥有路由所需的全部权限。
 *
 * @param route 当前路由。
 * @param permissions 当前窗口拥有的权限列表。
 * @returns 是否允许。
 */
function checkPermission(route, permissions) {
    if (route.meta.permissions.length === 0) {
        return true;
    }
    return route.meta.permissions.every((permission) => permissions.includes(permission));
}
/**
 * 检查路由是否存在（是否匹配到了有效记录）。
 *
 * 当路由名称为 notFound 且实际路径不等于 /404 时，说明是未匹配到的路径。
 *
 * @param route 当前路由。
 * @returns 是否存在。
 */
function checkRouteExists(route) {
    // 如果匹配到的路由是 notFound，但实际路径不是 /404，说明是未匹配的路径
    if (route.name === 'notFound' && route.path !== constants_1.ROUTE_PATHS.NOT_FOUND) {
        return false;
    }
    return true;
}
/**
 * 检查 devOnly 路由在生产环境是否被禁止。
 *
 * @param route 当前路由。
 * @param isDev 是否开发环境。
 * @returns 是否允许。
 */
function checkDevOnly(route, isDev) {
    if (!route.meta.devOnly) {
        return true;
    }
    return isDev;
}
/**
 * 检查登录后访问登录页是否需要重定向到 dashboard。
 *
 * @param route 当前路由。
 * @param isAuthenticated 是否已认证。
 * @returns 是否需要重定向到 dashboard。
 */
function shouldRedirectFromLogin(route, isAuthenticated) {
    return route.path === constants_1.ROUTE_PATHS.LOGIN && isAuthenticated;
}
/**
 * 按顺序执行全部守卫，返回最终结果。
 *
 * 守卫执行顺序：
 * 1. 路由是否存在 → 不存在则重定向到 /404
 * 2. devOnly 守卫 → 生产环境禁止 devOnly 页面，重定向到 /404
 * 3. 窗口角色白名单 → 不允许则重定向到 /403
 * 4. 认证状态 → 未认证则重定向到 /login
 * 5. 登录后访问 /login → 重定向到 /dashboard
 * 6. 权限检查 → 权限不足则重定向到 /403
 *
 * 防止无限重定向：目标为错误页或登录页时不再触发重定向。
 *
 * @param to 目标路由。
 * @param from 来源路由（保留参数，当前未使用）。
 * @param context 守卫上下文。
 * @returns 守卫执行结果。
 */
function executeGuards(to, from, context) {
    void from;
    const isDev = constants_1.APP_INFO.ENVIRONMENT === 'development';
    // 防止无限重定向：目标本身是错误页或登录页时，直接放行
    const isRedirectTarget = to.path === constants_1.ROUTE_PATHS.NOT_FOUND ||
        to.path === constants_1.ROUTE_PATHS.FORBIDDEN ||
        to.path === constants_1.ROUTE_PATHS.SERVER_ERROR ||
        to.path === constants_1.ROUTE_PATHS.LOGIN;
    // 1. 路由是否存在
    if (!checkRouteExists(to)) {
        return { allowed: false, redirect: constants_1.ROUTE_PATHS.NOT_FOUND };
    }
    // 2. devOnly 守卫
    if (!checkDevOnly(to, isDev)) {
        return { allowed: false, redirect: constants_1.ROUTE_PATHS.NOT_FOUND };
    }
    // 如果已经是重定向目标页面，直接放行
    if (isRedirectTarget) {
        return { allowed: true };
    }
    // 3. 窗口角色白名单
    if (!checkRouteAllowed(to, context.windowRole)) {
        return { allowed: false, redirect: constants_1.ROUTE_PATHS.FORBIDDEN };
    }
    // 4. 认证状态
    if (!checkAuth(to, context.isAuthenticated)) {
        return { allowed: false, redirect: constants_1.ROUTE_PATHS.LOGIN };
    }
    // 5. 登录后访问 /login → 重定向到 /dashboard
    if (shouldRedirectFromLogin(to, context.isAuthenticated)) {
        return { allowed: false, redirect: constants_1.ROUTE_PATHS.DASHBOARD };
    }
    // 6. 权限检查
    if (!checkPermission(to, context.permissions)) {
        return { allowed: false, redirect: constants_1.ROUTE_PATHS.FORBIDDEN };
    }
    return { allowed: true };
}

}, {"../../../electron/windows/shared/window-routes":"electron/windows/shared/window-routes.js","../constants":"src/renderer/constants/index.js"}],
"electron/windows/shared/window-routes.js": [function(require, module, exports) {
"use strict";
/**
 * @file 窗口-路由映射表，定义每个窗口角色允许打开的路由白名单。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WINDOW_ROUTE_MAP = void 0;
exports.matchRoutePattern = matchRoutePattern;
exports.isRouteAllowedForRole = isRouteAllowedForRole;
exports.getDefaultRoute = getDefaultRoute;
/**
 * 窗口路由映射表。
 *
 * 每个角色只能打开 allowedRoutes 中的路由，双端校验（main + renderer）。
 */
exports.WINDOW_ROUTE_MAP = {
    main: {
        role: 'main',
        allowedRoutes: ['/', '/task-center', '/log-viewer', '/about', '/forbidden', '/not-found'],
        defaultRoute: '/'
    },
    login: {
        role: 'login',
        allowedRoutes: ['/login', '/forbidden', '/not-found'],
        defaultRoute: '/login'
    },
    settings: {
        role: 'settings',
        allowedRoutes: ['/settings', '/forbidden', '/not-found'],
        defaultRoute: '/settings'
    },
    about: {
        role: 'about',
        allowedRoutes: ['/about', '/not-found'],
        defaultRoute: '/about'
    },
    detail: {
        role: 'detail',
        allowedRoutes: ['/detail/:id', '/not-found'],
        defaultRoute: '/detail/:id'
    },
    editor: {
        role: 'editor',
        allowedRoutes: ['/not-found'],
        defaultRoute: '/not-found'
    },
    taskCenter: {
        role: 'taskCenter',
        allowedRoutes: ['/task-center', '/not-found'],
        defaultRoute: '/task-center'
    },
    logViewer: {
        role: 'logViewer',
        allowedRoutes: ['/log-viewer', '/not-found'],
        defaultRoute: '/log-viewer'
    },
    devtoolsPanel: {
        role: 'devtoolsPanel',
        allowedRoutes: ['/not-found'],
        defaultRoute: '/not-found'
    },
    floatingToolbox: {
        role: 'floatingToolbox',
        allowedRoutes: ['/not-found'],
        defaultRoute: '/not-found'
    },
    trayPanel: {
        role: 'trayPanel',
        allowedRoutes: ['/not-found'],
        defaultRoute: '/not-found'
    },
    modal: {
        role: 'modal',
        allowedRoutes: ['/modal/:type', '/not-found'],
        defaultRoute: '/modal/:type'
    },
    child: {
        role: 'child',
        allowedRoutes: ['/not-found'],
        defaultRoute: '/not-found'
    },
    hiddenWorker: {
        role: 'hiddenWorker',
        allowedRoutes: ['/not-found'],
        defaultRoute: '/not-found'
    }
};
/**
 * 将带参数的路由模式（如 /detail/:id）匹配为具体路由（如 /detail/42）。
 *
 * @param pattern 路由模式。
 * @param actualPath 实际路径。
 * @returns 是否匹配。
 */
function matchRoutePattern(pattern, actualPath) {
    const patternParts = pattern.split('/').filter(Boolean);
    const pathParts = actualPath.split('/').filter(Boolean);
    if (patternParts.length !== pathParts.length) {
        return false;
    }
    for (let i = 0; i < patternParts.length; i++) {
        if (patternParts[i].startsWith(':')) {
            continue;
        }
        if (patternParts[i] !== pathParts[i]) {
            return false;
        }
    }
    return true;
}
/**
 * 判断指定路由是否允许在指定窗口角色中打开。
 *
 * @param role 窗口角色。
 * @param route 路由路径。
 * @returns 是否允许。
 */
function isRouteAllowedForRole(role, route) {
    const entry = exports.WINDOW_ROUTE_MAP[role];
    if (!entry) {
        return false;
    }
    const normalizedRoute = route.split('?')[0] || '/';
    return entry.allowedRoutes.some((pattern) => matchRoutePattern(pattern, normalizedRoute));
}
/**
 * 获取角色的默认路由。
 *
 * @param role 窗口角色。
 * @returns 默认路由路径。
 */
function getDefaultRoute(role) {
    return exports.WINDOW_ROUTE_MAP[role]?.defaultRoute ?? '/not-found';
}

}, {}],
"src/renderer/pages/index.js": [function(require, module, exports) {
"use strict";
/**
 * @file 全部页面组件定义与映射表。
 *
 * HomePage / DetailPage / LogViewerPage / ModalPage 保留在此文件内联实现，
 * 通过 window.desktop API 操作窗口与任务；其余页面拆分为独立文件，
 * 使用 PageContainer + 基础组件 + Tailwind/daisyUI 类名实现。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PAGES = exports.ModalPage = exports.LogViewerPage = exports.DetailPage = exports.HomePage = void 0;
const useWindowControls_1 = require("../composables/useWindowControls");
const useOpenWindow_1 = require("../composables/useOpenWindow");
const useWindowEvents_1 = require("../composables/useWindowEvents");
// 独立文件页面导入
const DashboardPage_1 = require("./DashboardPage");
const LoginPage_1 = require("./LoginPage");
const SettingsPage_1 = require("./SettingsPage");
const SettingsProfilePage_1 = require("./SettingsProfilePage");
const SettingsSecurityPage_1 = require("./SettingsSecurityPage");
const TaskCenterPage_1 = require("./TaskCenterPage");
const TaskDetailPage_1 = require("./TaskDetailPage");
const AboutPage_1 = require("./AboutPage");
const ComponentDemoPage_1 = require("./ComponentDemoPage");
const ForbiddenPage_1 = require("./ForbiddenPage");
const NotFoundPage_1 = require("./NotFoundPage");
const ServerErrorPage_1 = require("./ServerErrorPage");
/* ───────────────────────── 辅助函数 ───────────────────────── */
/**
 * 格式化应用信息为可读文本。
 *
 * @param info 应用信息对象。
 * @returns 格式化后的文本。
 */
function formatAppInfo(info) {
    return [
        `应用: ${info.appName}`,
        `版本: ${info.appVersion}`,
        `Electron: ${info.electronVersion}`,
        `Chrome: ${info.chromeVersion}`,
        `平台: ${info.platform}`,
        `已打包: ${String(info.isPackaged)}`
    ].join(' | ');
}
/**
 * 统一格式化错误对象为文本。
 *
 * @param error 未知错误对象。
 * @returns 错误提示文本。
 */
function formatError(error) {
    if (typeof error === 'object' && error !== null && 'message' in error) {
        return String(error.message);
    }
    return String(error);
}
/**
 * 首页：展示应用信息、窗口控制按钮与打开子窗口的入口。
 */
exports.HomePage = {
    name: 'HomePage',
    props: {
        params: { type: Object, default: () => ({}) },
        query: { type: Object, default: () => ({}) },
        meta: { type: Object, default: () => ({}) },
        route: { type: Object, default: () => ({}) }
    },
    data() {
        return {
            appInfoText: '正在加载应用信息...',
            windowId: 0,
            role: '',
            isMaximized: false,
            isFocused: false,
            isVisible: true,
            permissions: [],
            stateText: '窗口状态未同步',
            cleanup: null
        };
    },
    async mounted() {
        // 获取应用信息
        try {
            const info = await window.desktop.app.getInfo();
            this.appInfoText = formatAppInfo(info);
        }
        catch (error) {
            this.appInfoText = `获取应用信息失败: ${formatError(error)}`;
        }
        // 获取当前窗口信息
        try {
            const info = await window.desktop.window.getCurrent();
            this.windowId = info.windowId;
            this.role = info.role;
            this.permissions = info.permissions;
            this.stateText = `窗口 ${this.windowId} (${this.role}) 已就绪`;
        }
        catch {
            this.stateText = '获取窗口信息失败';
        }
        // 订阅窗口状态变化
        const { subscribe } = (0, useWindowEvents_1.useWindowEvents)();
        this.cleanup = subscribe({
            onStateChanged: (payload) => {
                if (this.windowId !== 0 && payload.windowId !== this.windowId) {
                    return;
                }
                switch (payload.state) {
                    case 'maximized':
                        this.isMaximized = true;
                        break;
                    case 'unmaximized':
                        this.isMaximized = false;
                        break;
                    case 'focused':
                        this.isFocused = true;
                        break;
                    case 'blurred':
                        this.isFocused = false;
                        break;
                    case 'shown':
                        this.isVisible = true;
                        break;
                    case 'hidden':
                        this.isVisible = false;
                        break;
                    case 'minimized':
                        this.isVisible = false;
                        break;
                    case 'restored':
                        this.isMaximized = false;
                        this.isVisible = true;
                        break;
                    default:
                        break;
                }
            },
            onFocusChanged: (payload) => {
                if (this.windowId !== 0 && payload.windowId !== this.windowId) {
                    return;
                }
                this.isFocused = payload.focused;
            }
        });
    },
    beforeUnmount() {
        this.cleanup?.();
        this.cleanup = null;
    },
    methods: {
        async refreshAppInfo() {
            try {
                const info = await window.desktop.app.getInfo();
                this.appInfoText = formatAppInfo(info);
            }
            catch (error) {
                this.appInfoText = `获取应用信息失败: ${formatError(error)}`;
            }
        },
        async openSettings() {
            try {
                await (0, useOpenWindow_1.useOpenWindow)().openSettings();
            }
            catch (error) {
                this.stateText = `打开设置失败: ${formatError(error)}`;
            }
        },
        async openDetailWindow() {
            try {
                await (0, useOpenWindow_1.useOpenWindow)().openDetail('demo');
            }
            catch (error) {
                this.stateText = `打开详情失败: ${formatError(error)}`;
            }
        },
        async openAbout() {
            try {
                await (0, useOpenWindow_1.useOpenWindow)().openAbout();
            }
            catch (error) {
                this.stateText = `打开关于失败: ${formatError(error)}`;
            }
        },
        async openTaskCenter() {
            try {
                await (0, useOpenWindow_1.useOpenWindow)().openTaskCenter();
            }
            catch (error) {
                this.stateText = `打开任务中心失败: ${formatError(error)}`;
            }
        },
        async openLogViewer() {
            try {
                await (0, useOpenWindow_1.useOpenWindow)().openLogViewer();
            }
            catch (error) {
                this.stateText = `打开日志查看器失败: ${formatError(error)}`;
            }
        },
        async minimizeWindow() {
            try {
                await (0, useWindowControls_1.useWindowControls)().minimize();
            }
            catch (error) {
                this.stateText = `最小化失败: ${formatError(error)}`;
            }
        },
        async toggleMaximize() {
            try {
                const controls = (0, useWindowControls_1.useWindowControls)();
                if (this.isMaximized) {
                    await controls.restore();
                }
                else {
                    await controls.maximize();
                }
            }
            catch (error) {
                this.stateText = `窗口操作失败: ${formatError(error)}`;
            }
        },
        async closeWindow() {
            try {
                await (0, useWindowControls_1.useWindowControls)().close();
            }
            catch (error) {
                this.stateText = `关闭失败: ${formatError(error)}`;
            }
        }
    },
    render: (function () {
const { createElementVNode: _createElementVNode, toDisplayString: _toDisplayString, openBlock: _openBlock, createElementBlock: _createElementBlock } = Vue

return function render(_ctx, _cache) {
  return (_openBlock(), _createElementBlock("div", null, [
    _createElementVNode("h1", null, "首页"),
    _createElementVNode("p", { class: "muted" }, _toDisplayString(_ctx.appInfoText), 1 /* TEXT */),
    _createElementVNode("div", { class: "actions" }, [
      _createElementVNode("button", { onClick: _ctx.openSettings }, "打开设置", 8 /* PROPS */, ["onClick"]),
      _createElementVNode("button", { onClick: _ctx.openDetailWindow }, "打开详情", 8 /* PROPS */, ["onClick"]),
      _createElementVNode("button", { onClick: _ctx.openAbout }, "关于", 8 /* PROPS */, ["onClick"]),
      _createElementVNode("button", { onClick: _ctx.openTaskCenter }, "任务中心", 8 /* PROPS */, ["onClick"]),
      _createElementVNode("button", { onClick: _ctx.openLogViewer }, "日志查看器", 8 /* PROPS */, ["onClick"])
    ]),
    _createElementVNode("div", { class: "actions" }, [
      _createElementVNode("button", { onClick: _ctx.refreshAppInfo }, "刷新信息", 8 /* PROPS */, ["onClick"]),
      _createElementVNode("button", { onClick: _ctx.minimizeWindow }, "最小化", 8 /* PROPS */, ["onClick"]),
      _createElementVNode("button", { onClick: _ctx.toggleMaximize }, _toDisplayString(_ctx.isMaximized ? '还原' : '最大化'), 9 /* TEXT, PROPS */, ["onClick"]),
      _createElementVNode("button", { onClick: _ctx.closeWindow }, "关闭窗口", 8 /* PROPS */, ["onClick"])
    ]),
    _createElementVNode("div", { class: "status" }, [
      _createElementVNode("p", null, _toDisplayString(_ctx.stateText), 1 /* TEXT */),
      _createElementVNode("p", null, "窗口 ID: " + _toDisplayString(_ctx.windowId) + " | 角色: " + _toDisplayString(_ctx.role), 1 /* TEXT */),
      _createElementVNode("p", null, "最大化: " + _toDisplayString(_ctx.isMaximized ? '是' : '否') + " | 聚焦: " + _toDisplayString(_ctx.isFocused ? '是' : '否') + " | 可见: " + _toDisplayString(_ctx.isVisible ? '是' : '否'), 1 /* TEXT */),
      _createElementVNode("p", null, "权限: " + _toDisplayString(_ctx.permissions.join(', ') || '无'), 1 /* TEXT */)
    ])
  ]))
}
})()
};
/**
 * 详情页：根据路由参数 id 展示详情内容，提供返回按钮。
 */
exports.DetailPage = {
    name: 'DetailPage',
    props: {
        params: { type: Object, default: () => ({}) },
        query: { type: Object, default: () => ({}) },
        meta: { type: Object, default: () => ({}) },
        route: { type: Object, default: () => ({}) }
    },
    data() {
        return {
            detailText: '',
            loading: true
        };
    },
    async mounted() {
        const id = this.params.id || 'unknown';
        try {
            await new Promise((resolve) => setTimeout(resolve, 200));
            this.detailText = `正在展示 ID 为 ${id} 的详情内容。查询参数: ${JSON.stringify(this.query)}`;
        }
        catch (error) {
            this.detailText = `加载详情失败: ${formatError(error)}`;
        }
        finally {
            this.loading = false;
        }
    },
    methods: {
        async closeWindow() {
            try {
                await (0, useWindowControls_1.useWindowControls)().close();
            }
            catch {
                // 忽略关闭错误
            }
        },
        async openAnother() {
            try {
                await (0, useOpenWindow_1.useOpenWindow)().openDetail(`${this.params.id}-next`);
            }
            catch {
                // 忽略打开错误
            }
        }
    },
    render: (function () {
const { createElementVNode: _createElementVNode, openBlock: _openBlock, createElementBlock: _createElementBlock, createCommentVNode: _createCommentVNode, toDisplayString: _toDisplayString } = Vue

return function render(_ctx, _cache) {
  return (_openBlock(), _createElementBlock("div", null, [
    _createElementVNode("h1", null, "详情"),
    (_ctx.loading)
      ? (_openBlock(), _createElementBlock("p", {
          key: 0,
          class: "muted"
        }, "加载中..."))
      : (_openBlock(), _createElementBlock("div", { key: 1 }, [
          _createElementVNode("p", null, _toDisplayString(_ctx.detailText), 1 /* TEXT */),
          _createElementVNode("div", { class: "actions" }, [
            _createElementVNode("button", { onClick: _ctx.openAnother }, "打开下一个详情", 8 /* PROPS */, ["onClick"]),
            _createElementVNode("button", { onClick: _ctx.closeWindow }, "关闭", 8 /* PROPS */, ["onClick"])
          ])
        ]))
  ]))
}
})()
};
/**
 * 日志查看器页：展示日志条目，支持按级别筛选与刷新。
 */
exports.LogViewerPage = {
    name: 'LogViewerPage',
    props: {
        params: { type: Object, default: () => ({}) },
        query: { type: Object, default: () => ({}) },
        meta: { type: Object, default: () => ({}) },
        route: { type: Object, default: () => ({}) }
    },
    data() {
        return {
            logs: [],
            filter: 'all'
        };
    },
    mounted() {
        this.refreshLogs();
    },
    methods: {
        refreshLogs() {
            const levels = ['info', 'warn', 'error', 'debug'];
            const messages = [
                '应用启动完成',
                'IPC 总线已连接',
                '窗口已就绪',
                '路由变更: / -> /log-viewer',
                '任务队列空闲',
                '配置文件已加载',
                '权限校验通过',
                '窗口状态同步完成'
            ];
            const newLogs = [];
            for (let i = 0; i < 8; i++) {
                const level = levels[Math.floor(Math.random() * levels.length)];
                const message = messages[Math.floor(Math.random() * messages.length)];
                const time = new Date(Date.now() - i * 60000);
                newLogs.push({
                    level,
                    message,
                    timestamp: time.toLocaleTimeString('zh-CN')
                });
            }
            this.logs = newLogs;
        },
        clearLogs() {
            this.logs = [];
        },
        async closeWindow() {
            try {
                await (0, useWindowControls_1.useWindowControls)().close();
            }
            catch {
                // 忽略关闭错误
            }
        }
    },
    render: (function () {
const { createElementVNode: _createElementVNode, vModelSelect: _vModelSelect, withDirectives: _withDirectives, renderList: _renderList, Fragment: _Fragment, openBlock: _openBlock, createElementBlock: _createElementBlock, toDisplayString: _toDisplayString, normalizeClass: _normalizeClass, vShow: _vShow, createCommentVNode: _createCommentVNode } = Vue

return function render(_ctx, _cache) {
  return (_openBlock(), _createElementBlock("div", null, [
    _createElementVNode("h1", null, "日志查看器"),
    _createElementVNode("div", { class: "actions" }, [
      _withDirectives(_createElementVNode("select", {
        "onUpdate:modelValue": $event => ((_ctx.filter) = $event)
      }, [
        _createElementVNode("option", { value: "all" }, "全部"),
        _createElementVNode("option", { value: "info" }, "Info"),
        _createElementVNode("option", { value: "warn" }, "Warn"),
        _createElementVNode("option", { value: "error" }, "Error"),
        _createElementVNode("option", { value: "debug" }, "Debug")
      ], 8 /* PROPS */, ["onUpdate:modelValue"]), [
        [_vModelSelect, _ctx.filter]
      ]),
      _createElementVNode("button", { onClick: _ctx.refreshLogs }, "刷新", 8 /* PROPS */, ["onClick"]),
      _createElementVNode("button", { onClick: _ctx.clearLogs }, "清空", 8 /* PROPS */, ["onClick"]),
      _createElementVNode("button", { onClick: _ctx.closeWindow }, "关闭", 8 /* PROPS */, ["onClick"])
    ]),
    _createElementVNode("div", { class: "log-list" }, [
      (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(_ctx.logs, (log, index) => {
        return _withDirectives((_openBlock(), _createElementBlock("div", {
          class: "log-item",
          key: index
        }, [
          _createElementVNode("span", { class: "log-time" }, _toDisplayString(log.timestamp), 1 /* TEXT */),
          _createElementVNode("span", {
            class: _normalizeClass(["log-level", 'level-' + log.level])
          }, _toDisplayString(log.level.toUpperCase()), 3 /* TEXT, CLASS */),
          _createElementVNode("span", { class: "log-message" }, _toDisplayString(log.message), 1 /* TEXT */)
        ])), [
          [_vShow, _ctx.filter === 'all' || log.level === _ctx.filter]
        ])
      }), 128 /* KEYED_FRAGMENT */)),
      (_ctx.logs.length === 0)
        ? (_openBlock(), _createElementBlock("p", {
            key: 0,
            class: "muted"
          }, "暂无日志"))
        : _createCommentVNode("v-if", true)
    ])
  ]))
}
})()
};
/**
 * 弹窗页：根据路由参数 type 展示不同类型的弹窗内容。
 */
exports.ModalPage = {
    name: 'ModalPage',
    props: {
        params: { type: Object, default: () => ({}) },
        query: { type: Object, default: () => ({}) },
        meta: { type: Object, default: () => ({}) },
        route: { type: Object, default: () => ({}) }
    },
    data() {
        return {
            modalTitle: '弹窗',
            modalText: '',
            inputValue: '',
            resultText: ''
        };
    },
    mounted() {
        const type = this.params.type || 'default';
        switch (type) {
            case 'confirm':
                this.modalTitle = '确认操作';
                this.modalText = '确认要执行此操作吗？此操作不可撤销。';
                break;
            case 'alert':
                this.modalTitle = '提示';
                this.modalText = '这是一个提示信息，请知悉。';
                break;
            case 'prompt':
                this.modalTitle = '请输入';
                this.modalText = '请输入内容：';
                break;
            default:
                this.modalTitle = `弹窗 (${type})`;
                this.modalText = `未知弹窗类型: ${type}`;
                break;
        }
    },
    methods: {
        confirm() {
            const type = this.params.type || 'default';
            if (type === 'prompt') {
                this.resultText = `已确认，输入内容: ${this.inputValue}`;
            }
            else {
                this.resultText = '已确认';
            }
            // 确认后关闭窗口
            void (0, useWindowControls_1.useWindowControls)().close();
        },
        cancel() {
            this.resultText = '已取消';
            // 取消后关闭窗口
            void (0, useWindowControls_1.useWindowControls)().close();
        },
        async closeWindow() {
            try {
                await (0, useWindowControls_1.useWindowControls)().close();
            }
            catch {
                // 忽略关闭错误
            }
        }
    },
    render: (function () {
const { toDisplayString: _toDisplayString, createElementVNode: _createElementVNode, vModelText: _vModelText, withDirectives: _withDirectives, openBlock: _openBlock, createElementBlock: _createElementBlock, createCommentVNode: _createCommentVNode } = Vue

return function render(_ctx, _cache) {
  return (_openBlock(), _createElementBlock("div", null, [
    _createElementVNode("h1", null, _toDisplayString(_ctx.modalTitle), 1 /* TEXT */),
    _createElementVNode("p", null, _toDisplayString(_ctx.modalText), 1 /* TEXT */),
    (_ctx.params.type === 'prompt')
      ? (_openBlock(), _createElementBlock("div", {
          key: 0,
          class: "form-group"
        }, [
          _withDirectives(_createElementVNode("input", {
            type: "text",
            "onUpdate:modelValue": $event => ((_ctx.inputValue) = $event),
            placeholder: "请输入内容"
          }, null, 8 /* PROPS */, ["onUpdate:modelValue"]), [
            [_vModelText, _ctx.inputValue]
          ])
        ]))
      : _createCommentVNode("v-if", true),
    _createElementVNode("div", { class: "actions" }, [
      _createElementVNode("button", { onClick: _ctx.confirm }, "确认", 8 /* PROPS */, ["onClick"]),
      _createElementVNode("button", { onClick: _ctx.cancel }, "取消", 8 /* PROPS */, ["onClick"])
    ]),
    (_ctx.resultText)
      ? (_openBlock(), _createElementBlock("div", {
          key: 1,
          class: "status"
        }, [
          _createElementVNode("p", null, _toDisplayString(_ctx.resultText), 1 /* TEXT */)
        ]))
      : _createCommentVNode("v-if", true)
  ]))
}
})()
};
/* ───────────────────────── 页面映射表 ───────────────────────── */
/**
 * 全部页面的映射表，键为 PageComponentName，值为组件选项对象。
 *
 * 根组件通过路由的 component 字段从此表查找并渲染对应页面。
 */
exports.PAGES = {
    home: exports.HomePage,
    dashboard: DashboardPage_1.DashboardPage,
    settings: SettingsPage_1.SettingsPage,
    settingsProfile: SettingsProfilePage_1.SettingsProfilePage,
    settingsSecurity: SettingsSecurityPage_1.SettingsSecurityPage,
    about: AboutPage_1.AboutPage,
    detail: exports.DetailPage,
    taskCenter: TaskCenterPage_1.TaskCenterPage,
    taskDetail: TaskDetailPage_1.TaskDetailPage,
    logViewer: exports.LogViewerPage,
    modal: exports.ModalPage,
    componentDemo: ComponentDemoPage_1.ComponentDemoPage,
    forbidden: ForbiddenPage_1.ForbiddenPage,
    notFound: NotFoundPage_1.NotFoundPage,
    serverError: ServerErrorPage_1.ServerErrorPage,
    login: LoginPage_1.LoginPage
};

}, {"../composables/useWindowControls":"src/renderer/composables/useWindowControls.js","../composables/useOpenWindow":"src/renderer/composables/useOpenWindow.js","../composables/useWindowEvents":"src/renderer/composables/useWindowEvents.js","./DashboardPage":"src/renderer/pages/DashboardPage.js","./LoginPage":"src/renderer/pages/LoginPage.js","./SettingsPage":"src/renderer/pages/SettingsPage.js","./SettingsProfilePage":"src/renderer/pages/SettingsProfilePage.js","./SettingsSecurityPage":"src/renderer/pages/SettingsSecurityPage.js","./TaskCenterPage":"src/renderer/pages/TaskCenterPage.js","./TaskDetailPage":"src/renderer/pages/TaskDetailPage.js","./AboutPage":"src/renderer/pages/AboutPage.js","./ComponentDemoPage":"src/renderer/pages/ComponentDemoPage.js","./ForbiddenPage":"src/renderer/pages/ForbiddenPage.js","./NotFoundPage":"src/renderer/pages/NotFoundPage.js","./ServerErrorPage":"src/renderer/pages/ServerErrorPage.js"}],
"src/renderer/composables/useWindowControls.js": [function(require, module, exports) {
"use strict";
/**
 * @file 窗口控制组合式函数，封装 window.desktop.window 的全部控制方法。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.useWindowControls = useWindowControls;
/**
 * 窗口控制组合式函数，提供对 window.desktop.window API 的类型安全封装。
 *
 * 该函数不使用生命周期钩子，可在任意位置调用。
 *
 * @returns 窗口控制方法集合。
 */
function useWindowControls() {
    return {
        minimize: (windowId) => window.desktop.window.minimize(windowId),
        maximize: (windowId) => window.desktop.window.maximize(windowId),
        restore: (windowId) => window.desktop.window.restore(windowId),
        close: (windowId) => window.desktop.window.close(windowId),
        hide: (windowId) => window.desktop.window.hide(windowId),
        show: (windowId) => window.desktop.window.show(windowId),
        focus: (target) => window.desktop.window.focus(target),
        reload: (windowId) => window.desktop.window.reload(windowId),
        setTitle: (title, windowId) => window.desktop.window.setTitle(title, windowId),
        open: (role, options) => window.desktop.window.open(role, options),
        closeAll: () => window.desktop.window.closeAll(),
        closeByRole: (role) => window.desktop.window.closeByRole(role)
    };
}

}, {}],
"src/renderer/composables/useOpenWindow.js": [function(require, module, exports) {
"use strict";
/**
 * @file 打开窗口组合式函数，提供按角色打开各类窗口的便捷方法。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.useOpenWindow = useOpenWindow;
/**
 * 打开窗口组合式函数，封装常用的窗口打开操作。
 *
 * 该函数不使用生命周期钩子，可在任意位置调用。
 *
 * @returns 窗口打开方法集合。
 */
function useOpenWindow() {
    const open = async (role, options) => {
        return window.desktop.window.open(role, options);
    };
    const openSettings = () => open('settings');
    const openDetail = (id) => open('detail', { params: { id } });
    const openAbout = () => open('about');
    const openTaskCenter = () => open('taskCenter');
    const openLogViewer = () => open('logViewer');
    const openModal = (type) => open('modal', { params: { type } });
    return { open, openSettings, openDetail, openAbout, openTaskCenter, openLogViewer, openModal };
}

}, {}],
"src/renderer/composables/useWindowEvents.js": [function(require, module, exports) {
"use strict";
/**
 * @file 窗口事件订阅组合式函数，提供统一的事件订阅与取消能力。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.useWindowEvents = useWindowEvents;
/**
 * 窗口事件组合式函数。
 *
 * 该函数不使用生命周期钩子，返回的 subscribe 方法可在任意位置调用，
 * 调用方需自行在合适的时机（如 beforeUnmount）调用返回的取消订阅函数。
 *
 * @returns 窗口事件订阅 API。
 */
function useWindowEvents() {
    const subscribe = (handlers) => {
        const unsubscribers = [];
        if (handlers.onStateChanged) {
            unsubscribers.push(window.desktop.window.onStateChanged(handlers.onStateChanged));
        }
        if (handlers.onRouteChanged) {
            unsubscribers.push(window.desktop.window.onRouteChanged(handlers.onRouteChanged));
        }
        if (handlers.onFocusChanged) {
            unsubscribers.push(window.desktop.window.onFocusChanged(handlers.onFocusChanged));
        }
        let disposed = false;
        return () => {
            if (disposed) {
                return;
            }
            disposed = true;
            for (const unsubscribe of unsubscribers) {
                unsubscribe();
            }
        };
    };
    return { subscribe };
}

}, {}],
"src/renderer/pages/DashboardPage.js": [function(require, module, exports) {
"use strict";
/**
 * @file 仪表盘页，展示应用概览统计与快捷操作入口。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardPage = void 0;
const PageContainer_1 = require("../components/base/PageContainer");
const BaseCard_1 = require("../components/base/BaseCard");
const BaseButton_1 = require("../components/base/BaseButton");
const useOpenWindow_1 = require("../composables/useOpenWindow");
exports.DashboardPage = {
    name: 'DashboardPage',
    components: { PageContainer: PageContainer_1.PageContainer, BaseCard: BaseCard_1.BaseCard, BaseButton: BaseButton_1.BaseButton },
    props: {
        params: { type: Object, default: () => ({}) },
        query: { type: Object, default: () => ({}) },
        meta: { type: Object, default: () => ({}) },
        route: { type: Object, default: () => ({}) }
    },
    setup() {
        // 统计卡片 mock 数据
        const stats = [
            { label: '用户数', value: 128, icon: '👤', color: 'text-primary' },
            { label: '任务数', value: 36, icon: '📋', color: 'text-secondary' },
            { label: '日志数', value: 1024, icon: '📜', color: 'text-accent' },
            { label: '窗口数', value: 5, icon: '🪟', color: 'text-info' }
        ];
        // 最近活动 mock 数据
        const activities = [
            { id: 1, content: '用户 admin 登录系统', time: '2 分钟前' },
            { id: 2, content: '任务 task-1024 执行完成', time: '10 分钟前' },
            { id: 3, content: '新增窗口 settings 已打开', time: '30 分钟前' },
            { id: 4, content: '系统配置已更新', time: '1 小时前' },
            { id: 5, content: '日志文件已归档', time: '2 小时前' }
        ];
        const openWindow = (0, useOpenWindow_1.useOpenWindow)();
        // 快捷操作：打开设置
        function handleOpenSettings() {
            void openWindow.openSettings();
        }
        // 快捷操作：打开任务中心
        function handleOpenTaskCenter() {
            void openWindow.openTaskCenter();
        }
        // 快捷操作：打开关于
        function handleOpenAbout() {
            void openWindow.openAbout();
        }
        return { stats, activities, handleOpenSettings, handleOpenTaskCenter, handleOpenAbout };
    },
    render: (function () {
const { renderList: _renderList, Fragment: _Fragment, openBlock: _openBlock, createElementBlock: _createElementBlock, toDisplayString: _toDisplayString, createElementVNode: _createElementVNode, normalizeClass: _normalizeClass, resolveComponent: _resolveComponent, withCtx: _withCtx, createBlock: _createBlock, createTextVNode: _createTextVNode, createVNode: _createVNode } = Vue

return function render(_ctx, _cache) {
  const _component_BaseCard = _resolveComponent("BaseCard")
  const _component_BaseButton = _resolveComponent("BaseButton")
  const _component_PageContainer = _resolveComponent("PageContainer")

  return (_openBlock(), _createBlock(_component_PageContainer, {
    title: "仪表盘",
    description: "应用概览与快捷操作"
  }, {
    default: _withCtx(() => [
      _createElementVNode("div", { class: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6" }, [
        (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(_ctx.stats, (stat) => {
          return (_openBlock(), _createBlock(_component_BaseCard, {
            key: stat.label,
            compact: ""
          }, {
            default: _withCtx(() => [
              _createElementVNode("div", { class: "flex items-center gap-4" }, [
                _createElementVNode("div", { class: "text-4xl" }, _toDisplayString(stat.icon), 1 /* TEXT */),
                _createElementVNode("div", null, [
                  _createElementVNode("div", {
                    class: _normalizeClass(["text-2xl font-bold", stat.color])
                  }, _toDisplayString(stat.value), 3 /* TEXT, CLASS */),
                  _createElementVNode("div", { class: "text-sm text-base-content/60" }, _toDisplayString(stat.label), 1 /* TEXT */)
                ])
              ])
            ]),
            _: 2 /* DYNAMIC */
          }, 1024 /* DYNAMIC_SLOTS */))
        }), 128 /* KEYED_FRAGMENT */))
      ]),
      _createVNode(_component_BaseCard, {
        title: "快捷操作",
        class: "mb-6"
      }, {
        default: _withCtx(() => [
          _createElementVNode("div", { class: "flex flex-wrap gap-2" }, [
            _createVNode(_component_BaseButton, {
              variant: "primary",
              "left-icon": "⚙️",
              onClick: _ctx.handleOpenSettings
            }, {
              default: _withCtx(() => [
                _createTextVNode("打开设置")
              ]),
              _: 1 /* STABLE */
            }, 8 /* PROPS */, ["onClick"]),
            _createVNode(_component_BaseButton, {
              variant: "secondary",
              "left-icon": "📋",
              onClick: _ctx.handleOpenTaskCenter
            }, {
              default: _withCtx(() => [
                _createTextVNode("打开任务中心")
              ]),
              _: 1 /* STABLE */
            }, 8 /* PROPS */, ["onClick"]),
            _createVNode(_component_BaseButton, {
              variant: "accent",
              "left-icon": "ℹ️",
              onClick: _ctx.handleOpenAbout
            }, {
              default: _withCtx(() => [
                _createTextVNode("打开关于")
              ]),
              _: 1 /* STABLE */
            }, 8 /* PROPS */, ["onClick"])
          ])
        ]),
        _: 1 /* STABLE */
      }),
      _createVNode(_component_BaseCard, { title: "最近活动" }, {
        default: _withCtx(() => [
          _createElementVNode("ul", { class: "space-y-3" }, [
            (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(_ctx.activities, (activity) => {
              return (_openBlock(), _createElementBlock("li", {
                key: activity.id,
                class: "flex items-start gap-3"
              }, [
                _createElementVNode("span", { class: "w-2 h-2 rounded-full bg-primary mt-2 shrink-0" }),
                _createElementVNode("div", { class: "flex-1" }, [
                  _createElementVNode("p", { class: "text-sm" }, _toDisplayString(activity.content), 1 /* TEXT */),
                  _createElementVNode("p", { class: "text-xs text-base-content/40" }, _toDisplayString(activity.time), 1 /* TEXT */)
                ])
              ]))
            }), 128 /* KEYED_FRAGMENT */))
          ])
        ]),
        _: 1 /* STABLE */
      })
    ]),
    _: 1 /* STABLE */
  }))
}
})()
};

}, {"../components/base/PageContainer":"src/renderer/components/base/PageContainer.js","../components/base/BaseCard":"src/renderer/components/base/BaseCard.js","../components/base/BaseButton":"src/renderer/components/base/BaseButton.js","../composables/useOpenWindow":"src/renderer/composables/useOpenWindow.js"}],
"src/renderer/components/base/PageContainer.js": [function(require, module, exports) {
"use strict";
/**
 * @file 页面容器组件，统一页面布局与 loading/error/empty 状态。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PageContainer = void 0;
const BaseLoading_1 = require("./BaseLoading");
const BaseError_1 = require("./BaseError");
const BaseEmpty_1 = require("./BaseEmpty");
exports.PageContainer = {
    name: 'PageContainer',
    components: { BaseLoading: BaseLoading_1.BaseLoading, BaseError: BaseError_1.BaseError, BaseEmpty: BaseEmpty_1.BaseEmpty },
    props: {
        title: { type: String, default: '' },
        description: { type: String, default: '' },
        loading: { type: Boolean, default: false },
        error: { type: String, default: '' },
        empty: { type: Boolean, default: false },
        contentClass: { type: String, default: '' }
    },
    setup(props) {
        const p = props;
        return { p };
    },
    render: (function () {
const { toDisplayString: _toDisplayString, openBlock: _openBlock, createElementBlock: _createElementBlock, createCommentVNode: _createCommentVNode, createElementVNode: _createElementVNode, renderSlot: _renderSlot, resolveComponent: _resolveComponent, createBlock: _createBlock, normalizeClass: _normalizeClass } = Vue

return function render(_ctx, _cache) {
  const _component_BaseLoading = _resolveComponent("BaseLoading")
  const _component_BaseError = _resolveComponent("BaseError")
  const _component_BaseEmpty = _resolveComponent("BaseEmpty")

  return (_openBlock(), _createElementBlock("div", { class: "page-container" }, [
    (_ctx.title || _ctx.$slots.actions)
      ? (_openBlock(), _createElementBlock("div", {
          key: 0,
          class: "flex items-center justify-between mb-4"
        }, [
          _createElementVNode("div", null, [
            (_ctx.title)
              ? (_openBlock(), _createElementBlock("h1", {
                  key: 0,
                  class: "text-2xl font-semibold"
                }, _toDisplayString(_ctx.title), 1 /* TEXT */))
              : _createCommentVNode("v-if", true),
            (_ctx.description)
              ? (_openBlock(), _createElementBlock("p", {
                  key: 1,
                  class: "text-sm text-base-content/60 mt-1"
                }, _toDisplayString(_ctx.description), 1 /* TEXT */))
              : _createCommentVNode("v-if", true)
          ]),
          (_ctx.$slots.actions)
            ? (_openBlock(), _createElementBlock("div", { key: 0 }, [
                _renderSlot(_ctx.$slots, "actions")
              ]))
            : _createCommentVNode("v-if", true)
        ]))
      : _createCommentVNode("v-if", true),
    _createElementVNode("div", {
      class: _normalizeClass(["page-content", _ctx.contentClass])
    }, [
      (_ctx.loading)
        ? (_openBlock(), _createBlock(_component_BaseLoading, { key: 0 }))
        : (_ctx.error)
          ? (_openBlock(), _createBlock(_component_BaseError, {
              key: 1,
              description: _ctx.error
            }, null, 8 /* PROPS */, ["description"]))
          : (_ctx.empty)
            ? (_openBlock(), _createBlock(_component_BaseEmpty, { key: 2 }))
            : _renderSlot(_ctx.$slots, "default", { key: 3 })
    ], 2 /* CLASS */)
  ]))
}
})()
};

}, {"./BaseLoading":"src/renderer/components/base/BaseLoading.js","./BaseError":"src/renderer/components/base/BaseError.js","./BaseEmpty":"src/renderer/components/base/BaseEmpty.js"}],
"src/renderer/components/base/BaseLoading.js": [function(require, module, exports) {
"use strict";
/**
 * @file 基础加载组件，支持 spinner、skeleton、text 三种模式。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseLoading = void 0;
/** 尺寸到 daisyUI loading 类名映射 */
const sizeMap = {
    xs: 'loading-xs',
    sm: 'loading-sm',
    md: '',
    lg: 'loading-lg'
};
exports.BaseLoading = {
    name: 'BaseLoading',
    props: {
        type: { type: Object, default: 'spinner' },
        size: { type: Object, default: 'md' },
        text: { type: String, default: '加载中...' },
        inline: { type: Boolean, default: false }
    },
    setup(props) {
        const p = props;
        const sizeClass = Vue.computed(() => sizeMap[p.size] || '');
        return { sizeClass };
    },
    render: (function () {
const { normalizeClass: _normalizeClass, createElementVNode: _createElementVNode, openBlock: _openBlock, createElementBlock: _createElementBlock, createCommentVNode: _createCommentVNode, toDisplayString: _toDisplayString, Fragment: _Fragment } = Vue

return function render(_ctx, _cache) {
  return (!_ctx.inline)
    ? (_openBlock(), _createElementBlock("div", {
        key: 0,
        class: "w-full"
      }, [
        (_ctx.type === 'spinner')
          ? (_openBlock(), _createElementBlock("div", {
              key: 0,
              class: "flex items-center justify-center py-4"
            }, [
              _createElementVNode("span", {
                class: _normalizeClass(["loading loading-spinner", _ctx.sizeClass])
              }, null, 2 /* CLASS */)
            ]))
          : (_ctx.type === 'skeleton')
            ? (_openBlock(), _createElementBlock("div", {
                key: 1,
                class: "skeleton h-4 w-full"
              }))
            : (_openBlock(), _createElementBlock("div", {
                key: 2,
                class: "flex items-center justify-center gap-2 py-4"
              }, [
                _createElementVNode("span", { class: "loading loading-spinner loading-sm" }),
                _createElementVNode("span", null, _toDisplayString(_ctx.text), 1 /* TEXT */)
              ]))
      ]))
    : (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [
        (_ctx.type === 'spinner')
          ? (_openBlock(), _createElementBlock("span", {
              key: 0,
              class: _normalizeClass(["loading loading-spinner", _ctx.sizeClass])
            }, null, 2 /* CLASS */))
          : (_ctx.type === 'skeleton')
            ? (_openBlock(), _createElementBlock("div", {
                key: 1,
                class: "skeleton h-4 w-full"
              }))
            : (_openBlock(), _createElementBlock("div", {
                key: 2,
                class: "flex items-center gap-2"
              }, [
                _createElementVNode("span", { class: "loading loading-spinner loading-sm" }),
                _createElementVNode("span", null, _toDisplayString(_ctx.text), 1 /* TEXT */)
              ]))
      ], 64 /* STABLE_FRAGMENT */))
}
})()
};

}, {}],
"src/renderer/components/base/BaseError.js": [function(require, module, exports) {
"use strict";
/**
 * @file 错误状态组件，用于页面或区域出错时展示。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseError = void 0;
const BaseButton_1 = require("./BaseButton");
exports.BaseError = {
    name: 'BaseError',
    components: { BaseButton: BaseButton_1.BaseButton },
    props: {
        title: { type: String, default: '出错了' },
        description: { type: String, default: '' },
        showRetry: { type: Boolean, default: true },
        showBack: { type: Boolean, default: true },
        showHome: { type: Boolean, default: true },
        error: { type: Object, default: () => null }
    },
    emits: ['retry', 'back', 'home'],
    setup(props) {
        const p = props;
        // 将 error 转为可显示文本
        const errorText = Vue.computed(() => {
            if (!p.error)
                return '';
            if (p.error instanceof Error)
                return p.error.message;
            if (typeof p.error === 'string')
                return p.error;
            try {
                return JSON.stringify(p.error, null, 2);
            }
            catch {
                return String(p.error);
            }
        });
        return { errorText };
    },
    render: (function () {
const { createElementVNode: _createElementVNode, toDisplayString: _toDisplayString, openBlock: _openBlock, createElementBlock: _createElementBlock, createCommentVNode: _createCommentVNode, createTextVNode: _createTextVNode, resolveComponent: _resolveComponent, withCtx: _withCtx, createBlock: _createBlock } = Vue

return function render(_ctx, _cache) {
  const _component_BaseButton = _resolveComponent("BaseButton")

  return (_openBlock(), _createElementBlock("div", { class: "flex flex-col items-center justify-center py-12 text-center" }, [
    _createElementVNode("div", { class: "text-6xl mb-4" }, "⚠️"),
    _createElementVNode("h3", { class: "text-xl font-semibold" }, _toDisplayString(_ctx.title), 1 /* TEXT */),
    (_ctx.description)
      ? (_openBlock(), _createElementBlock("p", {
          key: 0,
          class: "text-sm text-base-content/60 mt-2 max-w-md"
        }, _toDisplayString(_ctx.description), 1 /* TEXT */))
      : _createCommentVNode("v-if", true),
    (_ctx.error)
      ? (_openBlock(), _createElementBlock("div", {
          key: 1,
          class: "mt-4 p-3 bg-base-200 rounded text-xs text-left max-w-lg overflow-auto"
        }, [
          _createElementVNode("pre", null, _toDisplayString(_ctx.errorText), 1 /* TEXT */)
        ]))
      : _createCommentVNode("v-if", true),
    _createElementVNode("div", { class: "flex gap-2 mt-6" }, [
      (_ctx.showRetry)
        ? (_openBlock(), _createBlock(_component_BaseButton, {
            key: 0,
            variant: "primary",
            size: "sm",
            onClick: $event => (_ctx.$emit('retry'))
          }, {
            default: _withCtx(() => [
              _createTextVNode("重试")
            ]),
            _: 1 /* STABLE */
          }, 8 /* PROPS */, ["onClick"]))
        : _createCommentVNode("v-if", true),
      (_ctx.showBack)
        ? (_openBlock(), _createBlock(_component_BaseButton, {
            key: 1,
            variant: "ghost",
            size: "sm",
            onClick: $event => (_ctx.$emit('back'))
          }, {
            default: _withCtx(() => [
              _createTextVNode("返回")
            ]),
            _: 1 /* STABLE */
          }, 8 /* PROPS */, ["onClick"]))
        : _createCommentVNode("v-if", true),
      (_ctx.showHome)
        ? (_openBlock(), _createBlock(_component_BaseButton, {
            key: 2,
            variant: "ghost",
            size: "sm",
            onClick: $event => (_ctx.$emit('home'))
          }, {
            default: _withCtx(() => [
              _createTextVNode("首页")
            ]),
            _: 1 /* STABLE */
          }, 8 /* PROPS */, ["onClick"]))
        : _createCommentVNode("v-if", true)
    ])
  ]))
}
})()
};

}, {"./BaseButton":"src/renderer/components/base/BaseButton.js"}],
"src/renderer/components/base/BaseButton.js": [function(require, module, exports) {
"use strict";
/**
 * @file 基础按钮组件，基于 daisyUI btn 类。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseButton = void 0;
/** 变体到 daisyUI 类名映射 */
const variantMap = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    accent: 'btn-accent',
    ghost: 'btn-ghost',
    link: 'btn-link',
    error: 'btn-error',
    warning: 'btn-warning',
    success: 'btn-success',
    info: 'btn-info'
};
/** 尺寸到 daisyUI 类名映射 */
const sizeMap = {
    xs: 'btn-xs',
    sm: 'btn-sm',
    md: '',
    lg: 'btn-lg'
};
exports.BaseButton = {
    name: 'BaseButton',
    props: {
        variant: { type: Object, default: 'primary' },
        size: { type: Object, default: 'md' },
        loading: { type: Boolean, default: false },
        disabled: { type: Boolean, default: false },
        block: { type: Boolean, default: false },
        outline: { type: Boolean, default: false },
        leftIcon: { type: String, default: '' },
        rightIcon: { type: String, default: '' },
        type: { type: Object, default: 'button' }
    },
    emits: ['click'],
    setup(props, ctx) {
        const { emit } = ctx;
        const p = props;
        // 计算按钮 class
        const btnClass = Vue.computed(() => {
            const classes = ['btn'];
            if (p.outline && p.variant !== 'link') {
                classes.push('btn-outline');
            }
            classes.push(variantMap[p.variant] || 'btn-primary');
            if (sizeMap[p.size]) {
                classes.push(sizeMap[p.size]);
            }
            if (p.block) {
                classes.push('w-full');
            }
            return classes.join(' ');
        });
        // 点击处理
        function handleClick(event) {
            if (p.disabled || p.loading)
                return;
            emit('click', event);
        }
        return { btnClass, handleClick };
    },
    render: (function () {
const { openBlock: _openBlock, createElementBlock: _createElementBlock, createCommentVNode: _createCommentVNode, toDisplayString: _toDisplayString, renderSlot: _renderSlot, normalizeClass: _normalizeClass } = Vue

return function render(_ctx, _cache) {
  return (_openBlock(), _createElementBlock("button", {
    class: _normalizeClass(_ctx.btnClass),
    disabled: _ctx.disabled || _ctx.loading,
    type: _ctx.type,
    onClick: _ctx.handleClick
  }, [
    (_ctx.loading)
      ? (_openBlock(), _createElementBlock("span", {
          key: 0,
          class: "loading loading-spinner loading-xs"
        }))
      : _createCommentVNode("v-if", true),
    (_ctx.leftIcon)
      ? (_openBlock(), _createElementBlock("span", {
          key: 1,
          class: "text-sm"
        }, _toDisplayString(_ctx.leftIcon), 1 /* TEXT */))
      : _createCommentVNode("v-if", true),
    _renderSlot(_ctx.$slots, "default"),
    (_ctx.rightIcon)
      ? (_openBlock(), _createElementBlock("span", {
          key: 2,
          class: "text-sm"
        }, _toDisplayString(_ctx.rightIcon), 1 /* TEXT */))
      : _createCommentVNode("v-if", true)
  ], 10 /* CLASS, PROPS */, ["disabled", "type", "onClick"]))
}
})()
};

}, {}],
"src/renderer/components/base/BaseEmpty.js": [function(require, module, exports) {
"use strict";
/**
 * @file 空状态组件，用于列表或页面无数据时展示。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseEmpty = void 0;
exports.BaseEmpty = {
    name: 'BaseEmpty',
    props: {
        title: { type: String, default: '暂无数据' },
        description: { type: String, default: '' },
        icon: { type: String, default: '📭' }
    },
    setup(props) {
        const p = props;
        return { p };
    },
    render: (function () {
const { toDisplayString: _toDisplayString, createElementVNode: _createElementVNode, openBlock: _openBlock, createElementBlock: _createElementBlock, createCommentVNode: _createCommentVNode, renderSlot: _renderSlot } = Vue

return function render(_ctx, _cache) {
  return (_openBlock(), _createElementBlock("div", { class: "flex flex-col items-center justify-center py-12 text-center" }, [
    _createElementVNode("div", { class: "text-6xl mb-4" }, _toDisplayString(_ctx.icon), 1 /* TEXT */),
    _createElementVNode("h3", { class: "text-lg font-medium" }, _toDisplayString(_ctx.title), 1 /* TEXT */),
    (_ctx.description)
      ? (_openBlock(), _createElementBlock("p", {
          key: 0,
          class: "text-sm text-base-content/60 mt-1"
        }, _toDisplayString(_ctx.description), 1 /* TEXT */))
      : _createCommentVNode("v-if", true),
    _createElementVNode("div", { class: "mt-4" }, [
      _renderSlot(_ctx.$slots, "action")
    ])
  ]))
}
})()
};

}, {}],
"src/renderer/components/base/BaseCard.js": [function(require, module, exports) {
"use strict";
/**
 * @file 基础卡片组件，基于 daisyUI card。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseCard = void 0;
exports.BaseCard = {
    name: 'BaseCard',
    props: {
        title: { type: String, default: '' },
        subtitle: { type: String, default: '' },
        loading: { type: Boolean, default: false },
        bordered: { type: Boolean, default: true },
        compact: { type: Boolean, default: false }
    },
    setup(props) {
        const p = props;
        return { p };
    },
    render: (function () {
const { createElementVNode: _createElementVNode, openBlock: _openBlock, createElementBlock: _createElementBlock, createCommentVNode: _createCommentVNode, renderSlot: _renderSlot, toDisplayString: _toDisplayString, normalizeClass: _normalizeClass } = Vue

return function render(_ctx, _cache) {
  return (_openBlock(), _createElementBlock("div", {
    class: _normalizeClass(["card bg-base-100 shadow-lg relative", { 'border border-base-300': _ctx.bordered, 'card-compact': _ctx.compact }])
  }, [
    (_ctx.loading)
      ? (_openBlock(), _createElementBlock("div", {
          key: 0,
          class: "absolute inset-0 flex items-center justify-center bg-base-200/50 z-10"
        }, [
          _createElementVNode("span", { class: "loading loading-spinner loading-lg" })
        ]))
      : _createCommentVNode("v-if", true),
    _createElementVNode("div", { class: "card-body" }, [
      (_ctx.$slots.header)
        ? (_openBlock(), _createElementBlock("div", { key: 0 }, [
            _renderSlot(_ctx.$slots, "header")
          ]))
        : (_ctx.title || _ctx.subtitle || _ctx.$slots.actions)
          ? (_openBlock(), _createElementBlock("div", {
              key: 1,
              class: "flex items-start justify-between"
            }, [
              _createElementVNode("div", null, [
                (_ctx.title)
                  ? (_openBlock(), _createElementBlock("h2", {
                      key: 0,
                      class: "card-title"
                    }, _toDisplayString(_ctx.title), 1 /* TEXT */))
                  : _createCommentVNode("v-if", true),
                (_ctx.subtitle)
                  ? (_openBlock(), _createElementBlock("p", {
                      key: 1,
                      class: "text-sm text-base-content/60"
                    }, _toDisplayString(_ctx.subtitle), 1 /* TEXT */))
                  : _createCommentVNode("v-if", true)
              ]),
              (_ctx.$slots.actions)
                ? (_openBlock(), _createElementBlock("div", { key: 0 }, [
                    _renderSlot(_ctx.$slots, "actions")
                  ]))
                : _createCommentVNode("v-if", true)
            ]))
          : _createCommentVNode("v-if", true),
      _createElementVNode("div", { class: "card-content" }, [
        _renderSlot(_ctx.$slots, "default")
      ]),
      (_ctx.$slots.footer)
        ? (_openBlock(), _createElementBlock("div", {
            key: 2,
            class: "mt-4 pt-4 border-t border-base-200"
          }, [
            _renderSlot(_ctx.$slots, "footer")
          ]))
        : _createCommentVNode("v-if", true)
    ])
  ], 2 /* CLASS */))
}
})()
};

}, {}],
"src/renderer/pages/LoginPage.js": [function(require, module, exports) {
"use strict";
/**
 * @file 登录页，提供用户名密码输入与登录跳转。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginPage = void 0;
const BaseButton_1 = require("../components/base/BaseButton");
const FormField_1 = require("../components/form/FormField");
const FormInput_1 = require("../components/form/FormInput");
const auth_store_1 = require("../stores/auth.store");
exports.LoginPage = {
    name: 'LoginPage',
    components: { BaseButton: BaseButton_1.BaseButton, FormField: FormField_1.FormField, FormInput: FormInput_1.FormInput },
    props: {
        params: { type: Object, default: () => ({}) },
        query: { type: Object, default: () => ({}) },
        meta: { type: Object, default: () => ({}) },
        route: { type: Object, default: () => ({}) }
    },
    setup() {
        const authStore = (0, auth_store_1.useAuthStore)();
        // 用户名
        const username = Vue.ref('');
        // 密码
        const password = Vue.ref('');
        // 错误信息
        const error = Vue.ref('');
        // 登录中状态
        const loading = Vue.ref(false);
        // 处理登录
        async function handleLogin() {
            if (!username.value || !password.value) {
                error.value = '请输入用户名和密码';
                return;
            }
            error.value = '';
            loading.value = true;
            try {
                await authStore.login(username.value, password.value);
                // 登录成功后跳转到仪表盘
                window.location.hash = '#/dashboard';
            }
            catch (e) {
                error.value = e instanceof Error ? e.message : '登录失败';
            }
            finally {
                loading.value = false;
            }
        }
        return { username, password, error, loading, handleLogin };
    },
    render: (function () {
const { resolveComponent: _resolveComponent, createVNode: _createVNode, withCtx: _withCtx, createTextVNode: _createTextVNode, toDisplayString: _toDisplayString, openBlock: _openBlock, createElementBlock: _createElementBlock, createCommentVNode: _createCommentVNode, createElementVNode: _createElementVNode } = Vue

return function render(_ctx, _cache) {
  const _component_FormInput = _resolveComponent("FormInput")
  const _component_FormField = _resolveComponent("FormField")
  const _component_BaseButton = _resolveComponent("BaseButton")

  return (_openBlock(), _createElementBlock("div", { class: "space-y-4" }, [
    _createVNode(_component_FormField, {
      label: "用户名",
      required: ""
    }, {
      default: _withCtx(() => [
        _createVNode(_component_FormInput, {
          modelValue: _ctx.username,
          "onUpdate:modelValue": $event => ((_ctx.username) = $event),
          placeholder: "请输入用户名"
        }, null, 8 /* PROPS */, ["modelValue", "onUpdate:modelValue"])
      ]),
      _: 1 /* STABLE */
    }),
    _createVNode(_component_FormField, {
      label: "密码",
      required: ""
    }, {
      default: _withCtx(() => [
        _createVNode(_component_FormInput, {
          modelValue: _ctx.password,
          "onUpdate:modelValue": $event => ((_ctx.password) = $event),
          type: "password",
          placeholder: "请输入密码"
        }, null, 8 /* PROPS */, ["modelValue", "onUpdate:modelValue"])
      ]),
      _: 1 /* STABLE */
    }),
    _createVNode(_component_BaseButton, {
      block: "",
      loading: _ctx.loading,
      onClick: _ctx.handleLogin
    }, {
      default: _withCtx(() => [
        _createTextVNode("登录")
      ]),
      _: 1 /* STABLE */
    }, 8 /* PROPS */, ["loading", "onClick"]),
    (_ctx.error)
      ? (_openBlock(), _createElementBlock("p", {
          key: 0,
          class: "text-error text-sm text-center"
        }, _toDisplayString(_ctx.error), 1 /* TEXT */))
      : _createCommentVNode("v-if", true),
    _createElementVNode("div", { class: "text-center text-xs text-base-content/40" }, "提示：任意用户名密码即可登录（演示）")
  ]))
}
})()
};

}, {"../components/base/BaseButton":"src/renderer/components/base/BaseButton.js","../components/form/FormField":"src/renderer/components/form/FormField.js","../components/form/FormInput":"src/renderer/components/form/FormInput.js","../stores/auth.store":"src/renderer/stores/auth.store.js"}],
"src/renderer/components/form/FormField.js": [function(require, module, exports) {
"use strict";
/**
 * @file 表单字段容器组件，统一 label、错误、提示的布局。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormField = void 0;
exports.FormField = {
    name: 'FormField',
    props: {
        label: { type: String, default: '' },
        required: { type: Boolean, default: false },
        error: { type: String, default: '' },
        hint: { type: String, default: '' },
        description: { type: String, default: '' }
    },
    setup(props) {
        const p = props;
        return { p };
    },
    render: (function () {
const { toDisplayString: _toDisplayString, openBlock: _openBlock, createElementBlock: _createElementBlock, createCommentVNode: _createCommentVNode, createTextVNode: _createTextVNode, createElementVNode: _createElementVNode, renderSlot: _renderSlot } = Vue

return function render(_ctx, _cache) {
  return (_openBlock(), _createElementBlock("div", { class: "form-control w-full" }, [
    (_ctx.label)
      ? (_openBlock(), _createElementBlock("label", {
          key: 0,
          class: "label"
        }, [
          _createElementVNode("span", { class: "label-text" }, [
            _createTextVNode(_toDisplayString(_ctx.label), 1 /* TEXT */),
            (_ctx.required)
              ? (_openBlock(), _createElementBlock("span", {
                  key: 0,
                  class: "text-error ml-1"
                }, "*"))
              : _createCommentVNode("v-if", true)
          ])
        ]))
      : _createCommentVNode("v-if", true),
    _renderSlot(_ctx.$slots, "default"),
    (_ctx.hint && !_ctx.error)
      ? (_openBlock(), _createElementBlock("label", {
          key: 1,
          class: "label"
        }, [
          _createElementVNode("span", { class: "label-text-alt text-base-content/50" }, _toDisplayString(_ctx.hint), 1 /* TEXT */)
        ]))
      : _createCommentVNode("v-if", true),
    (_ctx.error)
      ? (_openBlock(), _createElementBlock("label", {
          key: 2,
          class: "label"
        }, [
          _createElementVNode("span", { class: "label-text-alt text-error" }, _toDisplayString(_ctx.error), 1 /* TEXT */)
        ]))
      : _createCommentVNode("v-if", true)
  ]))
}
})()
};

}, {}],
"src/renderer/components/form/FormInput.js": [function(require, module, exports) {
"use strict";
/**
 * @file 文本输入框组件，基于 daisyUI input。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormInput = void 0;
exports.FormInput = {
    name: 'FormInput',
    props: {
        modelValue: { type: [String, Number], default: '' },
        type: { type: Object, default: 'text' },
        placeholder: { type: String, default: '' },
        disabled: { type: Boolean, default: false },
        readonly: { type: Boolean, default: false },
        size: { type: Object, default: 'md' },
        error: { type: Boolean, default: false }
    },
    emits: ['update:modelValue', 'blur', 'focus'],
    setup(props, ctx) {
        const { emit } = ctx;
        const p = props;
        // 输入事件处理，number 类型自动转为数值
        function handleInput(event) {
            const target = event.target;
            const value = p.type === 'number' ? Number(target.value) : target.value;
            emit('update:modelValue', value);
        }
        return { handleInput };
    },
    render: (function () {
const { normalizeClass: _normalizeClass, openBlock: _openBlock, createElementBlock: _createElementBlock } = Vue

return function render(_ctx, _cache) {
  return (_openBlock(), _createElementBlock("input", {
    type: _ctx.type,
    value: _ctx.modelValue,
    placeholder: _ctx.placeholder,
    disabled: _ctx.disabled,
    readonly: _ctx.readonly,
    class: _normalizeClass(["input input-bordered w-full", { 'input-error': _ctx.error, 'input-sm': _ctx.size === 'sm', 'input-lg': _ctx.size === 'lg' }]),
    onInput: _ctx.handleInput,
    onBlur: $event => (_ctx.$emit('blur', $event)),
    onFocus: $event => (_ctx.$emit('focus', $event))
  }, null, 42 /* CLASS, PROPS, NEED_HYDRATION */, ["type", "value", "placeholder", "disabled", "readonly", "onInput", "onBlur", "onFocus"]))
}
})()
};

}, {}],
"src/renderer/stores/auth.store.js": [function(require, module, exports) {
"use strict";
/**
 * @file 认证 Store，管理登录态、用户信息、token。
 *
 * 注意：Electron 环境下 token 存储应使用安全存储（keytar / safeStorage），
 * 本实现使用 localStorage 作为占位，生产环境需替换。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuthStore = createAuthStore;
exports.useAuthStore = useAuthStore;
const base_1 = require("./base");
const constants_1 = require("../constants");
/** 认证 Store 单例 */
let authStoreInstance = null;
/**
 * 创建认证 Store。
 */
function createAuthStore() {
    if (authStoreInstance)
        return authStoreInstance;
    const state = (0, base_1.defineState)({
        token: base_1.storage.get(constants_1.STORAGE_KEYS.AUTH_TOKEN, null),
        user: base_1.storage.get(constants_1.STORAGE_KEYS.AUTH_USER, null),
        loginLoading: false,
        loginError: null,
        restored: false
    });
    const isLoggedIn = (0, base_1.computedRef)(() => !!state.token && !!state.user);
    const userRoles = (0, base_1.computedRef)(() => state.user?.roles ?? []);
    /**
     * 占位登录实现（无实际认证后端）。
     *
     * 生产环境应替换为真实 IPC 或 HTTP 调用。
     */
    async function login(username, _password) {
        state.loginLoading = true;
        state.loginError = null;
        try {
            // 模拟登录延迟
            await new Promise((resolve) => setTimeout(resolve, 500));
            const user = {
                id: `user-${Date.now()}`,
                username,
                displayName: username,
                roles: ['user']
            };
            const token = `mock-token-${Date.now()}`;
            state.token = token;
            state.user = user;
            base_1.storage.set(constants_1.STORAGE_KEYS.AUTH_TOKEN, token);
            base_1.storage.set(constants_1.STORAGE_KEYS.AUTH_USER, user);
            return user;
        }
        catch (error) {
            state.loginError = error instanceof Error ? error.message : String(error);
            throw error;
        }
        finally {
            state.loginLoading = false;
        }
    }
    /**
     * 登出，清理全部敏感状态。
     */
    async function logout() {
        state.token = null;
        state.user = null;
        base_1.storage.remove(constants_1.STORAGE_KEYS.AUTH_TOKEN);
        base_1.storage.remove(constants_1.STORAGE_KEYS.AUTH_USER);
        base_1.storage.remove(constants_1.STORAGE_KEYS.PERMISSIONS);
    }
    /**
     * 恢复会话（从本地存储读取 token 与用户）。
     */
    function restoreSession() {
        // state 初始化时已读取，此处仅标记恢复完成
        state.restored = true;
    }
    function setToken(token) {
        state.token = token;
        if (token) {
            base_1.storage.set(constants_1.STORAGE_KEYS.AUTH_TOKEN, token);
        }
        else {
            base_1.storage.remove(constants_1.STORAGE_KEYS.AUTH_TOKEN);
        }
    }
    function setUser(user) {
        state.user = user;
        if (user) {
            base_1.storage.set(constants_1.STORAGE_KEYS.AUTH_USER, user);
        }
        else {
            base_1.storage.remove(constants_1.STORAGE_KEYS.AUTH_USER);
        }
    }
    const store = {
        $id: 'auth',
        state,
        isLoggedIn,
        userRoles,
        login,
        logout,
        restoreSession,
        setToken,
        setUser,
        $reset: () => {
            state.token = null;
            state.user = null;
            state.loginLoading = false;
            state.loginError = null;
            base_1.storage.remove(constants_1.STORAGE_KEYS.AUTH_TOKEN);
            base_1.storage.remove(constants_1.STORAGE_KEYS.AUTH_USER);
        }
    };
    (0, base_1.registerStore)(store);
    authStoreInstance = store;
    return store;
}
/**
 * 获取认证 Store 单例。
 */
function useAuthStore() {
    if (!authStoreInstance) {
        return createAuthStore();
    }
    return authStoreInstance;
}

}, {"./base":"src/renderer/stores/base.js","../constants":"src/renderer/constants/index.js"}],
"src/renderer/stores/base.js": [function(require, module, exports) {
"use strict";
/**
 * @file 轻量响应式 Store 基类，模拟 Pinia 的核心能力。
 *
 * 由于项目 Vue 通过 CDN 全局加载、无 Vite 构建，无法直接使用 pinia npm 包。
 * 本实现基于 Vue.reactive + computed 提供 store 的响应式与派生能力，
 * API 与 Pinia 高度兼容，便于未来迁移。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.storage = void 0;
exports.defineState = defineState;
exports.computedRef = computedRef;
exports.writableComputed = writableComputed;
exports.registerStore = registerStore;
exports.getStore = getStore;
/**
 * 创建响应式 state（语法糖，等价于 Vue.reactive）。
 *
 * @param initialState 初始状态。
 * @returns 响应式状态对象。
 */
function defineState(initialState) {
    return Vue.reactive(initialState);
}
/**
 * 创建计算属性（语法糖，等价于 Vue.computed）。
 *
 * @param getter 计算函数。
 * @returns 响应式引用。
 */
function computedRef(getter) {
    return Vue.computed(getter);
}
/**
 * 创建可写计算属性。
 */
function writableComputed(getter, setter) {
    // Vue CDN 全局对象支持 { get, set } 形式
    return Vue.computed(getter);
}
/**
 * 本地存储工具（带 JSON 序列化与异常保护）。
 */
exports.storage = {
    /**
     * 读取本地存储值。
     *
     * @param key 存储键。
     * @param fallback 默认值。
     * @returns 解析后的值或默认值。
     */
    get(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            if (raw === null)
                return fallback;
            return JSON.parse(raw);
        }
        catch {
            return fallback;
        }
    },
    /**
     * 写入本地存储值。
     *
     * @param key 存储键。
     * @param value 待存储的值。
     */
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        }
        catch {
            // 存储失败（如配额超限、隐私模式）时静默忽略
        }
    },
    /**
     * 移除本地存储值。
     *
     * @param key 存储键。
     */
    remove(key) {
        try {
            localStorage.removeItem(key);
        }
        catch {
            // 忽略
        }
    }
};
/**
 * 全局 store 注册表，用于按 id 获取 store 实例（调试与 SSR 预留）。
 */
const storeRegistry = new Map();
/**
 * 注册 store 到全局注册表。
 *
 * @param store store 实例。
 */
function registerStore(store) {
    storeRegistry.set(store.$id, store);
}
/**
 * 按 id 获取 store 实例。
 *
 * @param id store 标识。
 * @returns store 实例或 undefined。
 */
function getStore(id) {
    return storeRegistry.get(id);
}

}, {}],
"src/renderer/pages/SettingsPage.js": [function(require, module, exports) {
"use strict";
/**
 * @file 设置页，提供通用设置、通知设置与关于信息。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsPage = void 0;
const PageContainer_1 = require("../components/base/PageContainer");
const BaseCard_1 = require("../components/base/BaseCard");
const BaseButton_1 = require("../components/base/BaseButton");
const FormField_1 = require("../components/form/FormField");
const FormSelect_1 = require("../components/form/FormSelect");
const FormSwitch_1 = require("../components/form/FormSwitch");
const theme_store_1 = require("../stores/theme.store");
const layout_store_1 = require("../stores/layout.store");
const useToast_1 = require("../composables/useToast");
exports.SettingsPage = {
    name: 'SettingsPage',
    components: { PageContainer: PageContainer_1.PageContainer, BaseCard: BaseCard_1.BaseCard, BaseButton: BaseButton_1.BaseButton, FormField: FormField_1.FormField, FormSelect: FormSelect_1.FormSelect, FormSwitch: FormSwitch_1.FormSwitch },
    props: {
        params: { type: Object, default: () => ({}) },
        query: { type: Object, default: () => ({}) },
        meta: { type: Object, default: () => ({}) },
        route: { type: Object, default: () => ({}) }
    },
    setup() {
        const themeStore = (0, theme_store_1.useThemeStore)();
        const layoutStore = (0, layout_store_1.useLayoutStore)();
        const toast = (0, useToast_1.useToast)();
        // 当前主题
        const currentTheme = Vue.computed(() => themeStore.currentTheme.value);
        // 可用主题选项
        const themeOptions = themeStore.availableThemes.map((t) => ({
            label: t.label,
            value: t.value
        }));
        // 侧栏折叠状态
        const sidebarCollapsed = Vue.computed(() => layoutStore.state.sidebarCollapsed);
        // 通知设置
        const desktopNotify = Vue.ref(true);
        const soundNotify = Vue.ref(false);
        const autoUpdate = Vue.ref(true);
        // 主题变更
        function handleThemeChange(value) {
            themeStore.setTheme(value);
        }
        // 侧栏折叠变更
        function handleSidebarChange(value) {
            layoutStore.setSidebarCollapsed(value);
        }
        // 保存设置
        function handleSave() {
            toast.success('保存成功', '设置已更新');
        }
        return {
            currentTheme,
            themeOptions,
            sidebarCollapsed,
            desktopNotify,
            soundNotify,
            autoUpdate,
            handleThemeChange,
            handleSidebarChange,
            handleSave
        };
    },
    render: (function () {
const { resolveComponent: _resolveComponent, createVNode: _createVNode, withCtx: _withCtx, createElementVNode: _createElementVNode, createTextVNode: _createTextVNode, openBlock: _openBlock, createBlock: _createBlock } = Vue

return function render(_ctx, _cache) {
  const _component_FormSelect = _resolveComponent("FormSelect")
  const _component_FormField = _resolveComponent("FormField")
  const _component_FormSwitch = _resolveComponent("FormSwitch")
  const _component_BaseCard = _resolveComponent("BaseCard")
  const _component_BaseButton = _resolveComponent("BaseButton")
  const _component_PageContainer = _resolveComponent("PageContainer")

  return (_openBlock(), _createBlock(_component_PageContainer, { title: "设置" }, {
    default: _withCtx(() => [
      _createElementVNode("div", { class: "space-y-6" }, [
        _createVNode(_component_BaseCard, {
          title: "通用设置",
          subtitle: "主题与界面偏好"
        }, {
          default: _withCtx(() => [
            _createElementVNode("div", { class: "space-y-4" }, [
              _createVNode(_component_FormField, { label: "主题" }, {
                default: _withCtx(() => [
                  _createVNode(_component_FormSelect, {
                    "model-value": _ctx.currentTheme,
                    options: _ctx.themeOptions,
                    "onUpdate:modelValue": _ctx.handleThemeChange
                  }, null, 8 /* PROPS */, ["model-value", "options", "onUpdate:modelValue"])
                ]),
                _: 1 /* STABLE */
              }),
              _createVNode(_component_FormField, {
                label: "侧栏折叠",
                hint: "折叠侧栏以获得更大的内容区域"
              }, {
                default: _withCtx(() => [
                  _createVNode(_component_FormSwitch, {
                    "model-value": _ctx.sidebarCollapsed,
                    label: "折叠侧栏",
                    "onUpdate:modelValue": _ctx.handleSidebarChange
                  }, null, 8 /* PROPS */, ["model-value", "onUpdate:modelValue"])
                ]),
                _: 1 /* STABLE */
              })
            ])
          ]),
          _: 1 /* STABLE */
        }),
        _createVNode(_component_BaseCard, {
          title: "通知设置",
          subtitle: "消息提醒方式"
        }, {
          default: _withCtx(() => [
            _createElementVNode("div", { class: "space-y-4" }, [
              _createVNode(_component_FormField, { label: "桌面通知" }, {
                default: _withCtx(() => [
                  _createVNode(_component_FormSwitch, {
                    modelValue: _ctx.desktopNotify,
                    "onUpdate:modelValue": $event => ((_ctx.desktopNotify) = $event),
                    label: "启用桌面通知"
                  }, null, 8 /* PROPS */, ["modelValue", "onUpdate:modelValue"])
                ]),
                _: 1 /* STABLE */
              }),
              _createVNode(_component_FormField, { label: "声音提醒" }, {
                default: _withCtx(() => [
                  _createVNode(_component_FormSwitch, {
                    modelValue: _ctx.soundNotify,
                    "onUpdate:modelValue": $event => ((_ctx.soundNotify) = $event),
                    label: "启用声音提醒"
                  }, null, 8 /* PROPS */, ["modelValue", "onUpdate:modelValue"])
                ]),
                _: 1 /* STABLE */
              }),
              _createVNode(_component_FormField, { label: "自动更新" }, {
                default: _withCtx(() => [
                  _createVNode(_component_FormSwitch, {
                    modelValue: _ctx.autoUpdate,
                    "onUpdate:modelValue": $event => ((_ctx.autoUpdate) = $event),
                    label: "自动检查更新"
                  }, null, 8 /* PROPS */, ["modelValue", "onUpdate:modelValue"])
                ]),
                _: 1 /* STABLE */
              })
            ])
          ]),
          _: 1 /* STABLE */
        }),
        _createVNode(_component_BaseCard, {
          title: "关于",
          subtitle: "应用信息"
        }, {
          default: _withCtx(() => [
            _createElementVNode("p", { class: "text-sm text-base-content/60" }, "All In One v1.0.0，基于 Electron + Vue 3 + TypeScript 构建。")
          ]),
          _: 1 /* STABLE */
        }),
        _createElementVNode("div", { class: "flex justify-end" }, [
          _createVNode(_component_BaseButton, {
            variant: "primary",
            onClick: _ctx.handleSave
          }, {
            default: _withCtx(() => [
              _createTextVNode("保存设置")
            ]),
            _: 1 /* STABLE */
          }, 8 /* PROPS */, ["onClick"])
        ])
      ])
    ]),
    _: 1 /* STABLE */
  }))
}
})()
};

}, {"../components/base/PageContainer":"src/renderer/components/base/PageContainer.js","../components/base/BaseCard":"src/renderer/components/base/BaseCard.js","../components/base/BaseButton":"src/renderer/components/base/BaseButton.js","../components/form/FormField":"src/renderer/components/form/FormField.js","../components/form/FormSelect":"src/renderer/components/form/FormSelect.js","../components/form/FormSwitch":"src/renderer/components/form/FormSwitch.js","../stores/theme.store":"src/renderer/stores/theme.store.js","../stores/layout.store":"src/renderer/stores/layout.store.js","../composables/useToast":"src/renderer/composables/useToast.js"}],
"src/renderer/components/form/FormSelect.js": [function(require, module, exports) {
"use strict";
/**
 * @file 下拉选择组件，基于 daisyUI select。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormSelect = void 0;
exports.FormSelect = {
    name: 'FormSelect',
    props: {
        modelValue: { type: [String, Number], default: '' },
        options: { type: Array, default: () => [] },
        placeholder: { type: String, default: '' },
        disabled: { type: Boolean, default: false },
        size: { type: Object, default: 'md' },
        error: { type: Boolean, default: false }
    },
    emits: ['update:modelValue', 'change'],
    setup(props, ctx) {
        const { emit } = ctx;
        // 选择变更处理
        function handleChange(event) {
            const target = event.target;
            emit('update:modelValue', target.value);
            emit('change', target.value);
        }
        return { handleChange };
    },
    render: (function () {
const { toDisplayString: _toDisplayString, openBlock: _openBlock, createElementBlock: _createElementBlock, createCommentVNode: _createCommentVNode, renderList: _renderList, Fragment: _Fragment, normalizeClass: _normalizeClass } = Vue

return function render(_ctx, _cache) {
  return (_openBlock(), _createElementBlock("select", {
    class: _normalizeClass(["select select-bordered w-full", { 'select-error': _ctx.error, 'select-sm': _ctx.size === 'sm', 'select-lg': _ctx.size === 'lg' }]),
    value: _ctx.modelValue,
    disabled: _ctx.disabled,
    onChange: _ctx.handleChange
  }, [
    (_ctx.placeholder)
      ? (_openBlock(), _createElementBlock("option", {
          key: 0,
          value: "",
          selected: !_ctx.modelValue,
          disabled: ""
        }, _toDisplayString(_ctx.placeholder), 9 /* TEXT, PROPS */, ["selected"]))
      : _createCommentVNode("v-if", true),
    (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(_ctx.options, (opt) => {
      return (_openBlock(), _createElementBlock("option", {
        key: opt.value,
        value: opt.value,
        disabled: opt.disabled
      }, _toDisplayString(opt.label), 9 /* TEXT, PROPS */, ["value", "disabled"]))
    }), 128 /* KEYED_FRAGMENT */))
  ], 42 /* CLASS, PROPS, NEED_HYDRATION */, ["value", "disabled", "onChange"]))
}
})()
};

}, {}],
"src/renderer/components/form/FormSwitch.js": [function(require, module, exports) {
"use strict";
/**
 * @file 开关组件，基于 daisyUI toggle。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormSwitch = void 0;
exports.FormSwitch = {
    name: 'FormSwitch',
    props: {
        modelValue: { type: Boolean, default: false },
        disabled: { type: Boolean, default: false },
        label: { type: String, default: '' },
        size: { type: Object, default: 'md' }
    },
    emits: ['update:modelValue', 'change'],
    setup(props, ctx) {
        const { emit } = ctx;
        // 切换处理
        function handleChange(event) {
            const target = event.target;
            emit('update:modelValue', target.checked);
            emit('change', target.checked);
        }
        return { handleChange };
    },
    render: (function () {
const { normalizeClass: _normalizeClass, createElementVNode: _createElementVNode, toDisplayString: _toDisplayString, openBlock: _openBlock, createElementBlock: _createElementBlock, createCommentVNode: _createCommentVNode } = Vue

return function render(_ctx, _cache) {
  return (_openBlock(), _createElementBlock("label", { class: "label cursor-pointer justify-start gap-3" }, [
    _createElementVNode("input", {
      type: "checkbox",
      checked: _ctx.modelValue,
      disabled: _ctx.disabled,
      class: _normalizeClass(["toggle", { 'toggle-sm': _ctx.size === 'sm', 'toggle-lg': _ctx.size === 'lg' }]),
      onChange: _ctx.handleChange
    }, null, 42 /* CLASS, PROPS, NEED_HYDRATION */, ["checked", "disabled", "onChange"]),
    (_ctx.label)
      ? (_openBlock(), _createElementBlock("span", {
          key: 0,
          class: "label-text"
        }, _toDisplayString(_ctx.label), 1 /* TEXT */))
      : _createCommentVNode("v-if", true)
  ]))
}
})()
};

}, {}],
"src/renderer/stores/theme.store.js": [function(require, module, exports) {
"use strict";
/**
 * @file 主题 Store，管理 daisyUI 主题切换、跟随系统、本地持久化。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createThemeStore = createThemeStore;
exports.useThemeStore = useThemeStore;
const base_1 = require("./base");
const constants_1 = require("../constants");
/** 默认主题 */
const DEFAULT_THEME = constants_1.THEMES.LIGHT;
/**
 * 判断主题是否为深色。
 */
function isDarkTheme(theme) {
    return theme === constants_1.THEMES.DARK || theme === constants_1.THEMES.BUSINESS;
}
/**
 * 读取系统颜色方案偏好。
 */
function readSystemPreference() {
    if (typeof window === 'undefined' || !window.matchMedia)
        return constants_1.THEMES.LIGHT;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? constants_1.THEMES.DARK : constants_1.THEMES.LIGHT;
}
/** 主题 Store 单例 */
let themeStoreInstance = null;
/**
 * 创建主题 Store。
 *
 * @returns 主题 Store 实例。
 */
function createThemeStore() {
    if (themeStoreInstance)
        return themeStoreInstance;
    const state = (0, base_1.defineState)({
        theme: base_1.storage.get(constants_1.STORAGE_KEYS.THEME, DEFAULT_THEME),
        followSystem: base_1.storage.get(constants_1.STORAGE_KEYS.FOLLOW_SYSTEM, true),
        systemPreference: readSystemPreference(),
        initialized: false
    });
    const currentTheme = (0, base_1.computedRef)(() => state.followSystem ? state.systemPreference : state.theme);
    const isDark = (0, base_1.computedRef)(() => isDarkTheme(currentTheme.value));
    /**
     * 应用当前主题到 document.documentElement。
     */
    function applyTheme() {
        if (typeof document === 'undefined')
            return;
        const theme = currentTheme.value;
        document.documentElement.setAttribute('data-theme', theme);
    }
    /**
     * 初始化主题：读取本地存储、监听系统偏好变化。
     */
    function initTheme() {
        if (state.initialized)
            return;
        // 监听系统主题变化
        if (typeof window !== 'undefined' && window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handler = (e) => {
                state.systemPreference = e.matches ? constants_1.THEMES.DARK : constants_1.THEMES.LIGHT;
                if (state.followSystem) {
                    applyTheme();
                }
            };
            // 兼容旧版 Safari
            if (mediaQuery.addEventListener) {
                mediaQuery.addEventListener('change', handler);
            }
            else if (mediaQuery.addListener) {
                mediaQuery.addListener(handler);
            }
        }
        applyTheme();
        state.initialized = true;
    }
    /**
     * 设置主题。
     */
    function setTheme(theme) {
        state.theme = theme;
        state.followSystem = false;
        base_1.storage.set(constants_1.STORAGE_KEYS.THEME, theme);
        base_1.storage.set(constants_1.STORAGE_KEYS.FOLLOW_SYSTEM, false);
        applyTheme();
    }
    /**
     * 切换深浅色。
     */
    function toggleDark() {
        const next = isDarkTheme(state.theme) ? constants_1.THEMES.LIGHT : constants_1.THEMES.DARK;
        setTheme(next);
    }
    /**
     * 设置是否跟随系统主题。
     */
    function setFollowSystem(follow) {
        state.followSystem = follow;
        base_1.storage.set(constants_1.STORAGE_KEYS.FOLLOW_SYSTEM, follow);
        if (follow) {
            state.systemPreference = readSystemPreference();
        }
        applyTheme();
    }
    const store = {
        $id: 'theme',
        state,
        currentTheme,
        availableThemes: constants_1.AVAILABLE_THEMES,
        isDark,
        initTheme,
        setTheme,
        toggleDark,
        setFollowSystem,
        applyTheme,
        $reset: () => {
            state.theme = DEFAULT_THEME;
            state.followSystem = true;
            state.systemPreference = readSystemPreference();
            base_1.storage.remove(constants_1.STORAGE_KEYS.THEME);
            base_1.storage.remove(constants_1.STORAGE_KEYS.FOLLOW_SYSTEM);
            applyTheme();
        }
    };
    (0, base_1.registerStore)(store);
    themeStoreInstance = store;
    return store;
}
/**
 * 获取主题 Store 单例（需先调用 createThemeStore）。
 */
function useThemeStore() {
    if (!themeStoreInstance) {
        return createThemeStore();
    }
    return themeStoreInstance;
}

}, {"./base":"src/renderer/stores/base.js","../constants":"src/renderer/constants/index.js"}],
"src/renderer/stores/layout.store.js": [function(require, module, exports) {
"use strict";
/**
 * @file 布局 Store，管理侧栏折叠、移动端 drawer、布局模式。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLayoutStore = createLayoutStore;
exports.useLayoutStore = useLayoutStore;
exports.initLayoutResizeListener = initLayoutResizeListener;
const base_1 = require("./base");
const constants_1 = require("../constants");
/** 布局 Store 单例 */
let layoutStoreInstance = null;
/** 移动端断点（px） */
const MOBILE_BREAKPOINT = 768;
/**
 * 创建布局 Store。
 */
function createLayoutStore() {
    if (layoutStoreInstance)
        return layoutStoreInstance;
    const state = (0, base_1.defineState)({
        sidebarCollapsed: base_1.storage.get(constants_1.STORAGE_KEYS.SIDEBAR_COLLAPSED, false),
        mobileDrawerOpen: false,
        layoutMode: constants_1.LAYOUTS.BASIC,
        isMobile: typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false
    });
    const sidebarWidthClass = (0, base_1.computedRef)(() => state.sidebarCollapsed ? 'w-16' : 'w-60');
    function toggleSidebar() {
        state.sidebarCollapsed = !state.sidebarCollapsed;
        base_1.storage.set(constants_1.STORAGE_KEYS.SIDEBAR_COLLAPSED, state.sidebarCollapsed);
    }
    function setSidebarCollapsed(collapsed) {
        state.sidebarCollapsed = collapsed;
        base_1.storage.set(constants_1.STORAGE_KEYS.SIDEBAR_COLLAPSED, collapsed);
    }
    function toggleMobileDrawer() {
        state.mobileDrawerOpen = !state.mobileDrawerOpen;
    }
    function closeMobileDrawer() {
        state.mobileDrawerOpen = false;
    }
    function setLayoutMode(mode) {
        state.layoutMode = mode;
    }
    function setIsMobile(isMobile) {
        state.isMobile = isMobile;
        if (!isMobile) {
            state.mobileDrawerOpen = false;
        }
    }
    const store = {
        $id: 'layout',
        state,
        sidebarWidthClass,
        toggleSidebar,
        setSidebarCollapsed,
        toggleMobileDrawer,
        closeMobileDrawer,
        setLayoutMode,
        setIsMobile,
        $reset: () => {
            state.sidebarCollapsed = false;
            state.mobileDrawerOpen = false;
            state.layoutMode = constants_1.LAYOUTS.BASIC;
        }
    };
    (0, base_1.registerStore)(store);
    layoutStoreInstance = store;
    return store;
}
/**
 * 获取布局 Store 单例。
 */
function useLayoutStore() {
    if (!layoutStoreInstance) {
        return createLayoutStore();
    }
    return layoutStoreInstance;
}
/**
 * 初始化窗口尺寸监听，自动更新 isMobile 状态。
 */
function initLayoutResizeListener() {
    const handler = () => {
        const store = useLayoutStore();
        store.setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
}

}, {"./base":"src/renderer/stores/base.js","../constants":"src/renderer/constants/index.js"}],
"src/renderer/composables/useToast.js": [function(require, module, exports) {
"use strict";
/**
 * @file Toast 组合式函数，封装 notification store 的便捷方法。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.useToast = useToast;
const notification_store_1 = require("../stores/notification.store");
const base_1 = require("../stores/base");
/**
 * Toast 组合式函数。
 *
 * @returns Toast 操作方法。
 */
function useToast() {
    const store = (0, notification_store_1.useNotificationStore)();
    const toasts = (0, base_1.computedRef)(() => store.state.toasts);
    return {
        toasts,
        success: store.success,
        error: store.error,
        warning: store.warning,
        info: store.info,
        loading: store.loading,
        update: (id, update) => store.updateToast(id, update),
        close: store.removeToast,
        closeAll: store.clearToasts
    };
}

}, {"../stores/notification.store":"src/renderer/stores/notification.store.js","../stores/base":"src/renderer/stores/base.js"}],
"src/renderer/stores/notification.store.js": [function(require, module, exports) {
"use strict";
/**
 * @file 通知 Store，管理全局 Toast 消息队列。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNotificationStore = createNotificationStore;
exports.useNotificationStore = useNotificationStore;
const base_1 = require("./base");
/** 最大 Toast 数量 */
const MAX_TOASTS = 5;
/** 通知 Store 单例 */
let notificationStoreInstance = null;
/** Toast ID 计数器 */
let toastIdCounter = 0;
/**
 * 生成 Toast ID。
 */
function generateToastId() {
    toastIdCounter += 1;
    return `toast-${Date.now()}-${toastIdCounter}`;
}
/**
 * 创建通知 Store。
 */
function createNotificationStore() {
    if (notificationStoreInstance)
        return notificationStoreInstance;
    const state = (0, base_1.defineState)({
        toasts: [],
        unreadCount: 0
    });
    const hasToasts = (0, base_1.computedRef)(() => state.toasts.length > 0);
    function addToast(toast) {
        const id = generateToastId();
        const item = {
            ...toast,
            id,
            createdAt: Date.now()
        };
        state.toasts.push(item);
        // 超出最大数量时移除最早的
        while (state.toasts.length > MAX_TOASTS) {
            state.toasts.shift();
        }
        // 自动关闭
        if (toast.duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, toast.duration);
        }
        return id;
    }
    function updateToast(id, update) {
        const toast = state.toasts.find((t) => t.id === id);
        if (toast) {
            Object.assign(toast, update);
        }
    }
    function removeToast(id) {
        const index = state.toasts.findIndex((t) => t.id === id);
        if (index >= 0) {
            state.toasts.splice(index, 1);
        }
    }
    function clearToasts() {
        state.toasts = [];
    }
    function success(title, description, duration = 3000) {
        return addToast({ type: 'success', title, description, duration });
    }
    function error(title, description, duration = 5000) {
        return addToast({ type: 'error', title, description, duration });
    }
    function warning(title, description, duration = 4000) {
        return addToast({ type: 'warning', title, description, duration });
    }
    function info(title, description, duration = 3000) {
        return addToast({ type: 'info', title, description, duration });
    }
    function loading(title, description) {
        return addToast({ type: 'loading', title, description, duration: 0 });
    }
    const store = {
        $id: 'notification',
        state,
        hasToasts,
        addToast,
        updateToast,
        removeToast,
        clearToasts,
        success,
        error,
        warning,
        info,
        loading,
        $reset: () => {
            state.toasts = [];
            state.unreadCount = 0;
        }
    };
    (0, base_1.registerStore)(store);
    notificationStoreInstance = store;
    return store;
}
/**
 * 获取通知 Store 单例。
 */
function useNotificationStore() {
    if (!notificationStoreInstance) {
        return createNotificationStore();
    }
    return notificationStoreInstance;
}

}, {"./base":"src/renderer/stores/base.js"}],
"src/renderer/pages/SettingsProfilePage.js": [function(require, module, exports) {
"use strict";
/**
 * @file 个人资料设置页，展示并编辑当前用户信息。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsProfilePage = void 0;
const PageContainer_1 = require("../components/base/PageContainer");
const BaseCard_1 = require("../components/base/BaseCard");
const BaseButton_1 = require("../components/base/BaseButton");
const FormField_1 = require("../components/form/FormField");
const FormInput_1 = require("../components/form/FormInput");
const auth_store_1 = require("../stores/auth.store");
const useToast_1 = require("../composables/useToast");
exports.SettingsProfilePage = {
    name: 'SettingsProfilePage',
    components: { PageContainer: PageContainer_1.PageContainer, BaseCard: BaseCard_1.BaseCard, BaseButton: BaseButton_1.BaseButton, FormField: FormField_1.FormField, FormInput: FormInput_1.FormInput },
    props: {
        params: { type: Object, default: () => ({}) },
        query: { type: Object, default: () => ({}) },
        meta: { type: Object, default: () => ({}) },
        route: { type: Object, default: () => ({}) }
    },
    setup() {
        const authStore = (0, auth_store_1.useAuthStore)();
        const toast = (0, useToast_1.useToast)();
        // 表单字段
        const nickname = Vue.ref('');
        const email = Vue.ref('');
        const phone = Vue.ref('');
        const avatar = Vue.ref('');
        // 初始化时从当前用户填充
        Vue.onMounted(() => {
            const user = authStore.state.user;
            if (user) {
                nickname.value = user.displayName || user.username || '';
                email.value = '';
                phone.value = '';
                avatar.value = user.avatar || '';
            }
        });
        // 保存
        function handleSave() {
            toast.success('保存成功', '个人资料已更新');
        }
        return { nickname, email, phone, avatar, handleSave };
    },
    render: (function () {
const { resolveComponent: _resolveComponent, createVNode: _createVNode, withCtx: _withCtx, createTextVNode: _createTextVNode, createElementVNode: _createElementVNode, openBlock: _openBlock, createBlock: _createBlock } = Vue

return function render(_ctx, _cache) {
  const _component_FormInput = _resolveComponent("FormInput")
  const _component_FormField = _resolveComponent("FormField")
  const _component_BaseButton = _resolveComponent("BaseButton")
  const _component_BaseCard = _resolveComponent("BaseCard")
  const _component_PageContainer = _resolveComponent("PageContainer")

  return (_openBlock(), _createBlock(_component_PageContainer, { title: "个人资料" }, {
    default: _withCtx(() => [
      _createVNode(_component_BaseCard, {
        title: "基本信息",
        subtitle: "编辑您的个人资料"
      }, {
        default: _withCtx(() => [
          _createElementVNode("div", { class: "space-y-4 max-w-lg" }, [
            _createVNode(_component_FormField, {
              label: "昵称",
              required: ""
            }, {
              default: _withCtx(() => [
                _createVNode(_component_FormInput, {
                  modelValue: _ctx.nickname,
                  "onUpdate:modelValue": $event => ((_ctx.nickname) = $event),
                  placeholder: "请输入昵称"
                }, null, 8 /* PROPS */, ["modelValue", "onUpdate:modelValue"])
              ]),
              _: 1 /* STABLE */
            }),
            _createVNode(_component_FormField, { label: "邮箱" }, {
              default: _withCtx(() => [
                _createVNode(_component_FormInput, {
                  modelValue: _ctx.email,
                  "onUpdate:modelValue": $event => ((_ctx.email) = $event),
                  type: "email",
                  placeholder: "请输入邮箱"
                }, null, 8 /* PROPS */, ["modelValue", "onUpdate:modelValue"])
              ]),
              _: 1 /* STABLE */
            }),
            _createVNode(_component_FormField, { label: "手机号" }, {
              default: _withCtx(() => [
                _createVNode(_component_FormInput, {
                  modelValue: _ctx.phone,
                  "onUpdate:modelValue": $event => ((_ctx.phone) = $event),
                  placeholder: "请输入手机号"
                }, null, 8 /* PROPS */, ["modelValue", "onUpdate:modelValue"])
              ]),
              _: 1 /* STABLE */
            }),
            _createVNode(_component_FormField, { label: "头像 URL" }, {
              default: _withCtx(() => [
                _createVNode(_component_FormInput, {
                  modelValue: _ctx.avatar,
                  "onUpdate:modelValue": $event => ((_ctx.avatar) = $event),
                  placeholder: "请输入头像链接"
                }, null, 8 /* PROPS */, ["modelValue", "onUpdate:modelValue"])
              ]),
              _: 1 /* STABLE */
            }),
            _createElementVNode("div", { class: "flex justify-end" }, [
              _createVNode(_component_BaseButton, {
                variant: "primary",
                onClick: _ctx.handleSave
              }, {
                default: _withCtx(() => [
                  _createTextVNode("保存")
                ]),
                _: 1 /* STABLE */
              }, 8 /* PROPS */, ["onClick"])
            ])
          ])
        ]),
        _: 1 /* STABLE */
      })
    ]),
    _: 1 /* STABLE */
  }))
}
})()
};

}, {"../components/base/PageContainer":"src/renderer/components/base/PageContainer.js","../components/base/BaseCard":"src/renderer/components/base/BaseCard.js","../components/base/BaseButton":"src/renderer/components/base/BaseButton.js","../components/form/FormField":"src/renderer/components/form/FormField.js","../components/form/FormInput":"src/renderer/components/form/FormInput.js","../stores/auth.store":"src/renderer/stores/auth.store.js","../composables/useToast":"src/renderer/composables/useToast.js"}],
"src/renderer/pages/SettingsSecurityPage.js": [function(require, module, exports) {
"use strict";
/**
 * @file 安全设置页，提供修改密码、两步验证与登录会话管理。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsSecurityPage = void 0;
const PageContainer_1 = require("../components/base/PageContainer");
const BaseCard_1 = require("../components/base/BaseCard");
const BaseButton_1 = require("../components/base/BaseButton");
const FormField_1 = require("../components/form/FormField");
const FormInput_1 = require("../components/form/FormInput");
const FormSwitch_1 = require("../components/form/FormSwitch");
const useToast_1 = require("../composables/useToast");
exports.SettingsSecurityPage = {
    name: 'SettingsSecurityPage',
    components: { PageContainer: PageContainer_1.PageContainer, BaseCard: BaseCard_1.BaseCard, BaseButton: BaseButton_1.BaseButton, FormField: FormField_1.FormField, FormInput: FormInput_1.FormInput, FormSwitch: FormSwitch_1.FormSwitch },
    props: {
        params: { type: Object, default: () => ({}) },
        query: { type: Object, default: () => ({}) },
        meta: { type: Object, default: () => ({}) },
        route: { type: Object, default: () => ({}) }
    },
    setup() {
        const toast = (0, useToast_1.useToast)();
        // 修改密码表单
        const oldPassword = Vue.ref('');
        const newPassword = Vue.ref('');
        const confirmPassword = Vue.ref('');
        // 两步验证
        const twoFactor = Vue.ref(false);
        // 登录会话 mock 数据
        const sessions = [
            { id: 1, device: 'Windows - Chrome', ip: '192.168.1.100', lastActive: '当前会话', current: true },
            { id: 2, device: 'macOS - Safari', ip: '192.168.1.101', lastActive: '2 小时前', current: false },
            { id: 3, device: 'iOS - App', ip: '10.0.0.5', lastActive: '1 天前', current: false }
        ];
        // 修改密码
        function handleChangePassword() {
            if (!oldPassword.value || !newPassword.value) {
                toast.warning('请填写完整', '请输入旧密码与新密码');
                return;
            }
            if (newPassword.value !== confirmPassword.value) {
                toast.error('密码不一致', '两次输入的密码不匹配');
                return;
            }
            toast.success('修改成功', '密码已更新');
            oldPassword.value = '';
            newPassword.value = '';
            confirmPassword.value = '';
        }
        // 注销会话
        function handleRevokeSession(id) {
            toast.success('已注销', '会话 ' + id + ' 已注销');
        }
        return {
            oldPassword,
            newPassword,
            confirmPassword,
            twoFactor,
            sessions,
            handleChangePassword,
            handleRevokeSession
        };
    },
    render: (function () {
const { resolveComponent: _resolveComponent, createVNode: _createVNode, withCtx: _withCtx, createTextVNode: _createTextVNode, createElementVNode: _createElementVNode, renderList: _renderList, Fragment: _Fragment, openBlock: _openBlock, createElementBlock: _createElementBlock, toDisplayString: _toDisplayString, createCommentVNode: _createCommentVNode, createBlock: _createBlock } = Vue

return function render(_ctx, _cache) {
  const _component_FormInput = _resolveComponent("FormInput")
  const _component_FormField = _resolveComponent("FormField")
  const _component_BaseButton = _resolveComponent("BaseButton")
  const _component_BaseCard = _resolveComponent("BaseCard")
  const _component_FormSwitch = _resolveComponent("FormSwitch")
  const _component_PageContainer = _resolveComponent("PageContainer")

  return (_openBlock(), _createBlock(_component_PageContainer, { title: "安全设置" }, {
    default: _withCtx(() => [
      _createElementVNode("div", { class: "space-y-6" }, [
        _createVNode(_component_BaseCard, {
          title: "修改密码",
          subtitle: "定期更新密码以保障账户安全"
        }, {
          default: _withCtx(() => [
            _createElementVNode("div", { class: "space-y-4 max-w-lg" }, [
              _createVNode(_component_FormField, {
                label: "旧密码",
                required: ""
              }, {
                default: _withCtx(() => [
                  _createVNode(_component_FormInput, {
                    modelValue: _ctx.oldPassword,
                    "onUpdate:modelValue": $event => ((_ctx.oldPassword) = $event),
                    type: "password",
                    placeholder: "请输入旧密码"
                  }, null, 8 /* PROPS */, ["modelValue", "onUpdate:modelValue"])
                ]),
                _: 1 /* STABLE */
              }),
              _createVNode(_component_FormField, {
                label: "新密码",
                required: ""
              }, {
                default: _withCtx(() => [
                  _createVNode(_component_FormInput, {
                    modelValue: _ctx.newPassword,
                    "onUpdate:modelValue": $event => ((_ctx.newPassword) = $event),
                    type: "password",
                    placeholder: "请输入新密码"
                  }, null, 8 /* PROPS */, ["modelValue", "onUpdate:modelValue"])
                ]),
                _: 1 /* STABLE */
              }),
              _createVNode(_component_FormField, {
                label: "确认密码",
                required: ""
              }, {
                default: _withCtx(() => [
                  _createVNode(_component_FormInput, {
                    modelValue: _ctx.confirmPassword,
                    "onUpdate:modelValue": $event => ((_ctx.confirmPassword) = $event),
                    type: "password",
                    placeholder: "请再次输入新密码"
                  }, null, 8 /* PROPS */, ["modelValue", "onUpdate:modelValue"])
                ]),
                _: 1 /* STABLE */
              }),
              _createElementVNode("div", { class: "flex justify-end" }, [
                _createVNode(_component_BaseButton, {
                  variant: "primary",
                  onClick: _ctx.handleChangePassword
                }, {
                  default: _withCtx(() => [
                    _createTextVNode("修改密码")
                  ]),
                  _: 1 /* STABLE */
                }, 8 /* PROPS */, ["onClick"])
              ])
            ])
          ]),
          _: 1 /* STABLE */
        }),
        _createVNode(_component_BaseCard, {
          title: "两步验证",
          subtitle: "增强账户安全性"
        }, {
          default: _withCtx(() => [
            _createElementVNode("div", { class: "flex items-center justify-between" }, [
              _createElementVNode("div", null, [
                _createElementVNode("p", { class: "text-sm" }, "启用两步验证"),
                _createElementVNode("p", { class: "text-xs text-base-content/50" }, "登录时需要额外的验证码")
              ]),
              _createVNode(_component_FormSwitch, {
                modelValue: _ctx.twoFactor,
                "onUpdate:modelValue": $event => ((_ctx.twoFactor) = $event)
              }, null, 8 /* PROPS */, ["modelValue", "onUpdate:modelValue"])
            ])
          ]),
          _: 1 /* STABLE */
        }),
        _createVNode(_component_BaseCard, {
          title: "登录会话",
          subtitle: "管理已登录的设备"
        }, {
          default: _withCtx(() => [
            _createElementVNode("ul", { class: "space-y-3" }, [
              (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(_ctx.sessions, (session) => {
                return (_openBlock(), _createElementBlock("li", {
                  key: session.id,
                  class: "flex items-center justify-between p-3 rounded-lg bg-base-200"
                }, [
                  _createElementVNode("div", null, [
                    _createElementVNode("p", { class: "text-sm font-medium" }, [
                      _createTextVNode(_toDisplayString(session.device) + " ", 1 /* TEXT */),
                      (session.current)
                        ? (_openBlock(), _createElementBlock("span", {
                            key: 0,
                            class: "badge badge-primary badge-sm ml-1"
                          }, "当前"))
                        : _createCommentVNode("v-if", true)
                    ]),
                    _createElementVNode("p", { class: "text-xs text-base-content/50" }, _toDisplayString(session.ip) + " · " + _toDisplayString(session.lastActive), 1 /* TEXT */)
                  ]),
                  (!session.current)
                    ? (_openBlock(), _createBlock(_component_BaseButton, {
                        key: 0,
                        variant: "ghost",
                        size: "sm",
                        onClick: $event => (_ctx.handleRevokeSession(session.id))
                      }, {
                        default: _withCtx(() => [
                          _createTextVNode("注销")
                        ]),
                        _: 1 /* STABLE */
                      }, 8 /* PROPS */, ["onClick"]))
                    : _createCommentVNode("v-if", true)
                ]))
              }), 128 /* KEYED_FRAGMENT */))
            ])
          ]),
          _: 1 /* STABLE */
        })
      ])
    ]),
    _: 1 /* STABLE */
  }))
}
})()
};

}, {"../components/base/PageContainer":"src/renderer/components/base/PageContainer.js","../components/base/BaseCard":"src/renderer/components/base/BaseCard.js","../components/base/BaseButton":"src/renderer/components/base/BaseButton.js","../components/form/FormField":"src/renderer/components/form/FormField.js","../components/form/FormInput":"src/renderer/components/form/FormInput.js","../components/form/FormSwitch":"src/renderer/components/form/FormSwitch.js","../composables/useToast":"src/renderer/composables/useToast.js"}],
"src/renderer/pages/TaskCenterPage.js": [function(require, module, exports) {
"use strict";
/**
 * @file 任务中心页，展示任务列表与状态，支持查看与取消操作。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskCenterPage = void 0;
const PageContainer_1 = require("../components/base/PageContainer");
const BaseButton_1 = require("../components/base/BaseButton");
const DataTable_1 = require("../components/table/DataTable");
const useToast_1 = require("../composables/useToast");
/** 状态到 badge class 映射 */
const statusBadgeMap = {
    running: 'badge-primary',
    completed: 'badge-success',
    failed: 'badge-error',
    cancelled: 'badge-warning'
};
/** 状态到中文文案映射 */
const statusTextMap = {
    running: '运行中',
    completed: '已完成',
    failed: '已失败',
    cancelled: '已取消'
};
exports.TaskCenterPage = {
    name: 'TaskCenterPage',
    components: { PageContainer: PageContainer_1.PageContainer, BaseButton: BaseButton_1.BaseButton, DataTable: DataTable_1.DataTable },
    props: {
        params: { type: Object, default: () => ({}) },
        query: { type: Object, default: () => ({}) },
        meta: { type: Object, default: () => ({}) },
        route: { type: Object, default: () => ({}) }
    },
    setup() {
        const toast = (0, useToast_1.useToast)();
        // 任务列表 mock 数据
        const tasks = Vue.ref([
            { taskId: 'task-1001', name: '数据同步', status: 'running', progress: 65, createdAt: '2026-06-20 09:30' },
            { taskId: 'task-1002', name: '日志归档', status: 'completed', progress: 100, createdAt: '2026-06-20 08:15' },
            { taskId: 'task-1003', name: '报表生成', status: 'failed', progress: 45, createdAt: '2026-06-19 18:00' },
            { taskId: 'task-1004', name: '缓存清理', status: 'cancelled', progress: 20, createdAt: '2026-06-19 14:20' },
            { taskId: 'task-1005', name: '索引重建', status: 'completed', progress: 100, createdAt: '2026-06-19 10:00' }
        ]);
        // 表格列定义
        const columns = [
            { key: 'taskId', title: '任务ID', width: '140px' },
            { key: 'name', title: '名称' },
            {
                key: 'status',
                title: '状态',
                render: (row) => {
                    const status = row.status;
                    return '<span class="badge ' + statusBadgeMap[status] + ' badge-sm">' + statusTextMap[status] + '</span>';
                }
            },
            {
                key: 'progress',
                title: '进度',
                render: (row) => {
                    const progress = row.progress;
                    return '<progress class="progress progress-primary w-32" value="' + progress + '" max="100"></progress><span class="text-xs ml-2">' + progress + '%</span>';
                }
            },
            { key: 'createdAt', title: '创建时间', width: '160px' }
        ];
        // 新建任务
        function handleCreate() {
            toast.info('新建任务', '功能开发中');
        }
        // 查看任务
        function handleView(row) {
            toast.info('查看任务', '任务 ' + String(row.taskId) + ' 详情');
        }
        // 取消任务
        function handleCancel(row) {
            toast.warning('已取消', '任务 ' + String(row.taskId) + ' 已取消');
        }
        return { tasks, columns, handleCreate, handleView, handleCancel };
    },
    render: (function () {
const { createTextVNode: _createTextVNode, resolveComponent: _resolveComponent, withCtx: _withCtx, createVNode: _createVNode, createElementVNode: _createElementVNode, openBlock: _openBlock, createBlock: _createBlock } = Vue

return function render(_ctx, _cache) {
  const _component_BaseButton = _resolveComponent("BaseButton")
  const _component_DataTable = _resolveComponent("DataTable")
  const _component_PageContainer = _resolveComponent("PageContainer")

  return (_openBlock(), _createBlock(_component_PageContainer, { title: "任务中心" }, {
    actions: _withCtx(() => [
      _createVNode(_component_BaseButton, {
        variant: "primary",
        "left-icon": "➕",
        onClick: _ctx.handleCreate
      }, {
        default: _withCtx(() => [
          _createTextVNode("新建任务")
        ]),
        _: 1 /* STABLE */
      }, 8 /* PROPS */, ["onClick"])
    ]),
    default: _withCtx(() => [
      _createVNode(_component_DataTable, {
        columns: _ctx.columns,
        data: _ctx.tasks,
        "row-key": "taskId"
      }, {
        action: _withCtx(({ row }) => [
          _createElementVNode("div", { class: "flex justify-end gap-1" }, [
            _createVNode(_component_BaseButton, {
              variant: "ghost",
              size: "sm",
              onClick: $event => (_ctx.handleView(row))
            }, {
              default: _withCtx(() => [
                _createTextVNode("查看")
              ]),
              _: 1 /* STABLE */
            }, 8 /* PROPS */, ["onClick"]),
            _createVNode(_component_BaseButton, {
              variant: "ghost",
              size: "sm",
              onClick: $event => (_ctx.handleCancel(row))
            }, {
              default: _withCtx(() => [
                _createTextVNode("取消")
              ]),
              _: 1 /* STABLE */
            }, 8 /* PROPS */, ["onClick"])
          ])
        ]),
        _: 1 /* STABLE */
      }, 8 /* PROPS */, ["columns", "data"])
    ]),
    _: 1 /* STABLE */
  }))
}
})()
};

}, {"../components/base/PageContainer":"src/renderer/components/base/PageContainer.js","../components/base/BaseButton":"src/renderer/components/base/BaseButton.js","../components/table/DataTable":"src/renderer/components/table/DataTable.js","../composables/useToast":"src/renderer/composables/useToast.js"}],
"src/renderer/components/table/DataTable.js": [function(require, module, exports) {
"use strict";
/**
 * @file 数据表格组件，支持排序、选择、分页、自定义渲染。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataTable = void 0;
const BaseLoading_1 = require("../base/BaseLoading");
const BaseEmpty_1 = require("../base/BaseEmpty");
const BaseError_1 = require("../base/BaseError");
/** 对齐方式到 class 映射 */
const alignMap = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right'
};
exports.DataTable = {
    name: 'DataTable',
    components: { BaseLoading: BaseLoading_1.BaseLoading, BaseEmpty: BaseEmpty_1.BaseEmpty, BaseError: BaseError_1.BaseError },
    props: {
        columns: { type: Array, default: () => [] },
        data: { type: Array, default: () => [] },
        loading: { type: Boolean, default: false },
        rowKey: { type: String, default: 'id' },
        selectable: { type: Boolean, default: false },
        showIndex: { type: Boolean, default: false },
        emptyText: { type: String, default: '暂无数据' },
        errorText: { type: String, default: '加载失败' },
        error: { type: String, default: '' },
        pagination: { type: Object, default: () => null },
        selectedKeys: { type: Array, default: () => [] }
    },
    emits: ['sort', 'pageChange', 'pageSizeChange', 'select', 'selectAll', 'refresh'],
    setup(props, ctx) {
        const { emit } = ctx;
        const p = props;
        // 是否全选
        const isAllSelected = Vue.computed(() => {
            if (!p.selectable || p.data.length === 0)
                return false;
            return p.data.every((row) => {
                const key = String(row[p.rowKey]);
                return p.selectedKeys.includes(key);
            });
        });
        // 是否半选
        const isIndeterminate = Vue.computed(() => {
            if (!p.selectable || p.data.length === 0)
                return false;
            const selectedCount = p.data.filter((row) => {
                const key = String(row[p.rowKey]);
                return p.selectedKeys.includes(key);
            }).length;
            return selectedCount > 0 && selectedCount < p.data.length;
        });
        // 是否为空数据
        const isEmpty = Vue.computed(() => !p.loading && !p.error && p.data.length === 0);
        // 获取行的 key
        function getRowKey(row) {
            return String(row[p.rowKey]);
        }
        // 判断行是否选中
        function isRowSelected(row) {
            return p.selectedKeys.includes(getRowKey(row));
        }
        // 获取列对齐 class
        function getAlignClass(align) {
            return align ? alignMap[align] : 'text-left';
        }
        // 获取单元格内容（支持自定义渲染）
        function getCellContent(col, row, index) {
            if (col.render) {
                return col.render(row, index);
            }
            const val = row[col.key];
            return val == null ? '' : String(val);
        }
        // 全选切换
        function handleSelectAll(event) {
            const target = event.target;
            if (target.checked) {
                const keys = p.data.map((row) => getRowKey(row));
                emit('selectAll', keys);
            }
            else {
                emit('selectAll', []);
            }
        }
        // 单行选择
        function handleSelectRow(row, event) {
            const target = event.target;
            const key = getRowKey(row);
            emit('select', { key, selected: target.checked, row });
        }
        return {
            isAllSelected,
            isIndeterminate,
            isEmpty,
            getRowKey,
            isRowSelected,
            getAlignClass,
            getCellContent,
            handleSelectAll,
            handleSelectRow
        };
    },
    render: (function () {
const { resolveComponent: _resolveComponent, openBlock: _openBlock, createBlock: _createBlock, createCommentVNode: _createCommentVNode, createElementVNode: _createElementVNode, createElementBlock: _createElementBlock, renderList: _renderList, Fragment: _Fragment, toDisplayString: _toDisplayString, createTextVNode: _createTextVNode, normalizeClass: _normalizeClass, normalizeStyle: _normalizeStyle, renderSlot: _renderSlot } = Vue

return function render(_ctx, _cache) {
  const _component_BaseLoading = _resolveComponent("BaseLoading")
  const _component_BaseError = _resolveComponent("BaseError")
  const _component_BaseEmpty = _resolveComponent("BaseEmpty")

  return (_openBlock(), _createElementBlock("div", { class: "data-table" }, [
    (_ctx.loading)
      ? (_openBlock(), _createBlock(_component_BaseLoading, {
          key: 0,
          type: "spinner",
          size: "lg"
        }))
      : (_ctx.error)
        ? (_openBlock(), _createBlock(_component_BaseError, {
            key: 1,
            title: _ctx.errorText,
            description: _ctx.error,
            "show-back": false,
            "show-home": false,
            onRetry: $event => (_ctx.$emit('refresh'))
          }, null, 8 /* PROPS */, ["title", "description", "onRetry"]))
        : (_ctx.isEmpty)
          ? (_openBlock(), _createBlock(_component_BaseEmpty, {
              key: 2,
              title: _ctx.emptyText
            }, null, 8 /* PROPS */, ["title"]))
          : (_openBlock(), _createElementBlock("div", {
              key: 3,
              class: "overflow-x-auto"
            }, [
              _createElementVNode("table", { class: "table table-zebra" }, [
                _createElementVNode("thead", null, [
                  _createElementVNode("tr", null, [
                    (_ctx.selectable)
                      ? (_openBlock(), _createElementBlock("th", {
                          key: 0,
                          class: "w-12"
                        }, [
                          _createElementVNode("input", {
                            type: "checkbox",
                            class: "checkbox checkbox-sm",
                            checked: _ctx.isAllSelected,
                            ".indeterminate": _ctx.isIndeterminate,
                            onChange: _ctx.handleSelectAll
                          }, null, 40 /* PROPS, NEED_HYDRATION */, ["checked", ".indeterminate", "onChange"])
                        ]))
                      : _createCommentVNode("v-if", true),
                    (_ctx.showIndex)
                      ? (_openBlock(), _createElementBlock("th", {
                          key: 1,
                          class: "w-16"
                        }, "#"))
                      : _createCommentVNode("v-if", true),
                    (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(_ctx.columns, (col) => {
                      return (_openBlock(), _createElementBlock("th", {
                        key: col.key,
                        style: _normalizeStyle({ width: col.width }),
                        class: _normalizeClass([_ctx.getAlignClass(col.align), col.sortable ? 'cursor-pointer select-none' : '']),
                        onClick: $event => (col.sortable && _ctx.$emit('sort', col.key))
                      }, [
                        _createTextVNode(_toDisplayString(col.title) + " ", 1 /* TEXT */),
                        (col.sortable)
                          ? (_openBlock(), _createElementBlock("span", {
                              key: 0,
                              class: "opacity-50 text-xs ml-1"
                            }, "⇅"))
                          : _createCommentVNode("v-if", true)
                      ], 14 /* CLASS, STYLE, PROPS */, ["onClick"]))
                    }), 128 /* KEYED_FRAGMENT */)),
                    (_ctx.$slots.action)
                      ? (_openBlock(), _createElementBlock("th", {
                          key: 2,
                          class: "text-right"
                        }, "操作"))
                      : _createCommentVNode("v-if", true)
                  ])
                ]),
                _createElementVNode("tbody", null, [
                  (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(_ctx.data, (row, index) => {
                    return (_openBlock(), _createElementBlock("tr", {
                      key: _ctx.getRowKey(row)
                    }, [
                      (_ctx.selectable)
                        ? (_openBlock(), _createElementBlock("td", {
                            key: 0,
                            class: "w-12"
                          }, [
                            _createElementVNode("input", {
                              type: "checkbox",
                              class: "checkbox checkbox-sm",
                              checked: _ctx.isRowSelected(row),
                              onChange: $event => (_ctx.handleSelectRow(row, $event))
                            }, null, 40 /* PROPS, NEED_HYDRATION */, ["checked", "onChange"])
                          ]))
                        : _createCommentVNode("v-if", true),
                      (_ctx.showIndex)
                        ? (_openBlock(), _createElementBlock("td", { key: 1 }, _toDisplayString(index + 1), 1 /* TEXT */))
                        : _createCommentVNode("v-if", true),
                      (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(_ctx.columns, (col) => {
                        return (_openBlock(), _createElementBlock("td", {
                          key: col.key,
                          class: _normalizeClass(_ctx.getAlignClass(col.align)),
                          innerHTML: _ctx.getCellContent(col, row, index)
                        }, null, 10 /* CLASS, PROPS */, ["innerHTML"]))
                      }), 128 /* KEYED_FRAGMENT */)),
                      (_ctx.$slots.action)
                        ? (_openBlock(), _createElementBlock("td", {
                            key: 2,
                            class: "text-right"
                          }, [
                            _renderSlot(_ctx.$slots, "action", {
                              row: row,
                              index: index
                            })
                          ]))
                        : _createCommentVNode("v-if", true)
                    ]))
                  }), 128 /* KEYED_FRAGMENT */))
                ])
              ])
            ]))
  ]))
}
})()
};

}, {"../base/BaseLoading":"src/renderer/components/base/BaseLoading.js","../base/BaseEmpty":"src/renderer/components/base/BaseEmpty.js","../base/BaseError":"src/renderer/components/base/BaseError.js"}],
"src/renderer/pages/TaskDetailPage.js": [function(require, module, exports) {
"use strict";
/**
 * @file 任务详情页，展示单个任务的详细信息与进度。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskDetailPage = void 0;
const PageContainer_1 = require("../components/base/PageContainer");
const BaseCard_1 = require("../components/base/BaseCard");
const BaseButton_1 = require("../components/base/BaseButton");
const useToast_1 = require("../composables/useToast");
exports.TaskDetailPage = {
    name: 'TaskDetailPage',
    components: { PageContainer: PageContainer_1.PageContainer, BaseCard: BaseCard_1.BaseCard, BaseButton: BaseButton_1.BaseButton },
    props: {
        params: { type: Object, default: () => ({}) },
        query: { type: Object, default: () => ({}) },
        meta: { type: Object, default: () => ({}) },
        route: { type: Object, default: () => ({}) }
    },
    setup(props) {
        const p = props;
        const toast = (0, useToast_1.useToast)();
        // 任务 ID
        const taskId = Vue.computed(() => p.params.id || 'unknown');
        // 任务详情 mock 数据
        const task = Vue.ref({
            taskId: p.params.id || 'unknown',
            name: '数据同步任务',
            status: 'running',
            progress: 65,
            createdAt: '2026-06-20 09:30',
            owner: 'admin',
            description: '将本地数据同步到远程服务器，包含全量与增量两个阶段。'
        });
        // 返回
        function handleBack() {
            window.history.back();
        }
        // 取消任务
        function handleCancel() {
            toast.warning('已取消', '任务 ' + taskId.value + ' 已取消');
        }
        return { taskId, task, handleBack, handleCancel };
    },
    render: (function () {
const { createElementVNode: _createElementVNode, toDisplayString: _toDisplayString, createTextVNode: _createTextVNode, resolveComponent: _resolveComponent, withCtx: _withCtx, createVNode: _createVNode, openBlock: _openBlock, createBlock: _createBlock } = Vue

return function render(_ctx, _cache) {
  const _component_BaseButton = _resolveComponent("BaseButton")
  const _component_BaseCard = _resolveComponent("BaseCard")
  const _component_PageContainer = _resolveComponent("PageContainer")

  return (_openBlock(), _createBlock(_component_PageContainer, { title: "任务详情" }, {
    default: _withCtx(() => [
      _createVNode(_component_BaseCard, {
        title: '任务 ' + _ctx.taskId
      }, {
        default: _withCtx(() => [
          _createElementVNode("div", { class: "space-y-4" }, [
            _createElementVNode("div", { class: "grid grid-cols-1 sm:grid-cols-2 gap-4" }, [
              _createElementVNode("div", null, [
                _createElementVNode("p", { class: "text-xs text-base-content/50" }, "任务名称"),
                _createElementVNode("p", { class: "text-sm font-medium" }, _toDisplayString(_ctx.task.name), 1 /* TEXT */)
              ]),
              _createElementVNode("div", null, [
                _createElementVNode("p", { class: "text-xs text-base-content/50" }, "状态"),
                _createElementVNode("p", { class: "text-sm font-medium" }, _toDisplayString(_ctx.task.status), 1 /* TEXT */)
              ]),
              _createElementVNode("div", null, [
                _createElementVNode("p", { class: "text-xs text-base-content/50" }, "创建时间"),
                _createElementVNode("p", { class: "text-sm font-medium" }, _toDisplayString(_ctx.task.createdAt), 1 /* TEXT */)
              ]),
              _createElementVNode("div", null, [
                _createElementVNode("p", { class: "text-xs text-base-content/50" }, "负责人"),
                _createElementVNode("p", { class: "text-sm font-medium" }, _toDisplayString(_ctx.task.owner), 1 /* TEXT */)
              ])
            ]),
            _createElementVNode("div", null, [
              _createElementVNode("p", { class: "text-xs text-base-content/50 mb-1" }, "描述"),
              _createElementVNode("p", { class: "text-sm" }, _toDisplayString(_ctx.task.description), 1 /* TEXT */)
            ]),
            _createElementVNode("div", null, [
              _createElementVNode("p", { class: "text-xs text-base-content/50 mb-1" }, "进度"),
              _createElementVNode("progress", {
                class: "progress progress-primary w-full",
                value: _ctx.task.progress,
                max: "100"
              }, null, 8 /* PROPS */, ["value"]),
              _createElementVNode("p", { class: "text-xs text-base-content/50 mt-1" }, _toDisplayString(_ctx.task.progress) + "%", 1 /* TEXT */)
            ]),
            _createElementVNode("div", { class: "flex gap-2 pt-2" }, [
              _createVNode(_component_BaseButton, {
                variant: "ghost",
                onClick: _ctx.handleBack
              }, {
                default: _withCtx(() => [
                  _createTextVNode("返回")
                ]),
                _: 1 /* STABLE */
              }, 8 /* PROPS */, ["onClick"]),
              _createVNode(_component_BaseButton, {
                variant: "error",
                onClick: _ctx.handleCancel
              }, {
                default: _withCtx(() => [
                  _createTextVNode("取消任务")
                ]),
                _: 1 /* STABLE */
              }, 8 /* PROPS */, ["onClick"])
            ])
          ])
        ]),
        _: 1 /* STABLE */
      }, 8 /* PROPS */, ["title"])
    ]),
    _: 1 /* STABLE */
  }))
}
})()
};

}, {"../components/base/PageContainer":"src/renderer/components/base/PageContainer.js","../components/base/BaseCard":"src/renderer/components/base/BaseCard.js","../components/base/BaseButton":"src/renderer/components/base/BaseButton.js","../composables/useToast":"src/renderer/composables/useToast.js"}],
"src/renderer/pages/AboutPage.js": [function(require, module, exports) {
"use strict";
/**
 * @file 关于页，展示应用信息与技术栈。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AboutPage = void 0;
const PageContainer_1 = require("../components/base/PageContainer");
const BaseCard_1 = require("../components/base/BaseCard");
const app_store_1 = require("../stores/app.store");
exports.AboutPage = {
    name: 'AboutPage',
    components: { PageContainer: PageContainer_1.PageContainer, BaseCard: BaseCard_1.BaseCard },
    props: {
        params: { type: Object, default: () => ({}) },
        query: { type: Object, default: () => ({}) },
        meta: { type: Object, default: () => ({}) },
        route: { type: Object, default: () => ({}) }
    },
    setup() {
        const appStore = (0, app_store_1.useAppStore)();
        // 应用信息
        const appName = Vue.computed(() => appStore.state.appName);
        const version = Vue.computed(() => appStore.state.version);
        const platform = Vue.computed(() => appStore.state.platform);
        const environment = Vue.computed(() => appStore.state.environment);
        // 技术栈列表
        const techStack = [
            { name: 'Electron', desc: '跨平台桌面应用框架' },
            { name: 'Vue 3', desc: '渐进式前端框架' },
            { name: 'TypeScript', desc: '类型安全的 JavaScript' },
            { name: 'Tailwind CSS', desc: '原子化 CSS 框架' },
            { name: 'daisyUI v5', desc: 'Tailwind 组件库' }
        ];
        return { appName, version, platform, environment, techStack };
    },
    render: (function () {
const { createElementVNode: _createElementVNode, toDisplayString: _toDisplayString, resolveComponent: _resolveComponent, withCtx: _withCtx, createVNode: _createVNode, renderList: _renderList, Fragment: _Fragment, openBlock: _openBlock, createElementBlock: _createElementBlock, createBlock: _createBlock } = Vue

return function render(_ctx, _cache) {
  const _component_BaseCard = _resolveComponent("BaseCard")
  const _component_PageContainer = _resolveComponent("PageContainer")

  return (_openBlock(), _createBlock(_component_PageContainer, { title: "关于" }, {
    default: _withCtx(() => [
      _createElementVNode("div", { class: "space-y-6 max-w-2xl" }, [
        _createVNode(_component_BaseCard, { title: "应用信息" }, {
          default: _withCtx(() => [
            _createElementVNode("div", { class: "space-y-3" }, [
              _createElementVNode("div", { class: "flex justify-between" }, [
                _createElementVNode("span", { class: "text-sm text-base-content/60" }, "应用名称"),
                _createElementVNode("span", { class: "text-sm font-medium" }, _toDisplayString(_ctx.appName), 1 /* TEXT */)
              ]),
              _createElementVNode("div", { class: "flex justify-between" }, [
                _createElementVNode("span", { class: "text-sm text-base-content/60" }, "版本"),
                _createElementVNode("span", { class: "text-sm font-medium" }, _toDisplayString(_ctx.version), 1 /* TEXT */)
              ]),
              _createElementVNode("div", { class: "flex justify-between" }, [
                _createElementVNode("span", { class: "text-sm text-base-content/60" }, "Electron 版本"),
                _createElementVNode("span", { class: "text-sm font-medium" }, "42.x")
              ]),
              _createElementVNode("div", { class: "flex justify-between" }, [
                _createElementVNode("span", { class: "text-sm text-base-content/60" }, "平台"),
                _createElementVNode("span", { class: "text-sm font-medium" }, _toDisplayString(_ctx.platform), 1 /* TEXT */)
              ]),
              _createElementVNode("div", { class: "flex justify-between" }, [
                _createElementVNode("span", { class: "text-sm text-base-content/60" }, "环境"),
                _createElementVNode("span", { class: "text-sm font-medium" }, _toDisplayString(_ctx.environment), 1 /* TEXT */)
              ])
            ])
          ]),
          _: 1 /* STABLE */
        }),
        _createVNode(_component_BaseCard, { title: "技术栈" }, {
          default: _withCtx(() => [
            _createElementVNode("ul", { class: "space-y-3" }, [
              (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(_ctx.techStack, (tech) => {
                return (_openBlock(), _createElementBlock("li", {
                  key: tech.name,
                  class: "flex items-center justify-between"
                }, [
                  _createElementVNode("span", { class: "text-sm font-medium" }, _toDisplayString(tech.name), 1 /* TEXT */),
                  _createElementVNode("span", { class: "text-xs text-base-content/50" }, _toDisplayString(tech.desc), 1 /* TEXT */)
                ]))
              }), 128 /* KEYED_FRAGMENT */))
            ])
          ]),
          _: 1 /* STABLE */
        })
      ])
    ]),
    _: 1 /* STABLE */
  }))
}
})()
};

}, {"../components/base/PageContainer":"src/renderer/components/base/PageContainer.js","../components/base/BaseCard":"src/renderer/components/base/BaseCard.js","../stores/app.store":"src/renderer/stores/app.store.js"}],
"src/renderer/stores/app.store.js": [function(require, module, exports) {
"use strict";
/**
 * @file 应用 Store，管理应用级状态（名称、版本、环境、就绪状态）。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAppStore = createAppStore;
exports.useAppStore = useAppStore;
const base_1 = require("./base");
const constants_1 = require("../constants");
/** 应用 Store 单例 */
let appStoreInstance = null;
/**
 * 创建应用 Store。
 */
function createAppStore() {
    if (appStoreInstance)
        return appStoreInstance;
    const state = (0, base_1.defineState)({
        appName: constants_1.APP_INFO.NAME,
        version: constants_1.APP_INFO.VERSION,
        environment: constants_1.APP_INFO.ENVIRONMENT,
        isReady: false,
        platform: 'unknown',
        isElectron: typeof window !== 'undefined' && !!window.desktop
    });
    const isDev = (0, base_1.computedRef)(() => state.environment === 'development');
    const isProd = (0, base_1.computedRef)(() => state.environment === 'production');
    function setReady(ready) {
        state.isReady = ready;
    }
    function setPlatform(platform) {
        state.platform = platform;
    }
    function initApp() {
        // 从 navigator 获取平台信息
        if (typeof navigator !== 'undefined') {
            state.platform = navigator.platform || 'unknown';
        }
    }
    const store = {
        $id: 'app',
        state,
        isDev,
        isProd,
        setReady,
        setPlatform,
        initApp,
        $reset: () => {
            state.isReady = false;
        }
    };
    (0, base_1.registerStore)(store);
    appStoreInstance = store;
    return store;
}
/**
 * 获取应用 Store 单例。
 */
function useAppStore() {
    if (!appStoreInstance) {
        return createAppStore();
    }
    return appStoreInstance;
}

}, {"./base":"src/renderer/stores/base.js","../constants":"src/renderer/constants/index.js"}],
"src/renderer/pages/ComponentDemoPage.js": [function(require, module, exports) {
"use strict";
/**
 * @file 组件演示页，集中展示基础组件的能力与用法。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComponentDemoPage = void 0;
const PageContainer_1 = require("../components/base/PageContainer");
const BaseCard_1 = require("../components/base/BaseCard");
const BaseButton_1 = require("../components/base/BaseButton");
const BaseAlert_1 = require("../components/base/BaseAlert");
const BaseModal_1 = require("../components/base/BaseModal");
const BaseDrawer_1 = require("../components/base/BaseDrawer");
const BaseEmpty_1 = require("../components/base/BaseEmpty");
const BaseLoading_1 = require("../components/base/BaseLoading");
const BaseError_1 = require("../components/base/BaseError");
const FormField_1 = require("../components/form/FormField");
const FormInput_1 = require("../components/form/FormInput");
const FormSelect_1 = require("../components/form/FormSelect");
const FormTextarea_1 = require("../components/form/FormTextarea");
const FormSwitch_1 = require("../components/form/FormSwitch");
const SearchForm_1 = require("../components/form/SearchForm");
const DataTable_1 = require("../components/table/DataTable");
const PermissionGate_1 = require("../components/business/PermissionGate");
const useToast_1 = require("../composables/useToast");
exports.ComponentDemoPage = {
    name: 'ComponentDemoPage',
    components: {
        PageContainer: PageContainer_1.PageContainer,
        BaseCard: BaseCard_1.BaseCard,
        BaseButton: BaseButton_1.BaseButton,
        BaseAlert: BaseAlert_1.BaseAlert,
        BaseModal: BaseModal_1.BaseModal,
        BaseDrawer: BaseDrawer_1.BaseDrawer,
        BaseEmpty: BaseEmpty_1.BaseEmpty,
        BaseLoading: BaseLoading_1.BaseLoading,
        BaseError: BaseError_1.BaseError,
        FormField: FormField_1.FormField,
        FormInput: FormInput_1.FormInput,
        FormSelect: FormSelect_1.FormSelect,
        FormTextarea: FormTextarea_1.FormTextarea,
        FormSwitch: FormSwitch_1.FormSwitch,
        SearchForm: SearchForm_1.SearchForm,
        DataTable: DataTable_1.DataTable,
        PermissionGate: PermissionGate_1.PermissionGate
    },
    props: {
        params: { type: Object, default: () => ({}) },
        query: { type: Object, default: () => ({}) },
        meta: { type: Object, default: () => ({}) },
        route: { type: Object, default: () => ({}) }
    },
    setup() {
        const toast = (0, useToast_1.useToast)();
        // Modal / Drawer 显示状态
        const modalVisible = Vue.ref(false);
        const drawerVisible = Vue.ref(false);
        // 表单演示数据
        const formInput = Vue.ref('');
        const formSelect = Vue.ref('');
        const formTextarea = Vue.ref('');
        const formSwitch = Vue.ref(false);
        const selectOptions = [
            { label: '选项一', value: 'opt1' },
            { label: '选项二', value: 'opt2' },
            { label: '选项三', value: 'opt3' }
        ];
        // 搜索表单数据
        const searchKeyword = Vue.ref('');
        const searchStatus = Vue.ref('');
        // 表格数据
        const tableColumns = [
            { key: 'name', title: '名称' },
            { key: 'age', title: '年龄' },
            { key: 'city', title: '城市' }
        ];
        const tableData = [
            { name: '张三', age: 28, city: '北京' },
            { name: '李四', age: 34, city: '上海' },
            { name: '王五', age: 22, city: '广州' }
        ];
        // Toast 演示
        function showToast(type) {
            toast[type](type + ' 提示', '这是一条演示消息');
        }
        // 搜索
        function handleSearch() {
            toast.info('搜索', '关键词: ' + searchKeyword.value);
        }
        // 重置
        function handleReset() {
            searchKeyword.value = '';
            searchStatus.value = '';
        }
        return {
            modalVisible,
            drawerVisible,
            formInput,
            formSelect,
            formTextarea,
            formSwitch,
            selectOptions,
            searchKeyword,
            searchStatus,
            tableColumns,
            tableData,
            showToast,
            handleSearch,
            handleReset
        };
    },
    render: (function () {
const { createTextVNode: _createTextVNode, resolveComponent: _resolveComponent, withCtx: _withCtx, createVNode: _createVNode, createElementVNode: _createElementVNode, openBlock: _openBlock, createBlock: _createBlock } = Vue

return function render(_ctx, _cache) {
  const _component_BaseButton = _resolveComponent("BaseButton")
  const _component_BaseCard = _resolveComponent("BaseCard")
  const _component_BaseAlert = _resolveComponent("BaseAlert")
  const _component_BaseModal = _resolveComponent("BaseModal")
  const _component_BaseDrawer = _resolveComponent("BaseDrawer")
  const _component_FormInput = _resolveComponent("FormInput")
  const _component_FormField = _resolveComponent("FormField")
  const _component_FormSelect = _resolveComponent("FormSelect")
  const _component_FormTextarea = _resolveComponent("FormTextarea")
  const _component_FormSwitch = _resolveComponent("FormSwitch")
  const _component_SearchForm = _resolveComponent("SearchForm")
  const _component_DataTable = _resolveComponent("DataTable")
  const _component_BaseEmpty = _resolveComponent("BaseEmpty")
  const _component_BaseLoading = _resolveComponent("BaseLoading")
  const _component_BaseError = _resolveComponent("BaseError")
  const _component_PermissionGate = _resolveComponent("PermissionGate")
  const _component_PageContainer = _resolveComponent("PageContainer")

  return (_openBlock(), _createBlock(_component_PageContainer, {
    title: "组件演示",
    description: "基础组件能力展示"
  }, {
    default: _withCtx(() => [
      _createElementVNode("div", { class: "space-y-6" }, [
        _createVNode(_component_BaseCard, {
          title: "Button 按钮",
          subtitle: "变体、尺寸、状态"
        }, {
          default: _withCtx(() => [
            _createElementVNode("div", { class: "space-y-3" }, [
              _createElementVNode("div", { class: "flex flex-wrap gap-2" }, [
                _createVNode(_component_BaseButton, { variant: "primary" }, {
                  default: _withCtx(() => [
                    _createTextVNode("primary")
                  ]),
                  _: 1 /* STABLE */
                }),
                _createVNode(_component_BaseButton, { variant: "secondary" }, {
                  default: _withCtx(() => [
                    _createTextVNode("secondary")
                  ]),
                  _: 1 /* STABLE */
                }),
                _createVNode(_component_BaseButton, { variant: "accent" }, {
                  default: _withCtx(() => [
                    _createTextVNode("accent")
                  ]),
                  _: 1 /* STABLE */
                }),
                _createVNode(_component_BaseButton, { variant: "ghost" }, {
                  default: _withCtx(() => [
                    _createTextVNode("ghost")
                  ]),
                  _: 1 /* STABLE */
                }),
                _createVNode(_component_BaseButton, { variant: "link" }, {
                  default: _withCtx(() => [
                    _createTextVNode("link")
                  ]),
                  _: 1 /* STABLE */
                }),
                _createVNode(_component_BaseButton, { variant: "error" }, {
                  default: _withCtx(() => [
                    _createTextVNode("error")
                  ]),
                  _: 1 /* STABLE */
                }),
                _createVNode(_component_BaseButton, { variant: "warning" }, {
                  default: _withCtx(() => [
                    _createTextVNode("warning")
                  ]),
                  _: 1 /* STABLE */
                }),
                _createVNode(_component_BaseButton, { variant: "success" }, {
                  default: _withCtx(() => [
                    _createTextVNode("success")
                  ]),
                  _: 1 /* STABLE */
                }),
                _createVNode(_component_BaseButton, { variant: "info" }, {
                  default: _withCtx(() => [
                    _createTextVNode("info")
                  ]),
                  _: 1 /* STABLE */
                })
              ]),
              _createElementVNode("div", { class: "flex flex-wrap items-center gap-2" }, [
                _createVNode(_component_BaseButton, { size: "xs" }, {
                  default: _withCtx(() => [
                    _createTextVNode("xs")
                  ]),
                  _: 1 /* STABLE */
                }),
                _createVNode(_component_BaseButton, { size: "sm" }, {
                  default: _withCtx(() => [
                    _createTextVNode("sm")
                  ]),
                  _: 1 /* STABLE */
                }),
                _createVNode(_component_BaseButton, { size: "md" }, {
                  default: _withCtx(() => [
                    _createTextVNode("md")
                  ]),
                  _: 1 /* STABLE */
                }),
                _createVNode(_component_BaseButton, { size: "lg" }, {
                  default: _withCtx(() => [
                    _createTextVNode("lg")
                  ]),
                  _: 1 /* STABLE */
                })
              ]),
              _createElementVNode("div", { class: "flex flex-wrap gap-2" }, [
                _createVNode(_component_BaseButton, { loading: true }, {
                  default: _withCtx(() => [
                    _createTextVNode("loading")
                  ]),
                  _: 1 /* STABLE */
                }),
                _createVNode(_component_BaseButton, { disabled: true }, {
                  default: _withCtx(() => [
                    _createTextVNode("disabled")
                  ]),
                  _: 1 /* STABLE */
                }),
                _createVNode(_component_BaseButton, {
                  variant: "primary",
                  outline: ""
                }, {
                  default: _withCtx(() => [
                    _createTextVNode("outline")
                  ]),
                  _: 1 /* STABLE */
                })
              ]),
              _createVNode(_component_BaseButton, { block: "" }, {
                default: _withCtx(() => [
                  _createTextVNode("block")
                ]),
                _: 1 /* STABLE */
              })
            ])
          ]),
          _: 1 /* STABLE */
        }),
        _createVNode(_component_BaseCard, {
          title: "Card 卡片",
          subtitle: "标题与副标题"
        }, {
          default: _withCtx(() => [
            _createElementVNode("p", { class: "text-sm" }, "这是卡片内容，支持 title、subtitle、loading 等属性。")
          ]),
          _: 1 /* STABLE */
        }),
        _createVNode(_component_BaseCard, {
          title: "Alert 告警",
          subtitle: "四种类型"
        }, {
          default: _withCtx(() => [
            _createElementVNode("div", { class: "space-y-2" }, [
              _createVNode(_component_BaseAlert, {
                type: "info",
                title: "信息",
                description: "这是一条信息提示"
              }),
              _createVNode(_component_BaseAlert, {
                type: "success",
                title: "成功",
                description: "操作已完成"
              }),
              _createVNode(_component_BaseAlert, {
                type: "warning",
                title: "警告",
                description: "请注意潜在风险"
              }),
              _createVNode(_component_BaseAlert, {
                type: "error",
                title: "错误",
                description: "操作执行失败"
              })
            ])
          ]),
          _: 1 /* STABLE */
        }),
        _createVNode(_component_BaseCard, {
          title: "Modal 模态框",
          subtitle: "点击按钮打开"
        }, {
          default: _withCtx(() => [
            _createVNode(_component_BaseButton, {
              variant: "primary",
              onClick: $event => (_ctx.modalVisible = true)
            }, {
              default: _withCtx(() => [
                _createTextVNode("打开模态框")
              ]),
              _: 1 /* STABLE */
            }, 8 /* PROPS */, ["onClick"]),
            _createVNode(_component_BaseModal, {
              modelValue: _ctx.modalVisible,
              "onUpdate:modelValue": $event => ((_ctx.modalVisible) = $event),
              title: "演示模态框"
            }, {
              default: _withCtx(() => [
                _createElementVNode("p", { class: "text-sm" }, "这是一个模态框示例内容。")
              ]),
              _: 1 /* STABLE */
            }, 8 /* PROPS */, ["modelValue", "onUpdate:modelValue"])
          ]),
          _: 1 /* STABLE */
        }),
        _createVNode(_component_BaseCard, {
          title: "Drawer 抽屉",
          subtitle: "点击按钮打开"
        }, {
          default: _withCtx(() => [
            _createVNode(_component_BaseButton, {
              variant: "primary",
              onClick: $event => (_ctx.drawerVisible = true)
            }, {
              default: _withCtx(() => [
                _createTextVNode("打开抽屉")
              ]),
              _: 1 /* STABLE */
            }, 8 /* PROPS */, ["onClick"]),
            _createVNode(_component_BaseDrawer, {
              modelValue: _ctx.drawerVisible,
              "onUpdate:modelValue": $event => ((_ctx.drawerVisible) = $event),
              title: "演示抽屉"
            }, {
              default: _withCtx(() => [
                _createElementVNode("p", { class: "text-sm" }, "这是抽屉内容。")
              ]),
              _: 1 /* STABLE */
            }, 8 /* PROPS */, ["modelValue", "onUpdate:modelValue"])
          ]),
          _: 1 /* STABLE */
        }),
        _createVNode(_component_BaseCard, {
          title: "Toast 提示",
          subtitle: "四种类型"
        }, {
          default: _withCtx(() => [
            _createElementVNode("div", { class: "flex flex-wrap gap-2" }, [
              _createVNode(_component_BaseButton, {
                variant: "success",
                size: "sm",
                onClick: $event => (_ctx.showToast('success'))
              }, {
                default: _withCtx(() => [
                  _createTextVNode("success")
                ]),
                _: 1 /* STABLE */
              }, 8 /* PROPS */, ["onClick"]),
              _createVNode(_component_BaseButton, {
                variant: "error",
                size: "sm",
                onClick: $event => (_ctx.showToast('error'))
              }, {
                default: _withCtx(() => [
                  _createTextVNode("error")
                ]),
                _: 1 /* STABLE */
              }, 8 /* PROPS */, ["onClick"]),
              _createVNode(_component_BaseButton, {
                variant: "warning",
                size: "sm",
                onClick: $event => (_ctx.showToast('warning'))
              }, {
                default: _withCtx(() => [
                  _createTextVNode("warning")
                ]),
                _: 1 /* STABLE */
              }, 8 /* PROPS */, ["onClick"]),
              _createVNode(_component_BaseButton, {
                variant: "info",
                size: "sm",
                onClick: $event => (_ctx.showToast('info'))
              }, {
                default: _withCtx(() => [
                  _createTextVNode("info")
                ]),
                _: 1 /* STABLE */
              }, 8 /* PROPS */, ["onClick"])
            ])
          ]),
          _: 1 /* STABLE */
        }),
        _createVNode(_component_BaseCard, {
          title: "Form 表单",
          subtitle: "表单组件集合"
        }, {
          default: _withCtx(() => [
            _createElementVNode("div", { class: "space-y-4 max-w-lg" }, [
              _createVNode(_component_FormField, {
                label: "文本输入",
                required: ""
              }, {
                default: _withCtx(() => [
                  _createVNode(_component_FormInput, {
                    modelValue: _ctx.formInput,
                    "onUpdate:modelValue": $event => ((_ctx.formInput) = $event),
                    placeholder: "请输入文本"
                  }, null, 8 /* PROPS */, ["modelValue", "onUpdate:modelValue"])
                ]),
                _: 1 /* STABLE */
              }),
              _createVNode(_component_FormField, { label: "下拉选择" }, {
                default: _withCtx(() => [
                  _createVNode(_component_FormSelect, {
                    modelValue: _ctx.formSelect,
                    "onUpdate:modelValue": $event => ((_ctx.formSelect) = $event),
                    options: _ctx.selectOptions,
                    placeholder: "请选择"
                  }, null, 8 /* PROPS */, ["modelValue", "onUpdate:modelValue", "options"])
                ]),
                _: 1 /* STABLE */
              }),
              _createVNode(_component_FormField, { label: "多行文本" }, {
                default: _withCtx(() => [
                  _createVNode(_component_FormTextarea, {
                    modelValue: _ctx.formTextarea,
                    "onUpdate:modelValue": $event => ((_ctx.formTextarea) = $event),
                    placeholder: "请输入内容"
                  }, null, 8 /* PROPS */, ["modelValue", "onUpdate:modelValue"])
                ]),
                _: 1 /* STABLE */
              }),
              _createVNode(_component_FormField, { label: "开关" }, {
                default: _withCtx(() => [
                  _createVNode(_component_FormSwitch, {
                    modelValue: _ctx.formSwitch,
                    "onUpdate:modelValue": $event => ((_ctx.formSwitch) = $event),
                    label: "启用选项"
                  }, null, 8 /* PROPS */, ["modelValue", "onUpdate:modelValue"])
                ]),
                _: 1 /* STABLE */
              })
            ])
          ]),
          _: 1 /* STABLE */
        }),
        _createVNode(_component_BaseCard, {
          title: "SearchForm 搜索表单",
          subtitle: "搜索与重置"
        }, {
          default: _withCtx(() => [
            _createVNode(_component_SearchForm, {
              onSearch: _ctx.handleSearch,
              onReset: _ctx.handleReset
            }, {
              default: _withCtx(() => [
                _createVNode(_component_FormField, { label: "关键词" }, {
                  default: _withCtx(() => [
                    _createVNode(_component_FormInput, {
                      modelValue: _ctx.searchKeyword,
                      "onUpdate:modelValue": $event => ((_ctx.searchKeyword) = $event),
                      placeholder: "请输入关键词"
                    }, null, 8 /* PROPS */, ["modelValue", "onUpdate:modelValue"])
                  ]),
                  _: 1 /* STABLE */
                }),
                _createVNode(_component_FormField, { label: "状态" }, {
                  default: _withCtx(() => [
                    _createVNode(_component_FormSelect, {
                      modelValue: _ctx.searchStatus,
                      "onUpdate:modelValue": $event => ((_ctx.searchStatus) = $event),
                      options: _ctx.selectOptions,
                      placeholder: "请选择状态"
                    }, null, 8 /* PROPS */, ["modelValue", "onUpdate:modelValue", "options"])
                  ]),
                  _: 1 /* STABLE */
                })
              ]),
              _: 1 /* STABLE */
            }, 8 /* PROPS */, ["onSearch", "onReset"])
          ]),
          _: 1 /* STABLE */
        }),
        _createVNode(_component_BaseCard, {
          title: "DataTable 数据表格",
          subtitle: "简单表格"
        }, {
          default: _withCtx(() => [
            _createVNode(_component_DataTable, {
              columns: _ctx.tableColumns,
              data: _ctx.tableData,
              "row-key": "name"
            }, null, 8 /* PROPS */, ["columns", "data"])
          ]),
          _: 1 /* STABLE */
        }),
        _createVNode(_component_BaseCard, { title: "Empty 空状态" }, {
          default: _withCtx(() => [
            _createVNode(_component_BaseEmpty, {
              title: "暂无数据",
              description: "这里还没有任何内容"
            })
          ]),
          _: 1 /* STABLE */
        }),
        _createVNode(_component_BaseCard, {
          title: "Loading 加载",
          subtitle: "多种模式"
        }, {
          default: _withCtx(() => [
            _createElementVNode("div", { class: "space-y-4" }, [
              _createElementVNode("div", null, [
                _createElementVNode("p", { class: "text-xs text-base-content/50 mb-1" }, "spinner"),
                _createVNode(_component_BaseLoading, { type: "spinner" })
              ]),
              _createElementVNode("div", null, [
                _createElementVNode("p", { class: "text-xs text-base-content/50 mb-1" }, "skeleton"),
                _createVNode(_component_BaseLoading, { type: "skeleton" })
              ]),
              _createElementVNode("div", null, [
                _createElementVNode("p", { class: "text-xs text-base-content/50 mb-1" }, "text"),
                _createVNode(_component_BaseLoading, {
                  type: "text",
                  text: "加载中..."
                })
              ])
            ])
          ]),
          _: 1 /* STABLE */
        }),
        _createVNode(_component_BaseCard, { title: "Error 错误状态" }, {
          default: _withCtx(() => [
            _createVNode(_component_BaseError, {
              title: "加载失败",
              description: "数据获取失败，请重试",
              "show-retry": false,
              "show-back": false,
              "show-home": false
            })
          ]),
          _: 1 /* STABLE */
        }),
        _createVNode(_component_BaseCard, {
          title: "ThemeToggle 主题切换",
          subtitle: "主题切换组件"
        }, {
          default: _withCtx(() => [
            _createElementVNode("p", { class: "text-sm text-base-content/60" }, "主题切换组件位于顶部导航栏，点击图标可切换浅色/深色/商务/企业主题。")
          ]),
          _: 1 /* STABLE */
        }),
        _createVNode(_component_BaseCard, {
          title: "PermissionGate 权限控制",
          subtitle: "根据权限显示内容"
        }, {
          default: _withCtx(() => [
            _createVNode(_component_PermissionGate, { permissions: ['user:create'] }, {
              fallback: _withCtx(() => [
                _createElementVNode("p", { class: "text-sm text-base-content/50" }, "当前用户无 user:create 权限，按钮已隐藏。")
              ]),
              default: _withCtx(() => [
                _createVNode(_component_BaseButton, {
                  variant: "primary",
                  size: "sm"
                }, {
                  default: _withCtx(() => [
                    _createTextVNode("拥有 user:create 权限可见")
                  ]),
                  _: 1 /* STABLE */
                })
              ]),
              _: 1 /* STABLE */
            })
          ]),
          _: 1 /* STABLE */
        }),
        _createVNode(_component_BaseCard, {
          title: "WindowControls 窗口控制",
          subtitle: "窗口操作组件"
        }, {
          default: _withCtx(() => [
            _createElementVNode("p", { class: "text-sm text-base-content/60" }, "窗口控制组件位于标题栏右侧，提供最小化、最大化/还原、关闭按钮，通过 useWindowControls 组合式函数实现。")
          ]),
          _: 1 /* STABLE */
        })
      ])
    ]),
    _: 1 /* STABLE */
  }))
}
})()
};

}, {"../components/base/PageContainer":"src/renderer/components/base/PageContainer.js","../components/base/BaseCard":"src/renderer/components/base/BaseCard.js","../components/base/BaseButton":"src/renderer/components/base/BaseButton.js","../components/base/BaseAlert":"src/renderer/components/base/BaseAlert.js","../components/base/BaseModal":"src/renderer/components/base/BaseModal.js","../components/base/BaseDrawer":"src/renderer/components/base/BaseDrawer.js","../components/base/BaseEmpty":"src/renderer/components/base/BaseEmpty.js","../components/base/BaseLoading":"src/renderer/components/base/BaseLoading.js","../components/base/BaseError":"src/renderer/components/base/BaseError.js","../components/form/FormField":"src/renderer/components/form/FormField.js","../components/form/FormInput":"src/renderer/components/form/FormInput.js","../components/form/FormSelect":"src/renderer/components/form/FormSelect.js","../components/form/FormTextarea":"src/renderer/components/form/FormTextarea.js","../components/form/FormSwitch":"src/renderer/components/form/FormSwitch.js","../components/form/SearchForm":"src/renderer/components/form/SearchForm.js","../components/table/DataTable":"src/renderer/components/table/DataTable.js","../components/business/PermissionGate":"src/renderer/components/business/PermissionGate.js","../composables/useToast":"src/renderer/composables/useToast.js"}],
"src/renderer/components/base/BaseAlert.js": [function(require, module, exports) {
"use strict";
/**
 * @file 基础告警组件，基于 daisyUI alert。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseAlert = void 0;
/** 类型到 daisyUI alert 类名映射 */
const typeMap = {
    info: 'alert-info',
    success: 'alert-success',
    warning: 'alert-warning',
    error: 'alert-error'
};
/** 默认图标映射 */
const defaultIconMap = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌'
};
exports.BaseAlert = {
    name: 'BaseAlert',
    props: {
        type: { type: Object, default: 'info' },
        title: { type: String, default: '' },
        description: { type: String, default: '' },
        closable: { type: Boolean, default: false },
        icon: { type: String, default: '' }
    },
    emits: ['close'],
    setup(props) {
        const p = props;
        const typeClass = Vue.computed(() => typeMap[p.type] || 'alert-info');
        const defaultIcon = Vue.computed(() => defaultIconMap[p.type] || 'ℹ️');
        return { typeClass, defaultIcon };
    },
    render: (function () {
const { toDisplayString: _toDisplayString, createElementVNode: _createElementVNode, openBlock: _openBlock, createElementBlock: _createElementBlock, createCommentVNode: _createCommentVNode, normalizeClass: _normalizeClass } = Vue

return function render(_ctx, _cache) {
  return (_openBlock(), _createElementBlock("div", {
    class: _normalizeClass(["alert", _ctx.typeClass])
  }, [
    _createElementVNode("span", { class: "text-xl" }, _toDisplayString(_ctx.icon || _ctx.defaultIcon), 1 /* TEXT */),
    _createElementVNode("div", { class: "flex-1" }, [
      (_ctx.title)
        ? (_openBlock(), _createElementBlock("h3", {
            key: 0,
            class: "font-medium"
          }, _toDisplayString(_ctx.title), 1 /* TEXT */))
        : _createCommentVNode("v-if", true),
      (_ctx.description)
        ? (_openBlock(), _createElementBlock("p", {
            key: 1,
            class: "text-sm opacity-80"
          }, _toDisplayString(_ctx.description), 1 /* TEXT */))
        : _createCommentVNode("v-if", true)
    ]),
    (_ctx.closable)
      ? (_openBlock(), _createElementBlock("button", {
          key: 0,
          class: "btn btn-ghost btn-xs",
          onClick: $event => (_ctx.$emit('close'))
        }, "✕", 8 /* PROPS */, ["onClick"]))
      : _createCommentVNode("v-if", true)
  ], 2 /* CLASS */))
}
})()
};

}, {}],
"src/renderer/components/base/BaseModal.js": [function(require, module, exports) {
"use strict";
/**
 * @file 基础模态框组件，基于 daisyUI modal。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseModal = void 0;
/** 尺寸到 max-width 类名映射 */
const sizeMap = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl'
};
exports.BaseModal = {
    name: 'BaseModal',
    props: {
        modelValue: { type: Boolean, default: false },
        title: { type: String, default: '' },
        size: { type: Object, default: 'md' },
        loading: { type: Boolean, default: false },
        confirmText: { type: String, default: '确认' },
        cancelText: { type: String, default: '取消' },
        closeOnEsc: { type: Boolean, default: true },
        closeOnBackdrop: { type: Boolean, default: true },
        showConfirm: { type: Boolean, default: true },
        showCancel: { type: Boolean, default: true }
    },
    emits: ['update:modelValue', 'confirm', 'cancel', 'close'],
    setup(props, ctx) {
        const { emit } = ctx;
        const p = props;
        // 尺寸 class
        const sizeClass = Vue.computed(() => sizeMap[p.size] || 'max-w-md');
        // 关闭模态框
        function close() {
            emit('update:modelValue', false);
            emit('close');
        }
        // 背景点击处理
        function handleBackdrop() {
            if (p.closeOnBackdrop) {
                close();
            }
        }
        // 确认按钮处理
        function handleConfirm() {
            emit('confirm');
        }
        // 取消按钮处理
        function handleCancel() {
            emit('cancel');
            close();
        }
        // ESC 键处理
        function handleKeydown(event) {
            if (event.key === 'Escape' && p.closeOnEsc && p.modelValue) {
                close();
            }
        }
        Vue.onMounted(() => {
            window.addEventListener('keydown', handleKeydown);
        });
        Vue.onBeforeUnmount(() => {
            window.removeEventListener('keydown', handleKeydown);
        });
        return { sizeClass, close, handleBackdrop, handleConfirm, handleCancel };
    },
    render: (function () {
const { createElementVNode: _createElementVNode, openBlock: _openBlock, createElementBlock: _createElementBlock, createCommentVNode: _createCommentVNode, toDisplayString: _toDisplayString, renderSlot: _renderSlot, normalizeClass: _normalizeClass, withModifiers: _withModifiers, Transition: _Transition, withCtx: _withCtx, createVNode: _createVNode, Teleport: _Teleport, createBlock: _createBlock } = Vue

return function render(_ctx, _cache) {
  return (_openBlock(), _createBlock(_Teleport, { to: "body" }, [
    _createVNode(_Transition, { name: "modal" }, {
      default: _withCtx(() => [
        (_ctx.modelValue)
          ? (_openBlock(), _createElementBlock("div", {
              key: 0,
              class: "modal modal-open",
              onClick: _withModifiers(_ctx.handleBackdrop, ["self"])
            }, [
              _createElementVNode("div", {
                class: _normalizeClass(["modal-box relative", _ctx.sizeClass])
              }, [
                (_ctx.loading)
                  ? (_openBlock(), _createElementBlock("div", {
                      key: 0,
                      class: "absolute inset-0 flex items-center justify-center bg-base-100/60 z-20 rounded-box"
                    }, [
                      _createElementVNode("span", { class: "loading loading-spinner loading-lg" })
                    ]))
                  : _createCommentVNode("v-if", true),
                _createElementVNode("div", { class: "flex items-center justify-between mb-4" }, [
                  (_ctx.title)
                    ? (_openBlock(), _createElementBlock("h3", {
                        key: 0,
                        class: "text-lg font-semibold"
                      }, _toDisplayString(_ctx.title), 1 /* TEXT */))
                    : _createCommentVNode("v-if", true),
                  _createElementVNode("button", {
                    class: "btn btn-ghost btn-xs btn-circle ml-auto",
                    onClick: _ctx.close
                  }, "✕", 8 /* PROPS */, ["onClick"])
                ]),
                _createElementVNode("div", { class: "py-2" }, [
                  _renderSlot(_ctx.$slots, "default")
                ]),
                (_ctx.$slots.footer)
                  ? (_openBlock(), _createElementBlock("div", {
                      key: 1,
                      class: "modal-action"
                    }, [
                      _renderSlot(_ctx.$slots, "footer")
                    ]))
                  : (_ctx.showConfirm || _ctx.showCancel)
                    ? (_openBlock(), _createElementBlock("div", {
                        key: 2,
                        class: "modal-action"
                      }, [
                        (_ctx.showCancel)
                          ? (_openBlock(), _createElementBlock("button", {
                              key: 0,
                              class: "btn btn-ghost",
                              onClick: _ctx.handleCancel
                            }, _toDisplayString(_ctx.cancelText), 9 /* TEXT, PROPS */, ["onClick"]))
                          : _createCommentVNode("v-if", true),
                        (_ctx.showConfirm)
                          ? (_openBlock(), _createElementBlock("button", {
                              key: 1,
                              class: "btn btn-primary",
                              onClick: _ctx.handleConfirm
                            }, _toDisplayString(_ctx.confirmText), 9 /* TEXT, PROPS */, ["onClick"]))
                          : _createCommentVNode("v-if", true)
                      ]))
                    : _createCommentVNode("v-if", true)
              ], 2 /* CLASS */)
            ], 8 /* PROPS */, ["onClick"]))
          : _createCommentVNode("v-if", true)
      ]),
      _: 3 /* FORWARDED */
    })
  ]))
}
})()
};

}, {}],
"src/renderer/components/base/BaseDrawer.js": [function(require, module, exports) {
"use strict";
/**
 * @file 基础抽屉组件，基于 daisyUI drawer 风格。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseDrawer = void 0;
/** 尺寸到宽度类名映射 */
const sizeMap = {
    sm: 'w-80',
    md: 'w-96',
    lg: 'w-[32rem]'
};
exports.BaseDrawer = {
    name: 'BaseDrawer',
    props: {
        modelValue: { type: Boolean, default: false },
        side: { type: Object, default: 'right' },
        title: { type: String, default: '' },
        size: { type: Object, default: 'md' },
        closeOnBackdrop: { type: Boolean, default: true }
    },
    emits: ['update:modelValue', 'close'],
    setup(props, ctx) {
        const { emit } = ctx;
        const p = props;
        // 尺寸 class
        const sizeClass = Vue.computed(() => sizeMap[p.size] || 'w-96');
        // 方向 class
        const sideClass = Vue.computed(() => (p.side === 'left' ? 'left-0' : 'right-0'));
        // 过渡动画名称
        const transitionName = Vue.computed(() => (p.side === 'left' ? 'fade' : 'toast'));
        // 关闭抽屉
        function close() {
            emit('update:modelValue', false);
            emit('close');
        }
        // 背景点击处理
        function handleBackdrop() {
            if (p.closeOnBackdrop) {
                close();
            }
        }
        return { sizeClass, sideClass, transitionName, close, handleBackdrop };
    },
    render: (function () {
const { createElementVNode: _createElementVNode, toDisplayString: _toDisplayString, openBlock: _openBlock, createElementBlock: _createElementBlock, createCommentVNode: _createCommentVNode, renderSlot: _renderSlot, normalizeClass: _normalizeClass, Transition: _Transition, withCtx: _withCtx, createVNode: _createVNode, Teleport: _Teleport, createBlock: _createBlock } = Vue

return function render(_ctx, _cache) {
  return (_openBlock(), _createBlock(_Teleport, { to: "body" }, [
    _createVNode(_Transition, { name: _ctx.transitionName }, {
      default: _withCtx(() => [
        (_ctx.modelValue)
          ? (_openBlock(), _createElementBlock("div", {
              key: 0,
              class: "fixed inset-0 z-50"
            }, [
              _createElementVNode("div", {
                class: "absolute inset-0 bg-black/50",
                onClick: _ctx.handleBackdrop
              }, null, 8 /* PROPS */, ["onClick"]),
              _createElementVNode("div", {
                class: _normalizeClass(["absolute top-0 h-full bg-base-100 shadow-xl flex flex-col", [_ctx.sizeClass, _ctx.sideClass]])
              }, [
                _createElementVNode("div", { class: "flex items-center justify-between p-4 border-b border-base-300" }, [
                  (_ctx.title)
                    ? (_openBlock(), _createElementBlock("h3", {
                        key: 0,
                        class: "text-lg font-semibold"
                      }, _toDisplayString(_ctx.title), 1 /* TEXT */))
                    : _createCommentVNode("v-if", true),
                  _createElementVNode("button", {
                    class: "btn btn-ghost btn-xs btn-circle ml-auto",
                    onClick: _ctx.close
                  }, "✕", 8 /* PROPS */, ["onClick"])
                ]),
                _createElementVNode("div", { class: "flex-1 overflow-auto p-4" }, [
                  _renderSlot(_ctx.$slots, "default")
                ])
              ], 2 /* CLASS */)
            ]))
          : _createCommentVNode("v-if", true)
      ]),
      _: 3 /* FORWARDED */
    }, 8 /* PROPS */, ["name"])
  ]))
}
})()
};

}, {}],
"src/renderer/components/form/FormTextarea.js": [function(require, module, exports) {
"use strict";
/**
 * @file 多行文本输入组件，基于 daisyUI textarea。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormTextarea = void 0;
exports.FormTextarea = {
    name: 'FormTextarea',
    props: {
        modelValue: { type: String, default: '' },
        placeholder: { type: String, default: '' },
        rows: { type: Number, default: 3 },
        disabled: { type: Boolean, default: false },
        readonly: { type: Boolean, default: false },
        error: { type: Boolean, default: false },
        resize: { type: Object, default: 'vertical' }
    },
    emits: ['update:modelValue', 'blur'],
    setup(props, ctx) {
        const { emit } = ctx;
        // 输入事件处理
        function handleInput(event) {
            const target = event.target;
            emit('update:modelValue', target.value);
        }
        return { handleInput };
    },
    render: (function () {
const { normalizeClass: _normalizeClass, normalizeStyle: _normalizeStyle, openBlock: _openBlock, createElementBlock: _createElementBlock } = Vue

return function render(_ctx, _cache) {
  return (_openBlock(), _createElementBlock("textarea", {
    value: _ctx.modelValue,
    placeholder: _ctx.placeholder,
    rows: _ctx.rows,
    disabled: _ctx.disabled,
    readonly: _ctx.readonly,
    class: _normalizeClass(["textarea textarea-bordered w-full", { 'textarea-error': _ctx.error }]),
    style: _normalizeStyle({ resize: _ctx.resize }),
    onInput: _ctx.handleInput,
    onBlur: $event => (_ctx.$emit('blur', $event))
  }, null, 46 /* CLASS, STYLE, PROPS, NEED_HYDRATION */, ["value", "placeholder", "rows", "disabled", "readonly", "onInput", "onBlur"]))
}
})()
};

}, {}],
"src/renderer/components/form/SearchForm.js": [function(require, module, exports) {
"use strict";
/**
 * @file 搜索表单容器组件，提供展开/收起、搜索、重置能力。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchForm = void 0;
const BaseButton_1 = require("../base/BaseButton");
exports.SearchForm = {
    name: 'SearchForm',
    components: { BaseButton: BaseButton_1.BaseButton },
    props: {
        modelValue: { type: Object, default: () => ({}) },
        collapsible: { type: Boolean, default: true },
        defaultCollapsed: { type: Boolean, default: false },
        loading: { type: Boolean, default: false }
    },
    emits: ['update:modelValue', 'search', 'reset'],
    setup(props) {
        const p = props;
        // 收起状态，初始值取 defaultCollapsed
        const collapsed = Vue.ref(p.defaultCollapsed);
        // 切换展开/收起
        function toggleCollapse() {
            collapsed.value = !collapsed.value;
        }
        return { collapsed, toggleCollapse };
    },
    render: (function () {
const { renderSlot: _renderSlot, createElementVNode: _createElementVNode, createTextVNode: _createTextVNode, resolveComponent: _resolveComponent, withCtx: _withCtx, createVNode: _createVNode, toDisplayString: _toDisplayString, openBlock: _openBlock, createBlock: _createBlock, createCommentVNode: _createCommentVNode, createElementBlock: _createElementBlock } = Vue

return function render(_ctx, _cache) {
  const _component_BaseButton = _resolveComponent("BaseButton")

  return (_openBlock(), _createElementBlock("div", { class: "bg-base-100 rounded-lg p-4 mb-4 border border-base-300" }, [
    _createElementVNode("div", { class: "flex flex-wrap items-center gap-3" }, [
      _createElementVNode("div", { class: "flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3" }, [
        _renderSlot(_ctx.$slots, "default")
      ]),
      _createElementVNode("div", { class: "flex items-center gap-2" }, [
        _createVNode(_component_BaseButton, {
          variant: "primary",
          size: "sm",
          loading: _ctx.loading,
          onClick: $event => (_ctx.$emit('search'))
        }, {
          default: _withCtx(() => [
            _createTextVNode("搜索")
          ]),
          _: 1 /* STABLE */
        }, 8 /* PROPS */, ["loading", "onClick"]),
        _createVNode(_component_BaseButton, {
          variant: "ghost",
          size: "sm",
          onClick: $event => (_ctx.$emit('reset'))
        }, {
          default: _withCtx(() => [
            _createTextVNode("重置")
          ]),
          _: 1 /* STABLE */
        }, 8 /* PROPS */, ["onClick"]),
        _renderSlot(_ctx.$slots, "extra"),
        (_ctx.collapsible)
          ? (_openBlock(), _createBlock(_component_BaseButton, {
              key: 0,
              variant: "ghost",
              size: "sm",
              onClick: _ctx.toggleCollapse
            }, {
              default: _withCtx(() => [
                _createTextVNode(_toDisplayString(_ctx.collapsed ? '展开' : '收起'), 1 /* TEXT */)
              ]),
              _: 1 /* STABLE */
            }, 8 /* PROPS */, ["onClick"]))
          : _createCommentVNode("v-if", true)
      ])
    ])
  ]))
}
})()
};

}, {"../base/BaseButton":"src/renderer/components/base/BaseButton.js"}],
"src/renderer/components/business/PermissionGate.js": [function(require, module, exports) {
"use strict";
/**
 * @file 权限控制组件，根据权限/角色/窗口角色控制内容显示或禁用。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionGate = void 0;
const usePermission_1 = require("../../composables/usePermission");
exports.PermissionGate = {
    name: 'PermissionGate',
    props: {
        permissions: { type: Array, default: () => [] },
        mode: { type: Object, default: 'any' },
        behavior: { type: Object, default: 'hide' },
        roles: { type: Array, default: () => [] },
        windowRoles: { type: Array, default: () => [] }
    },
    setup(props) {
        const p = props;
        const { hasAnyPermission, hasAllPermissions, hasRole, isWindowRole } = (0, usePermission_1.usePermission)();
        // 是否允许显示：所有非空条件均需满足
        const allowed = Vue.computed(() => {
            // 权限检查
            if (p.permissions && p.permissions.length > 0) {
                if (p.mode === 'all') {
                    if (!hasAllPermissions(p.permissions))
                        return false;
                }
                else {
                    if (!hasAnyPermission(p.permissions))
                        return false;
                }
            }
            // 角色检查（任一角色匹配即可）
            if (p.roles && p.roles.length > 0) {
                const hasAnyRole = p.roles.some((r) => hasRole(r));
                if (!hasAnyRole)
                    return false;
            }
            // 窗口角色检查（任一窗口角色匹配即可）
            if (p.windowRoles && p.windowRoles.length > 0) {
                const hasAnyWindowRole = p.windowRoles.some((r) => isWindowRole(r));
                if (!hasAnyWindowRole)
                    return false;
            }
            return true;
        });
        return { allowed };
    },
    render: (function () {
const { renderSlot: _renderSlot, openBlock: _openBlock, createElementBlock: _createElementBlock, createCommentVNode: _createCommentVNode } = Vue

return function render(_ctx, _cache) {
  return (_ctx.allowed)
    ? (_openBlock(), _createElementBlock("div", { key: 0 }, [
        _renderSlot(_ctx.$slots, "default")
      ]))
    : (_ctx.behavior === 'disable')
      ? (_openBlock(), _createElementBlock("div", {
          key: 1,
          class: "pointer-events-none opacity-50"
        }, [
          _renderSlot(_ctx.$slots, "default")
        ]))
      : _renderSlot(_ctx.$slots, "fallback", { key: 2 })
}
})()
};

}, {"../../composables/usePermission":"src/renderer/composables/usePermission.js"}],
"src/renderer/composables/usePermission.js": [function(require, module, exports) {
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

}, {"../stores/permission.store":"src/renderer/stores/permission.store.js"}],
"src/renderer/stores/permission.store.js": [function(require, module, exports) {
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

}, {"./base":"src/renderer/stores/base.js","../constants":"src/renderer/constants/index.js"}],
"src/renderer/pages/ForbiddenPage.js": [function(require, module, exports) {
"use strict";
/**
 * @file 403 禁止访问页，无权限时展示。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForbiddenPage = void 0;
const BaseButton_1 = require("../components/base/BaseButton");
exports.ForbiddenPage = {
    name: 'ForbiddenPage',
    components: { BaseButton: BaseButton_1.BaseButton },
    props: {
        params: { type: Object, default: () => ({}) },
        query: { type: Object, default: () => ({}) },
        meta: { type: Object, default: () => ({}) },
        route: { type: Object, default: () => ({}) }
    },
    setup() {
        // 返回首页
        function goHome() {
            window.location.hash = '#/';
        }
        return { goHome };
    },
    render: (function () {
const { createElementVNode: _createElementVNode, createTextVNode: _createTextVNode, resolveComponent: _resolveComponent, withCtx: _withCtx, createVNode: _createVNode, openBlock: _openBlock, createElementBlock: _createElementBlock } = Vue

return function render(_ctx, _cache) {
  const _component_BaseButton = _resolveComponent("BaseButton")

  return (_openBlock(), _createElementBlock("div", { class: "min-h-[60vh] flex flex-col items-center justify-center text-center" }, [
    _createElementVNode("div", { class: "text-8xl font-bold text-error mb-4" }, "403"),
    _createElementVNode("h2", { class: "text-2xl font-semibold mb-2" }, "无权访问"),
    _createElementVNode("p", { class: "text-base-content/60 mb-6" }, "您没有权限访问此页面"),
    _createVNode(_component_BaseButton, { onClick: _ctx.goHome }, {
      default: _withCtx(() => [
        _createTextVNode("返回首页")
      ]),
      _: 1 /* STABLE */
    }, 8 /* PROPS */, ["onClick"])
  ]))
}
})()
};

}, {"../components/base/BaseButton":"src/renderer/components/base/BaseButton.js"}],
"src/renderer/pages/NotFoundPage.js": [function(require, module, exports) {
"use strict";
/**
 * @file 404 未找到页，路由无法匹配时展示。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotFoundPage = void 0;
const BaseButton_1 = require("../components/base/BaseButton");
exports.NotFoundPage = {
    name: 'NotFoundPage',
    components: { BaseButton: BaseButton_1.BaseButton },
    props: {
        params: { type: Object, default: () => ({}) },
        query: { type: Object, default: () => ({}) },
        meta: { type: Object, default: () => ({}) },
        route: { type: Object, default: () => ({}) }
    },
    setup(props) {
        const p = props;
        // 请求的路径
        const requestedPath = Vue.computed(() => p.route.path || window.location.hash);
        // 返回首页
        function goHome() {
            window.location.hash = '#/';
        }
        return { requestedPath, goHome };
    },
    render: (function () {
const { createElementVNode: _createElementVNode, toDisplayString: _toDisplayString, createTextVNode: _createTextVNode, resolveComponent: _resolveComponent, withCtx: _withCtx, createVNode: _createVNode, openBlock: _openBlock, createElementBlock: _createElementBlock } = Vue

return function render(_ctx, _cache) {
  const _component_BaseButton = _resolveComponent("BaseButton")

  return (_openBlock(), _createElementBlock("div", { class: "min-h-[60vh] flex flex-col items-center justify-center text-center" }, [
    _createElementVNode("div", { class: "text-8xl font-bold text-error mb-4" }, "404"),
    _createElementVNode("h2", { class: "text-2xl font-semibold mb-2" }, "页面不存在"),
    _createElementVNode("p", { class: "text-base-content/60 mb-2" }, "您访问的页面不存在"),
    _createElementVNode("p", { class: "text-sm text-base-content/40 mb-6" }, "请求路径: " + _toDisplayString(_ctx.requestedPath), 1 /* TEXT */),
    _createVNode(_component_BaseButton, { onClick: _ctx.goHome }, {
      default: _withCtx(() => [
        _createTextVNode("返回首页")
      ]),
      _: 1 /* STABLE */
    }, 8 /* PROPS */, ["onClick"])
  ]))
}
})()
};

}, {"../components/base/BaseButton":"src/renderer/components/base/BaseButton.js"}],
"src/renderer/pages/ServerErrorPage.js": [function(require, module, exports) {
"use strict";
/**
 * @file 500 服务器错误页，服务异常时展示。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerErrorPage = void 0;
const BaseButton_1 = require("../components/base/BaseButton");
exports.ServerErrorPage = {
    name: 'ServerErrorPage',
    components: { BaseButton: BaseButton_1.BaseButton },
    props: {
        params: { type: Object, default: () => ({}) },
        query: { type: Object, default: () => ({}) },
        meta: { type: Object, default: () => ({}) },
        route: { type: Object, default: () => ({}) }
    },
    setup() {
        // 重试
        function handleRetry() {
            window.location.reload();
        }
        // 返回首页
        function goHome() {
            window.location.hash = '#/';
        }
        return { handleRetry, goHome };
    },
    render: (function () {
const { createElementVNode: _createElementVNode, createTextVNode: _createTextVNode, resolveComponent: _resolveComponent, withCtx: _withCtx, createVNode: _createVNode, openBlock: _openBlock, createElementBlock: _createElementBlock } = Vue

return function render(_ctx, _cache) {
  const _component_BaseButton = _resolveComponent("BaseButton")

  return (_openBlock(), _createElementBlock("div", { class: "min-h-[60vh] flex flex-col items-center justify-center text-center" }, [
    _createElementVNode("div", { class: "text-8xl font-bold text-error mb-4" }, "500"),
    _createElementVNode("h2", { class: "text-2xl font-semibold mb-2" }, "服务器错误"),
    _createElementVNode("p", { class: "text-base-content/60 mb-6" }, "服务器遇到错误，请稍后重试"),
    _createElementVNode("div", { class: "flex gap-2" }, [
      _createVNode(_component_BaseButton, {
        variant: "primary",
        onClick: _ctx.handleRetry
      }, {
        default: _withCtx(() => [
          _createTextVNode("重试")
        ]),
        _: 1 /* STABLE */
      }, 8 /* PROPS */, ["onClick"]),
      _createVNode(_component_BaseButton, {
        variant: "ghost",
        onClick: _ctx.goHome
      }, {
        default: _withCtx(() => [
          _createTextVNode("返回首页")
        ]),
        _: 1 /* STABLE */
      }, 8 /* PROPS */, ["onClick"])
    ])
  ]))
}
})()
};

}, {"../components/base/BaseButton":"src/renderer/components/base/BaseButton.js"}],
"src/renderer/composables/useCurrentWindow.js": [function(require, module, exports) {
"use strict";
/**
 * @file 当前窗口状态组合式函数，获取当前窗口信息并订阅状态变化。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.useCurrentWindow = useCurrentWindow;
/**
 * 当前窗口组合式函数，在组件 setup 中调用。
 *
 * - 挂载时调用 window.desktop.window.getCurrent() 获取窗口信息
 * - 订阅 onStateChanged 跟踪最大化/可见性等状态
 * - 订阅 onFocusChanged 跟踪聚焦状态
 * - 卸载时自动取消全部订阅
 *
 * @returns 当前窗口的响应式状态。
 */
function useCurrentWindow() {
    const windowId = Vue.ref(0);
    const role = Vue.ref('');
    const instanceKey = Vue.ref('');
    const isMaximized = Vue.ref(false);
    const isFocused = Vue.ref(false);
    const isVisible = Vue.ref(true);
    const permissions = Vue.ref([]);
    let stateUnsubscribe = null;
    let focusUnsubscribe = null;
    Vue.onMounted(async () => {
        try {
            const info = await window.desktop.window.getCurrent();
            windowId.value = info.windowId;
            role.value = info.role;
            instanceKey.value = info.instanceKey;
            permissions.value = info.permissions;
        }
        catch {
            // 获取窗口信息失败时保持默认值
        }
        stateUnsubscribe = window.desktop.window.onStateChanged((payload) => {
            if (windowId.value !== 0 && payload.windowId !== windowId.value) {
                return;
            }
            switch (payload.state) {
                case 'maximized':
                    isMaximized.value = true;
                    break;
                case 'unmaximized':
                    isMaximized.value = false;
                    break;
                case 'focused':
                    isFocused.value = true;
                    break;
                case 'blurred':
                    isFocused.value = false;
                    break;
                case 'shown':
                    isVisible.value = true;
                    break;
                case 'hidden':
                    isVisible.value = false;
                    break;
                case 'minimized':
                    isVisible.value = false;
                    break;
                case 'restored':
                    isMaximized.value = false;
                    isVisible.value = true;
                    break;
                default:
                    break;
            }
        });
        focusUnsubscribe = window.desktop.window.onFocusChanged((payload) => {
            if (windowId.value !== 0 && payload.windowId !== windowId.value) {
                return;
            }
            isFocused.value = payload.focused;
        });
    });
    Vue.onBeforeUnmount(() => {
        stateUnsubscribe?.();
        focusUnsubscribe?.();
    });
    return {
        windowId,
        role,
        instanceKey,
        isMaximized,
        isFocused,
        isVisible,
        permissions
    };
}

}, {}],
"src/renderer/composables/useWindowTitle.js": [function(require, module, exports) {
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

}, {}],
"src/renderer/stores/index.js": [function(require, module, exports) {
"use strict";
/**
 * @file Store 统一导出与初始化入口。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStore = exports.registerStore = exports.storage = exports.computedRef = exports.defineState = exports.useNotificationStore = exports.createNotificationStore = exports.useTabStore = exports.createTabStore = exports.useWindowStore = exports.createWindowStore = exports.initLayoutResizeListener = exports.useLayoutStore = exports.createLayoutStore = exports.useThemeStore = exports.createThemeStore = exports.usePermissionStore = exports.createPermissionStore = exports.useAuthStore = exports.createAuthStore = exports.useAppStore = exports.createAppStore = void 0;
exports.initStores = initStores;
const app_store_1 = require("./app.store");
Object.defineProperty(exports, "createAppStore", { enumerable: true, get: function () { return app_store_1.createAppStore; } });
Object.defineProperty(exports, "useAppStore", { enumerable: true, get: function () { return app_store_1.useAppStore; } });
const auth_store_1 = require("./auth.store");
Object.defineProperty(exports, "createAuthStore", { enumerable: true, get: function () { return auth_store_1.createAuthStore; } });
Object.defineProperty(exports, "useAuthStore", { enumerable: true, get: function () { return auth_store_1.useAuthStore; } });
const permission_store_1 = require("./permission.store");
Object.defineProperty(exports, "createPermissionStore", { enumerable: true, get: function () { return permission_store_1.createPermissionStore; } });
Object.defineProperty(exports, "usePermissionStore", { enumerable: true, get: function () { return permission_store_1.usePermissionStore; } });
const theme_store_1 = require("./theme.store");
Object.defineProperty(exports, "createThemeStore", { enumerable: true, get: function () { return theme_store_1.createThemeStore; } });
Object.defineProperty(exports, "useThemeStore", { enumerable: true, get: function () { return theme_store_1.useThemeStore; } });
const layout_store_1 = require("./layout.store");
Object.defineProperty(exports, "createLayoutStore", { enumerable: true, get: function () { return layout_store_1.createLayoutStore; } });
Object.defineProperty(exports, "useLayoutStore", { enumerable: true, get: function () { return layout_store_1.useLayoutStore; } });
Object.defineProperty(exports, "initLayoutResizeListener", { enumerable: true, get: function () { return layout_store_1.initLayoutResizeListener; } });
const window_store_1 = require("./window.store");
Object.defineProperty(exports, "createWindowStore", { enumerable: true, get: function () { return window_store_1.createWindowStore; } });
Object.defineProperty(exports, "useWindowStore", { enumerable: true, get: function () { return window_store_1.useWindowStore; } });
const tab_store_1 = require("./tab.store");
Object.defineProperty(exports, "createTabStore", { enumerable: true, get: function () { return tab_store_1.createTabStore; } });
Object.defineProperty(exports, "useTabStore", { enumerable: true, get: function () { return tab_store_1.useTabStore; } });
const notification_store_1 = require("./notification.store");
Object.defineProperty(exports, "createNotificationStore", { enumerable: true, get: function () { return notification_store_1.createNotificationStore; } });
Object.defineProperty(exports, "useNotificationStore", { enumerable: true, get: function () { return notification_store_1.useNotificationStore; } });
var base_1 = require("./base");
Object.defineProperty(exports, "defineState", { enumerable: true, get: function () { return base_1.defineState; } });
Object.defineProperty(exports, "computedRef", { enumerable: true, get: function () { return base_1.computedRef; } });
Object.defineProperty(exports, "storage", { enumerable: true, get: function () { return base_1.storage; } });
Object.defineProperty(exports, "registerStore", { enumerable: true, get: function () { return base_1.registerStore; } });
Object.defineProperty(exports, "getStore", { enumerable: true, get: function () { return base_1.getStore; } });
/**
 * 初始化全部 Store（在应用启动时调用）。
 */
function initStores() {
    (0, app_store_1.createAppStore)();
    (0, auth_store_1.createAuthStore)();
    (0, permission_store_1.createPermissionStore)();
    (0, theme_store_1.createThemeStore)();
    (0, layout_store_1.createLayoutStore)();
    (0, window_store_1.createWindowStore)();
    (0, tab_store_1.createTabStore)();
    (0, notification_store_1.createNotificationStore)();
}

}, {"./app.store":"src/renderer/stores/app.store.js","./auth.store":"src/renderer/stores/auth.store.js","./permission.store":"src/renderer/stores/permission.store.js","./theme.store":"src/renderer/stores/theme.store.js","./layout.store":"src/renderer/stores/layout.store.js","./window.store":"src/renderer/stores/window.store.js","./tab.store":"src/renderer/stores/tab.store.js","./notification.store":"src/renderer/stores/notification.store.js","./base":"src/renderer/stores/base.js"}],
"src/renderer/stores/window.store.js": [function(require, module, exports) {
"use strict";
/**
 * @file 窗口 Store，管理当前 Electron 窗口上下文（windowId、role、状态）。
 *
 * 与 useCurrentWindow composable 配合使用：
 * - useCurrentWindow 负责订阅 IPC 事件并更新 store
 * - 其他组件通过 useWindowStore 读取响应式状态
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWindowStore = createWindowStore;
exports.useWindowStore = useWindowStore;
const base_1 = require("./base");
/** 窗口 Store 单例 */
let windowStoreInstance = null;
/**
 * 创建窗口 Store。
 */
function createWindowStore() {
    if (windowStoreInstance)
        return windowStoreInstance;
    const state = (0, base_1.defineState)({
        windowId: 0,
        windowRole: '',
        instanceKey: '',
        isMaximized: false,
        isFocused: false,
        isVisible: true,
        isFullScreen: false,
        isAlwaysOnTop: false,
        initialized: false
    });
    const isElectron = (0, base_1.computedRef)(() => typeof window !== 'undefined' && !!window.desktop);
    function setWindowInfo(info) {
        if (info.windowId !== undefined)
            state.windowId = info.windowId;
        if (info.windowRole !== undefined)
            state.windowRole = info.windowRole;
        if (info.instanceKey !== undefined)
            state.instanceKey = info.instanceKey;
    }
    function updateState(update) {
        Object.assign(state, update);
    }
    function setInitialized() {
        state.initialized = true;
    }
    function reset() {
        state.windowId = 0;
        state.windowRole = '';
        state.instanceKey = '';
        state.isMaximized = false;
        state.isFocused = false;
        state.isVisible = true;
        state.isFullScreen = false;
        state.isAlwaysOnTop = false;
        state.initialized = false;
    }
    const store = {
        $id: 'window',
        state,
        isElectron,
        setWindowInfo,
        updateState,
        setInitialized,
        reset,
        $reset: reset
    };
    (0, base_1.registerStore)(store);
    windowStoreInstance = store;
    return store;
}
/**
 * 获取窗口 Store 单例。
 */
function useWindowStore() {
    if (!windowStoreInstance) {
        return createWindowStore();
    }
    return windowStoreInstance;
}

}, {"./base":"src/renderer/stores/base.js"}],
"src/renderer/stores/tab.store.js": [function(require, module, exports) {
"use strict";
/**
 * @file 标签页 Store，管理多标签页与 keep-alive 缓存。
 *
 * 标签页按 windowRole 隔离，避免多窗口状态污染。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTabStore = createTabStore;
exports.useTabStore = useTabStore;
const base_1 = require("./base");
/** 标签页 Store 单例 */
let tabStoreInstance = null;
/**
 * 创建标签页 Store。
 */
function createTabStore() {
    if (tabStoreInstance)
        return tabStoreInstance;
    const state = (0, base_1.defineState)({
        tabs: [],
        activePath: '',
        cachedNames: [],
        windowRole: ''
    });
    const activeTab = (0, base_1.computedRef)(() => state.tabs.find((t) => t.path === state.activePath));
    function addTab(tab) {
        const exists = state.tabs.find((t) => t.path === tab.path);
        if (!exists) {
            state.tabs.push(tab);
        }
        else {
            // 更新查询参数
            exists.query = tab.query;
        }
        state.activePath = tab.path;
        if (!state.cachedNames.includes(tab.name)) {
            state.cachedNames.push(tab.name);
        }
    }
    function removeTab(path) {
        const index = state.tabs.findIndex((t) => t.path === path);
        if (index === -1)
            return null;
        const tab = state.tabs[index];
        if (tab.affix)
            return null;
        state.tabs.splice(index, 1);
        removeCache(tab.name);
        // 如果关闭的是当前激活标签，跳转到相邻标签
        if (state.activePath === path) {
            const next = state.tabs[index] || state.tabs[index - 1];
            if (next) {
                state.activePath = next.path;
                return next.path;
            }
            state.activePath = '';
            return '/';
        }
        return null;
    }
    function removeOthers(path) {
        state.tabs = state.tabs.filter((t) => t.path === path || t.affix);
        state.activePath = path;
        // 重建缓存
        state.cachedNames = state.tabs.map((t) => t.name);
    }
    function removeAll() {
        state.tabs = state.tabs.filter((t) => t.affix);
        state.cachedNames = state.tabs.map((t) => t.name);
        const first = state.tabs[0];
        state.activePath = first?.path ?? '/';
    }
    function setActive(path) {
        state.activePath = path;
    }
    function setWindowRole(role) {
        if (state.windowRole !== role) {
            state.windowRole = role;
            state.tabs = [];
            state.activePath = '';
            state.cachedNames = [];
        }
    }
    function addCache(name) {
        if (!state.cachedNames.includes(name)) {
            state.cachedNames.push(name);
        }
    }
    function removeCache(name) {
        const index = state.cachedNames.indexOf(name);
        if (index >= 0) {
            state.cachedNames.splice(index, 1);
        }
    }
    function clearAll() {
        state.tabs = [];
        state.activePath = '';
        state.cachedNames = [];
    }
    const store = {
        $id: 'tab',
        state,
        activeTab,
        addTab,
        removeTab,
        removeOthers,
        removeAll,
        setActive,
        setWindowRole,
        addCache,
        removeCache,
        clearAll,
        $reset: clearAll
    };
    (0, base_1.registerStore)(store);
    tabStoreInstance = store;
    return store;
}
/**
 * 获取标签页 Store 单例。
 */
function useTabStore() {
    if (!tabStoreInstance) {
        return createTabStore();
    }
    return tabStoreInstance;
}

}, {"./base":"src/renderer/stores/base.js"}],
"src/renderer/layouts/index.js": [function(require, module, exports) {
"use strict";
/**
 * @file 布局统一导出。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WindowLayout = exports.AuthLayout = exports.BlankLayout = exports.BasicLayout = void 0;
var BasicLayout_1 = require("./BasicLayout");
Object.defineProperty(exports, "BasicLayout", { enumerable: true, get: function () { return BasicLayout_1.BasicLayout; } });
var BlankLayout_1 = require("./BlankLayout");
Object.defineProperty(exports, "BlankLayout", { enumerable: true, get: function () { return BlankLayout_1.BlankLayout; } });
var AuthLayout_1 = require("./AuthLayout");
Object.defineProperty(exports, "AuthLayout", { enumerable: true, get: function () { return AuthLayout_1.AuthLayout; } });
var WindowLayout_1 = require("./WindowLayout");
Object.defineProperty(exports, "WindowLayout", { enumerable: true, get: function () { return WindowLayout_1.WindowLayout; } });

}, {"./BasicLayout":"src/renderer/layouts/BasicLayout.js","./BlankLayout":"src/renderer/layouts/BlankLayout.js","./AuthLayout":"src/renderer/layouts/AuthLayout.js","./WindowLayout":"src/renderer/layouts/WindowLayout.js"}],
"src/renderer/layouts/BasicLayout.js": [function(require, module, exports) {
"use strict";
/**
 * @file 后台主布局，桌面端侧栏 + 内容区，移动端 drawer 侧栏。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BasicLayout = void 0;
const layout_store_1 = require("../stores/layout.store");
const AppSidebar_1 = require("../components/layout/AppSidebar");
const AppHeader_1 = require("../components/layout/AppHeader");
const AppTabs_1 = require("../components/layout/AppTabs");
const AppContent_1 = require("../components/layout/AppContent");
exports.BasicLayout = {
    name: 'BasicLayout',
    components: { AppSidebar: AppSidebar_1.AppSidebar, AppHeader: AppHeader_1.AppHeader, AppTabs: AppTabs_1.AppTabs, AppContent: AppContent_1.AppContent },
    setup() {
        const layoutStore = (0, layout_store_1.useLayoutStore)();
        // 侧栏是否折叠
        const sidebarCollapsed = Vue.computed(() => layoutStore.state.sidebarCollapsed);
        // 是否移动端
        const isMobile = Vue.computed(() => layoutStore.state.isMobile);
        // 移动端 drawer 是否打开
        const mobileDrawerOpen = Vue.computed(() => layoutStore.state.mobileDrawerOpen);
        // 侧栏宽度类名
        const sidebarWidthClass = layoutStore.sidebarWidthClass;
        // 切换移动端 drawer
        function toggleMobileDrawer() {
            layoutStore.toggleMobileDrawer();
        }
        // 关闭移动端 drawer
        function closeMobileDrawer() {
            layoutStore.closeMobileDrawer();
        }
        return {
            sidebarCollapsed,
            isMobile,
            mobileDrawerOpen,
            sidebarWidthClass,
            toggleMobileDrawer,
            closeMobileDrawer
        };
    },
    render: (function () {
const { createElementVNode: _createElementVNode, resolveComponent: _resolveComponent, createVNode: _createVNode, openBlock: _openBlock, createElementBlock: _createElementBlock, createCommentVNode: _createCommentVNode, normalizeClass: _normalizeClass, Fragment: _Fragment } = Vue

return function render(_ctx, _cache) {
  const _component_AppHeader = _resolveComponent("AppHeader")
  const _component_AppTabs = _resolveComponent("AppTabs")
  const _component_AppContent = _resolveComponent("AppContent")
  const _component_AppSidebar = _resolveComponent("AppSidebar")

  return (_openBlock(), _createElementBlock("div", { class: "h-screen flex" }, [
    (_ctx.isMobile)
      ? (_openBlock(), _createElementBlock("div", {
          key: 0,
          class: "drawer"
        }, [
          _createElementVNode("input", {
            type: "checkbox",
            checked: _ctx.mobileDrawerOpen,
            onChange: _ctx.toggleMobileDrawer,
            class: "drawer-toggle"
          }, null, 40 /* PROPS, NEED_HYDRATION */, ["checked", "onChange"]),
          _createElementVNode("div", { class: "drawer-content flex flex-col w-full overflow-hidden" }, [
            _createVNode(_component_AppHeader),
            _createVNode(_component_AppTabs),
            _createVNode(_component_AppContent)
          ]),
          _createElementVNode("div", { class: "drawer-side" }, [
            _createElementVNode("label", {
              class: "drawer-overlay",
              onClick: _ctx.closeMobileDrawer
            }, null, 8 /* PROPS */, ["onClick"]),
            _createElementVNode("div", { class: "w-64 bg-base-100" }, [
              _createVNode(_component_AppSidebar)
            ])
          ])
        ]))
      : (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [
          _createVNode(_component_AppSidebar, {
            class: _normalizeClass([_ctx.sidebarWidthClass, "transition-all duration-200"])
          }, null, 8 /* PROPS */, ["class"]),
          _createElementVNode("div", { class: "flex-1 flex flex-col overflow-hidden" }, [
            _createVNode(_component_AppHeader),
            _createVNode(_component_AppTabs),
            _createVNode(_component_AppContent)
          ])
        ], 64 /* STABLE_FRAGMENT */))
  ]))
}
})()
};

}, {"../stores/layout.store":"src/renderer/stores/layout.store.js","../components/layout/AppSidebar":"src/renderer/components/layout/AppSidebar.js","../components/layout/AppHeader":"src/renderer/components/layout/AppHeader.js","../components/layout/AppTabs":"src/renderer/components/layout/AppTabs.js","../components/layout/AppContent":"src/renderer/components/layout/AppContent.js"}],
"src/renderer/components/layout/AppSidebar.js": [function(require, module, exports) {
"use strict";
/**
 * @file 侧边栏菜单组件，根据权限与窗口角色生成菜单树，支持折叠与多级菜单。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppSidebar = void 0;
const useMenu_1 = require("../../composables/useMenu");
const layout_store_1 = require("../../stores/layout.store");
const permission_store_1 = require("../../stores/permission.store");
exports.AppSidebar = {
    name: 'AppSidebar',
    setup() {
        const layoutStore = (0, layout_store_1.useLayoutStore)();
        const permissionStore = (0, permission_store_1.usePermissionStore)();
        const { menu, activeMenuPath } = (0, useMenu_1.useMenu)();
        // 注入路由上下文
        const router = Vue.inject('router');
        const currentRoute = Vue.inject('currentRoute');
        // 菜单树
        const menuList = menu;
        // 侧栏是否折叠
        const sidebarCollapsed = Vue.computed(() => layoutStore.state.sidebarCollapsed);
        // 当前窗口角色
        const windowRole = Vue.computed(() => permissionStore.state.windowRole);
        // 当前路径
        const currentPath = Vue.computed(() => currentRoute?.value?.path ?? '');
        // 判断菜单项是否激活
        function isActive(item) {
            const active = activeMenuPath(currentPath.value);
            if (active)
                return active === item.path;
            return currentPath.value === item.path;
        }
        // 点击菜单项
        function handleClick(path) {
            if (router) {
                router.navigate(path);
            }
        }
        return {
            menuList,
            sidebarCollapsed,
            windowRole,
            currentPath,
            isActive,
            handleClick
        };
    },
    render: (function () {
const { renderList: _renderList, Fragment: _Fragment, openBlock: _openBlock, createElementBlock: _createElementBlock, toDisplayString: _toDisplayString, createCommentVNode: _createCommentVNode, normalizeClass: _normalizeClass, createElementVNode: _createElementVNode } = Vue

return function render(_ctx, _cache) {
  return (_openBlock(), _createElementBlock("aside", { class: "bg-base-100 border-r border-base-300 h-full flex flex-col" }, [
    _createElementVNode("ul", { class: "menu menu-md w-full p-2 gap-1" }, [
      (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(_ctx.menuList, (item) => {
        return (_openBlock(), _createElementBlock("li", {
          key: item.path
        }, [
          (item.children && item.children.length > 0)
            ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [
                _createElementVNode("a", {
                  class: _normalizeClass({ active: _ctx.isActive(item) })
                }, [
                  (item.icon)
                    ? (_openBlock(), _createElementBlock("span", {
                        key: 0,
                        class: "text-base"
                      }, _toDisplayString(item.icon), 1 /* TEXT */))
                    : _createCommentVNode("v-if", true),
                  (!_ctx.sidebarCollapsed)
                    ? (_openBlock(), _createElementBlock("span", { key: 1 }, _toDisplayString(item.title), 1 /* TEXT */))
                    : _createCommentVNode("v-if", true)
                ], 2 /* CLASS */),
                (!_ctx.sidebarCollapsed)
                  ? (_openBlock(), _createElementBlock("ul", { key: 0 }, [
                      (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(item.children, (child) => {
                        return (_openBlock(), _createElementBlock("li", {
                          key: child.path
                        }, [
                          _createElementVNode("a", {
                            class: _normalizeClass({ active: _ctx.isActive(child) }),
                            onClick: $event => (_ctx.handleClick(child.path))
                          }, [
                            (child.icon)
                              ? (_openBlock(), _createElementBlock("span", {
                                  key: 0,
                                  class: "text-sm"
                                }, _toDisplayString(child.icon), 1 /* TEXT */))
                              : _createCommentVNode("v-if", true),
                            _createElementVNode("span", null, _toDisplayString(child.title), 1 /* TEXT */)
                          ], 10 /* CLASS, PROPS */, ["onClick"])
                        ]))
                      }), 128 /* KEYED_FRAGMENT */))
                    ]))
                  : _createCommentVNode("v-if", true)
              ], 64 /* STABLE_FRAGMENT */))
            : (_openBlock(), _createElementBlock("a", {
                key: 1,
                class: _normalizeClass({ active: _ctx.isActive(item) }),
                onClick: $event => (_ctx.handleClick(item.path)),
                title: _ctx.sidebarCollapsed ? item.title : ''
              }, [
                (item.icon)
                  ? (_openBlock(), _createElementBlock("span", {
                      key: 0,
                      class: "text-base"
                    }, _toDisplayString(item.icon), 1 /* TEXT */))
                  : _createCommentVNode("v-if", true),
                (!_ctx.sidebarCollapsed)
                  ? (_openBlock(), _createElementBlock("span", { key: 1 }, _toDisplayString(item.title), 1 /* TEXT */))
                  : _createCommentVNode("v-if", true)
              ], 10 /* CLASS, PROPS */, ["onClick", "title"]))
        ]))
      }), 128 /* KEYED_FRAGMENT */))
    ])
  ]))
}
})()
};

}, {"../../composables/useMenu":"src/renderer/composables/useMenu.js","../../stores/layout.store":"src/renderer/stores/layout.store.js","../../stores/permission.store":"src/renderer/stores/permission.store.js"}],
"src/renderer/composables/useMenu.js": [function(require, module, exports) {
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

}, {"../stores/base":"src/renderer/stores/base.js","../utils/menu":"src/renderer/utils/menu.js","../stores/permission.store":"src/renderer/stores/permission.store.js","../stores/app.store":"src/renderer/stores/app.store.js"}],
"src/renderer/utils/menu.js": [function(require, module, exports) {
"use strict";
/**
 * @file 菜单工具函数，从路由表自动生成菜单树。
 *
 * 规则：
 * 1. meta.menu = true 才显示
 * 2. meta.hidden = true 不显示
 * 3. 根据 permissions 过滤
 * 4. 根据 windowRoles 过滤
 * 5. 根据 devOnly 过滤（生产环境隐藏 devOnly）
 * 6. 支持 meta.parent 构建多级菜单
 * 7. 按 menuOrder 排序
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMenu = generateMenu;
exports.flattenMenu = flattenMenu;
exports.findActiveMenuPath = findActiveMenuPath;
const routes_1 = require("../router/routes");
const constants_1 = require("../constants");
/**
 * 判断路由是否满足权限要求。
 *
 * @param route 路由记录。
 * @param permissions 当前权限列表。
 * @returns 是否满足。
 */
function matchPermissions(route, permissions) {
    if (route.meta.permissions.length === 0) {
        return true;
    }
    return route.meta.permissions.every((p) => permissions.includes(p));
}
/**
 * 判断路由是否允许在当前窗口角色下显示。
 *
 * 规则：
 * - main 窗口作为主控台，显示所有菜单项（便于导航/开窗）
 * - 其他窗口只显示与自身角色匹配的路由
 * - 子菜单（有 parent）允许跨角色，由父级控制
 *
 * @param route 路由记录。
 * @param windowRole 当前窗口角色。
 * @returns 是否允许。
 */
function matchWindowRole(route, windowRole) {
    // 子菜单（有 parent）允许跨角色，由父级控制
    if (route.meta.parent !== undefined) {
        return true;
    }
    // main 窗口作为主控台，显示所有顶层菜单
    if (windowRole === 'main') {
        return true;
    }
    // 其他窗口只显示与自身角色匹配的顶层路由
    return route.meta.windowRole === windowRole;
}
/**
 * 将路由记录转换为菜单项。
 *
 * @param route 路由记录。
 * @returns 菜单项。
 */
function routeToMenuItem(route) {
    return {
        name: route.name,
        path: route.path,
        title: route.meta.title,
        icon: route.meta.icon,
        order: route.meta.menuOrder ?? 999,
        activeMenu: route.meta.activeMenu
    };
}
/**
 * 从路由表生成菜单树。
 *
 * @param options 过滤选项。
 * @returns 菜单树。
 */
function generateMenu(options) {
    const { permissions, windowRole, isDev = constants_1.APP_INFO.ENVIRONMENT === 'development' } = options;
    // 过滤可见路由
    const visibleRoutes = routes_1.routes.filter((route) => {
        // 必须 menu = true
        if (!route.meta.menu)
            return false;
        // hidden = true 不显示
        if (route.meta.hidden)
            return false;
        // devOnly 在生产环境不显示
        if (route.meta.devOnly && !isDev)
            return false;
        // 权限过滤
        if (!matchPermissions(route, permissions))
            return false;
        return true;
    });
    // 按是否有 parent 分组
    const topItems = [];
    const childMap = new Map();
    for (const route of visibleRoutes) {
        const item = routeToMenuItem(route);
        if (route.meta.parent) {
            // 子菜单
            const siblings = childMap.get(route.meta.parent) ?? [];
            siblings.push(item);
            childMap.set(route.meta.parent, siblings);
        }
        else {
            // 顶层菜单，只显示当前窗口角色的
            if (matchWindowRole(route, windowRole)) {
                topItems.push(item);
            }
        }
    }
    // 为顶层菜单挂载子菜单
    for (const top of topItems) {
        const children = childMap.get(top.path);
        if (children && children.length > 0) {
            children.sort((a, b) => a.order - b.order);
            top.children = children;
        }
    }
    // 排序
    topItems.sort((a, b) => a.order - b.order);
    return topItems;
}
/**
 * 扁平化菜单（用于移动端或简单列表）。
 *
 * @param menu 菜单树。
 * @returns 扁平菜单列表。
 */
function flattenMenu(menu) {
    const result = [];
    for (const item of menu) {
        result.push(item);
        if (item.children) {
            result.push(...flattenMenu(item.children));
        }
    }
    return result;
}
/**
 * 根据当前路径查找高亮的菜单路径。
 *
 * @param currentPath 当前路由路径。
 * @param menu 菜单树。
 * @returns 高亮菜单路径。
 */
function findActiveMenuPath(currentPath, menu) {
    // 先精确匹配
    for (const item of flattenMenu(menu)) {
        if (item.path === currentPath) {
            return item.path;
        }
        // 检查 activeMenu
        if (item.activeMenu === currentPath) {
            return item.path;
        }
    }
    // 模糊匹配（前缀）
    for (const item of flattenMenu(menu)) {
        if (currentPath.startsWith(item.path + '/')) {
            return item.path;
        }
    }
    return '';
}

}, {"../router/routes":"src/renderer/router/routes.js","../constants":"src/renderer/constants/index.js"}],
"src/renderer/components/layout/AppHeader.js": [function(require, module, exports) {
"use strict";
/**
 * @file 顶部导航栏组件，包含折叠按钮、面包屑、主题切换、窗口控制与用户菜单。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppHeader = void 0;
const layout_store_1 = require("../../stores/layout.store");
const auth_store_1 = require("../../stores/auth.store");
const AppBreadcrumb_1 = require("./AppBreadcrumb");
const AppThemeToggle_1 = require("./AppThemeToggle");
const AppWindowControls_1 = require("./AppWindowControls");
exports.AppHeader = {
    name: 'AppHeader',
    components: { AppBreadcrumb: AppBreadcrumb_1.AppBreadcrumb, AppThemeToggle: AppThemeToggle_1.AppThemeToggle, AppWindowControls: AppWindowControls_1.AppWindowControls },
    setup() {
        const layoutStore = (0, layout_store_1.useLayoutStore)();
        const authStore = (0, auth_store_1.useAuthStore)();
        // 是否移动端视口
        const isMobile = Vue.computed(() => layoutStore.state.isMobile);
        // 侧栏是否折叠
        const sidebarCollapsed = Vue.computed(() => layoutStore.state.sidebarCollapsed);
        // 是否已登录
        const isLoggedIn = authStore.isLoggedIn;
        // 当前用户信息
        const user = Vue.computed(() => authStore.state.user);
        // 切换侧栏（桌面端折叠 / 移动端 drawer）
        function handleToggle() {
            if (isMobile.value) {
                layoutStore.toggleMobileDrawer();
            }
            else {
                layoutStore.toggleSidebar();
            }
        }
        // 登出
        async function handleLogout() {
            await authStore.logout();
        }
        return {
            isMobile,
            sidebarCollapsed,
            isLoggedIn,
            user,
            handleToggle,
            handleLogout
        };
    },
    render: (function () {
const { createElementVNode: _createElementVNode, openBlock: _openBlock, createElementBlock: _createElementBlock, resolveComponent: _resolveComponent, createVNode: _createVNode, toDisplayString: _toDisplayString, createCommentVNode: _createCommentVNode } = Vue

return function render(_ctx, _cache) {
  const _component_AppBreadcrumb = _resolveComponent("AppBreadcrumb")
  const _component_AppThemeToggle = _resolveComponent("AppThemeToggle")
  const _component_AppWindowControls = _resolveComponent("AppWindowControls")

  return (_openBlock(), _createElementBlock("header", { class: "navbar bg-base-100 border-b border-base-300 min-h-14 px-4 gap-2" }, [
    _createElementVNode("div", { class: "flex items-center gap-2" }, [
      _createElementVNode("button", {
        class: "btn btn-ghost btn-sm btn-circle",
        onClick: _ctx.handleToggle,
        "aria-label": "切换侧栏"
      }, [
        (_openBlock(), _createElementBlock("svg", {
          xmlns: "http://www.w3.org/2000/svg",
          class: "h-5 w-5",
          fill: "none",
          viewBox: "0 0 24 24",
          stroke: "currentColor"
        }, [
          _createElementVNode("path", {
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            "stroke-width": "2",
            d: "M4 6h16M4 12h16M4 18h16"
          })
        ]))
      ], 8 /* PROPS */, ["onClick"]),
      _createElementVNode("span", { class: "text-lg font-bold hidden sm:inline" }, "All In One")
    ]),
    _createElementVNode("div", { class: "flex-1" }, [
      _createVNode(_component_AppBreadcrumb)
    ]),
    _createElementVNode("div", { class: "flex items-center gap-1" }, [
      _createVNode(_component_AppThemeToggle),
      _createVNode(_component_AppWindowControls),
      (_ctx.isLoggedIn)
        ? (_openBlock(), _createElementBlock("div", {
            key: 0,
            class: "dropdown dropdown-end"
          }, [
            _createElementVNode("div", {
              tabindex: "0",
              role: "button",
              class: "btn btn-ghost btn-sm btn-circle avatar placeholder"
            }, [
              _createElementVNode("div", { class: "bg-neutral text-neutral-content rounded-full w-8" }, [
                _createElementVNode("span", { class: "text-xs" }, _toDisplayString(_ctx.user?.displayName?.charAt(0).toUpperCase() || 'U'), 1 /* TEXT */)
              ])
            ]),
            _createElementVNode("ul", {
              tabindex: "0",
              class: "dropdown-content menu bg-base-100 rounded-box z-[1] w-48 p-2 shadow-lg border border-base-300"
            }, [
              _createElementVNode("li", { class: "menu-title" }, _toDisplayString(_ctx.user?.displayName || _ctx.user?.username || '用户'), 1 /* TEXT */),
              _createElementVNode("li", null, [
                _createElementVNode("a", { onClick: _ctx.handleLogout }, "登出", 8 /* PROPS */, ["onClick"])
              ])
            ])
          ]))
        : _createCommentVNode("v-if", true)
    ])
  ]))
}
})()
};

}, {"../../stores/layout.store":"src/renderer/stores/layout.store.js","../../stores/auth.store":"src/renderer/stores/auth.store.js","./AppBreadcrumb":"src/renderer/components/layout/AppBreadcrumb.js","./AppThemeToggle":"src/renderer/components/layout/AppThemeToggle.js","./AppWindowControls":"src/renderer/components/layout/AppWindowControls.js"}],
"src/renderer/components/layout/AppBreadcrumb.js": [function(require, module, exports) {
"use strict";
/**
 * @file 面包屑组件，根据当前路由自动生成导航面包屑。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppBreadcrumb = void 0;
const useBreadcrumb_1 = require("../../composables/useBreadcrumb");
exports.AppBreadcrumb = {
    name: 'AppBreadcrumb',
    setup() {
        // 注入当前路由
        const currentRoute = Vue.inject('currentRoute');
        // 注入路由器
        const router = Vue.inject('router');
        // 生成面包屑
        const { breadcrumbs } = (0, useBreadcrumb_1.useBreadcrumb)(currentRoute ?? { value: null });
        // 导航到指定路径
        function navigate(path) {
            if (router) {
                router.navigate(path);
            }
        }
        return {
            breadcrumbs,
            navigate
        };
    },
    render: (function () {
const { renderList: _renderList, Fragment: _Fragment, openBlock: _openBlock, createElementBlock: _createElementBlock, toDisplayString: _toDisplayString, createCommentVNode: _createCommentVNode, createElementVNode: _createElementVNode } = Vue

return function render(_ctx, _cache) {
  return (_openBlock(), _createElementBlock("div", { class: "breadcrumbs text-sm" }, [
    _createElementVNode("ul", null, [
      (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(_ctx.breadcrumbs, (item) => {
        return (_openBlock(), _createElementBlock("li", {
          key: item.path
        }, [
          (item.clickable)
            ? (_openBlock(), _createElementBlock("a", {
                key: 0,
                onClick: $event => (_ctx.navigate(item.path))
              }, _toDisplayString(item.title), 9 /* TEXT, PROPS */, ["onClick"]))
            : (_openBlock(), _createElementBlock("span", {
                key: 1,
                class: "text-base-content/60"
              }, _toDisplayString(item.title), 1 /* TEXT */))
        ]))
      }), 128 /* KEYED_FRAGMENT */))
    ])
  ]))
}
})()
};

}, {"../../composables/useBreadcrumb":"src/renderer/composables/useBreadcrumb.js"}],
"src/renderer/composables/useBreadcrumb.js": [function(require, module, exports) {
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

}, {"../stores/base":"src/renderer/stores/base.js","../utils/route":"src/renderer/utils/route.js"}],
"src/renderer/utils/route.js": [function(require, module, exports) {
"use strict";
/**
 * @file 路由工具函数。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildBreadcrumbs = buildBreadcrumbs;
exports.buildPageTitle = buildPageTitle;
exports.isSameRoute = isSameRoute;
/**
 * 从当前路由的 matchedChain 构建面包屑。
 *
 * @param route 当前路由。
 * @returns 面包屑列表。
 */
function buildBreadcrumbs(route) {
    const breadcrumbs = [];
    for (let i = 0; i < route.matchedChain.length; i++) {
        const record = route.matchedChain[i];
        // meta.breadcrumb !== false 才显示
        if (record.meta.breadcrumb === false)
            continue;
        if (record.meta.hidden)
            continue;
        breadcrumbs.push({
            name: record.name,
            path: record.path,
            title: record.meta.title,
            // 最后一个不可点击
            clickable: i < route.matchedChain.length - 1
        });
    }
    return breadcrumbs;
}
/**
 * 构建页面标题（含应用名）。
 *
 * @param route 当前路由。
 * @param appName 应用名称。
 * @returns 完整标题。
 */
function buildPageTitle(route, appName) {
    const title = route.meta.title;
    if (!title)
        return appName;
    return `${title} - ${appName}`;
}
/**
 * 判断两个路由是否相同（路径与查询一致）。
 *
 * @param a 路由 a。
 * @param b 路由 b。
 * @returns 是否相同。
 */
function isSameRoute(a, b) {
    if (!a || !b)
        return false;
    if (a.path !== b.path)
        return false;
    const aKeys = Object.keys(a.query).sort();
    const bKeys = Object.keys(b.query).sort();
    if (aKeys.length !== bKeys.length)
        return false;
    return aKeys.every((key, i) => key === bKeys[i] && a.query[key] === b.query[bKeys[i]]);
}

}, {}],
"src/renderer/components/layout/AppThemeToggle.js": [function(require, module, exports) {
"use strict";
/**
 * @file 主题切换组件，支持主题选择与深浅色快捷切换。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppThemeToggle = void 0;
const theme_store_1 = require("../../stores/theme.store");
exports.AppThemeToggle = {
    name: 'AppThemeToggle',
    setup() {
        const themeStore = (0, theme_store_1.useThemeStore)();
        // 当前主题
        const currentTheme = themeStore.currentTheme;
        // 是否深色
        const isDark = themeStore.isDark;
        // 可用主题列表
        const availableThemes = themeStore.availableThemes;
        // 设置主题
        function setTheme(value) {
            themeStore.setTheme(value);
        }
        // 快捷切换深浅色
        function toggleDark() {
            themeStore.toggleDark();
        }
        return {
            currentTheme,
            isDark,
            availableThemes,
            setTheme,
            toggleDark
        };
    },
    render: (function () {
const { toDisplayString: _toDisplayString, createElementVNode: _createElementVNode, renderList: _renderList, Fragment: _Fragment, openBlock: _openBlock, createElementBlock: _createElementBlock, normalizeClass: _normalizeClass } = Vue

return function render(_ctx, _cache) {
  return (_openBlock(), _createElementBlock("div", { class: "dropdown dropdown-end" }, [
    _createElementVNode("div", {
      tabindex: "0",
      role: "button",
      class: "btn btn-ghost btn-sm btn-circle"
    }, _toDisplayString(_ctx.isDark ? '🌙' : '☀️'), 1 /* TEXT */),
    _createElementVNode("ul", {
      tabindex: "0",
      class: "dropdown-content menu bg-base-100 rounded-box z-[1] w-40 p-2 shadow-lg border border-base-300"
    }, [
      (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(_ctx.availableThemes, (theme) => {
        return (_openBlock(), _createElementBlock("li", {
          key: theme.value
        }, [
          _createElementVNode("a", {
            onClick: $event => (_ctx.setTheme(theme.value)),
            class: _normalizeClass({ active: theme.value === _ctx.currentTheme })
          }, _toDisplayString(theme.label), 11 /* TEXT, CLASS, PROPS */, ["onClick"])
        ]))
      }), 128 /* KEYED_FRAGMENT */))
    ])
  ]))
}
})()
};

}, {"../../stores/theme.store":"src/renderer/stores/theme.store.js"}],
"src/renderer/components/layout/AppWindowControls.js": [function(require, module, exports) {
"use strict";
/**
 * @file Electron 窗口控制按钮组件（最小化/最大化/关闭），仅 Electron 环境显示。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppWindowControls = void 0;
const window_store_1 = require("../../stores/window.store");
const useWindowControls_1 = require("../../composables/useWindowControls");
exports.AppWindowControls = {
    name: 'AppWindowControls',
    setup() {
        const windowStore = (0, window_store_1.useWindowStore)();
        const controls = (0, useWindowControls_1.useWindowControls)();
        // 是否 Electron 环境
        const isElectron = windowStore.isElectron;
        // 是否最大化
        const isMaximized = Vue.computed(() => windowStore.state.isMaximized);
        // 最小化
        function minimize() {
            controls.minimize();
        }
        // 切换最大化
        function toggleMaximize() {
            if (isMaximized.value) {
                controls.restore();
            }
            else {
                controls.maximize();
            }
        }
        // 关闭
        function close() {
            controls.close();
        }
        return {
            isElectron,
            isMaximized,
            minimize,
            toggleMaximize,
            close
        };
    },
    render: (function () {
const { createElementVNode: _createElementVNode, toDisplayString: _toDisplayString, openBlock: _openBlock, createElementBlock: _createElementBlock, createCommentVNode: _createCommentVNode } = Vue

return function render(_ctx, _cache) {
  return (_ctx.isElectron)
    ? (_openBlock(), _createElementBlock("div", {
        key: 0,
        class: "flex items-center gap-1 ml-2"
      }, [
        _createElementVNode("button", {
          class: "btn btn-ghost btn-xs btn-circle",
          onClick: _ctx.minimize,
          "aria-label": "最小化"
        }, "─", 8 /* PROPS */, ["onClick"]),
        _createElementVNode("button", {
          class: "btn btn-ghost btn-xs btn-circle",
          onClick: _ctx.toggleMaximize,
          "aria-label": "最大化"
        }, _toDisplayString(_ctx.isMaximized ? '❐' : '□'), 9 /* TEXT, PROPS */, ["onClick"]),
        _createElementVNode("button", {
          class: "btn btn-ghost btn-xs btn-circle hover:bg-error hover:text-error-content",
          onClick: _ctx.close,
          "aria-label": "关闭"
        }, "✕", 8 /* PROPS */, ["onClick"])
      ]))
    : _createCommentVNode("v-if", true)
}
})()
};

}, {"../../stores/window.store":"src/renderer/stores/window.store.js","../../composables/useWindowControls":"src/renderer/composables/useWindowControls.js"}],
"src/renderer/components/layout/AppTabs.js": [function(require, module, exports) {
"use strict";
/**
 * @file 标签页组件，支持多标签切换、关闭与右键菜单。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppTabs = void 0;
const tab_store_1 = require("../../stores/tab.store");
exports.AppTabs = {
    name: 'AppTabs',
    setup() {
        const tabStore = (0, tab_store_1.useTabStore)();
        // 注入路由器
        const router = Vue.inject('router');
        // 标签列表
        const tabs = Vue.computed(() => tabStore.state.tabs);
        // 当前激活标签路径
        const activePath = Vue.computed(() => tabStore.state.activePath);
        // 右键菜单状态
        const contextMenuVisible = Vue.ref(false);
        const contextMenuX = Vue.ref(0);
        const contextMenuY = Vue.ref(0);
        const contextMenuPath = Vue.ref('');
        // 导航到指定路径
        function navigate(path) {
            if (router) {
                router.navigate(path);
            }
        }
        // 关闭标签
        function closeTab(path) {
            const next = tabStore.removeTab(path);
            if (next) {
                navigate(next);
            }
        }
        // 关闭其他标签
        function closeOthers(path) {
            tabStore.removeOthers(path);
            navigate(path);
        }
        // 关闭全部标签
        function closeAll() {
            tabStore.removeAll();
            const first = tabStore.state.tabs[0];
            if (first) {
                navigate(first.path);
            }
        }
        // 显示右键菜单
        function showContextMenu(event, path) {
            contextMenuX.value = event.clientX;
            contextMenuY.value = event.clientY;
            contextMenuPath.value = path;
            contextMenuVisible.value = true;
        }
        // 隐藏右键菜单
        function hideContextMenu() {
            contextMenuVisible.value = false;
        }
        // 右键菜单：关闭当前
        function handleCloseCurrent() {
            closeTab(contextMenuPath.value);
            hideContextMenu();
        }
        // 右键菜单：关闭其他
        function handleCloseOthers() {
            closeOthers(contextMenuPath.value);
            hideContextMenu();
        }
        // 右键菜单：关闭全部
        function handleCloseAll() {
            closeAll();
            hideContextMenu();
        }
        // 点击外部关闭右键菜单
        Vue.onMounted(() => {
            window.addEventListener('click', hideContextMenu);
        });
        Vue.onBeforeUnmount(() => {
            window.removeEventListener('click', hideContextMenu);
        });
        return {
            tabs,
            activePath,
            contextMenuVisible,
            contextMenuX,
            contextMenuY,
            navigate,
            closeTab,
            showContextMenu,
            handleCloseCurrent,
            handleCloseOthers,
            handleCloseAll
        };
    },
    render: (function () {
const { renderList: _renderList, Fragment: _Fragment, openBlock: _openBlock, createElementBlock: _createElementBlock, toDisplayString: _toDisplayString, createElementVNode: _createElementVNode, withModifiers: _withModifiers, createCommentVNode: _createCommentVNode, normalizeClass: _normalizeClass, normalizeStyle: _normalizeStyle } = Vue

return function render(_ctx, _cache) {
  return (_openBlock(), _createElementBlock("div", { class: "tabs-container border-b border-base-300 bg-base-100 flex items-center gap-1 px-2 overflow-x-auto scrollbar-thin" }, [
    (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(_ctx.tabs, (tab) => {
      return (_openBlock(), _createElementBlock("div", {
        key: tab.path,
        class: _normalizeClass(["tab-item flex items-center gap-1 px-3 py-2 cursor-pointer rounded-t text-sm", { 'bg-base-200 text-primary': tab.path === _ctx.activePath }]),
        onClick: $event => (_ctx.navigate(tab.path)),
        onContextmenu: _withModifiers($event => (_ctx.showContextMenu($event, tab.path)), ["prevent"])
      }, [
        _createElementVNode("span", null, _toDisplayString(tab.title), 1 /* TEXT */),
        (tab.closable && !tab.affix)
          ? (_openBlock(), _createElementBlock("button", {
              key: 0,
              class: "btn btn-ghost btn-xs btn-circle",
              onClick: _withModifiers($event => (_ctx.closeTab(tab.path)), ["stop"]),
              "aria-label": "关闭标签"
            }, "✕", 8 /* PROPS */, ["onClick"]))
          : _createCommentVNode("v-if", true)
      ], 42 /* CLASS, PROPS, NEED_HYDRATION */, ["onClick", "onContextmenu"]))
    }), 128 /* KEYED_FRAGMENT */)),
    (_ctx.contextMenuVisible)
      ? (_openBlock(), _createElementBlock("div", {
          key: 0,
          class: "fixed z-50 menu bg-base-100 rounded-box shadow-lg border border-base-300 p-2 w-40",
          style: _normalizeStyle({ left: _ctx.contextMenuX + 'px', top: _ctx.contextMenuY + 'px' }),
          onClick: _withModifiers(() => {}, ["stop"])
        }, [
          _createElementVNode("ul", null, [
            _createElementVNode("li", null, [
              _createElementVNode("a", { onClick: _ctx.handleCloseCurrent }, "关闭当前", 8 /* PROPS */, ["onClick"])
            ]),
            _createElementVNode("li", null, [
              _createElementVNode("a", { onClick: _ctx.handleCloseOthers }, "关闭其他", 8 /* PROPS */, ["onClick"])
            ]),
            _createElementVNode("li", null, [
              _createElementVNode("a", { onClick: _ctx.handleCloseAll }, "关闭全部", 8 /* PROPS */, ["onClick"])
            ])
          ])
        ], 12 /* STYLE, PROPS */, ["onClick"]))
      : _createCommentVNode("v-if", true)
  ]))
}
})()
};

}, {"../../stores/tab.store":"src/renderer/stores/tab.store.js"}],
"src/renderer/components/layout/AppContent.js": [function(require, module, exports) {
"use strict";
/**
 * @file 内容区域组件，渲染当前路由对应的页面组件。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppContent = void 0;
exports.AppContent = {
    name: 'AppContent',
    setup() {
        // 注入路由与页面渲染上下文
        const currentRoute = Vue.inject('currentRoute');
        const renderPage = Vue.inject('renderPage');
        const getPageProps = Vue.inject('getPageProps');
        const cachedNames = Vue.inject('cachedNames');
        // 当前页面组件
        const pageComponent = Vue.computed(() => {
            if (!renderPage)
                return null;
            return renderPage();
        });
        // 当前页面 props
        const pageProps = Vue.computed(() => {
            if (!getPageProps)
                return {};
            return getPageProps();
        });
        // 是否缓存当前页面（keep-alive 模拟）
        const isCached = Vue.computed(() => {
            const route = currentRoute?.value;
            if (!route || !cachedNames)
                return false;
            return cachedNames.includes(route.name);
        });
        return {
            pageComponent,
            pageProps,
            isCached
        };
    },
    render: (function () {
const { resolveDynamicComponent: _resolveDynamicComponent, normalizeProps: _normalizeProps, guardReactiveProps: _guardReactiveProps, openBlock: _openBlock, createBlock: _createBlock, createElementBlock: _createElementBlock } = Vue

return function render(_ctx, _cache) {
  return (_openBlock(), _createElementBlock("main", { class: "flex-1 overflow-auto p-4 bg-base-200/30" }, [
    (_openBlock(), _createBlock(_resolveDynamicComponent(_ctx.pageComponent), _normalizeProps(_guardReactiveProps(_ctx.pageProps)), null, 16 /* FULL_PROPS */))
  ]))
}
})()
};

}, {}],
"src/renderer/layouts/BlankLayout.js": [function(require, module, exports) {
"use strict";
/**
 * @file 空白布局，仅渲染页面内容，无导航与侧栏。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlankLayout = void 0;
exports.BlankLayout = {
    name: 'BlankLayout',
    setup() {
        // 注入页面渲染上下文
        const getPageComponent = Vue.inject('getPageComponent');
        const getPageProps = Vue.inject('getPageProps');
        // 页面组件
        const pageComponent = Vue.computed(() => {
            if (!getPageComponent)
                return null;
            return getPageComponent();
        });
        // 页面 props
        const pageProps = Vue.computed(() => {
            if (!getPageProps)
                return {};
            return getPageProps();
        });
        return {
            pageComponent,
            pageProps
        };
    },
    render: (function () {
const { resolveDynamicComponent: _resolveDynamicComponent, normalizeProps: _normalizeProps, guardReactiveProps: _guardReactiveProps, openBlock: _openBlock, createBlock: _createBlock, createElementVNode: _createElementVNode, createElementBlock: _createElementBlock } = Vue

return function render(_ctx, _cache) {
  return (_openBlock(), _createElementBlock("div", { class: "min-h-screen" }, [
    _createElementVNode("main", { class: "min-h-screen" }, [
      (_openBlock(), _createBlock(_resolveDynamicComponent(_ctx.pageComponent), _normalizeProps(_guardReactiveProps(_ctx.pageProps)), null, 16 /* FULL_PROPS */))
    ])
  ]))
}
})()
};

}, {}],
"src/renderer/layouts/AuthLayout.js": [function(require, module, exports) {
"use strict";
/**
 * @file 登录页布局，居中卡片样式，含 logo 与版权信息。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthLayout = void 0;
exports.AuthLayout = {
    name: 'AuthLayout',
    setup() {
        // 注入页面渲染上下文
        const getPageComponent = Vue.inject('getPageComponent');
        const getPageProps = Vue.inject('getPageProps');
        // 页面组件
        const pageComponent = Vue.computed(() => {
            if (!getPageComponent)
                return null;
            return getPageComponent();
        });
        // 页面 props
        const pageProps = Vue.computed(() => {
            if (!getPageProps)
                return {};
            return getPageProps();
        });
        return {
            pageComponent,
            pageProps
        };
    },
    render: (function () {
const { createElementVNode: _createElementVNode, resolveDynamicComponent: _resolveDynamicComponent, normalizeProps: _normalizeProps, guardReactiveProps: _guardReactiveProps, openBlock: _openBlock, createBlock: _createBlock, createElementBlock: _createElementBlock } = Vue

return function render(_ctx, _cache) {
  return (_openBlock(), _createElementBlock("div", { class: "min-h-screen flex items-center justify-center bg-base-200 p-4" }, [
    _createElementVNode("div", { class: "card bg-base-100 shadow-xl w-full max-w-md" }, [
      _createElementVNode("div", { class: "card-body" }, [
        _createElementVNode("div", { class: "text-center mb-6" }, [
          _createElementVNode("h1", { class: "text-2xl font-bold" }, "All In One"),
          _createElementVNode("p", { class: "text-sm text-base-content/60" }, "登录到您的账户")
        ]),
        (_openBlock(), _createBlock(_resolveDynamicComponent(_ctx.pageComponent), _normalizeProps(_guardReactiveProps(_ctx.pageProps)), null, 16 /* FULL_PROPS */)),
        _createElementVNode("div", { class: "text-center text-xs text-base-content/40 mt-6" }, "© 2026 All In One")
      ])
    ])
  ]))
}
})()
};

}, {}],
"src/renderer/layouts/WindowLayout.js": [function(require, module, exports) {
"use strict";
/**
 * @file Electron 窗口布局，含自定义可拖拽标题栏与窗口控制按钮。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WindowLayout = void 0;
const AppWindowControls_1 = require("../components/layout/AppWindowControls");
exports.WindowLayout = {
    name: 'WindowLayout',
    components: { AppWindowControls: AppWindowControls_1.AppWindowControls },
    setup() {
        // 注入页面渲染上下文
        const getPageComponent = Vue.inject('getPageComponent');
        const getPageProps = Vue.inject('getPageProps');
        // 页面组件
        const pageComponent = Vue.computed(() => {
            if (!getPageComponent)
                return null;
            return getPageComponent();
        });
        // 页面 props
        const pageProps = Vue.computed(() => {
            if (!getPageProps)
                return {};
            return getPageProps();
        });
        return {
            pageComponent,
            pageProps
        };
    },
    render: (function () {
const { createElementVNode: _createElementVNode, resolveComponent: _resolveComponent, createVNode: _createVNode, resolveDynamicComponent: _resolveDynamicComponent, normalizeProps: _normalizeProps, guardReactiveProps: _guardReactiveProps, openBlock: _openBlock, createBlock: _createBlock, createElementBlock: _createElementBlock } = Vue

return function render(_ctx, _cache) {
  const _component_AppWindowControls = _resolveComponent("AppWindowControls")

  return (_openBlock(), _createElementBlock("div", { class: "h-screen flex flex-col" }, [
    _createElementVNode("div", {
      class: "h-9 flex items-center justify-between px-2 bg-base-100 border-b border-base-300 select-none",
      style: {"-webkit-app-region":"drag"}
    }, [
      _createElementVNode("div", { class: "text-sm font-medium px-2" }, "All In One"),
      _createElementVNode("div", { style: {"-webkit-app-region":"no-drag"} }, [
        _createVNode(_component_AppWindowControls)
      ])
    ]),
    _createElementVNode("div", { class: "flex-1 overflow-auto" }, [
      (_openBlock(), _createBlock(_resolveDynamicComponent(_ctx.pageComponent), _normalizeProps(_guardReactiveProps(_ctx.pageProps)), null, 16 /* FULL_PROPS */))
    ])
  ]))
}
})()
};

}, {"../components/layout/AppWindowControls":"src/renderer/components/layout/AppWindowControls.js"}],
"src/renderer/components/base/BaseToast.js": [function(require, module, exports) {
"use strict";
/**
 * @file 全局 Toast 容器组件，从 notification store 读取消息队列。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseToast = void 0;
const notification_store_1 = require("../../stores/notification.store");
/** Toast 类型到 daisyUI alert 类名映射 */
const typeMap = {
    success: 'alert-success',
    error: 'alert-error',
    warning: 'alert-warning',
    info: 'alert-info',
    loading: 'alert-info'
};
/** Toast 类型到图标映射 */
const iconMap = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
    loading: ''
};
exports.BaseToast = {
    name: 'BaseToast',
    setup() {
        const store = (0, notification_store_1.useNotificationStore)();
        // Toast 队列（响应式）
        const toasts = Vue.computed(() => store.state.toasts);
        // 获取类型 class
        function typeClass(type) {
            return typeMap[type] || 'alert-info';
        }
        // 获取图标
        function iconFor(type) {
            return iconMap[type] || '';
        }
        // 移除指定 Toast
        function removeToast(id) {
            store.removeToast(id);
        }
        return { toasts, typeClass, iconFor, removeToast };
    },
    render: (function () {
const { renderList: _renderList, Fragment: _Fragment, openBlock: _openBlock, createElementBlock: _createElementBlock, createCommentVNode: _createCommentVNode, toDisplayString: _toDisplayString, createElementVNode: _createElementVNode, normalizeClass: _normalizeClass, TransitionGroup: _TransitionGroup, withCtx: _withCtx, createVNode: _createVNode, Teleport: _Teleport, createBlock: _createBlock } = Vue

return function render(_ctx, _cache) {
  return (_openBlock(), _createBlock(_Teleport, { to: "body" }, [
    _createElementVNode("div", { class: "toast toast-end z-[100]" }, [
      _createVNode(_TransitionGroup, { name: "toast" }, {
        default: _withCtx(() => [
          (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(_ctx.toasts, (toast) => {
            return (_openBlock(), _createElementBlock("div", {
              key: toast.id,
              class: _normalizeClass(["alert", _ctx.typeClass(toast.type)])
            }, [
              (toast.type === 'loading')
                ? (_openBlock(), _createElementBlock("span", {
                    key: 0,
                    class: "loading loading-spinner loading-sm"
                  }))
                : (_openBlock(), _createElementBlock("span", {
                    key: 1,
                    class: "text-xl"
                  }, _toDisplayString(_ctx.iconFor(toast.type)), 1 /* TEXT */)),
              _createElementVNode("div", { class: "flex-1" }, [
                _createElementVNode("h3", { class: "font-medium" }, _toDisplayString(toast.title), 1 /* TEXT */),
                (toast.description)
                  ? (_openBlock(), _createElementBlock("p", {
                      key: 0,
                      class: "text-sm opacity-80"
                    }, _toDisplayString(toast.description), 1 /* TEXT */))
                  : _createCommentVNode("v-if", true)
              ]),
              _createElementVNode("button", {
                class: "btn btn-ghost btn-xs",
                onClick: $event => (_ctx.removeToast(toast.id))
              }, "✕", 8 /* PROPS */, ["onClick"])
            ], 2 /* CLASS */))
          }), 128 /* KEYED_FRAGMENT */))
        ]),
        _: 1 /* STABLE */
      })
    ])
  ]))
}
})()
};

}, {"../../stores/notification.store":"src/renderer/stores/notification.store.js"}]
  }
  var __rendererCache = {}

  /**
   * 加载 bundle 内部模块。
   *
   * @param {string} moduleId 模块 ID。
   * @returns {unknown} 模块导出值。
   */
  function __rendererRequire(moduleId) {
    if (__rendererCache[moduleId]) {
      return __rendererCache[moduleId].exports
    }

    var record = __rendererModules[moduleId]
    if (!record) {
      throw new Error('renderer module not found: ' + moduleId)
    }

    var module = { exports: {} }
    __rendererCache[moduleId] = module

    /**
     * 解析当前模块的相对依赖。
     *
     * @param {string} request 原始 require 请求。
     * @returns {unknown} 依赖模块导出值。
     */
    function localRequire(request) {
      var dependencyId = record[1][request]
      if (!dependencyId) {
      throw new Error('renderer dependency not found: ' + moduleId + ' -> ' + request)
      }
      return __rendererRequire(dependencyId)
    }

    record[0](localRequire, module, module.exports)
    return module.exports
  }

  __rendererRequire("src/renderer.js")
})()
