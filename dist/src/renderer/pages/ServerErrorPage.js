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
    template: `
    <div class="min-h-[60vh] flex flex-col items-center justify-center text-center">
      <div class="text-8xl font-bold text-error mb-4">500</div>
      <h2 class="text-2xl font-semibold mb-2">服务器错误</h2>
      <p class="text-base-content/60 mb-6">服务器遇到错误，请稍后重试</p>
      <div class="flex gap-2">
        <BaseButton variant="primary" @click="handleRetry">重试</BaseButton>
        <BaseButton variant="ghost" @click="goHome">返回首页</BaseButton>
      </div>
    </div>
  `
};
