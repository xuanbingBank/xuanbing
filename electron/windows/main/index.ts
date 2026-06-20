/**
 * @file 主进程窗口管理系统统一导出口。
 */

export { WindowRegistry } from './window-registry'
export type {
  BrowserWindowLike as RegistryBrowserWindowLike,
  WindowRegistryEntry,
  RegisterWindowOptions,
  WindowRegistryDumpEntry
} from './window-registry'

export { WindowStateStore, DEFAULT_BOUNDS } from './window-state-store'
export type { WindowStateStoreOptions } from './window-state-store'

export { WindowUrlResolver } from './window-url-resolver'
export type { WindowUrlResolverOptions } from './window-url-resolver'

export {
  getAllDisplays,
  getPrimaryDisplay,
  selectTargetDisplay,
  isBoundsVisible,
  findDisplayContaining,
  centerToDisplay,
  centerToParentWindow,
  pullBackToVisible,
  correctSize,
  autoCorrectBounds
} from './window-display'
export type {
  DisplayBounds,
  DisplayInfo,
  ScreenLike,
  WindowBounds,
  ParentWindowLike
} from './window-display'

export { WindowInitPayloadStore } from './window-init-payload'
export type {
  StoredInitPayloadEntry,
  WindowInitPayloadStoreOptions,
  InitPayloadReadResult
} from './window-init-payload'

export { WindowEventBus } from './window-events'
export type { WindowEventHandler } from './window-events'

export {
  validateOpenRequest,
  checkPermission,
  validateRouteForRole,
  shouldAllowDevTools,
  ensureAllowedOrThrow
} from './window-guards'
export type { WindowEnvironment, GuardResult } from './window-guards'

export { WindowLifecycle } from './window-lifecycle'
export type {
  BrowserWindowLike as LifecycleBrowserWindowLike,
  WebContentsLike as LifecycleWebContentsLike,
  WindowLifecycleDeps
} from './window-lifecycle'

export { WindowManager } from './window-manager'
export type {
  WebContentsLike,
  BrowserWindowLike,
  SafeWebPreferences,
  BrowserWindowConstructorOptions,
  BrowserWindowFactory,
  ShellOpenExternalFn,
  WindowManagerOptions
} from './window-manager'

// 透传 shared 层的常用类型与函数，便于外部统一从 main/index.ts 导入。
export {
  WINDOW_ROLES,
  WINDOW_ROUTES,
  WINDOW_PERMISSIONS,
  isWindowRole,
  WINDOW_ROUTE_MAP,
  matchRoutePattern,
  isRouteAllowedForRole,
  getDefaultRoute,
  isWindowPermission,
  DEFAULT_WINDOW_ROLE_PERMISSIONS,
  hasPermission,
  WINDOW_ERROR_CODES,
  createWindowError,
  isWindowError,
  windowConfigSchema,
  windowConfigs,
  validateWindowConfigs,
  getWindowConfig,
  resolveWindowConfig,
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
  getCurrentWindowResponseSchema
} from '../shared/index'

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
  WindowRouteMap,
  WindowErrorCode,
  WindowError,
  OpenWindowRequestInput,
  OpenWindowResponseOutput,
  WindowControlRequestInput,
  WindowControlResponseOutput,
  WindowListResponseOutput,
  SetWindowTitleRequestInput,
  GetInitPayloadResponseOutput,
  GetCurrentWindowResponseOutput
} from '../shared/index'
