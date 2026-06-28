/**
 * @file 基于共享契约在 preload 暴露给 renderer 的业务 API。
 */

import {
  IPC_CHANNELS,
  IPC_EVENTS,
  eventContracts,
  requestContracts
} from '../shared'
import type {
  DesktopApi,
  DesktopAppApi,
  DesktopAuthApi,
  DesktopDatabaseApi,
  DesktopFileApi,
  DesktopSettingApi,
  DesktopSystemApi,
  DesktopTaskApi,
  DesktopTaskDataApi,
  DesktopWindowApi,
  DesktopXuanbingFileApi,
  AuthChangePasswordInput,
  AuthCurrentUserInput,
  AuthLoginInput,
  AuthLogoutInput,
  AuthVerifyInput,
  DatabaseRestoreInput,
  FileDialogInput,
  SettingDeleteOutput,
  SettingItem,
  SettingListOutput,
  SettingSetInput,
  SystemMessageBoxInput,
  SystemMessageBoxOutput,
  SystemNotificationInput,
  SystemNotificationOutput,
  SystemToastInput,
  SystemToastOutput,
  TaskCompletedPayload,
  TaskDataCreateInput,
  TaskDataListInput,
  TaskDataUpdateInput,
  TaskFailedPayload,
  TaskProgressPayload,
  TaskStartInput,
  WindowCreatedPayload,
  WindowFocusChangedPayload,
  WindowFocusTarget,
  WindowOpenInput,
  WindowRoutePayload,
  WindowStatePayload,
  XuanbingFileDryRunImportInput,
  XuanbingFileExportInput,
  XuanbingFileImportInput,
  XuanbingFileRef
} from '../renderer/desktop-api'
import type { PreloadClient } from './client'

/**
 * 构造窗口操作输入。
 *
 * @param windowId 可选窗口标识。
 * @returns 窗口操作输入对象。
 */
function createWindowActionInput(windowId?: number): { windowId?: number } {
  return windowId === undefined ? {} : { windowId }
}

/**
 * 构造窗口聚焦操作输入，支持 windowId（number）或 role（string）。
 *
 * @param target 目标窗口 ID 或角色名称。
 * @returns 窗口聚焦操作输入对象。
 */
function createWindowFocusInput(target?: WindowFocusTarget): { windowId?: number; role?: string } {
  if (target === undefined) {
    return {}
  }
  if (typeof target === 'number') {
    return { windowId: target }
  }
  return { role: target }
}

/**
 * 构造设置窗口标题输入。
 *
 * @param title 窗口标题。
 * @param windowId 可选窗口标识。
 * @returns 设置标题输入对象。
 */
function createWindowTitleInput(title: string, windowId?: number): { title: string; windowId?: number } {
  return windowId === undefined ? { title } : { title, windowId }
}

/**
 * 构造按任务标识过滤的订阅函数。
 *
 * @param client preload 客户端。
 * @param eventChannel 事件通道名。
 * @param payloadSchema 事件模型。
 * @param taskId 目标任务标识。
 * @param listener 业务回调。
 * @returns 取消订阅函数。
 */
function subscribeTaskEvent<TPayload extends { taskId: string }>(
  client: PreloadClient,
  eventChannel: string,
  payloadSchema: { parse(value: unknown): TPayload },
  taskId: string,
  listener: (payload: TPayload) => void
): () => void {
  return client.subscribe(eventChannel, payloadSchema, (payload) => {
    if (payload.taskId === taskId) {
      listener(payload)
    }
  })
}

/**
 * 构造应用信息操作命名空间。
 *
 * @param client preload 客户端。
 * @returns 应用信息操作命名空间。
 */
function createAppApi(client: PreloadClient): DesktopAppApi {
  return Object.freeze({
    getInfo: () => client.safeInvoke(IPC_CHANNELS.appInfoGet, requestContracts[IPC_CHANNELS.appInfoGet].outputSchema, {})
  })
}

/**
 * 构造文件操作命名空间。
 *
 * @param client preload 客户端。
 * @returns 文件操作命名空间。
 */
function createFileApi(client: PreloadClient): DesktopFileApi {
  return Object.freeze({
    openDialog: (input: FileDialogInput) => client.safeInvoke(IPC_CHANNELS.fileDialogOpen, requestContracts[IPC_CHANNELS.fileDialogOpen].outputSchema, input)
  })
}

/**
 * 构造窗口操作命名空间。
 *
 * @param client preload 客户端。
 * @returns 窗口操作命名空间。
 */
function createWindowApi(client: PreloadClient): DesktopWindowApi {
  return Object.freeze({
    /* ── 已有方法 ── */
    minimize: (windowId?: number) => client.safeInvoke(
      IPC_CHANNELS.windowMinimize,
      requestContracts[IPC_CHANNELS.windowMinimize].outputSchema,
      createWindowActionInput(windowId)
    ),
    maximize: (windowId?: number) => client.safeInvoke(
      IPC_CHANNELS.windowMaximize,
      requestContracts[IPC_CHANNELS.windowMaximize].outputSchema,
      createWindowActionInput(windowId)
    ),
    close: (windowId?: number) => client.safeInvoke(
      IPC_CHANNELS.windowClose,
      requestContracts[IPC_CHANNELS.windowClose].outputSchema,
      createWindowActionInput(windowId)
    ),
    onFocusChanged: (listener: (payload: WindowFocusChangedPayload) => void) => client.subscribe<WindowFocusChangedPayload>(
      IPC_EVENTS.windowFocusChanged,
      eventContracts[IPC_EVENTS.windowFocusChanged].payloadSchema,
      listener
    ),

    /* ── 新增窗口控制方法 ── */

    open: (role: string, options?: Omit<WindowOpenInput, 'role'>) => client.safeInvoke(
      IPC_CHANNELS.windowOpen,
      requestContracts[IPC_CHANNELS.windowOpen].outputSchema,
      { role, ...options }
    ),
    restore: (windowId?: number) => client.safeInvoke(
      IPC_CHANNELS.windowRestore,
      requestContracts[IPC_CHANNELS.windowRestore].outputSchema,
      createWindowActionInput(windowId)
    ),
    hide: (windowId?: number) => client.safeInvoke(
      IPC_CHANNELS.windowHide,
      requestContracts[IPC_CHANNELS.windowHide].outputSchema,
      createWindowActionInput(windowId)
    ),
    show: (windowId?: number) => client.safeInvoke(
      IPC_CHANNELS.windowShow,
      requestContracts[IPC_CHANNELS.windowShow].outputSchema,
      createWindowActionInput(windowId)
    ),
    focus: (target?: WindowFocusTarget) => client.safeInvoke(
      IPC_CHANNELS.windowFocus,
      requestContracts[IPC_CHANNELS.windowFocus].outputSchema,
      createWindowFocusInput(target)
    ),
    reload: (windowId?: number) => client.safeInvoke(
      IPC_CHANNELS.windowReload,
      requestContracts[IPC_CHANNELS.windowReload].outputSchema,
      createWindowActionInput(windowId)
    ),
    list: () => client.safeInvoke(
      IPC_CHANNELS.windowList,
      requestContracts[IPC_CHANNELS.windowList].outputSchema,
      {}
    ),
    getCurrent: () => client.safeInvoke(
      IPC_CHANNELS.windowGetCurrent,
      requestContracts[IPC_CHANNELS.windowGetCurrent].outputSchema,
      {}
    ),
    setTitle: (title: string, windowId?: number) => client.safeInvoke(
      IPC_CHANNELS.windowSetTitle,
      requestContracts[IPC_CHANNELS.windowSetTitle].outputSchema,
      createWindowTitleInput(title, windowId)
    ),
    getInitPayload: () => client.safeInvoke(
      IPC_CHANNELS.windowGetInitPayload,
      requestContracts[IPC_CHANNELS.windowGetInitPayload].outputSchema,
      {}
    ),
    closeAll: () => client.safeInvoke(
      IPC_CHANNELS.windowCloseAll,
      requestContracts[IPC_CHANNELS.windowCloseAll].outputSchema,
      {}
    ),
    closeByRole: (role: string) => client.safeInvoke(
      IPC_CHANNELS.windowCloseByRole,
      requestContracts[IPC_CHANNELS.windowCloseByRole].outputSchema,
      { role }
    ),

    /* ── 新增窗口事件订阅方法 ── */

    onStateChanged: (listener: (payload: WindowStatePayload) => void) => client.subscribe<WindowStatePayload>(
      IPC_EVENTS.windowStateChanged,
      eventContracts[IPC_EVENTS.windowStateChanged].payloadSchema,
      listener
    ),
    onRouteChanged: (listener: (payload: WindowRoutePayload) => void) => client.subscribe<WindowRoutePayload>(
      IPC_EVENTS.windowRouteChanged,
      eventContracts[IPC_EVENTS.windowRouteChanged].payloadSchema,
      listener
    ),
    onCreated: (listener: (payload: WindowCreatedPayload) => void) => client.subscribe<WindowCreatedPayload>(
      IPC_EVENTS.windowCreated,
      eventContracts[IPC_EVENTS.windowCreated].payloadSchema,
      listener
    )
  })
}

/**
 * 构造后台任务操作命名空间。
 *
 * @param client preload 客户端。
 * @returns 后台任务操作命名空间。
 */
function createTaskApi(client: PreloadClient): DesktopTaskApi {
  return Object.freeze({
    start: (input: TaskStartInput) => client.safeInvoke(IPC_CHANNELS.taskStart, requestContracts[IPC_CHANNELS.taskStart].outputSchema, input),
    cancel: (taskId: string, reason?: string) => client.safeInvoke(
      IPC_CHANNELS.taskCancel,
      requestContracts[IPC_CHANNELS.taskCancel].outputSchema,
      reason ? { taskId, reason } : { taskId }
    ),
    onProgress: (taskId: string, listener: (payload: TaskProgressPayload) => void) => subscribeTaskEvent<TaskProgressPayload>(
      client,
      IPC_EVENTS.taskProgress,
      eventContracts[IPC_EVENTS.taskProgress].payloadSchema,
      taskId,
      listener
    ),
    onCompleted: (taskId: string, listener: (payload: TaskCompletedPayload) => void) => subscribeTaskEvent<TaskCompletedPayload>(
      client,
      IPC_EVENTS.taskCompleted,
      eventContracts[IPC_EVENTS.taskCompleted].payloadSchema,
      taskId,
      listener
    ),
    onFailed: (taskId: string, listener: (payload: TaskFailedPayload) => void) => subscribeTaskEvent<TaskFailedPayload>(
      client,
      IPC_EVENTS.taskFailed,
      eventContracts[IPC_EVENTS.taskFailed].payloadSchema,
      taskId,
      listener
    )
  })
}

/**
 * 构造数据库管理操作命名空间。
 *
 * @param client preload 客户端。
 * @returns 数据库管理操作命名空间。
 */
function createDatabaseApi(client: PreloadClient): DesktopDatabaseApi {
  return Object.freeze({
    getHealth: () => client.safeInvoke(
      IPC_CHANNELS.databaseGetHealth,
      requestContracts[IPC_CHANNELS.databaseGetHealth].outputSchema,
      {}
    ),
    getStats: () => client.safeInvoke(
      IPC_CHANNELS.databaseGetStats,
      requestContracts[IPC_CHANNELS.databaseGetStats].outputSchema,
      {}
    ),
    backup: () => client.safeInvoke(
      IPC_CHANNELS.databaseBackup,
      requestContracts[IPC_CHANNELS.databaseBackup].outputSchema,
      {}
    ),
    restore: (input: DatabaseRestoreInput) => client.safeInvoke(
      IPC_CHANNELS.databaseRestore,
      requestContracts[IPC_CHANNELS.databaseRestore].outputSchema,
      input
    ),
    vacuum: () => client.safeInvoke(
      IPC_CHANNELS.databaseVacuum,
      requestContracts[IPC_CHANNELS.databaseVacuum].outputSchema,
      {}
    ),
    clearLogs: (olderThanDays?: number) => client.safeInvoke(
      IPC_CHANNELS.databaseClearLogs,
      requestContracts[IPC_CHANNELS.databaseClearLogs].outputSchema,
      olderThanDays !== undefined ? { olderThanDays } : {}
    )
  })
}

/**
 * 构造任务数据操作命名空间。
 *
 * @param client preload 客户端。
 * @returns 任务数据操作命名空间。
 */
function createTaskDataApi(client: PreloadClient): DesktopTaskDataApi {
  return Object.freeze({
    list: (input: TaskDataListInput = { page: undefined, pageSize: undefined, status: undefined, type: undefined }) => client.safeInvoke(
      IPC_CHANNELS.taskDataList,
      requestContracts[IPC_CHANNELS.taskDataList].outputSchema,
      input
    ),
    getById: (id: string) => client.safeInvoke(
      IPC_CHANNELS.taskDataGetById,
      requestContracts[IPC_CHANNELS.taskDataGetById].outputSchema,
      { id }
    ),
    create: (input: TaskDataCreateInput) => client.safeInvoke(
      IPC_CHANNELS.taskDataCreate,
      requestContracts[IPC_CHANNELS.taskDataCreate].outputSchema,
      input
    ),
    update: (input: TaskDataUpdateInput) => client.safeInvoke(
      IPC_CHANNELS.taskDataUpdate,
      requestContracts[IPC_CHANNELS.taskDataUpdate].outputSchema,
      input
    ),
    delete: (id: string) => client.safeInvoke(
      IPC_CHANNELS.taskDataDelete,
      requestContracts[IPC_CHANNELS.taskDataDelete].outputSchema,
      { id }
    )
  })
}

/**
 * 构造设置操作命名空间。
 *
 * @param client preload 客户端。
 * @returns 设置操作命名空间。
 */
function createSettingApi(client: PreloadClient): DesktopSettingApi {
  return Object.freeze({
    get: (namespace: string, key: string) => client.safeInvoke(
      IPC_CHANNELS.settingGet,
      requestContracts[IPC_CHANNELS.settingGet].outputSchema,
      { namespace, key }
    ) as Promise<SettingItem | null>,
    set: (input: SettingSetInput) => client.safeInvoke(
      IPC_CHANNELS.settingSet,
      requestContracts[IPC_CHANNELS.settingSet].outputSchema,
      input
    ) as Promise<SettingItem>,
    listByNamespace: (namespace: string) => client.safeInvoke(
      IPC_CHANNELS.settingListByNamespace,
      requestContracts[IPC_CHANNELS.settingListByNamespace].outputSchema,
      { namespace }
    ) as Promise<SettingListOutput>,
    delete: (namespace: string, key: string) => client.safeInvoke(
      IPC_CHANNELS.settingDelete,
      requestContracts[IPC_CHANNELS.settingDelete].outputSchema,
      { namespace, key }
    ) as Promise<SettingDeleteOutput>
  })
}

/**
 * 构造 .xuanbing 文件操作命名空间。
 *
 * @param client preload 客户端。
 * @returns .xuanbing 文件操作命名空间。
 */
function createXuanbingFileApi(client: PreloadClient): DesktopXuanbingFileApi {
  return Object.freeze({
    openDialog: (input = {}) => client.safeInvoke(
      IPC_CHANNELS.xuanbingFileOpenDialog,
      requestContracts[IPC_CHANNELS.xuanbingFileOpenDialog].outputSchema,
      input
    ),
    saveDialog: (input = {}) => client.safeInvoke(
      IPC_CHANNELS.xuanbingFileSaveDialog,
      requestContracts[IPC_CHANNELS.xuanbingFileSaveDialog].outputSchema,
      input
    ),
    readPreview: (fileRef: XuanbingFileRef) => client.safeInvoke(
      IPC_CHANNELS.xuanbingFileReadPreview,
      requestContracts[IPC_CHANNELS.xuanbingFileReadPreview].outputSchema,
      { fileRef }
    ),
    validate: (fileRef: XuanbingFileRef) => client.safeInvoke(
      IPC_CHANNELS.xuanbingFileValidate,
      requestContracts[IPC_CHANNELS.xuanbingFileValidate].outputSchema,
      { fileRef }
    ),
    exportPackage: (input: XuanbingFileExportInput) => client.safeInvoke(
      IPC_CHANNELS.xuanbingFileExportPackage,
      requestContracts[IPC_CHANNELS.xuanbingFileExportPackage].outputSchema,
      input
    ),
    dryRunImport: (input: XuanbingFileDryRunImportInput) => client.safeInvoke(
      IPC_CHANNELS.xuanbingFileDryRunImport,
      requestContracts[IPC_CHANNELS.xuanbingFileDryRunImport].outputSchema,
      input
    ),
    importPackage: (input: XuanbingFileImportInput) => client.safeInvoke(
      IPC_CHANNELS.xuanbingFileImportPackage,
      requestContracts[IPC_CHANNELS.xuanbingFileImportPackage].outputSchema,
      input
    )
  })
}

/**
 * 构造系统级操作命名空间。
 *
 * @param client preload 客户端。
 * @returns 系统级操作命名空间。
 */
function createSystemApi(client: PreloadClient): DesktopSystemApi {
  return Object.freeze({
    showNotification: (input: SystemNotificationInput) => client.safeInvoke<SystemNotificationOutput, SystemNotificationInput>(
      IPC_CHANNELS.systemNotificationShow,
      requestContracts[IPC_CHANNELS.systemNotificationShow].outputSchema,
      input
    ),
    showMessageBox: (input: SystemMessageBoxInput) => client.safeInvoke<SystemMessageBoxOutput, SystemMessageBoxInput>(
      IPC_CHANNELS.systemMessageBoxShow,
      requestContracts[IPC_CHANNELS.systemMessageBoxShow].outputSchema,
      input
    ),
    showToast: (input: SystemToastInput) => client.safeInvoke<SystemToastOutput, SystemToastInput>(
      IPC_CHANNELS.systemToastShow,
      requestContracts[IPC_CHANNELS.systemToastShow].outputSchema,
      input
    )
  })
}

/**
 * 构造鉴权操作命名空间。
 *
 * @param client preload 客户端。
 * @returns 鉴权操作命名空间。
 */
function createAuthApi(client: PreloadClient): DesktopAuthApi {
  return Object.freeze({
    login: (input: AuthLoginInput) => client.safeInvoke(
      IPC_CHANNELS.authLogin,
      requestContracts[IPC_CHANNELS.authLogin].outputSchema,
      input
    ),
    logout: (input: AuthLogoutInput) => client.safeInvoke(
      IPC_CHANNELS.authLogout,
      requestContracts[IPC_CHANNELS.authLogout].outputSchema,
      input
    ),
    verify: (input: AuthVerifyInput) => client.safeInvoke(
      IPC_CHANNELS.authVerify,
      requestContracts[IPC_CHANNELS.authVerify].outputSchema,
      input
    ),
    changePassword: (input: AuthChangePasswordInput) => client.safeInvoke(
      IPC_CHANNELS.authChangePassword,
      requestContracts[IPC_CHANNELS.authChangePassword].outputSchema,
      input
    ),
    currentUser: (input: AuthCurrentUserInput) => client.safeInvoke(
      IPC_CHANNELS.authCurrentUser,
      requestContracts[IPC_CHANNELS.authCurrentUser].outputSchema,
      input
    )
  })
}

/**
 * 构造顶层桌面 API。
 *
 * @param client preload 客户端。
 * @returns 顶层桌面 API。
 */
export function createDesktopApi(client: PreloadClient): DesktopApi {
  return Object.freeze({
    app: createAppApi(client),
    file: createFileApi(client),
    window: createWindowApi(client),
    task: createTaskApi(client),
    database: createDatabaseApi(client),
    taskData: createTaskDataApi(client),
    setting: createSettingApi(client),
    xuanbingFile: createXuanbingFileApi(client),
    system: createSystemApi(client),
    auth: createAuthApi(client)
  })
}
