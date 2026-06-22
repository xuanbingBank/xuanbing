/**
 * @file Fluent 基础组件统一导出。
 *
 * 同时导出原有的 Base* 组件（向后兼容）与新的 Fluent* 组件。
 * 新代码请优先使用 Fluent* 组件。
 */

// ── Fluent 基础组件 ──
export { FluentIcon } from './FluentIcon'
export { FluentButton } from './FluentButton'
export type { FluentButtonVariant, FluentButtonSize, FluentButtonShape, FluentButtonType } from './FluentButton'
export { FluentIconButton } from './FluentIconButton'
export type { FluentIconButtonSize } from './FluentIconButton'
export { FluentCard } from './FluentCard'
export { FluentInput } from './FluentInput'
export type { FluentInputType, FluentInputSize } from './FluentInput'
export { FluentSelect } from './FluentSelect'
export type { FluentSelectOption, FluentSelectSize } from './FluentSelect'
export { FluentTextarea } from './FluentTextarea'
export { FluentSwitch } from './FluentSwitch'
export { FluentCheckbox } from './FluentCheckbox'
export { FluentBadge } from './FluentBadge'
export type { FluentBadgeVariant } from './FluentBadge'
export { FluentTag } from './FluentTag'
export { FluentDivider } from './FluentDivider'
export { FluentSkeleton } from './FluentSkeleton'
export { FluentEmpty } from './FluentEmpty'
export { FluentLoading } from './FluentLoading'
export type { FluentLoadingType, FluentLoadingSize } from './FluentLoading'
export { FluentError } from './FluentError'

// ── Fluent 浮层组件 ──
export { FluentModal } from './FluentModal'
export type { FluentModalSize } from './FluentModal'
export { FluentDrawer } from './FluentDrawer'
export type { FluentDrawerSide, FluentDrawerSize } from './FluentDrawer'
export { FluentToast } from './FluentToast'
export { FluentDropdown } from './FluentDropdown'
export type { FluentDropdownItem } from './FluentDropdown'
export { FluentContextMenu } from './FluentContextMenu'
export { FluentSegmented } from './FluentSegmented'
export type { FluentSegmentedOption } from './FluentSegmented'

// ── 原有 Base 组件（向后兼容） ──
export { BaseButton } from './BaseButton'
export { BaseCard } from './BaseCard'
export { BaseModal } from './BaseModal'
export { BaseDrawer } from './BaseDrawer'
export { BaseAlert } from './BaseAlert'
export { BaseLoading } from './BaseLoading'
export { BaseEmpty } from './BaseEmpty'
export { BaseError } from './BaseError'
export { PageContainer } from './PageContainer'
export { BaseToast } from './BaseToast'
