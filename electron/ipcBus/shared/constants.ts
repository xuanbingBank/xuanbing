/**
 * @file 共享 IPC 通道、事件与权限常量定义。
 */

/**
 * 全部 IPC 请求通道常量。
 */
export const IPC_CHANNELS = {
  appInfoGet: 'app:info.get',
  fileDialogOpen: 'file:dialog.open',
  windowOpen: 'window:open',
  windowClose: 'window:close',
  windowMinimize: 'window:minimize',
  windowMaximize: 'window:maximize',
  windowRestore: 'window:restore',
  windowHide: 'window:hide',
  windowShow: 'window:show',
  windowFocus: 'window:focus',
  windowReload: 'window:reload',
  windowList: 'window:list',
  windowGetCurrent: 'window:getCurrent',
  windowSetTitle: 'window:setTitle',
  windowGetInitPayload: 'window:getInitPayload',
  windowCloseAll: 'window:closeAll',
  windowCloseByRole: 'window:closeByRole',
  taskStart: 'task:start',
  taskCancel: 'task:cancel',

  /* ───────────────────────── 数据库 ───────────────────────── */

  databaseGetHealth: 'database:getHealth',
  databaseGetStats: 'database:getStats',
  databaseBackup: 'database:backup',
  databaseRestore: 'database:restore',
  databaseVacuum: 'database:vacuum',
  databaseClearLogs: 'database:clearLogs',

  /* ───────────────────────── 任务数据持久化 ───────────────────────── */

  taskDataList: 'taskData:list',
  taskDataGetById: 'taskData:getById',
  taskDataCreate: 'taskData:create',
  taskDataUpdate: 'taskData:update',
  taskDataDelete: 'taskData:delete',

  /* ───────────────────────── 设置 ───────────────────────── */

  settingGet: 'setting:get',
  settingSet: 'setting:set',
  settingListByNamespace: 'setting:listByNamespace',
  settingDelete: 'setting:delete',

  /* ───────────────────────── .xuanbing 文件 ───────────────────────── */

  xuanbingFileOpenDialog: 'xuanbingFile:openDialog',
  xuanbingFileSaveDialog: 'xuanbingFile:saveDialog',
  xuanbingFileReadPreview: 'xuanbingFile:readPreview',
  xuanbingFileValidate: 'xuanbingFile:validate',
  xuanbingFileExportPackage: 'xuanbingFile:exportPackage',
  xuanbingFileDryRunImport: 'xuanbingFile:dryRunImport',
  xuanbingFileImportPackage: 'xuanbingFile:importPackage'
} as const

/**
 * 全部 IPC 事件通道常量。
 */
export const IPC_EVENTS = {
  taskProgress: 'task:progress',
  taskCompleted: 'task:completed',
  taskFailed: 'task:failed',
  windowFocusChanged: 'window:focus.changed',
  windowStateChanged: 'window:state.changed',
  windowRouteChanged: 'window:route.changed',
  windowCreated: 'window:created'
} as const

/**
 * 全部受控的 IPC 权限常量。
 */
export const IPC_PERMISSIONS = {
  public: 'public',
  appRead: 'app:read',
  fileRead: 'file:read',
  fileWrite: 'file:write',
  windowControl: 'window:control',
  windowOpen: 'window:open',
  windowList: 'window:list',
  windowControlSelf: 'window:control:self',
  windowControlAny: 'window:control:any',
  windowCloseSelf: 'window:close:self',
  windowCloseAny: 'window:close:any',
  windowFocus: 'window:focus',
  systemRead: 'system:read',
  systemWrite: 'system:write',
  taskRun: 'task:run',
  taskCancel: 'task:cancel',
  devtoolsOpen: 'devtools:open',

  /* ───────────────────────── 数据库权限 ───────────────────────── */

  databaseRead: 'database:read',
  databaseWrite: 'database:write',
  databaseBackup: 'database:backup',
  databaseRestore: 'database:restore',

  /* ───────────────────────── 任务数据权限 ───────────────────────── */

  taskDataRead: 'taskData:read',
  taskDataWrite: 'taskData:write',

  /* ───────────────────────── 设置权限 ───────────────────────── */

  settingRead: 'setting:read',
  settingWrite: 'setting:write',

  /* ───────────────────────── .xuanbing 文件权限 ───────────────────────── */

  xuanbingFileRead: 'xuanbingFile:read',
  xuanbingFileWrite: 'xuanbingFile:write',
  xuanbingFileImport: 'xuanbingFile:import',
  xuanbingFileExport: 'xuanbingFile:export'
} as const

/**
 * 默认 IPC 请求超时时间。
 */
export const DEFAULT_IPC_TIMEOUT_MS = 15_000

/**
 * 默认 IPC 载荷最大字节数。
 */
export const DEFAULT_IPC_MAX_PAYLOAD_BYTES = 64 * 1024
