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
    template: `
    <div class="flex flex-col items-center justify-center py-12 text-center">
      <div class="text-6xl mb-4">⚠️</div>
      <h3 class="text-xl font-semibold">{{ title }}</h3>
      <p v-if="description" class="text-sm text-base-content/60 mt-2 max-w-md">{{ description }}</p>
      <div v-if="error" class="mt-4 p-3 bg-base-200 rounded text-xs text-left max-w-lg overflow-auto">
        <pre>{{ errorText }}</pre>
      </div>
      <div class="flex gap-2 mt-6">
        <BaseButton v-if="showRetry" variant="primary" size="sm" @click="$emit('retry')">重试</BaseButton>
        <BaseButton v-if="showBack" variant="ghost" size="sm" @click="$emit('back')">返回</BaseButton>
        <BaseButton v-if="showHome" variant="ghost" size="sm" @click="$emit('home')">首页</BaseButton>
      </div>
    </div>
  `
};
