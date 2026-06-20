"use strict";
/**
 * @file 统一 IPC 总线共使用的请求、响应与事件校验模型。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ipcResultSchema = exports.windowFocusChangedEventSchema = exports.taskFailedEventSchema = exports.taskCompletedEventSchema = exports.taskProgressEventSchema = exports.ipcResultMetaSchema = exports.ipcErrorSchema = exports.taskCancelResponseSchema = exports.taskCancelRequestSchema = exports.taskStartResponseSchema = exports.taskStartRequestSchema = exports.windowCreatedEventSchema = exports.windowSetTitleResponseSchema = exports.windowCountResponseSchema = exports.windowCloseByRoleRequestSchema = exports.windowSetTitleIpcRequestSchema = exports.windowActionResponseSchema = exports.windowActionRequestSchema = exports.fileDialogResponseSchema = exports.fileDialogRequestSchema = exports.fileDialogFilterSchema = exports.appInfoResponseSchema = exports.TASK_PROGRESS_PHASES = exports.TASK_START_STATUSES = exports.TASK_KINDS = exports.FILE_DIALOG_PROPERTIES = exports.getCurrentWindowResponseSchema = exports.getInitPayloadResponseSchema = exports.windowRouteChangedEventSchema = exports.windowStateChangedEventSchema = exports.setWindowTitleRequestSchema = exports.windowListResponseSchema = exports.windowRefSchema = exports.windowControlResponseSchema = exports.windowControlRequestSchema = exports.openWindowResponseSchema = exports.openWindowRequestSchema = void 0;
exports.createIpcResultSchema = createIpcResultSchema;
const errors_1 = require("./errors");
const zod_1 = require("./zod");
/* ───────────────────────── 窗口管理 schemas（从 windows/shared 透传） ───────────────────────── */
var window_schemas_1 = require("../../windows/shared/window-schemas");
Object.defineProperty(exports, "openWindowRequestSchema", { enumerable: true, get: function () { return window_schemas_1.openWindowRequestSchema; } });
Object.defineProperty(exports, "openWindowResponseSchema", { enumerable: true, get: function () { return window_schemas_1.openWindowResponseSchema; } });
Object.defineProperty(exports, "windowControlRequestSchema", { enumerable: true, get: function () { return window_schemas_1.windowControlRequestSchema; } });
Object.defineProperty(exports, "windowControlResponseSchema", { enumerable: true, get: function () { return window_schemas_1.windowControlResponseSchema; } });
Object.defineProperty(exports, "windowRefSchema", { enumerable: true, get: function () { return window_schemas_1.windowRefSchema; } });
Object.defineProperty(exports, "windowListResponseSchema", { enumerable: true, get: function () { return window_schemas_1.windowListResponseSchema; } });
Object.defineProperty(exports, "setWindowTitleRequestSchema", { enumerable: true, get: function () { return window_schemas_1.setWindowTitleRequestSchema; } });
Object.defineProperty(exports, "windowStateChangedEventSchema", { enumerable: true, get: function () { return window_schemas_1.windowStateChangedEventSchema; } });
Object.defineProperty(exports, "windowRouteChangedEventSchema", { enumerable: true, get: function () { return window_schemas_1.windowRouteChangedEventSchema; } });
Object.defineProperty(exports, "getInitPayloadResponseSchema", { enumerable: true, get: function () { return window_schemas_1.getInitPayloadResponseSchema; } });
Object.defineProperty(exports, "getCurrentWindowResponseSchema", { enumerable: true, get: function () { return window_schemas_1.getCurrentWindowResponseSchema; } });
const window_types_1 = require("../../windows/shared/window-types");
/* ───────────────────────── 文件对话框 ───────────────────────── */
/**
 * 文件选择对话框支持的属性枚举。
 */
exports.FILE_DIALOG_PROPERTIES = [
    'openFile',
    'openDirectory',
    'multiSelections',
    'showHiddenFiles',
    'createDirectory',
    'promptToCreate'
];
/**
 * 后台任务运行时支持的种类类型。
 */
exports.TASK_KINDS = ['sync', 'import', 'export', 'analysis'];
/**
 * 后台任务启动后返回的状态集合。
 */
exports.TASK_START_STATUSES = ['queued', 'running'];
/**
 * 后台任务进度阶段枚举。
 */
exports.TASK_PROGRESS_PHASES = ['queued', 'running', 'completed', 'failed', 'canceled'];
/**
 * 定义应用信息响应模型。
 */
exports.appInfoResponseSchema = zod_1.z.object({
    appName: zod_1.z.string({ minLength: 1 }),
    appVersion: zod_1.z.string({ minLength: 1 }),
    electronVersion: zod_1.z.string({ minLength: 1 }),
    chromeVersion: zod_1.z.string({ minLength: 1 }),
    platform: zod_1.z.string({ minLength: 1 }),
    isPackaged: zod_1.z.boolean()
});
/**
 * 定义文件选择过滤器模型。
 */
exports.fileDialogFilterSchema = zod_1.z.object({
    name: zod_1.z.string({ minLength: 1 }),
    extensions: zod_1.z.array(zod_1.z.string({ minLength: 1 }), { minLength: 1 })
});
/**
 * 定义文件选择对话框请求模型。
 */
exports.fileDialogRequestSchema = zod_1.z.object({
    title: zod_1.z.string({ minLength: 1 }).optional(),
    defaultPath: zod_1.z.string({ minLength: 1 }).optional(),
    buttonLabel: zod_1.z.string({ minLength: 1 }).optional(),
    properties: zod_1.z.array(zod_1.z.enum(exports.FILE_DIALOG_PROPERTIES), { minLength: 1 }).optional(),
    filters: zod_1.z.array(exports.fileDialogFilterSchema, { minLength: 1 }).optional()
});
/**
 * 定义文件选择对话框响应模型。
 */
exports.fileDialogResponseSchema = zod_1.z.object({
    canceled: zod_1.z.boolean(),
    filePaths: zod_1.z.array(zod_1.z.string({ minLength: 1 }))
});
/**
 * 定义窗口控制请求模型。
 */
exports.windowActionRequestSchema = zod_1.z.object({
    windowId: zod_1.z.number({ integer: true, min: 1 }).optional()
});
/**
 * 定义窗口控制响应模型。
 */
exports.windowActionResponseSchema = zod_1.z.object({
    windowId: zod_1.z.number({ integer: true, min: 1 }),
    state: zod_1.z.enum(['minimized', 'maximized', 'closed', 'normal'])
});
/* ───────────────────────── 窗口管理补充 schemas ───────────────────────── */
/**
 * 设置窗口标题 IPC 请求模型（在 shared 基础上增加可选 windowId）。
 */
exports.windowSetTitleIpcRequestSchema = zod_1.z.object({
    title: zod_1.z.string({ minLength: 1, maxLength: 256 }),
    windowId: zod_1.z.number({ integer: true, min: 1 }).optional()
});
/**
 * 按角色关闭窗口请求模型。
 */
exports.windowCloseByRoleRequestSchema = zod_1.z.object({
    role: zod_1.z.enum(window_types_1.WINDOW_ROLES)
});
/**
 * 窗口计数响应模型（用于 closeAll / closeByRole 等批量操作）。
 */
exports.windowCountResponseSchema = zod_1.z.object({
    count: zod_1.z.number({ integer: true, min: 0 })
});
/**
 * 设置窗口标题响应模型。
 */
exports.windowSetTitleResponseSchema = zod_1.z.object({
    windowId: zod_1.z.number({ integer: true, min: 1 }),
    title: zod_1.z.string()
});
/**
 * 窗口创建事件模型。
 */
exports.windowCreatedEventSchema = zod_1.z.object({
    windowId: zod_1.z.number({ integer: true, min: 1 }),
    role: zod_1.z.enum(window_types_1.WINDOW_ROLES),
    instanceKey: zod_1.z.string({ minLength: 1 }),
    route: zod_1.z.string({ minLength: 1 }),
    timestamp: zod_1.z.number({ min: 0 })
});
/* ───────────────────────── 后台任务 ───────────────────────── */
/**
 * 定义后台任务启动请求模型。
 */
exports.taskStartRequestSchema = zod_1.z.object({
    taskId: zod_1.z.string({ minLength: 1, maxLength: 128 }),
    kind: zod_1.z.enum(exports.TASK_KINDS),
    payload: zod_1.z.unknown().optional(),
    abortable: zod_1.z.boolean().optional()
});
/**
 * 定义后台任务启动响应模型。
 */
exports.taskStartResponseSchema = zod_1.z.object({
    taskId: zod_1.z.string({ minLength: 1, maxLength: 128 }),
    accepted: zod_1.z.boolean(),
    status: zod_1.z.enum(exports.TASK_START_STATUSES)
});
/**
 * 定义后台任务取消请求模型。
 */
exports.taskCancelRequestSchema = zod_1.z.object({
    taskId: zod_1.z.string({ minLength: 1, maxLength: 128 }),
    reason: zod_1.z.string({ minLength: 1, maxLength: 256 }).optional()
});
/**
 * 定义后台任务取消响应模型。
 */
exports.taskCancelResponseSchema = zod_1.z.object({
    taskId: zod_1.z.string({ minLength: 1, maxLength: 128 }),
    cancelled: zod_1.z.boolean()
});
/**
 * 定义统一错误模型。
 */
exports.ipcErrorSchema = zod_1.z.object({
    code: zod_1.z.enum(Object.values(errors_1.IPC_ERROR_CODES)),
    message: zod_1.z.string({ minLength: 1 }),
    detail: zod_1.z.unknown().optional(),
    cause: zod_1.z.string({ minLength: 1 }).optional(),
    retryable: zod_1.z.boolean().optional()
});
/**
 * 定义统一结果元信息模型。
 */
exports.ipcResultMetaSchema = zod_1.z.object({
    requestId: zod_1.z.string({ minLength: 1 }),
    durationMs: zod_1.z.number({ min: 0 })
});
/**
 * 定义后台任务进度事件模型。
 */
exports.taskProgressEventSchema = zod_1.z.object({
    taskId: zod_1.z.string({ minLength: 1, maxLength: 128 }),
    phase: zod_1.z.enum(exports.TASK_PROGRESS_PHASES),
    percent: zod_1.z.number({ min: 0, max: 100 }),
    completedUnits: zod_1.z.number({ min: 0 }).optional(),
    totalUnits: zod_1.z.number({ min: 0 }).optional(),
    message: zod_1.z.string({ minLength: 1, maxLength: 512 }).optional()
});
/**
 * 定义后台任务完成事件模型。
 */
exports.taskCompletedEventSchema = zod_1.z.object({
    taskId: zod_1.z.string({ minLength: 1, maxLength: 128 }),
    result: zod_1.z.unknown().optional(),
    completedAt: zod_1.z.string({ minLength: 1 }).optional()
});
/**
 * 定义后台任务失败事件模型。
 */
exports.taskFailedEventSchema = zod_1.z.object({
    taskId: zod_1.z.string({ minLength: 1, maxLength: 128 }),
    error: exports.ipcErrorSchema,
    failedAt: zod_1.z.string({ minLength: 1 }).optional()
});
/**
 * 定义窗口焦点变化事件模型。
 */
exports.windowFocusChangedEventSchema = zod_1.z.object({
    windowId: zod_1.z.number({ integer: true, min: 1 }),
    focused: zod_1.z.boolean()
});
/**
 * 为成功数据模型创建统一的包装模型。
 *
 * @param dataSchema 成功数据的校验模型。
 * @returns 统一的包装校验模型。
 */
function createIpcResultSchema(dataSchema) {
    return zod_1.z.union([
        zod_1.z.object({
            ok: zod_1.z.literal(true),
            data: dataSchema,
            meta: exports.ipcResultMetaSchema.optional()
        }),
        zod_1.z.object({
            ok: zod_1.z.literal(false),
            error: exports.ipcErrorSchema,
            meta: exports.ipcResultMetaSchema.optional()
        })
    ]);
}
/**
 * 定义通用 IPC 结果模型。
 */
exports.ipcResultSchema = createIpcResultSchema(zod_1.z.unknown());
