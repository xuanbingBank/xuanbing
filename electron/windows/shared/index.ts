/**
 * @file 窗口管理系统的统一导出口。
 */

export {
  WINDOW_ROLES,
  WINDOW_ROUTES,
  WINDOW_PERMISSIONS
} from './window-types'

export type {
  WindowRole,
  WindowRoutePath,
  CloseBehavior,
  SecondOpenBehavior,
  EnvironmentScope,
  DisplayTarget,
  WindowPermission,
  WindowConfig,
  WindowConfigMap,
  WindowRef,
  WindowStateRecord,
  WindowStateMap,
  OpenWindowOptions,
  OpenWindowResult,
  InitPayloadEntry,
  WindowEventType,
  WindowEventPayload,
  RouteMetaInfo,
  WindowRouteMapEntry,
  WindowRouteMap
} from './window-types'

export { isWindowRole } from './window-roles'
export {
  WINDOW_ROUTE_MAP,
  matchRoutePattern,
  isRouteAllowedForRole,
  getDefaultRoute
} from './window-routes'
export {
  isWindowPermission,
  DEFAULT_WINDOW_ROLE_PERMISSIONS,
  hasPermission
} from './window-permissions'
export {
  WINDOW_ERROR_CODES,
  createWindowError,
  isWindowError
} from './window-errors'
export type { WindowErrorCode, WindowError } from './window-errors'
export {
  windowConfigSchema,
  windowConfigs,
  validateWindowConfigs,
  getWindowConfig,
  resolveWindowConfig
} from './window-config'
export {
  openWindowRequestSchema,
  openWindowResponseSchema,
  windowControlRequestSchema,
  windowControlResponseSchema,
  windowRefSchema,
  windowListResponseSchema,
  setWindowTitleRequestSchema,
  windowStateChangedEventSchema,
  windowRouteChangedEventSchema,
  getInitPayloadResponseSchema,
  getCurrentWindowResponseSchema,
  permissionsSummarySchema
} from './window-schemas'
export type {
  OpenWindowRequestInput,
  OpenWindowResponseOutput,
  WindowControlRequestInput,
  WindowControlResponseOutput,
  WindowListResponseOutput,
  SetWindowTitleRequestInput,
  GetInitPayloadResponseOutput,
  GetCurrentWindowResponseOutput,
  PermissionsSummary
} from './window-schemas'
