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
    template: `
    <div class="bg-base-100 rounded-lg p-4 mb-4 border border-base-300">
      <div class="flex flex-wrap items-center gap-3">
        <div class="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <slot></slot>
        </div>
        <div class="flex items-center gap-2">
          <BaseButton variant="primary" size="sm" :loading="loading" @click="$emit('search')">搜索</BaseButton>
          <BaseButton variant="ghost" size="sm" @click="$emit('reset')">重置</BaseButton>
          <slot name="extra"></slot>
          <BaseButton v-if="collapsible" variant="ghost" size="sm" @click="toggleCollapse">{{ collapsed ? '展开' : '收起' }}</BaseButton>
        </div>
      </div>
    </div>
  `
};
