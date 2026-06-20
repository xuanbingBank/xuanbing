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

/**
 * ���嶥������ API��
 */
export interface DesktopApi {
  readonly app: DesktopAppApi
  readonly file: DesktopFileApi
  readonly window: DesktopWindowApi
  readonly task: DesktopTaskApi
}
