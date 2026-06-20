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
    template: `
    <main class="flex-1 overflow-auto p-4 bg-base-200/30">
      <component :is="pageComponent" v-bind="pageProps" />
    </main>
  `
};
