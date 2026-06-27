/**
 * @file 注册窗口控制与窗口事件相关的 IPC 处理器。
 *
 * 本模块使用 electron/windows/main 中的新 WindowManager，通过最小接口 WindowManagerLike 注入，
 * 避免直接依赖完整 WindowManager 类。
 */

import { IPC_CHANNELS, IPC_EVENTS, eventContracts, requestContracts } from '../../shared'
import { createIpcError } from '../ipc-errors'
import type { IpcMainBus } from '../ipc-main-bus'
import type {
  OpenWindowOptions,
  OpenWindowResult,
  WindowRef,
  WindowRole,
  WindowEventPayload,
  WindowEventType
} from '../../../windows/shared/window-types'
import type { InitPayloadReadResult } from '../../../windows/main/window-init-payload'

/* ───────────────────────── 类型定义 ───────────────────────── */

/**
 * 窗口控制请求输入（minimize / maximize / close / restore / hide / show / focus / reload）。
 */
interface WindowControlInput {
  windowId?: number
  role?: string
}

/**
 * 设置窗口标题请求输入。
 */
interface WindowSetTitleInput {
  title: string
  windowId?: number
}

/**
 * 按角色关闭窗口请求输入。
 */
interface WindowCloseByRoleInput {
  role: WindowRole
}

/**
 * 打开窗口请求输入。
 */
interface WindowOpenInput {
  role: WindowRole
  routeName?: string
  params?: Record<string, string>
  query?: Record<string, string>
  payload?: unknown
  displayTarget?: 'primary' | 'cursor' | 'parent' | 'last' | 'explicit'
  parentWindowId?: number
  title?: string
}

/**
 * 新 WindowManager 的最小接口，确保不直接依赖完整类。
 *
 * 实际的 WindowManager（electron/windows/main/window-manager.ts）满足此接口。
 */
export interface WindowManagerLike {
  openWindow(role: WindowRole, options?: Partial<Omit<OpenWindowOptions, 'role'>>): OpenWindowResult
  closeWindow(windowId: number): void
  closeAll(): void
  closeByRole(role: WindowRole): void
  minimizeWindow(windowId: number): void
  toggleMaximize(windowId: number): void
  restoreWindow(windowId: number): void
  hideWindow(windowId: number): void
  showWindow(windowId: number): void
  focusWindow(windowId: number): void
  focusByRole(role: WindowRole): void
  reloadWindow(windowId: number): void
  listWindows(): WindowRef[]
  getWindow(windowId: number): WindowRef | undefined
  getWindowByRole(role: WindowRole): WindowRef | undefined
  updateWindowTitle(windowId: number, title: string): void
  consumeInitPayload(windowId: number): InitPayloadReadResult | undefined
  getEventBus(): WindowEventBusLike
}

/**
 * 窗口事件总线最小接口。
 */
export interface WindowEventBusLike {
  on(type: WindowEventType, handler: (payload: WindowEventPayload) => void): () => void
}

/* ───────────────────────── 辅助函数 ───────────────────────── */

/**
 * 窗口状态映射：将窗口事件类型映射为 windowStateChanged 事件的 state 字段值。
 */
const WINDOW_EVENT_TO_STATE: Partial<Record<WindowEventType, string>> = {
  'window:focused': 'focused',
  'window:blurred': 'blurred',
  'window:minimized': 'minimized',
  'window:maximized': 'maximized',
  'window:unmaximized': 'unmaximized',
  'window:restored': 'restored',
  'window:shown': 'shown',
  'window:hidden': 'hidden',
  'window:closed': 'closed'
}

/**
 * 校验发送方是否有权控制目标窗口。
 *
 * - 目标窗口 === 发送方窗口：允许（self 控制）。
 * - 目标窗口 !== 发送方窗口：需要发送方拥有 window:control:any 权限。
 *
 * @param windowManager 窗口管理器。
 * @param senderWindowId 发送方窗口 ID。
 * @param targetWindowId 目标窗口 ID。
 * @param permission 权限名称（window:control:any）。
 * @throws IpcError 权限不足时抛出。
 */
function assertControlPermission(
  windowManager: WindowManagerLike,
  senderWindowId: number | undefined,
  targetWindowId: number,
  permission: 'window:control:any',
  rolePermissions: Record<string, string[]>
): void {
  if (senderWindowId === targetWindowId) {
    return
  }

  if (senderWindowId === undefined) {
    throw createIpcError('IPC_FORBIDDEN', 'Sender window could not be resolved; cross-window control is not allowed.')
  }

  const senderRef = windowManager.getWindow(senderWindowId)
  if (!senderRef) {
    throw createIpcError('IPC_WINDOW_NOT_FOUND', `Sender window ${senderWindowId} is unavailable.`)
  }

  const allowed = hasControlPermission(senderRef.role, permission, rolePermissions)
  if (!allowed) {
    throw createIpcError(
      'IPC_FORBIDDEN',
      `Sender role "${senderRef.role}" lacks permission "${permission}" to control window ${targetWindowId}.`
    )
  }
}

/**
 * 检查角色是否拥有指定控制权限。
 *
 * 使用 index.ts 装配时注入的扩展后 rolePermissions 映射，而非直接 require
 * DEFAULT_WINDOW_ROLE_PERMISSIONS，确保与 IPC 总线权限源保持一致。
 *
 * @param role 窗口角色。
 * @param permission 权限名称。
 * @param rolePermissions 注入的角色权限映射。
 * @returns 是否拥有。
 */
function hasControlPermission(
  role: string,
  permission: string,
  rolePermissions: Record<string, string[]>
): boolean {
  const perms = rolePermissions[role] ?? []
  return perms.includes(permission)
}

/**
 * 解析控制操作的目标窗口 ID。
 *
 * @param senderWindowId 发送方窗口 ID。
 * @param input 控制请求输入。
 * @returns 目标窗口 ID。
 * @throws IpcError 无法解析时抛出。
 */
function resolveTargetWindowId(senderWindowId: number | undefined, input: WindowControlInput): number {
  const targetWindowId = input.windowId ?? senderWindowId
  if (targetWindowId === undefined) {
    throw createIpcError('IPC_WINDOW_NOT_FOUND', 'Unable to resolve a target window for this request.')
  }
  return targetWindowId
}

/**
 * 当前窗口权限的布尔摘要，渲染层可按能力判断而非直接消费原始权限字符串。
 */
export interface PermissionsSummary {
  canOpenWindow: boolean
  canControlWindow: boolean
  canReadDatabase: boolean
  canBackupDatabase: boolean
  canManageSettings: boolean
  canManageTasks: boolean
  canManageFiles: boolean
}

/**
 * 根据权限数组构建布尔摘要对象，便于渲染层按能力判断。
 *
 * 仅做包含判断，不修改 permissions 数组本身。各字段映射到关键权限字符串：
 * - canOpenWindow: window:open
 * - canControlWindow: window:control:any 或 window:control:self
 * - canReadDatabase: database:read 或 app:read
 * - canBackupDatabase: database:backup
 * - canManageSettings: setting:write 或 setting:read
 * - canManageTasks: task:run / task:cancel / taskData:write
 * - canManageFiles: file:read 或 file:write
 *
 * @param permissions 当前窗口的权限数组。
 * @returns 布尔摘要对象。
 */
function buildPermissionsSummary(permissions: string[]): PermissionsSummary {
  const has = (perm: string): boolean => permissions.includes(perm)
  return {
    canOpenWindow: has('window:open'),
    canControlWindow: has('window:control:any') || has('window:control:self'),
    canReadDatabase: has('database:read') || has('app:read'),
    canBackupDatabase: has('database:backup'),
    canManageSettings: has('setting:write') || has('setting:read'),
    canManageTasks: has('task:run') || has('task:cancel') || has('taskData:write'),
    canManageFiles: has('file:read') || has('file:write')
  }
}

/* ───────────────────────── 注册入口 ───────────────────────── */

/**
 * 注册窗口控制与窗口事件处理器。
 *
 * 为什么必须在 main：
 * `BrowserWindow` 实例与窗口生命周期只能在主进程安全操作。
 *
 * renderer 能拿到什么：
 * 只拿到经 schema 校验的窗口引用、状态与窗口 ID。
 *
 * renderer 拿不到什么：
 * 拿不到 `BrowserWindow` 实例、`webContents` 或原始 Electron 事件对象。
 *
 * 输入如何校验：
 * 使用共享契约中的窗口控制请求模型，允许可选 `windowId`。
 *
 * 输出如何校验：
 * 使用共享契约中的窗口控制响应模型，严格约束状态值。
 *
 * 失败如何返回：
 * 统一抛出标准 `IpcError`，错误码包含找不到窗口、窗口已销毁等。
 *
 * 权限校验：
 * - 自身控制（target === sender）：默认允许。
 * - 跨窗口控制（target !== sender）：需要 window:control:any 权限。
 * - windowGetCurrent / windowGetInitPayload：windowId 始终从 IPC sender 解析，不信任 renderer 输入。
 *
 * @param bus 主进程 IPC 总线。
 * @param windowManager 新窗口管理器（electron/windows/main）。
 * @param rolePermissions 注入的扩展后角色权限映射，供 hasControlPermission 使用，
 *   保证窗口控制权限校验与 IPC 总线权限源一致。
 */
export function registerWindowIpc(
  bus: IpcMainBus,
  windowManager: WindowManagerLike,
  rolePermissions: Record<string, string[]>
): void {
  /* ── windowOpen ── */
  bus.registerHandler(requestContracts[IPC_CHANNELS.windowOpen], async ({ input, senderWindowId }) => {
    const openInput = input as WindowOpenInput
    // 始终用 IPC sender 的 windowId 作为 parentWindowId，防止渲染进程伪造父窗口绕过权限校验。
    const result = windowManager.openWindow(openInput.role, {
      routeName: openInput.routeName,
      params: openInput.params,
      query: openInput.query,
      payload: openInput.payload,
      displayTarget: openInput.displayTarget,
      parentWindowId: senderWindowId,
      title: openInput.title
    })
    return result
  })

  /* ── windowMinimize ── */
  bus.registerHandler(requestContracts[IPC_CHANNELS.windowMinimize], async ({ input, senderWindowId }) => {
    const controlInput = input as WindowControlInput
    const targetWindowId = resolveTargetWindowId(senderWindowId, controlInput)
    assertControlPermission(windowManager, senderWindowId, targetWindowId, 'window:control:any', rolePermissions)
    windowManager.minimizeWindow(targetWindowId)
    return { windowId: targetWindowId, state: 'minimized' as const }
  })

  /* ── windowMaximize ── */
  bus.registerHandler(requestContracts[IPC_CHANNELS.windowMaximize], async ({ input, senderWindowId }) => {
    const controlInput = input as WindowControlInput
    const targetWindowId = resolveTargetWindowId(senderWindowId, controlInput)
    assertControlPermission(windowManager, senderWindowId, targetWindowId, 'window:control:any', rolePermissions)
    windowManager.toggleMaximize(targetWindowId)
    const ref = windowManager.getWindow(targetWindowId)
    return {
      windowId: targetWindowId,
      state: ref?.isMaximized ? 'maximized' as const : 'unmaximized' as const
    }
  })

  /* ── windowClose ── */
  bus.registerHandler(requestContracts[IPC_CHANNELS.windowClose], async ({ input, senderWindowId }) => {
    const controlInput = input as WindowControlInput
    const targetWindowId = resolveTargetWindowId(senderWindowId, controlInput)
    assertControlPermission(windowManager, senderWindowId, targetWindowId, 'window:control:any', rolePermissions)
    windowManager.closeWindow(targetWindowId)
    return { windowId: targetWindowId, state: 'closed' as const }
  })

  /* ── windowRestore ── */
  bus.registerHandler(requestContracts[IPC_CHANNELS.windowRestore], async ({ input, senderWindowId }) => {
    const controlInput = input as WindowControlInput
    const targetWindowId = resolveTargetWindowId(senderWindowId, controlInput)
    assertControlPermission(windowManager, senderWindowId, targetWindowId, 'window:control:any', rolePermissions)
    windowManager.restoreWindow(targetWindowId)
    return { windowId: targetWindowId, state: 'restored' as const }
  })

  /* ── windowHide ── */
  bus.registerHandler(requestContracts[IPC_CHANNELS.windowHide], async ({ input, senderWindowId }) => {
    const controlInput = input as WindowControlInput
    const targetWindowId = resolveTargetWindowId(senderWindowId, controlInput)
    assertControlPermission(windowManager, senderWindowId, targetWindowId, 'window:control:any', rolePermissions)
    windowManager.hideWindow(targetWindowId)
    return { windowId: targetWindowId, state: 'hidden' as const }
  })

  /* ── windowShow ── */
  bus.registerHandler(requestContracts[IPC_CHANNELS.windowShow], async ({ input, senderWindowId }) => {
    const controlInput = input as WindowControlInput
    const targetWindowId = resolveTargetWindowId(senderWindowId, controlInput)
    assertControlPermission(windowManager, senderWindowId, targetWindowId, 'window:control:any', rolePermissions)
    windowManager.showWindow(targetWindowId)
    return { windowId: targetWindowId, state: 'shown' as const }
  })

  /* ── windowFocus ── */
  bus.registerHandler(requestContracts[IPC_CHANNELS.windowFocus], async ({ input, senderWindowId }) => {
    const controlInput = input as WindowControlInput

    // 优先按角色聚焦。
    if (controlInput.role) {
      windowManager.focusByRole(controlInput.role as WindowRole)
      const ref = windowManager.getWindowByRole(controlInput.role as WindowRole)
      if (!ref) {
        throw createIpcError('IPC_WINDOW_NOT_FOUND', `No alive window found for role "${controlInput.role}".`)
      }
      return {
        windowId: ref.id,
        state: 'focused' as const
      }
    }

    const targetWindowId = resolveTargetWindowId(senderWindowId, controlInput)
    assertControlPermission(windowManager, senderWindowId, targetWindowId, 'window:control:any', rolePermissions)
    windowManager.focusWindow(targetWindowId)
    return { windowId: targetWindowId, state: 'focused' as const }
  })

  /* ── windowReload ── */
  bus.registerHandler(requestContracts[IPC_CHANNELS.windowReload], async ({ input, senderWindowId }) => {
    const controlInput = input as WindowControlInput
    const targetWindowId = resolveTargetWindowId(senderWindowId, controlInput)
    assertControlPermission(windowManager, senderWindowId, targetWindowId, 'window:control:any', rolePermissions)
    windowManager.reloadWindow(targetWindowId)
    return { windowId: targetWindowId, state: 'normal' as const }
  })

  /* ── windowList ── */
  // 按调用方权限过滤：无 window:control:any 权限的调用方仅返回其自身窗口，
  // 拥有该权限者才返回全量窗口列表，避免低权角色枚举其他窗口。
  bus.registerHandler(requestContracts[IPC_CHANNELS.windowList], async ({ senderWindowId }) => {
    const allWindows = windowManager.listWindows()
    if (senderWindowId === undefined) {
      return { windows: [] }
    }
    const senderRef = windowManager.getWindow(senderWindowId)
    if (!senderRef) {
      return { windows: [] }
    }
    if (hasControlPermission(senderRef.role, 'window:control:any', rolePermissions)) {
      return { windows: allWindows }
    }
    return { windows: allWindows.filter((w) => w.id === senderWindowId) }
  })

  /* ── windowGetCurrent ── */
  // windowId 始终从 IPC sender 解析，不信任 renderer 提供的 windowId。
  bus.registerHandler(requestContracts[IPC_CHANNELS.windowGetCurrent], async ({ senderWindowId }) => {
    if (senderWindowId === undefined) {
      throw createIpcError('IPC_WINDOW_NOT_FOUND', 'Unable to resolve the current window from the IPC sender.')
    }

    const ref = windowManager.getWindow(senderWindowId)
    if (!ref) {
      throw createIpcError('IPC_WINDOW_NOT_FOUND', `Window ${senderWindowId} is unavailable.`)
    }

    // 从角色配置中获取权限列表。
    const { getWindowConfig } = require('../../../windows/shared/window-config') as {
      getWindowConfig: (role: string) => { permissions: string[] }
    }
    const permissions = getWindowConfig(ref.role).permissions

    // 保留完整 permissions 数组以兼容现有渲染层，同时新增 permissionsSummary
    // 布尔摘要，供渲染层按能力判断（可选使用）。
    return {
      windowId: ref.id,
      role: ref.role,
      instanceKey: ref.instanceKey,
      permissions,
      permissionsSummary: buildPermissionsSummary(permissions)
    }
  })

  /* ── windowSetTitle ── */
  bus.registerHandler(requestContracts[IPC_CHANNELS.windowSetTitle], async ({ input, senderWindowId }) => {
    const titleInput = input as WindowSetTitleInput
    const targetWindowId = titleInput.windowId ?? senderWindowId
    if (targetWindowId === undefined) {
      throw createIpcError('IPC_WINDOW_NOT_FOUND', 'Unable to resolve a target window for setting title.')
    }
    assertControlPermission(windowManager, senderWindowId, targetWindowId, 'window:control:any', rolePermissions)
    windowManager.updateWindowTitle(targetWindowId, titleInput.title)
    return { windowId: targetWindowId, title: titleInput.title }
  })

  /* ── windowGetInitPayload ── */
  // windowId 始终从 IPC sender 解析，不信任 renderer 提供的 windowId。
  bus.registerHandler(requestContracts[IPC_CHANNELS.windowGetInitPayload], async ({ senderWindowId }) => {
    if (senderWindowId === undefined) {
      throw createIpcError('IPC_WINDOW_NOT_FOUND', 'Unable to resolve the current window from the IPC sender.')
    }

    const result = windowManager.consumeInitPayload(senderWindowId)
    if (!result) {
      throw createIpcError('IPC_NOT_READY', 'No init payload available for this window.')
    }

    return result
  })

  /* ── windowCloseAll ── */
  bus.registerHandler(requestContracts[IPC_CHANNELS.windowCloseAll], async () => {
    const before = windowManager.listWindows().length
    windowManager.closeAll()
    return { count: before }
  })

  /* ── windowCloseByRole ── */
  bus.registerHandler(requestContracts[IPC_CHANNELS.windowCloseByRole], async ({ input }) => {
    const roleInput = input as WindowCloseByRoleInput
    const before = windowManager.listWindows().filter((w) => w.role === roleInput.role).length
    windowManager.closeByRole(roleInput.role)
    return { count: before }
  })

  /* ── 事件注册 ── */
  bus.registerEvent(eventContracts[IPC_EVENTS.windowFocusChanged])
  bus.registerEvent(eventContracts[IPC_EVENTS.windowStateChanged])
  bus.registerEvent(eventContracts[IPC_EVENTS.windowRouteChanged])
  bus.registerEvent(eventContracts[IPC_EVENTS.windowCreated])

  /* ── 桥接窗口事件总线到 IPC 事件 ── */
  bridgeWindowEvents(bus, windowManager)
}

/**
 * 将新 WindowManager 的事件总线桥接到 IPC 总线，使渲染进程能订阅 windowStateChanged / windowRouteChanged / windowCreated。
 *
 * @param bus IPC 总线。
 * @param windowManager 窗口管理器。
 */
function bridgeWindowEvents(bus: IpcMainBus, windowManager: WindowManagerLike): void {
  const eventBus = windowManager.getEventBus()

  // 窗口状态变化 → windowStateChanged
  const stateEvents: WindowEventType[] = [
    'window:focused',
    'window:blurred',
    'window:minimized',
    'window:maximized',
    'window:unmaximized',
    'window:restored',
    'window:shown',
    'window:hidden',
    'window:closed'
  ]

  for (const eventType of stateEvents) {
    eventBus.on(eventType, (payload: WindowEventPayload) => {
      const state = WINDOW_EVENT_TO_STATE[eventType]
      if (!state) {
        return
      }
      bus.broadcast(IPC_EVENTS.windowStateChanged, {
        windowId: payload.windowId,
        role: payload.role,
        state
      })
    })
  }

  // 路由变化 → windowRouteChanged
  eventBus.on('window:route-changed', (payload: WindowEventPayload) => {
    const route = (payload.data?.route as string | undefined) ?? ''
    if (!route) {
      return
    }
    bus.broadcast(IPC_EVENTS.windowRouteChanged, {
      windowId: payload.windowId,
      role: payload.role,
      route
    })
  })

  // 窗口创建 → windowCreated
  eventBus.on('window:created', (payload: WindowEventPayload) => {
    const ref = windowManager.getWindow(payload.windowId)
    if (!ref) {
      return
    }
    bus.broadcast(IPC_EVENTS.windowCreated, {
      windowId: ref.id,
      role: ref.role,
      instanceKey: ref.instanceKey,
      route: ref.route,
      timestamp: payload.timestamp
    })
  })
}
