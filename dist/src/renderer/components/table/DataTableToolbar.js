"use strict";
/**
 * @file 表格工具栏组件，提供标题、选中状态、操作按钮区域。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataTableToolbar = void 0;
exports.DataTableToolbar = {
    name: 'DataTableToolbar',
    props: {
        title: { type: String, default: '' },
        selectedCount: { type: Number, default: 0 },
        loading: { type: Boolean, default: false }
    },
    emits: ['refresh'],
    template: `
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <h3 v-if="title" class="text-lg font-semibold">{{ title }}</h3>
        <div v-if="selectedCount > 0" class="badge badge-primary">已选 {{ selectedCount }} 项</div>
        <slot></slot>
      </div>
      <div class="flex items-center gap-2">
        <slot name="actions"></slot>
        <button class="btn btn-ghost btn-sm btn-circle" @click="$emit('refresh')" :disabled="loading" aria-label="刷新">↻</button>
      </div>
    </div>
  `
};
