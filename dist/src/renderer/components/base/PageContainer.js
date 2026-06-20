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
    template: `
    <div class="page-container">
      <div v-if="title || $slots.actions" class="flex items-center justify-between mb-4">
        <div>
          <h1 v-if="title" class="text-2xl font-semibold">{{ title }}</h1>
          <p v-if="description" class="text-sm text-base-content/60 mt-1">{{ description }}</p>
        </div>
        <div v-if="$slots.actions">
          <slot name="actions"></slot>
        </div>
      </div>
      <div class="page-content" :class="contentClass">
        <BaseLoading v-if="loading" />
        <BaseError v-else-if="error" :description="error" />
        <BaseEmpty v-else-if="empty" />
        <slot v-else></slot>
      </div>
    </div>
  `
};
