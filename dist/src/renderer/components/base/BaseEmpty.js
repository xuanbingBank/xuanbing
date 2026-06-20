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
    template: `
    <div class="flex flex-col items-center justify-center py-12 text-center">
      <div class="text-6xl mb-4">{{ icon }}</div>
      <h3 class="text-lg font-medium">{{ title }}</h3>
      <p v-if="description" class="text-sm text-base-content/60 mt-1">{{ description }}</p>
      <div class="mt-4">
        <slot name="action"></slot>
      </div>
    </div>
  `
};
