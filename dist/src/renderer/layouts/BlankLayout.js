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
    template: `
    <div class="min-h-screen">
      <main class="min-h-screen">
        <component :is="pageComponent" v-bind="pageProps" />
      </main>
    </div>
  `
};
