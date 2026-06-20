"use strict";
/**
 * @file 汇总 IPC 总线的全部请求契约与事件契约映射。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IPC_EVENTS = exports.IPC_CHANNELS = exports.eventContracts = exports.requestContracts = void 0;
exports.defineRequestContract = defineRequestContract;
exports.defineEventContract = defineEventContract;
exports.createEmptyObjectSchema = createEmptyObjectSchema;
const constants_1 = require("./constants");
Object.defineProperty(exports, "IPC_CHANNELS", { enumerable: true, get: function () { return constants_1.IPC_CHANNELS; } });
Object.defineProperty(exports, "IPC_EVENTS", { enumerable: true, get: function () { return constants_1.IPC_EVENTS; } });
const schemas_1 = require("./schemas");
const zod_1 = require("./zod");
/**
 * 带上默认超时与负载限制的请求契约工厂。
 *
 * @param definition 原始请求契约定义。
 * @returns 带上默认值的请求契约。
 */
function defineRequestContract(definition) {
    return {
        ...definition,
        timeoutMs: definition.timeoutMs ?? constants_1.DEFAULT_IPC_TIMEOUT_MS,
        maxPayloadBytes: definition.maxPayloadBytes ?? constants_1.DEFAULT_IPC_MAX_PAYLOAD_BYTES
    };
}
/**
 * 定义事件契约。
 *
 * @param definition 原始事件契约定义。
 * @returns 带上默认值的事件契约。
 */
function defineEventContract(definition) {
    return definition;
}
/**
 * 定义空对象模型，用于无参数的请求输入。
 *
 * @returns 空对象的校验模型。
 */
function createEmptyObjectSchema() {
    return zod_1.z.object({});
}
/**
 * 全部集合的请求契约映射。
 */
exports.requestContracts = {
    [constants_1.IPC_CHANNELS.appInfoGet]: defineRequestContract({
        channel: constants_1.IPC_CHANNELS.appInfoGet,
        description: '获取应用静态信息。',
        permission: constants_1.IPC_PERMISSIONS.public,
        inputSchema: createEmptyObjectSchema(),
        outputSchema: schemas_1.appInfoResponseSchema,
        timeoutMs: constants_1.DEFAULT_IPC_TIMEOUT_MS,
        maxPayloadBytes: constants_1.DEFAULT_IPC_MAX_PAYLOAD_BYTES
    }),
    [constants_1.IPC_CHANNELS.fileDialogOpen]: defineRequestContract({
        channel: constants_1.IPC_CHANNELS.fileDialogOpen,
        description: '通过主进程安全打开本地文件选择对话框。',
        permission: constants_1.IPC_PERMISSIONS.fileRead,
        inputSchema: schemas_1.fileDialogRequestSchema,
        outputSchema: schemas_1.fileDialogResponseSchema,
        timeoutMs: constants_1.DEFAULT_IPC_TIMEOUT_MS,
        maxPayloadBytes: 32 * 1024,
        audit: true,
        rateLimit: {
            maxCalls: 5,
            windowMs: 60000
        }
    }),
    /* ───────────────────────── 窗口管理 ───────────────────────── */
    [constants_1.IPC_CHANNELS.windowOpen]: defineRequestContract({
        channel: constants_1.IPC_CHANNELS.windowOpen,
        description: '打开或聚焦指定角色的窗口。',
        permission: constants_1.IPC_PERMISSIONS.windowOpen,
        inputSchema: schemas_1.openWindowRequestSchema,
        outputSchema: schemas_1.openWindowResponseSchema,
        timeoutMs: constants_1.DEFAULT_IPC_TIMEOUT_MS,
        maxPayloadBytes: 256 * 1024,
        audit: true
    }),
    [constants_1.IPC_CHANNELS.windowMinimize]: defineRequestContract({
        channel: constants_1.IPC_CHANNELS.windowMinimize,
        description: '最小化目标窗口。',
        permission: constants_1.IPC_PERMISSIONS.windowControlSelf,
        inputSchema: schemas_1.windowControlRequestSchema,
        outputSchema: schemas_1.windowControlResponseSchema,
        timeoutMs: constants_1.DEFAULT_IPC_TIMEOUT_MS,
        maxPayloadBytes: constants_1.DEFAULT_IPC_MAX_PAYLOAD_BYTES
    }),
    [constants_1.IPC_CHANNELS.windowMaximize]: defineRequestContract({
        channel: constants_1.IPC_CHANNELS.windowMaximize,
        description: '最大化或还原目标窗口。',
        permission: constants_1.IPC_PERMISSIONS.windowControlSelf,
        inputSchema: schemas_1.windowControlRequestSchema,
        outputSchema: schemas_1.windowControlResponseSchema,
        timeoutMs: constants_1.DEFAULT_IPC_TIMEOUT_MS,
        maxPayloadBytes: constants_1.DEFAULT_IPC_MAX_PAYLOAD_BYTES
    }),
    [constants_1.IPC_CHANNELS.windowClose]: defineRequestContract({
        channel: constants_1.IPC_CHANNELS.windowClose,
        description: '关闭目标窗口（遵循角色 closeBehavior）。',
        permission: constants_1.IPC_PERMISSIONS.windowCloseSelf,
        inputSchema: schemas_1.windowControlRequestSchema,
        outputSchema: schemas_1.windowControlResponseSchema,
        timeoutMs: constants_1.DEFAULT_IPC_TIMEOUT_MS,
        maxPayloadBytes: constants_1.DEFAULT_IPC_MAX_PAYLOAD_BYTES,
        audit: true
    }),
    [constants_1.IPC_CHANNELS.windowRestore]: defineRequestContract({
        channel: constants_1.IPC_CHANNELS.windowRestore,
        description: '从最小化或最大化状态恢复目标窗口。',
        permission: constants_1.IPC_PERMISSIONS.windowControlSelf,
        inputSchema: schemas_1.windowControlRequestSchema,
        outputSchema: schemas_1.windowControlResponseSchema,
        timeoutMs: constants_1.DEFAULT_IPC_TIMEOUT_MS,
        maxPayloadBytes: constants_1.DEFAULT_IPC_MAX_PAYLOAD_BYTES
    }),
    [constants_1.IPC_CHANNELS.windowHide]: defineRequestContract({
        channel: constants_1.IPC_CHANNELS.windowHide,
        description: '隐藏目标窗口。',
        permission: constants_1.IPC_PERMISSIONS.windowControlSelf,
        inputSchema: schemas_1.windowControlRequestSchema,
        outputSchema: schemas_1.windowControlResponseSchema,
        timeoutMs: constants_1.DEFAULT_IPC_TIMEOUT_MS,
        maxPayloadBytes: constants_1.DEFAULT_IPC_MAX_PAYLOAD_BYTES
    }),
    [constants_1.IPC_CHANNELS.windowShow]: defineRequestContract({
        channel: constants_1.IPC_CHANNELS.windowShow,
        description: '显示目标窗口。',
        permission: constants_1.IPC_PERMISSIONS.windowControlSelf,
        inputSchema: schemas_1.windowControlRequestSchema,
        outputSchema: schemas_1.windowControlResponseSchema,
        timeoutMs: constants_1.DEFAULT_IPC_TIMEOUT_MS,
        maxPayloadBytes: constants_1.DEFAULT_IPC_MAX_PAYLOAD_BYTES
    }),
    [constants_1.IPC_CHANNELS.windowFocus]: defineRequestContract({
        channel: constants_1.IPC_CHANNELS.windowFocus,
        description: '聚焦目标窗口或按角色聚焦。',
        permission: constants_1.IPC_PERMISSIONS.windowFocus,
        inputSchema: schemas_1.windowControlRequestSchema,
        outputSchema: schemas_1.windowControlResponseSchema,
        timeoutMs: constants_1.DEFAULT_IPC_TIMEOUT_MS,
        maxPayloadBytes: constants_1.DEFAULT_IPC_MAX_PAYLOAD_BYTES
    }),
    [constants_1.IPC_CHANNELS.windowReload]: defineRequestContract({
        channel: constants_1.IPC_CHANNELS.windowReload,
        description: '重新加载目标窗口页面。',
        permission: constants_1.IPC_PERMISSIONS.windowControlSelf,
        inputSchema: schemas_1.windowControlRequestSchema,
        outputSchema: schemas_1.windowControlResponseSchema,
        timeoutMs: constants_1.DEFAULT_IPC_TIMEOUT_MS,
        maxPayloadBytes: constants_1.DEFAULT_IPC_MAX_PAYLOAD_BYTES
    }),
    [constants_1.IPC_CHANNELS.windowList]: defineRequestContract({
        channel: constants_1.IPC_CHANNELS.windowList,
        description: '列出全部存活窗口引用。',
        permission: constants_1.IPC_PERMISSIONS.windowList,
        inputSchema: createEmptyObjectSchema(),
        outputSchema: schemas_1.windowListResponseSchema,
        timeoutMs: constants_1.DEFAULT_IPC_TIMEOUT_MS,
        maxPayloadBytes: constants_1.DEFAULT_IPC_MAX_PAYLOAD_BYTES
    }),
    [constants_1.IPC_CHANNELS.windowGetCurrent]: defineRequestContract({
        channel: constants_1.IPC_CHANNELS.windowGetCurrent,
        description: '获取当前调用方窗口信息（windowId 由主进程从 IPC sender 解析）。',
        permission: constants_1.IPC_PERMISSIONS.public,
        inputSchema: createEmptyObjectSchema(),
        outputSchema: schemas_1.getCurrentWindowResponseSchema,
        timeoutMs: constants_1.DEFAULT_IPC_TIMEOUT_MS,
        maxPayloadBytes: constants_1.DEFAULT_IPC_MAX_PAYLOAD_BYTES
    }),
    [constants_1.IPC_CHANNELS.windowSetTitle]: defineRequestContract({
        channel: constants_1.IPC_CHANNELS.windowSetTitle,
        description: '更新目标窗口标题。',
        permission: constants_1.IPC_PERMISSIONS.windowControlSelf,
        inputSchema: schemas_1.windowSetTitleIpcRequestSchema,
        outputSchema: schemas_1.windowSetTitleResponseSchema,
        timeoutMs: constants_1.DEFAULT_IPC_TIMEOUT_MS,
        maxPayloadBytes: constants_1.DEFAULT_IPC_MAX_PAYLOAD_BYTES
    }),
    [constants_1.IPC_CHANNELS.windowGetInitPayload]: defineRequestContract({
        channel: constants_1.IPC_CHANNELS.windowGetInitPayload,
        description: '消费当前窗口的初始化数据（一次性）。',
        permission: constants_1.IPC_PERMISSIONS.public,
        inputSchema: createEmptyObjectSchema(),
        outputSchema: schemas_1.getInitPayloadResponseSchema,
        timeoutMs: constants_1.DEFAULT_IPC_TIMEOUT_MS,
        maxPayloadBytes: 256 * 1024
    }),
    [constants_1.IPC_CHANNELS.windowCloseAll]: defineRequestContract({
        channel: constants_1.IPC_CHANNELS.windowCloseAll,
        description: '关闭全部窗口。',
        permission: constants_1.IPC_PERMISSIONS.windowControlAny,
        inputSchema: createEmptyObjectSchema(),
        outputSchema: schemas_1.windowCountResponseSchema,
        timeoutMs: constants_1.DEFAULT_IPC_TIMEOUT_MS,
        maxPayloadBytes: constants_1.DEFAULT_IPC_MAX_PAYLOAD_BYTES,
        audit: true
    }),
    [constants_1.IPC_CHANNELS.windowCloseByRole]: defineRequestContract({
        channel: constants_1.IPC_CHANNELS.windowCloseByRole,
        description: '关闭指定角色的全部窗口。',
        permission: constants_1.IPC_PERMISSIONS.windowCloseAny,
        inputSchema: schemas_1.windowCloseByRoleRequestSchema,
        outputSchema: schemas_1.windowCountResponseSchema,
        timeoutMs: constants_1.DEFAULT_IPC_TIMEOUT_MS,
        maxPayloadBytes: constants_1.DEFAULT_IPC_MAX_PAYLOAD_BYTES,
        audit: true
    }),
    /* ───────────────────────── 后台任务 ───────────────────────── */
    [constants_1.IPC_CHANNELS.taskStart]: defineRequestContract({
        channel: constants_1.IPC_CHANNELS.taskStart,
        description: '启动一个可跟踪、可取消的长任务。',
        permission: constants_1.IPC_PERMISSIONS.taskRun,
        inputSchema: schemas_1.taskStartRequestSchema,
        outputSchema: schemas_1.taskStartResponseSchema,
        timeoutMs: 30000,
        maxPayloadBytes: 128 * 1024,
        audit: true,
        rateLimit: {
            maxCalls: 10,
            windowMs: 60000
        }
    }),
    [constants_1.IPC_CHANNELS.taskCancel]: defineRequestContract({
        channel: constants_1.IPC_CHANNELS.taskCancel,
        description: '取消正在运行的任务。',
        permission: constants_1.IPC_PERMISSIONS.taskCancel,
        inputSchema: schemas_1.taskCancelRequestSchema,
        outputSchema: schemas_1.taskCancelResponseSchema,
        timeoutMs: constants_1.DEFAULT_IPC_TIMEOUT_MS,
        maxPayloadBytes: constants_1.DEFAULT_IPC_MAX_PAYLOAD_BYTES,
        audit: true
    })
};
/**
 * 全部集合的事件契约映射。
 */
exports.eventContracts = {
    [constants_1.IPC_EVENTS.taskProgress]: defineEventContract({
        event: constants_1.IPC_EVENTS.taskProgress,
        description: '向渲染进程推送任务进度。',
        direction: 'main-to-renderer',
        permission: constants_1.IPC_PERMISSIONS.taskRun,
        payloadSchema: schemas_1.taskProgressEventSchema,
        audit: false
    }),
    [constants_1.IPC_EVENTS.taskCompleted]: defineEventContract({
        event: constants_1.IPC_EVENTS.taskCompleted,
        description: '向渲染进程推送任务完成事件。',
        direction: 'main-to-renderer',
        permission: constants_1.IPC_PERMISSIONS.taskRun,
        payloadSchema: schemas_1.taskCompletedEventSchema,
        audit: false
    }),
    [constants_1.IPC_EVENTS.taskFailed]: defineEventContract({
        event: constants_1.IPC_EVENTS.taskFailed,
        description: '向渲染进程推送任务失败事件。',
        direction: 'main-to-renderer',
        permission: constants_1.IPC_PERMISSIONS.taskRun,
        payloadSchema: schemas_1.taskFailedEventSchema,
        audit: true
    }),
    [constants_1.IPC_EVENTS.windowFocusChanged]: defineEventContract({
        event: constants_1.IPC_EVENTS.windowFocusChanged,
        description: '向渲染进程推送窗口焦点变化。',
        direction: 'main-to-renderer',
        permission: constants_1.IPC_PERMISSIONS.windowControl,
        payloadSchema: schemas_1.windowFocusChangedEventSchema,
        audit: false
    }),
    [constants_1.IPC_EVENTS.windowStateChanged]: defineEventContract({
        event: constants_1.IPC_EVENTS.windowStateChanged,
        description: '向渲染进程推送窗口状态变化（最小化、最大化、恢复等）。',
        direction: 'main-to-renderer',
        permission: constants_1.IPC_PERMISSIONS.windowControl,
        payloadSchema: schemas_1.windowStateChangedEventSchema,
        audit: false
    }),
    [constants_1.IPC_EVENTS.windowRouteChanged]: defineEventContract({
        event: constants_1.IPC_EVENTS.windowRouteChanged,
        description: '向渲染进程推送窗口路由变化。',
        direction: 'main-to-renderer',
        permission: constants_1.IPC_PERMISSIONS.windowControl,
        payloadSchema: schemas_1.windowRouteChangedEventSchema,
        audit: false
    }),
    [constants_1.IPC_EVENTS.windowCreated]: defineEventContract({
        event: constants_1.IPC_EVENTS.windowCreated,
        description: '向渲染进程推送窗口创建事件。',
        direction: 'main-to-renderer',
        permission: constants_1.IPC_PERMISSIONS.windowControl,
        payloadSchema: schemas_1.windowCreatedEventSchema,
        audit: false
    })
};
