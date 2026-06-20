"use strict";
/**
 * @file 基于共享契约在 preload 暴露给 renderer 的业务 API。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDesktopApi = createDesktopApi;
const shared_1 = require("../shared");
/**
 * 构造窗口操作输入。
 *
 * @param windowId 可选窗口标识。
 * @returns 窗口操作输入对象。
 */
function createWindowActionInput(windowId) {
    return windowId === undefined ? {} : { windowId };
}
/**
 * 构造窗口聚焦操作输入，支持 windowId（number）或 role（string）。
 *
 * @param target 目标窗口 ID 或角色名称。
 * @returns 窗口聚焦操作输入对象。
 */
function createWindowFocusInput(target) {
    if (target === undefined) {
        return {};
    }
    if (typeof target === 'number') {
        return { windowId: target };
    }
    return { role: target };
}
/**
 * 构造设置窗口标题输入。
 *
 * @param title 窗口标题。
 * @param windowId 可选窗口标识。
 * @returns 设置标题输入对象。
 */
function createWindowTitleInput(title, windowId) {
    return windowId === undefined ? { title } : { title, windowId };
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
function subscribeTaskEvent(client, eventChannel, payloadSchema, taskId, listener) {
    return client.subscribe(eventChannel, payloadSchema, (payload) => {
        if (payload.taskId === taskId) {
            listener(payload);
        }
    });
}
/**
 * 构造应用信息操作命名空间。
 *
 * @param client preload 客户端。
 * @returns 应用信息操作命名空间。
 */
function createAppApi(client) {
    return Object.freeze({
        getInfo: () => client.safeInvoke(shared_1.IPC_CHANNELS.appInfoGet, shared_1.requestContracts[shared_1.IPC_CHANNELS.appInfoGet].outputSchema, {})
    });
}
/**
 * 构造文件操作命名空间。
 *
 * @param client preload 客户端。
 * @returns 文件操作命名空间。
 */
function createFileApi(client) {
    return Object.freeze({
        openDialog: (input) => client.safeInvoke(shared_1.IPC_CHANNELS.fileDialogOpen, shared_1.requestContracts[shared_1.IPC_CHANNELS.fileDialogOpen].outputSchema, input)
    });
}
/**
 * 构造窗口操作命名空间。
 *
 * @param client preload 客户端。
 * @returns 窗口操作命名空间。
 */
function createWindowApi(client) {
    return Object.freeze({
        /* ── 已有方法 ── */
        minimize: (windowId) => client.safeInvoke(shared_1.IPC_CHANNELS.windowMinimize, shared_1.requestContracts[shared_1.IPC_CHANNELS.windowMinimize].outputSchema, createWindowActionInput(windowId)),
        maximize: (windowId) => client.safeInvoke(shared_1.IPC_CHANNELS.windowMaximize, shared_1.requestContracts[shared_1.IPC_CHANNELS.windowMaximize].outputSchema, createWindowActionInput(windowId)),
        close: (windowId) => client.safeInvoke(shared_1.IPC_CHANNELS.windowClose, shared_1.requestContracts[shared_1.IPC_CHANNELS.windowClose].outputSchema, createWindowActionInput(windowId)),
        onFocusChanged: (listener) => client.subscribe(shared_1.IPC_EVENTS.windowFocusChanged, shared_1.eventContracts[shared_1.IPC_EVENTS.windowFocusChanged].payloadSchema, listener),
        /* ── 新增窗口控制方法 ── */
        open: (role, options) => client.safeInvoke(shared_1.IPC_CHANNELS.windowOpen, shared_1.requestContracts[shared_1.IPC_CHANNELS.windowOpen].outputSchema, { role, ...options }),
        restore: (windowId) => client.safeInvoke(shared_1.IPC_CHANNELS.windowRestore, shared_1.requestContracts[shared_1.IPC_CHANNELS.windowRestore].outputSchema, createWindowActionInput(windowId)),
        hide: (windowId) => client.safeInvoke(shared_1.IPC_CHANNELS.windowHide, shared_1.requestContracts[shared_1.IPC_CHANNELS.windowHide].outputSchema, createWindowActionInput(windowId)),
        show: (windowId) => client.safeInvoke(shared_1.IPC_CHANNELS.windowShow, shared_1.requestContracts[shared_1.IPC_CHANNELS.windowShow].outputSchema, createWindowActionInput(windowId)),
        focus: (target) => client.safeInvoke(shared_1.IPC_CHANNELS.windowFocus, shared_1.requestContracts[shared_1.IPC_CHANNELS.windowFocus].outputSchema, createWindowFocusInput(target)),
        reload: (windowId) => client.safeInvoke(shared_1.IPC_CHANNELS.windowReload, shared_1.requestContracts[shared_1.IPC_CHANNELS.windowReload].outputSchema, createWindowActionInput(windowId)),
        list: () => client.safeInvoke(shared_1.IPC_CHANNELS.windowList, shared_1.requestContracts[shared_1.IPC_CHANNELS.windowList].outputSchema, {}),
        getCurrent: () => client.safeInvoke(shared_1.IPC_CHANNELS.windowGetCurrent, shared_1.requestContracts[shared_1.IPC_CHANNELS.windowGetCurrent].outputSchema, {}),
        setTitle: (title, windowId) => client.safeInvoke(shared_1.IPC_CHANNELS.windowSetTitle, shared_1.requestContracts[shared_1.IPC_CHANNELS.windowSetTitle].outputSchema, createWindowTitleInput(title, windowId)),
        getInitPayload: () => client.safeInvoke(shared_1.IPC_CHANNELS.windowGetInitPayload, shared_1.requestContracts[shared_1.IPC_CHANNELS.windowGetInitPayload].outputSchema, {}),
        closeAll: () => client.safeInvoke(shared_1.IPC_CHANNELS.windowCloseAll, shared_1.requestContracts[shared_1.IPC_CHANNELS.windowCloseAll].outputSchema, {}),
        closeByRole: (role) => client.safeInvoke(shared_1.IPC_CHANNELS.windowCloseByRole, shared_1.requestContracts[shared_1.IPC_CHANNELS.windowCloseByRole].outputSchema, { role }),
        /* ── 新增窗口事件订阅方法 ── */
        onStateChanged: (listener) => client.subscribe(shared_1.IPC_EVENTS.windowStateChanged, shared_1.eventContracts[shared_1.IPC_EVENTS.windowStateChanged].payloadSchema, listener),
        onRouteChanged: (listener) => client.subscribe(shared_1.IPC_EVENTS.windowRouteChanged, shared_1.eventContracts[shared_1.IPC_EVENTS.windowRouteChanged].payloadSchema, listener),
        onCreated: (listener) => client.subscribe(shared_1.IPC_EVENTS.windowCreated, shared_1.eventContracts[shared_1.IPC_EVENTS.windowCreated].payloadSchema, listener)
    });
}
/**
 * 构造后台任务操作命名空间。
 *
 * @param client preload 客户端。
 * @returns 后台任务操作命名空间。
 */
function createTaskApi(client) {
    return Object.freeze({
        start: (input) => client.safeInvoke(shared_1.IPC_CHANNELS.taskStart, shared_1.requestContracts[shared_1.IPC_CHANNELS.taskStart].outputSchema, input),
        cancel: (taskId, reason) => client.safeInvoke(shared_1.IPC_CHANNELS.taskCancel, shared_1.requestContracts[shared_1.IPC_CHANNELS.taskCancel].outputSchema, reason ? { taskId, reason } : { taskId }),
        onProgress: (taskId, listener) => subscribeTaskEvent(client, shared_1.IPC_EVENTS.taskProgress, shared_1.eventContracts[shared_1.IPC_EVENTS.taskProgress].payloadSchema, taskId, listener),
        onCompleted: (taskId, listener) => subscribeTaskEvent(client, shared_1.IPC_EVENTS.taskCompleted, shared_1.eventContracts[shared_1.IPC_EVENTS.taskCompleted].payloadSchema, taskId, listener),
        onFailed: (taskId, listener) => subscribeTaskEvent(client, shared_1.IPC_EVENTS.taskFailed, shared_1.eventContracts[shared_1.IPC_EVENTS.taskFailed].payloadSchema, taskId, listener)
    });
}
/**
 * 构造顶层桌面 API。
 *
 * @param client preload 客户端。
 * @returns 顶层桌面 API。
 */
function createDesktopApi(client) {
    return Object.freeze({
        app: createAppApi(client),
        file: createFileApi(client),
        window: createWindowApi(client),
        task: createTaskApi(client)
    });
}
