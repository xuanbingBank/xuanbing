/**
 * @file ������Ⱦ���̿ɼ������� API ���ͣ�ȷ�� renderer ֻ����ҵ���������ǵײ� IPC��
 */

import { IPC_CHANNELS, IPC_EVENTS, eventContracts, requestContracts } from '../shared'
import type { InferEventPayload, InferRequestInput, InferRequestOutput } from '../shared'

/**
 * ����ȡ�����ĺ������͡�
 */
export type DesktopUnsubscribe = () => void

/**
 * �����޵ײ㴫��ϸ�ڵ�ҵ���������͡�
 */
export type DesktopCommand<TInput, TOutput> = [TInput] extends [void]
  ? () => Promise<TOutput>
  : (input: TInput) => Promise<TOutput>

/**
 * �����¼��������͡�
 */
export type DesktopSubscription<TPayload> = (listener: (payload: TPayload) => void) => DesktopUnsubscribe

/**
 * ����һ�ε��õĿ���״̬��
 */
export interface DesktopInvokeIdleState {
  status: 'idle'
  data: undefined
  error: undefined
}

/**
 * ����һ�ε��õļ���״̬��
 */
export interface DesktopInvokeLoadingState<TInput> {
  status: 'loading'
  input: TInput
  data: undefined
  error: undefined
}

/**
 * ����һ�ε��õĳɹ�״̬��
 */
export interface DesktopInvokeSuccessState<TData> {
  status: 'success'
  data: TData
  error: undefined
}

/**
 * ����һ�ε��õ�ʧ��״̬��
 */
export interface DesktopInvokeErrorState<TError> {
  status: 'error'
  data: undefined
  error: TError
}

/**
 * �������״̬�������͡�
 */
export type DesktopInvokeState<TData, TInput = void, TError = Error> =
  | DesktopInvokeIdleState
  | DesktopInvokeLoadingState<TInput>
  | DesktopInvokeSuccessState<TData>
  | DesktopInvokeErrorState<TError>

/**
 * ���干����Լ�����ĺ���ҵ�����͡�
 */
export type AppInfo = InferRequestOutput<(typeof requestContracts)[typeof IPC_CHANNELS.appInfoGet]>
export type FileDialogInput = InferRequestInput<(typeof requestContracts)[typeof IPC_CHANNELS.fileDialogOpen]>
export type FileDialogOutput = InferRequestOutput<(typeof requestContracts)[typeof IPC_CHANNELS.fileDialogOpen]>
export type WindowActionInput = InferRequestInput<(typeof requestContracts)[typeof IPC_CHANNELS.windowMinimize]>
export type WindowActionOutput = InferRequestOutput<(typeof requestContracts)[typeof IPC_CHANNELS.windowMinimize]>
export type TaskStartInput = InferRequestInput<(typeof requestContracts)[typeof IPC_CHANNELS.taskStart]>
export type TaskStartOutput = InferRequestOutput<(typeof requestContracts)[typeof IPC_CHANNELS.taskStart]>
export type TaskCancelOutput = InferRequestOutput<(typeof requestContracts)[typeof IPC_CHANNELS.taskCancel]>
export type TaskProgressPayload = InferEventPayload<(typeof eventContracts)[typeof IPC_EVENTS.taskProgress]>
export type TaskCompletedPayload = InferEventPayload<(typeof eventContracts)[typeof IPC_EVENTS.taskCompleted]>
export type TaskFailedPayload = InferEventPayload<(typeof eventContracts)[typeof IPC_EVENTS.taskFailed]>
export type WindowFocusChangedPayload = InferEventPayload<(typeof eventContracts)[typeof IPC_EVENTS.windowFocusChanged]>

/* ───────────────────────── 窗口管理扩展类型 ───────────────────────── */

/**
 * 打开窗口请求输入类型。
 */
export type WindowOpenInput = InferRequestInput<(typeof requestContracts)[typeof IPC_CHANNELS.windowOpen]>

/**
 * 打开窗口响应输出类型。
 */
export type WindowOpenOutput = InferRequestOutput<(typeof requestContracts)[typeof IPC_CHANNELS.windowOpen]>

/**
 * 窗口列表响应输出类型。
 */
export type WindowListOutput = InferRequestOutput<(typeof requestContracts)[typeof IPC_CHANNELS.windowList]>

/**
 * 当前窗口信息类型（windowGetCurrent 响应）。
 */
export type WindowCurrentInfo = InferRequestOutput<(typeof requestContracts)[typeof IPC_CHANNELS.windowGetCurrent]>

/**
 * 窗口初始化数据类型（windowGetInitPayload 响应）。
 */
export type WindowInitPayload = InferRequestOutput<(typeof requestContracts)[typeof IPC_CHANNELS.windowGetInitPayload]>

/**
 * 设置窗口标题请求输入类型。
 */
export type WindowSetTitleInput = InferRequestInput<(typeof requestContracts)[typeof IPC_CHANNELS.windowSetTitle]>

/**
 * 设置窗口标题响应输出类型。
 */
export type WindowSetTitleOutput = InferRequestOutput<(typeof requestContracts)[typeof IPC_CHANNELS.windowSetTitle]>

/**
 * 按角色关闭窗口请求输入类型。
 */
export type WindowCloseByRoleInput = InferRequestInput<(typeof requestContracts)[typeof IPC_CHANNELS.windowCloseByRole]>

/**
 * 窗口计数响应输出类型（closeAll / closeByRole）。
 */
export type WindowCloseCountOutput = InferRequestOutput<(typeof requestContracts)[typeof IPC_CHANNELS.windowCloseAll]>

/**
 * 窗口状态变化事件载荷类型。
 */
export type WindowStatePayload = InferEventPayload<(typeof eventContracts)[typeof IPC_EVENTS.windowStateChanged]>

/**
 * 窗口路由变化事件载荷类型。
 */
export type WindowRoutePayload = InferEventPayload<(typeof eventContracts)[typeof IPC_EVENTS.windowRouteChanged]>

/**
 * 窗口创建事件载荷类型。
 */
export type WindowCreatedPayload = InferEventPayload<(typeof eventContracts)[typeof IPC_EVENTS.windowCreated]>

/**
 * ����Ӧ�����������ռ䡣
 */
export interface DesktopAppApi {
  getInfo(): Promise<AppInfo>
}

/**
 * �����ļ����������ռ䡣
 */
export interface DesktopFileApi {
  openDialog(input: FileDialogInput): Promise<FileDialogOutput>
}

/**
 * 崗口控制操作输入（支持 windowId 或 role 二选一）。
 */
export type WindowFocusTarget = number | string

/**
 * 崗口管理操作命名空间。
 */
export interface DesktopWindowApi {
  /* ── 已有方法 ── */
  minimize(windowId?: number): Promise<WindowActionOutput>
  maximize(windowId?: number): Promise<WindowActionOutput>
  close(windowId?: number): Promise<WindowActionOutput>
  onFocusChanged(listener: (payload: WindowFocusChangedPayload) => void): DesktopUnsubscribe

  /* ── 新增窗口控制方法 ── */

  /**
   * 打开或聚焦指定角色的窗口。
   *
   * @param role 窗口角色。
   * @param options 打开选项（不含 role）。
   * @returns 打开窗口响应。
   */
  open(role: string, options?: Omit<WindowOpenInput, 'role'>): Promise<WindowOpenOutput>

  /**
   * 从最小化或最大化状态恢复目标窗口。
   *
   * @param windowId 目标窗口 ID，省略时由主进程从 IPC sender 解析。
   */
  restore(windowId?: number): Promise<WindowActionOutput>

  /**
   * 隐藏目标窗口。
   *
   * @param windowId 目标窗口 ID，省略时由主进程从 IPC sender 解析。
   */
  hide(windowId?: number): Promise<WindowActionOutput>

  /**
   * 显示目标窗口。
   *
   * @param windowId 目标窗口 ID，省略时由主进程从 IPC sender 解析。
   */
  show(windowId?: number): Promise<WindowActionOutput>

  /**
   * 聚焦目标窗口或按角色聚焦。
   *
   * @param target 目标窗口 ID（number）或角色名称（string），省略时聚焦当前窗口。
   */
  focus(target?: WindowFocusTarget): Promise<WindowActionOutput>

  /**
   * 重新加载目标窗口页面。
   *
   * @param windowId 目标窗口 ID，省略时由主进程从 IPC sender 解析。
   */
  reload(windowId?: number): Promise<WindowActionOutput>

  /**
   * 列出全部存活窗口引用。
   *
   * @returns 窗口列表响应。
   */
  list(): Promise<WindowListOutput>

  /**
   * 获取当前调用方窗口信息（windowId 由主进程从 IPC sender 解析）。
   *
   * @returns 当前窗口信息。
   */
  getCurrent(): Promise<WindowCurrentInfo>

  /**
   * 更新目标窗口标题。
   *
   * @param title 新标题。
   * @param windowId 目标窗口 ID，省略时由主进程从 IPC sender 解析。
   */
  setTitle(title: string, windowId?: number): Promise<WindowSetTitleOutput>

  /**
   * 消费当前窗口的初始化数据（一次性）。
   *
   * @returns 初始化数据。
   */
  getInitPayload(): Promise<WindowInitPayload>

  /**
   * 关闭全部窗口。
   *
   * @returns 关闭的窗口数量。
   */
  closeAll(): Promise<WindowCloseCountOutput>

  /**
   * 关闭指定角色的全部窗口。
   *
   * @param role 窗口角色。
   * @returns 关闭的窗口数量。
   */
  closeByRole(role: string): Promise<WindowCloseCountOutput>

  /* ── 新增窗口事件订阅方法 ── */

  /**
   * 订阅窗口状态变化事件（最小化、最大化、恢复等）。
   *
   * @param listener 事件回调。
   * @returns 取消订阅函数。
   */
  onStateChanged(listener: (payload: WindowStatePayload) => void): DesktopUnsubscribe

  /**
   * 订阅窗口路由变化事件。
   *
   * @param listener 事件回调。
   * @returns 取消订阅函数。
   */
  onRouteChanged(listener: (payload: WindowRoutePayload) => void): DesktopUnsubscribe

  /**
   * 订阅窗口创建事件。
   *
   * @param listener 事件回调。
   * @returns 取消订阅函数。
   */
  onCreated(listener: (payload: WindowCreatedPayload) => void): DesktopUnsubscribe
}

/**
 * �����������������ռ䡣
 */
export interface DesktopTaskApi {
  start(input: TaskStartInput): Promise<TaskStartOutput>
  cancel(taskId: string, reason?: string): Promise<TaskCancelOutput>
  onProgress(taskId: string, listener: (payload: TaskProgressPayload) => void): DesktopUnsubscribe
  onCompleted(taskId: string, listener: (payload: TaskCompletedPayload) => void): DesktopUnsubscribe
  onFailed(taskId: string, listener: (payload: TaskFailedPayload) => void): DesktopUnsubscribe
}

/* ───────────────────────── 数据库管理 API 类型 ───────────────────────── */

/**
 * 数据库健康报告类型。
 */
export type DatabaseHealthOutput = InferRequestOutput<(typeof requestContracts)[typeof IPC_CHANNELS.databaseGetHealth]>

/**
 * 数据库统计类型。
 */
export type DatabaseStatsOutput = InferRequestOutput<(typeof requestContracts)[typeof IPC_CHANNELS.databaseGetStats]>

/**
 * 数据库备份响应类型。
 */
export type DatabaseBackupOutput = InferRequestOutput<(typeof requestContracts)[typeof IPC_CHANNELS.databaseBackup]>

/**
 * 数据库恢复请求输入类型。
 */
export type DatabaseRestoreInput = InferRequestInput<(typeof requestContracts)[typeof IPC_CHANNELS.databaseRestore]>

/**
 * 数据库恢复响应类型。
 */
export type DatabaseRestoreOutput = InferRequestOutput<(typeof requestContracts)[typeof IPC_CHANNELS.databaseRestore]>

/**
 * 数据库 VACUUM 响应类型。
 */
export type DatabaseVacuumOutput = InferRequestOutput<(typeof requestContracts)[typeof IPC_CHANNELS.databaseVacuum]>

/**
 * 数据库清理日志响应类型。
 */
export type DatabaseClearLogsOutput = InferRequestOutput<(typeof requestContracts)[typeof IPC_CHANNELS.databaseClearLogs]>

/**
 * 数据库管理操作命名空间。
 */
export interface DesktopDatabaseApi {
  getHealth(): Promise<DatabaseHealthOutput>
  getStats(): Promise<DatabaseStatsOutput>
  backup(): Promise<DatabaseBackupOutput>
  restore(input: DatabaseRestoreInput): Promise<DatabaseRestoreOutput>
  vacuum(): Promise<DatabaseVacuumOutput>
  clearLogs(olderThanDays?: number): Promise<DatabaseClearLogsOutput>
}

/* ───────────────────────── 任务数据 API 类型 ───────────────────────── */

/**
 * 任务数据列表请求输入类型。
 */
export type TaskDataListInput = InferRequestInput<(typeof requestContracts)[typeof IPC_CHANNELS.taskDataList]>

/**
 * 任务数据列表响应类型。
 */
export type TaskDataListOutput = InferRequestOutput<(typeof requestContracts)[typeof IPC_CHANNELS.taskDataList]>

/**
 * 任务数据项类型。
 */
export type TaskDataItem = InferRequestOutput<(typeof requestContracts)[typeof IPC_CHANNELS.taskDataGetById]>

/**
 * 任务数据创建请求输入类型。
 */
export type TaskDataCreateInput = InferRequestInput<(typeof requestContracts)[typeof IPC_CHANNELS.taskDataCreate]>

/**
 * 任务数据更新请求输入类型。
 */
export type TaskDataUpdateInput = InferRequestInput<(typeof requestContracts)[typeof IPC_CHANNELS.taskDataUpdate]>

/**
 * 任务数据删除响应类型。
 */
export type TaskDataDeleteOutput = InferRequestOutput<(typeof requestContracts)[typeof IPC_CHANNELS.taskDataDelete]>

/**
 * 任务数据操作命名空间。
 */
export interface DesktopTaskDataApi {
  list(input?: TaskDataListInput): Promise<TaskDataListOutput>
  getById(id: string): Promise<TaskDataItem>
  create(input: TaskDataCreateInput): Promise<TaskDataItem>
  update(input: TaskDataUpdateInput): Promise<TaskDataItem>
  delete(id: string): Promise<TaskDataDeleteOutput>
}

/* ───────────────────────── 设置 API 类型 ───────────────────────── */

/**
 * 设置获取请求输入类型。
 */
export type SettingGetInput = InferRequestInput<(typeof requestContracts)[typeof IPC_CHANNELS.settingGet]>

/**
 * 设置响应类型。
 */
export type SettingItem = InferRequestOutput<(typeof requestContracts)[typeof IPC_CHANNELS.settingSet]>

/**
 * 设置写入请求输入类型。
 */
export type SettingSetInput = InferRequestInput<(typeof requestContracts)[typeof IPC_CHANNELS.settingSet]>

/**
 * 设置列表请求输入类型。
 */
export type SettingListInput = InferRequestInput<(typeof requestContracts)[typeof IPC_CHANNELS.settingListByNamespace]>

/**
 * 设置列表响应类型。
 */
export type SettingListOutput = InferRequestOutput<(typeof requestContracts)[typeof IPC_CHANNELS.settingListByNamespace]>

/**
 * 设置删除响应类型。
 */
export type SettingDeleteOutput = InferRequestOutput<(typeof requestContracts)[typeof IPC_CHANNELS.settingDelete]>

/**
 * 设置操作命名空间。
 */
export interface DesktopSettingApi {
  get(namespace: string, key: string): Promise<SettingItem | null>
  set(input: SettingSetInput): Promise<SettingItem>
  listByNamespace(namespace: string): Promise<SettingListOutput>
  delete(namespace: string, key: string): Promise<SettingDeleteOutput>
}

/* ───────────────────────── .xuanbing 文件 API 类型 ───────────────────────── */

/**
 * .xuanbing 文件引用类型。
 */
export type XuanbingFileRef = {
  token: string
  displayName: string
  size: number
  expiresAt: number
}

/**
 * .xuanbing 文件对话框请求输入类型。
 */
export type XuanbingFileDialogInput = InferRequestInput<(typeof requestContracts)[typeof IPC_CHANNELS.xuanbingFileOpenDialog]>

/**
 * .xuanbing 文件对话框响应类型。
 */
export type XuanbingFileDialogOutput = InferRequestOutput<(typeof requestContracts)[typeof IPC_CHANNELS.xuanbingFileOpenDialog]>

/**
 * .xuanbing 文件预览响应类型。
 */
export type XuanbingFilePreviewOutput = InferRequestOutput<(typeof requestContracts)[typeof IPC_CHANNELS.xuanbingFileReadPreview]>

/**
 * .xuanbing 文件校验响应类型。
 */
export type XuanbingFileValidateOutput = InferRequestOutput<(typeof requestContracts)[typeof IPC_CHANNELS.xuanbingFileValidate]>

/**
 * .xuanbing 文件导出请求输入类型。
 */
export type XuanbingFileExportInput = InferRequestInput<(typeof requestContracts)[typeof IPC_CHANNELS.xuanbingFileExportPackage]>

/**
 * .xuanbing 文件导出响应类型。
 */
export type XuanbingFileExportOutput = InferRequestOutput<(typeof requestContracts)[typeof IPC_CHANNELS.xuanbingFileExportPackage]>

/**
 * .xuanbing dryRun 导入请求输入类型。
 */
export type XuanbingFileDryRunImportInput = InferRequestInput<(typeof requestContracts)[typeof IPC_CHANNELS.xuanbingFileDryRunImport]>

/**
 * .xuanbing dryRun 导入响应类型。
 */
export type XuanbingFileDryRunImportOutput = InferRequestOutput<(typeof requestContracts)[typeof IPC_CHANNELS.xuanbingFileDryRunImport]>

/**
 * .xuanbing 正式导入请求输入类型。
 */
export type XuanbingFileImportInput = InferRequestInput<(typeof requestContracts)[typeof IPC_CHANNELS.xuanbingFileImportPackage]>

/**
 * .xuanbing 正式导入响应类型。
 */
export type XuanbingFileImportOutput = InferRequestOutput<(typeof requestContracts)[typeof IPC_CHANNELS.xuanbingFileImportPackage]>

/**
 * .xuanbing 文件操作命名空间。
 */
export interface DesktopXuanbingFileApi {
  openDialog(input?: XuanbingFileDialogInput): Promise<XuanbingFileDialogOutput>
  saveDialog(input?: XuanbingFileDialogInput): Promise<XuanbingFileDialogOutput>
  readPreview(fileRef: XuanbingFileRef): Promise<XuanbingFilePreviewOutput>
  validate(fileRef: XuanbingFileRef): Promise<XuanbingFileValidateOutput>
  exportPackage(input: XuanbingFileExportInput): Promise<XuanbingFileExportOutput>
  dryRunImport(input: XuanbingFileDryRunImportInput): Promise<XuanbingFileDryRunImportOutput>
  importPackage(input: XuanbingFileImportInput): Promise<XuanbingFileImportOutput>
}

/**
 * 顶层桌面 API。
 */
export interface DesktopApi {
  readonly app: DesktopAppApi
  readonly file: DesktopFileApi
  readonly window: DesktopWindowApi
  readonly task: DesktopTaskApi
  readonly database: DesktopDatabaseApi
  readonly taskData: DesktopTaskDataApi
  readonly setting: DesktopSettingApi
  readonly xuanbingFile: DesktopXuanbingFileApi
}
