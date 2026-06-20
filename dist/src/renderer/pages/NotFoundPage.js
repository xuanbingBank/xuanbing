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
    template: `
    <div class="min-h-[60vh] flex flex-col items-center justify-center text-center">
      <div class="text-8xl font-bold text-error mb-4">404</div>
      <h2 class="text-2xl font-semibold mb-2">页面不存在</h2>
      <p class="text-base-content/60 mb-2">您访问的页面不存在</p>
      <p class="text-sm text-base-content/40 mb-6">请求路径: {{ requestedPath }}</p>
      <BaseButton @click="goHome">返回首页</BaseButton>
    </div>
  `
};
