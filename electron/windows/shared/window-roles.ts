/**
 * @file 窗口角色常量与辅助函数。
 */

import { WINDOW_ROLES } from './window-types'
import type { WindowRole } from './window-types'

/**
 * 全部合法窗口角色。
 */
export { WINDOW_ROLES }

/**
 * 判断字符串是否为合法窗口角色。
 *
 * @param value 待校验值。
 * @returns 是否合法。
 */
export function isWindowRole(value: unknown): value is WindowRole {
  return typeof value === 'string' && (WINDOW_ROLES as readonly string[]).includes(value)
}
