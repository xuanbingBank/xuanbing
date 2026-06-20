"use strict";
/**
 * @file 窗口角色权限控制组件，根据当前窗口角色控制内容显示或禁用。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WindowPermissionGate = void 0;
const useWindowRole_1 = require("../../composables/useWindowRole");
exports.WindowPermissionGate = {
    name: 'WindowPermissionGate',
    props: {
        roles: { type: Array, default: () => [] },
        behavior: { type: Object, default: 'hide' }
    },
    setup(props) {
        const p = props;
        const { isRoleIn } = (0, useWindowRole_1.useWindowRole)();
        // 当前窗口角色是否在允许列表中
        const allowed = Vue.computed(() => {
            if (!p.roles || p.roles.length === 0)
                return true;
            return isRoleIn(p.roles);
        });
        return { allowed };
    },
    template: `
    <div v-if="allowed">
      <slot></slot>
    </div>
    <div v-else-if="behavior === 'disable'" class="pointer-events-none opacity-50">
      <slot></slot>
    </div>
    <slot v-else name="fallback"></slot>
  `
};
