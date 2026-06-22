/**
 * @file 权限控制组件，根据权限/角色/窗口角色控制内容显示或禁用。
 */

import type { ComponentOptions } from '../../vue-global'
import { usePermission } from '../../composables/usePermission'

/** 权限匹配模式 */
type PermissionMode = 'any' | 'all'

/** 无权限行为 */
type GateBehavior = 'hide' | 'disable'

/** 组件 Props */
interface PermissionGateProps {
  permissions: string[]
  mode: PermissionMode
  behavior: GateBehavior
  roles: string[]
  windowRoles: string[]
}

export const PermissionGate: ComponentOptions = {
  name: 'PermissionGate',
  props: {
    permissions: { type: Array, default: () => [] },
    mode: { type: Object as () => PermissionMode, default: 'any' },
    behavior: { type: Object as () => GateBehavior, default: 'hide' },
    roles: { type: Array, default: () => [] },
    windowRoles: { type: Array, default: () => [] }
  },
  setup(props) {
    const p = props as unknown as PermissionGateProps
    const { hasAnyPermission, hasAllPermissions, hasRole, isWindowRole } = usePermission()

    // 是否允许显示：所有非空条件均需满足
    const allowed = Vue.computed(() => {
      // 权限检查
      if (p.permissions && p.permissions.length > 0) {
        if (p.mode === 'all') {
          if (!hasAllPermissions(p.permissions)) return false
        } else {
          if (!hasAnyPermission(p.permissions)) return false
        }
      }
      // 角色检查（任一角色匹配即可）
      if (p.roles && p.roles.length > 0) {
        const hasAnyRole = p.roles.some((r) => hasRole(r))
        if (!hasAnyRole) return false
      }
      // 窗口角色检查（任一窗口角色匹配即可）
      if (p.windowRoles && p.windowRoles.length > 0) {
        const hasAnyWindowRole = p.windowRoles.some((r) => isWindowRole(r))
        if (!hasAnyWindowRole) return false
      }
      return true
    })

    return { allowed }
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
}
