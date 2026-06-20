"use strict";
/**
 * @file Electron 窗口控制按钮组件（最小化/最大化/关闭），仅 Electron 环境显示。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppWindowControls = void 0;
const window_store_1 = require("../../stores/window.store");
const useWindowControls_1 = require("../../composables/useWindowControls");
exports.AppWindowControls = {
    name: 'AppWindowControls',
    setup() {
        const windowStore = (0, window_store_1.useWindowStore)();
        const controls = (0, useWindowControls_1.useWindowControls)();
        // 是否 Electron 环境
        const isElectron = windowStore.isElectron;
        // 是否最大化
        const isMaximized = Vue.computed(() => windowStore.state.isMaximized);
        // 最小化
        function minimize() {
            controls.minimize();
        }
        // 切换最大化
        function toggleMaximize() {
            if (isMaximized.value) {
                controls.restore();
            }
            else {
                controls.maximize();
            }
        }
        // 关闭
        function close() {
            controls.close();
        }
        return {
            isElectron,
            isMaximized,
            minimize,
            toggleMaximize,
            close
        };
    },
    template: `
    <div v-if="isElectron" class="flex items-center gap-1 ml-2">
      <button class="btn btn-ghost btn-xs btn-circle" @click="minimize" aria-label="最小化">─</button>
      <button class="btn btn-ghost btn-xs btn-circle" @click="toggleMaximize" aria-label="最大化">
        {{ isMaximized ? '❐' : '□' }}
      </button>
      <button class="btn btn-ghost btn-xs btn-circle hover:bg-error hover:text-error-content" @click="close" aria-label="关闭">✕</button>
    </div>
  `
};
