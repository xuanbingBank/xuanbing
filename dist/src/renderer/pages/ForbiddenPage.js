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
    template: `
    <div class="min-h-[60vh] flex flex-col items-center justify-center text-center">
      <div class="text-8xl font-bold text-error mb-4">403</div>
      <h2 class="text-2xl font-semibold mb-2">无权访问</h2>
      <p class="text-base-content/60 mb-6">您没有权限访问此页面</p>
      <BaseButton @click="goHome">返回首页</BaseButton>
    </div>
  `
};
