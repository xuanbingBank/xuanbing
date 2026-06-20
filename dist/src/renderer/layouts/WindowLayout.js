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
    template: `
    <div class="h-screen flex flex-col">
      <!-- 自定义标题栏（可拖拽） -->
      <div
        class="h-9 flex items-center justify-between px-2 bg-base-100 border-b border-base-300 select-none"
        style="-webkit-app-region: drag"
      >
        <div class="text-sm font-medium px-2">All In One</div>
        <div style="-webkit-app-region: no-drag">
          <AppWindowControls />
        </div>
      </div>
      <!-- 页面内容 -->
      <div class="flex-1 overflow-auto">
        <component :is="pageComponent" v-bind="pageProps" />
      </div>
    </div>
  `
};
