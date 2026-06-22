/**
 * @file 动效工具，提供 reduced-motion 检测与动效时长计算。
 */

/**
 * 检测当前用户是否启用了 prefers-reduced-motion。
 *
 * 在 SSR 或无 matchMedia 环境下返回 false。
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * 监听 prefers-reduced-motion 变化。
 *
 * @param callback 变化回调。
 * @returns 取消监听函数。
 */
export function onReducedMotionChange(callback: (reduced: boolean) => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return () => {}
  }
  const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
  const handler = (e: MediaQueryListEvent) => callback(e.matches)
  mql.addEventListener('change', handler)
  return () => mql.removeEventListener('change', handler)
}

/**
 * 根据是否 reduced motion 返回动效时长。
 *
 * @param normalMs 正常时长（ms）。
 * @returns 实际时长（reduced 时为 0）。
 */
export function motionDuration(normalMs: number): number {
  return prefersReducedMotion() ? 0 : normalMs
}

/**
 * 动效常量（与 tokens.css 对齐）。
 */
export const MOTION = {
  FAST: 120,
  NORMAL: 180,
  SLOW: 220
} as const

/**
 * 缓动函数（与 tokens.css 对齐）。
 */
export const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'
