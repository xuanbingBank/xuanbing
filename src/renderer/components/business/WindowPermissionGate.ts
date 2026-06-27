/**
 * @file 窗口角色权限控制组件，根据当前窗口角色控制内容显示或禁用。
 */

import type { ComponentOptions } from '../../vue-global'
import { useWindowRole } from '../../composables/useWindowRole'

/** 无权限行为 */
type GateBehavior = 'hide' | 'disable'

/** 组件 Props */
interface WindowPermissionGateProps {
  roles: string[]
  behavior: GateBehavior
}

export const WindowPermissionGate: ComponentOptions = {
  name: 'WindowPermissionGate',
  props: {
    roles: { type: Array, default: () => [] },
    behavior: { type: String as () => GateBehavior, default: 'hide' }
  },
  setup(props) {
    const p = props as unknown as WindowPermissionGateProps
    const { isRoleIn } = useWindowRole()

    // 当前窗口角色是否在允许列表中
    const allowed = Vue.computed(() => {
      if (!p.roles || p.roles.length === 0) return true
      return isRoleIn(p.roles)
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
