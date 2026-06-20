"use strict";
/**
 * @file 权限控制组件，根据权限/角色/窗口角色控制内容显示或禁用。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionGate = void 0;
const usePermission_1 = require("../../composables/usePermission");
exports.PermissionGate = {
    name: 'PermissionGate',
    props: {
        permissions: { type: Array, default: () => [] },
        mode: { type: Object, default: 'any' },
        behavior: { type: Object, default: 'hide' },
        roles: { type: Array, default: () => [] },
        windowRoles: { type: Array, default: () => [] }
    },
    setup(props) {
        const p = props;
        const { hasAnyPermission, hasAllPermissions, hasRole, isWindowRole } = (0, usePermission_1.usePermission)();
        // 是否允许显示：所有非空条件均需满足
        const allowed = Vue.computed(() => {
            // 权限检查
            if (p.permissions && p.permissions.length > 0) {
                if (p.mode === 'all') {
                    if (!hasAllPermissions(p.permissions))
                        return false;
                }
                else {
                    if (!hasAnyPermission(p.permissions))
                        return false;
                }
            }
            // 角色检查（任一角色匹配即可）
            if (p.roles && p.roles.length > 0) {
                const hasAnyRole = p.roles.some((r) => hasRole(r));
                if (!hasAnyRole)
                    return false;
            }
            // 窗口角色检查（任一窗口角色匹配即可）
            if (p.windowRoles && p.windowRoles.length > 0) {
                const hasAnyWindowRole = p.windowRoles.some((r) => isWindowRole(r));
                if (!hasAnyWindowRole)
                    return false;
            }
            return true;
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
