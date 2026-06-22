/**
 * @file Fluent class 工具，提供组件 class 拼接与变体映射的辅助函数。
 *
 * 避免在组件中硬编码颜色，统一通过 token 工具类组合。
 */

/**
 * 合并多个 class 字符串，过滤空值。
 */
export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

/**
 * 按钮变体到 class 映射。
 */
export const buttonVariantClass: Record<string, string> = {
  primary:
    'bg-[var(--xb-brand)] text-[var(--xb-text-on-brand)] hover:bg-[var(--xb-brand-hover)] active:bg-[var(--xb-brand-active)] border border-transparent',
  secondary:
    'bg-[var(--xb-bg-surface)] text-[var(--xb-text-primary)] hover:bg-[var(--xb-bg-hover)] border border-[var(--xb-border)] hover:border-[var(--xb-border-strong)]',
  subtle:
    'bg-transparent text-[var(--xb-text-primary)] hover:bg-[var(--xb-bg-hover)] border border-transparent',
  transparent:
    'bg-transparent text-[var(--xb-text-primary)] hover:bg-[var(--xb-bg-hover)] border border-transparent',
  danger:
    'bg-[var(--xb-error)] text-white hover:opacity-90 active:opacity-80 border border-transparent',
  success:
    'bg-[var(--xb-success)] text-white hover:opacity-90 active:opacity-80 border border-transparent'
}

/**
 * 按钮尺寸到 class 映射。
 */
export const buttonSizeClass: Record<string, string> = {
  small: 'h-7 px-2.5 text-xs gap-1',
  medium: 'h-9 px-3.5 text-sm gap-1.5',
  large: 'h-11 px-5 text-base gap-2'
}

/**
 * 图标按钮尺寸到 class 映射。
 */
export const iconButtonSizeClass: Record<string, string> = {
  small: 'h-7 w-7',
  medium: 'h-9 w-9',
  large: 'h-11 w-11'
}

/**
 * 输入框尺寸到 class 映射。
 */
export const inputSizeClass: Record<string, string> = {
  small: 'h-7 text-xs px-2',
  medium: 'h-9 text-sm px-3',
  large: 'h-11 text-base px-3.5'
}

/**
 * Modal 尺寸到 max-width 映射。
 */
export const modalSizeClass: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[95vw]'
}

/**
 * Drawer 尺寸到宽度映射。
 */
export const drawerSizeClass: Record<string, string> = {
  sm: 'w-80',
  md: 'w-96',
  lg: 'w-[32rem]',
  xl: 'w-[40rem]',
  full: 'w-full'
}

/**
 * Badge 变体到 class 映射。
 */
export const badgeVariantClass: Record<string, string> = {
  default:
    'bg-[var(--xb-bg-hover)] text-[var(--xb-text-secondary)] border border-[var(--xb-border)]',
  brand:
    'bg-[var(--xb-brand-subtle)] text-[var(--xb-brand-hover)] border border-transparent',
  success:
    'bg-[var(--xb-success-subtle)] text-[var(--xb-success)] border border-transparent',
  warning:
    'bg-[var(--xb-warning-subtle)] text-[var(--xb-warning)] border border-transparent',
  error:
    'bg-[var(--xb-error-subtle)] text-[var(--xb-error)] border border-transparent',
  info: 'bg-[var(--xb-info-subtle)] text-[var(--xb-info)] border border-transparent'
}

/**
 * 菜单项状态 class。
 */
export function menuItemClass(active: boolean, selected: boolean, disabled: boolean): string {
  if (disabled) {
    return 'text-[var(--xb-text-disabled)] cursor-not-allowed'
  }
  if (selected) {
    return 'bg-[var(--xb-bg-active)] text-[var(--xb-brand-hover)]'
  }
  if (active) {
    return 'bg-[var(--xb-bg-hover)] text-[var(--xb-text-primary)]'
  }
  return 'text-[var(--xb-text-secondary)] hover:bg-[var(--xb-bg-hover)] hover:text-[var(--xb-text-primary)]'
}
