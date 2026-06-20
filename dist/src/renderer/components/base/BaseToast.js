"use strict";
/**
 * @file 全局 Toast 容器组件，从 notification store 读取消息队列。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseToast = void 0;
const notification_store_1 = require("../../stores/notification.store");
/** Toast 类型到 daisyUI alert 类名映射 */
const typeMap = {
    success: 'alert-success',
    error: 'alert-error',
    warning: 'alert-warning',
    info: 'alert-info',
    loading: 'alert-info'
};
/** Toast 类型到图标映射 */
const iconMap = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
    loading: ''
};
exports.BaseToast = {
    name: 'BaseToast',
    setup() {
        const store = (0, notification_store_1.useNotificationStore)();
        // Toast 队列（响应式）
        const toasts = Vue.computed(() => store.state.toasts);
        // 获取类型 class
        function typeClass(type) {
            return typeMap[type] || 'alert-info';
        }
        // 获取图标
        function iconFor(type) {
            return iconMap[type] || '';
        }
        // 移除指定 Toast
        function removeToast(id) {
            store.removeToast(id);
        }
        return { toasts, typeClass, iconFor, removeToast };
    },
    template: `
    <teleport to="body">
      <div class="toast toast-end z-[100]">
        <transition-group name="toast">
          <div
            v-for="toast in toasts"
            :key="toast.id"
            class="alert"
            :class="typeClass(toast.type)"
          >
            <span v-if="toast.type === 'loading'" class="loading loading-spinner loading-sm"></span>
            <span v-else class="text-xl">{{ iconFor(toast.type) }}</span>
            <div class="flex-1">
              <h3 class="font-medium">{{ toast.title }}</h3>
              <p v-if="toast.description" class="text-sm opacity-80">{{ toast.description }}</p>
            </div>
            <button class="btn btn-ghost btn-xs" @click="removeToast(toast.id)">✕</button>
          </div>
        </transition-group>
      </div>
    </teleport>
  `
};
