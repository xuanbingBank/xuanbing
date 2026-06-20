/**
 * @file preload bundle，由 scripts/build-renderer-bundle.js 自动生成。
 */
;(function () {
  var __preloadModules = {
"electron/preload.js": [function(require, module, exports) {
"use strict";
/**
 * @file ���� preload �ŽӲ���¶���� API��
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.exposeDesktopApi = void 0;
const expose_api_1 = require("./ipcBus/preload/expose-api");
Object.defineProperty(exports, "exposeDesktopApi", { enumerable: true, get: function () { return expose_api_1.exposeDesktopApi; } });
(0, expose_api_1.exposeDesktopApi)();

}, {"./ipcBus/preload/expose-api":"electron/ipcBus/preload/expose-api.js"}],
"electron/ipcBus/preload/expose-api.js": [function(require, module, exports) {
"use strict";
/**
 * @file ͨ�� contextBridge ��ҵ������ API ��¶����Ⱦ���̡�
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getElectronModule = getElectronModule;
exports.getWindowTarget = getWindowTarget;
exports.exposeDesktopApi = exposeDesktopApi;
const client_1 = require("./client");
const desktop_api_1 = require("./desktop-api");
/**
 * ��ȡ Electron ����ʱģ�顣
 *
 * @returns Electron ģ����������
 */
function getElectronModule() {
    return require('electron');
}
/**
 * ��ȡ preload �ɼ��Ĵ��ڶ���
 *
 * @returns ���ڶ���
 */
function getWindowTarget() {
    if (typeof window === 'undefined') {
        return undefined;
    }
    return window;
}
/**
 * ��¶ҵ������ API �� `window.desktop`��
 *
 * @param options ��ѡ����������ʱ��д�
 * @returns ��¶�������� API��
 */
function exposeDesktopApi(options = {}) {
    const electronModule = options.bridge || options.client ? undefined : getElectronModule();
    const bridge = options.bridge ?? electronModule?.contextBridge ?? getElectronModule().contextBridge;
    const client = options.client ?? (0, client_1.createPreloadClient)({
        ipcRenderer: electronModule?.ipcRenderer ?? getElectronModule().ipcRenderer,
        windowTarget: options.windowTarget ?? getWindowTarget()
    });
    const desktopApi = (0, desktop_api_1.createDesktopApi)(client);
    bridge.exposeInMainWorld('desktop', desktopApi);
    return desktopApi;
}

}, {"./client":"electron/ipcBus/preload/client.js","./desktop-api":"electron/ipcBus/preload/desktop-api.js"}],
"electron/ipcBus/preload/client.js": [function(require, module, exports) {
"use strict";
/**
 * @file ʵ�� preload �ڲ�ʹ�õİ�ȫ IPC �ͻ��ˣ�����ͳһ��������У���¼����������ġ�
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSafeParseSchema = isSafeParseSchema;
exports.parseWithSchema = parseWithSchema;
exports.unwrapIpcResult = unwrapIpcResult;
exports.createPreloadClient = createPreloadClient;
const shared_1 = require("../shared");
/**
 * �ж�ģ���Ƿ�֧�� `safeParse`��
 *
 * @param schema �����ģ�͡�
 * @returns �Ƿ�֧�� `safeParse`��
 */
function isSafeParseSchema(schema) {
    return 'safeParse' in schema;
}
/**
 * ʹ��ģ�ͽ�������ֵ��
 *
 * @param schema ģ�͡�
 * @param value ԭʼֵ��
 * @returns У����ֵ��
 */
function parseWithSchema(schema, value) {
    if (isSafeParseSchema(schema)) {
        const result = schema.safeParse(value);
        if (!result.success) {
            throw result.error;
        }
        return result.data;
    }
    return schema.parse(value);
}
/**
 * ͳһ��������̷��ص� Result �ṹ��
 *
 * @param value �����̷���ֵ��
 * @returns �����ĳɹ����ݡ�
 */
function unwrapIpcResult(value) {
    const parsedResult = parseWithSchema(shared_1.ipcResultSchema, value);
    if (!parsedResult.ok) {
        throw parsedResult.error;
    }
    return parsedResult.data;
}
/**
 * ���� preload IPC �ͻ��ˡ�
 *
 * @param dependencies ����ʱ������
 * @returns preload �ͻ���ʵ����
 */
function createPreloadClient(dependencies) {
    const subscriptions = new Set();
    let disposed = false;
    /**
     * �ͷ����ж��ġ�
     */
    function dispose() {
        if (disposed) {
            return;
        }
        disposed = true;
        for (const unsubscribe of [...subscriptions]) {
            unsubscribe();
        }
        subscriptions.clear();
        if (dependencies.windowTarget) {
            dependencies.windowTarget.removeEventListener('unload', dispose);
        }
    }
    if (dependencies.windowTarget) {
        dependencies.windowTarget.addEventListener('unload', dispose, { once: true });
    }
    return {
        /**
         * ����ԭʼ���󲢷���δ��������
         */
        async rawInvoke(channel, payload) {
            return dependencies.ipcRenderer.invoke(channel, payload);
        },
        /**
         * �������󡢽��ͳһ������ٴ���Ŀ��ģ��У��ɹ����ݡ�
         */
        async safeInvoke(channel, schema, payload) {
            const rawResult = await dependencies.ipcRenderer.invoke(channel, payload);
            const unwrapped = unwrapIpcResult(rawResult);
            return parseWithSchema(schema, unwrapped);
        },
        /**
         * �����������¼����ڻص�ǰ������У�顣
         */
        subscribe(channel, schema, listener, options = {}) {
            let subscriptionDisposed = false;
            /**
             * ����һ���¼��ص���
             *
             * @param _event ԭʼ�¼����󣬿��ⶪ����
             * @param payload ԭʼ�غɡ�
             */
            function handleIpcEvent(_event, payload) {
                try {
                    listener(parseWithSchema(schema, payload));
                }
                catch (error) {
                    options.onError?.(error);
                }
            }
            /**
             * ȡ����ǰ���ġ�
             */
            function unsubscribe() {
                if (subscriptionDisposed) {
                    return;
                }
                subscriptionDisposed = true;
                dependencies.ipcRenderer.removeListener(channel, handleIpcEvent);
                subscriptions.delete(unsubscribe);
            }
            dependencies.ipcRenderer.on(channel, handleIpcEvent);
            subscriptions.add(unsubscribe);
            return unsubscribe;
        },
        dispose
    };
}

}, {"../shared":"electron/ipcBus/shared/index.js"}],
"electron/ipcBus/shared/index.js": [function(require, module, exports) {
"use strict";
/**
 * @file 统一 Electron IPC 总线全部共享导出。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.windowStateChangedEventSchema = exports.windowSetTitleResponseSchema = exports.windowSetTitleIpcRequestSchema = exports.windowRouteChangedEventSchema = exports.windowRefSchema = exports.windowListResponseSchema = exports.windowFocusChangedEventSchema = exports.windowCreatedEventSchema = exports.windowCountResponseSchema = exports.windowControlResponseSchema = exports.windowControlRequestSchema = exports.windowCloseByRoleRequestSchema = exports.windowActionResponseSchema = exports.windowActionRequestSchema = exports.taskStartResponseSchema = exports.taskStartRequestSchema = exports.taskProgressEventSchema = exports.taskFailedEventSchema = exports.taskCompletedEventSchema = exports.taskCancelResponseSchema = exports.taskCancelRequestSchema = exports.setWindowTitleRequestSchema = exports.openWindowResponseSchema = exports.openWindowRequestSchema = exports.ipcResultSchema = exports.ipcErrorSchema = exports.getInitPayloadResponseSchema = exports.getCurrentWindowResponseSchema = exports.fileDialogResponseSchema = exports.fileDialogRequestSchema = exports.fileDialogFilterSchema = exports.appInfoResponseSchema = exports.TASK_START_STATUSES = exports.TASK_KINDS = exports.FILE_DIALOG_PROPERTIES = exports.isIpcErrorCode = exports.createIpcSuccessResult = exports.createIpcErrorResult = exports.createIpcError = exports.IPC_ERROR_CODES = exports.createEmptyObjectSchema = exports.defineRequestContract = exports.defineEventContract = exports.eventContracts = exports.requestContracts = exports.DEFAULT_IPC_TIMEOUT_MS = exports.DEFAULT_IPC_MAX_PAYLOAD_BYTES = exports.IPC_PERMISSIONS = exports.IPC_EVENTS = exports.IPC_CHANNELS = void 0;
exports.z = exports.ZodValidationError = exports.SimpleZodSchema = exports.createIpcResultSchema = void 0;
var constants_1 = require("./constants");
Object.defineProperty(exports, "IPC_CHANNELS", { enumerable: true, get: function () { return constants_1.IPC_CHANNELS; } });
Object.defineProperty(exports, "IPC_EVENTS", { enumerable: true, get: function () { return constants_1.IPC_EVENTS; } });
Object.defineProperty(exports, "IPC_PERMISSIONS", { enumerable: true, get: function () { return constants_1.IPC_PERMISSIONS; } });
Object.defineProperty(exports, "DEFAULT_IPC_MAX_PAYLOAD_BYTES", { enumerable: true, get: function () { return constants_1.DEFAULT_IPC_MAX_PAYLOAD_BYTES; } });
Object.defineProperty(exports, "DEFAULT_IPC_TIMEOUT_MS", { enumerable: true, get: function () { return constants_1.DEFAULT_IPC_TIMEOUT_MS; } });
var contracts_1 = require("./contracts");
Object.defineProperty(exports, "requestContracts", { enumerable: true, get: function () { return contracts_1.requestContracts; } });
Object.defineProperty(exports, "eventContracts", { enumerable: true, get: function () { return contracts_1.eventContracts; } });
Object.defineProperty(exports, "defineEventContract", { enumerable: true, get: function () { return contracts_1.defineEventContract; } });
Object.defineProperty(exports, "defineRequestContract", { enumerable: true, get: function () { return contracts_1.defineRequestContract; } });
Object.defineProperty(exports, "createEmptyObjectSchema", { enumerable: true, get: function () { return contracts_1.createEmptyObjectSchema; } });
var errors_1 = require("./errors");
Object.defineProperty(exports, "IPC_ERROR_CODES", { enumerable: true, get: function () { return errors_1.IPC_ERROR_CODES; } });
Object.defineProperty(exports, "createIpcError", { enumerable: true, get: function () { return errors_1.createIpcError; } });
Object.defineProperty(exports, "createIpcErrorResult", { enumerable: true, get: function () { return errors_1.createIpcErrorResult; } });
Object.defineProperty(exports, "createIpcSuccessResult", { enumerable: true, get: function () { return errors_1.createIpcSuccessResult; } });
Object.defineProperty(exports, "isIpcErrorCode", { enumerable: true, get: function () { return errors_1.isIpcErrorCode; } });
var schemas_1 = require("./schemas");
Object.defineProperty(exports, "FILE_DIALOG_PROPERTIES", { enumerable: true, get: function () { return schemas_1.FILE_DIALOG_PROPERTIES; } });
Object.defineProperty(exports, "TASK_KINDS", { enumerable: true, get: function () { return schemas_1.TASK_KINDS; } });
Object.defineProperty(exports, "TASK_START_STATUSES", { enumerable: true, get: function () { return schemas_1.TASK_START_STATUSES; } });
Object.defineProperty(exports, "appInfoResponseSchema", { enumerable: true, get: function () { return schemas_1.appInfoResponseSchema; } });
Object.defineProperty(exports, "fileDialogFilterSchema", { enumerable: true, get: function () { return schemas_1.fileDialogFilterSchema; } });
Object.defineProperty(exports, "fileDialogRequestSchema", { enumerable: true, get: function () { return schemas_1.fileDialogRequestSchema; } });
Object.defineProperty(exports, "fileDialogResponseSchema", { enumerable: true, get: function () { return schemas_1.fileDialogResponseSchema; } });
Object.defineProperty(exports, "getCurrentWindowResponseSchema", { enumerable: true, get: function () { return schemas_1.getCurrentWindowResponseSchema; } });
Object.defineProperty(exports, "getInitPayloadResponseSchema", { enumerable: true, get: function () { return schemas_1.getInitPayloadResponseSchema; } });
Object.defineProperty(exports, "ipcErrorSchema", { enumerable: true, get: function () { return schemas_1.ipcErrorSchema; } });
Object.defineProperty(exports, "ipcResultSchema", { enumerable: true, get: function () { return schemas_1.ipcResultSchema; } });
Object.defineProperty(exports, "openWindowRequestSchema", { enumerable: true, get: function () { return schemas_1.openWindowRequestSchema; } });
Object.defineProperty(exports, "openWindowResponseSchema", { enumerable: true, get: function () { return schemas_1.openWindowResponseSchema; } });
Object.defineProperty(exports, "setWindowTitleRequestSchema", { enumerable: true, get: function () { return schemas_1.setWindowTitleRequestSchema; } });
Object.defineProperty(exports, "taskCancelRequestSchema", { enumerable: true, get: function () { return schemas_1.taskCancelRequestSchema; } });
Object.defineProperty(exports, "taskCancelResponseSchema", { enumerable: true, get: function () { return schemas_1.taskCancelResponseSchema; } });
Object.defineProperty(exports, "taskCompletedEventSchema", { enumerable: true, get: function () { return schemas_1.taskCompletedEventSchema; } });
Object.defineProperty(exports, "taskFailedEventSchema", { enumerable: true, get: function () { return schemas_1.taskFailedEventSchema; } });
Object.defineProperty(exports, "taskProgressEventSchema", { enumerable: true, get: function () { return schemas_1.taskProgressEventSchema; } });
Object.defineProperty(exports, "taskStartRequestSchema", { enumerable: true, get: function () { return schemas_1.taskStartRequestSchema; } });
Object.defineProperty(exports, "taskStartResponseSchema", { enumerable: true, get: function () { return schemas_1.taskStartResponseSchema; } });
Object.defineProperty(exports, "windowActionRequestSchema", { enumerable: true, get: function () { return schemas_1.windowActionRequestSchema; } });
Object.defineProperty(exports, "windowActionResponseSchema", { enumerable: true, get: function () { return schemas_1.windowActionResponseSchema; } });
Object.defineProperty(exports, "windowCloseByRoleRequestSchema", { enumerable: true, get: function () { return schemas_1.windowCloseByRoleRequestSchema; } });
Object.defineProperty(exports, "windowControlRequestSchema", { enumerable: true, get: function () { return schemas_1.windowControlRequestSchema; } });
Object.defineProperty(exports, "windowControlResponseSchema", { enumerable: true, get: function () { return schemas_1.windowControlResponseSchema; } });
Object.defineProperty(exports, "windowCountResponseSchema", { enumerable: true, get: function () { return schemas_1.windowCountResponseSchema; } });
Object.defineProperty(exports, "windowCreatedEventSchema", { enumerable: true, get: function () { return schemas_1.windowCreatedEventSchema; } });
Object.defineProperty(exports, "windowFocusChangedEventSchema", { enumerable: true, get: function () { return schemas_1.windowFocusChangedEventSchema; } });
Object.defineProperty(exports, "windowListResponseSchema", { enumerable: true, get: function () { return schemas_1.windowListResponseSchema; } });
Object.defineProperty(exports, "windowRefSchema", { enumerable: true, get: function () { return schemas_1.windowRefSchema; } });
Object.defineProperty(exports, "windowRouteChangedEventSchema", { enumerable: true, get: function () { return schemas_1.windowRouteChangedEventSchema; } });
Object.defineProperty(exports, "windowSetTitleIpcRequestSchema", { enumerable: true, get: function () { return schemas_1.windowSetTitleIpcRequestSchema; } });
Object.defineProperty(exports, "windowSetTitleResponseSchema", { enumerable: true, get: function () { return schemas_1.windowSetTitleResponseSchema; } });
Object.defineProperty(exports, "windowStateChangedEventSchema", { enumerable: true, get: function () { return schemas_1.windowStateChangedEventSchema; } });
Object.defineProperty(exports, "createIpcResultSchema", { enumerable: true, get: function () { return schemas_1.createIpcResultSchema; } });
var zod_1 = require("./zod");
Object.defineProperty(exports, "SimpleZodSchema", { enumerable: true, get: function () { return zod_1.SimpleZodSchema; } });
Object.defineProperty(exports, "ZodValidationError", { enumerable: true, get: function () { return zod_1.ZodValidationError; } });
Object.defineProperty(exports, "z", { enumerable: true, get: function () { return zod_1.z; } });

}, {"./constants":"electron/ipcBus/shared/constants.js","./contracts":"electron/ipcBus/shared/contracts.js","./errors":"electron/ipcBus/shared/errors.js","./schemas":"electron/ipcBus/shared/schemas.js","./zod":"electron/ipcBus/shared/zod.js"}],
"electron/ipcBus/shared/constants.js": [function(require, module, exports) {
"use strict";
/**
 * @file ???? IPC ?????????????????????????
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_IPC_MAX_PAYLOAD_BYTES = exports.DEFAULT_IPC_TIMEOUT_MS = exports.IPC_PERMISSIONS = exports.IPC_EVENTS = exports.IPC_CHANNELS = void 0;
/**
 * 全部 IPC 请求通道常量。
 */
exports.IPC_CHANNELS = {
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
    taskCancel: 'task:cancel'
};
/**
 * 全部 IPC 事件通道常量。
 */
exports.IPC_EVENTS = {
    taskProgress: 'task:progress',
    taskCompleted: 'task:completed',
    taskFailed: 'task:failed',
    windowFocusChanged: 'window:focus.changed',
    windowStateChanged: 'window:state.changed',
    windowRouteChanged: 'window:route.changed',
    windowCreated: 'window:created'
};
/**
 * 全部受控的 IPC 权限常量。
 */
exports.IPC_PERMISSIONS = {
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
    devtoolsOpen: 'devtools:open'
};
/**
 * ??????????????????????
 */
exports.DEFAULT_IPC_TIMEOUT_MS = 15000;
/**
 * ????????????????????????
 */
exports.DEFAULT_IPC_MAX_PAYLOAD_BYTES = 64 * 1024;

}, {}],
"electron/ipcBus/shared/contracts.js": [function(require, module, exports) {
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

}, {"./constants":"electron/ipcBus/shared/constants.js","./schemas":"electron/ipcBus/shared/schemas.js","./zod":"electron/ipcBus/shared/zod.js"}],
"electron/ipcBus/shared/schemas.js": [function(require, module, exports) {
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

}, {"./errors":"electron/ipcBus/shared/errors.js","./zod":"electron/ipcBus/shared/zod.js","../../windows/shared/window-schemas":"electron/windows/shared/window-schemas.js","../../windows/shared/window-types":"electron/windows/shared/window-types.js"}],
"electron/ipcBus/shared/errors.js": [function(require, module, exports) {
"use strict";
/**
 * @file ????? IPC ???????????????????
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IPC_ERROR_CODES = void 0;
exports.isIpcErrorCode = isIpcErrorCode;
exports.createIpcError = createIpcError;
exports.createIpcSuccessResult = createIpcSuccessResult;
exports.createIpcErrorResult = createIpcErrorResult;
/**
 * ?? IPC ??????????????????
 */
exports.IPC_ERROR_CODES = {
    unknownChannel: 'IPC_UNKNOWN_CHANNEL',
    handlerNotFound: 'IPC_HANDLER_NOT_FOUND',
    validationError: 'IPC_VALIDATION_ERROR',
    forbidden: 'IPC_FORBIDDEN',
    timeout: 'IPC_TIMEOUT',
    aborted: 'IPC_ABORTED',
    internalError: 'IPC_INTERNAL_ERROR',
    windowNotFound: 'IPC_WINDOW_NOT_FOUND',
    windowDestroyed: 'IPC_WINDOW_DESTROYED',
    rateLimited: 'IPC_RATE_LIMITED',
    payloadTooLarge: 'IPC_PAYLOAD_TOO_LARGE',
    unsupported: 'IPC_UNSUPPORTED',
    conflict: 'IPC_CONFLICT',
    notReady: 'IPC_NOT_READY'
};
/**
 * ??????????????? IPC ????
 *
 * @param value ?????????????
 * @returns ???????? IPC ?????? `true`?
 */
function isIpcErrorCode(value) {
    return Object.values(exports.IPC_ERROR_CODES).includes(value);
}
/**
 * ?????? IPC ?????
 *
 * @param code ??? IPC ????
 * @param message ??????????
 * @param detail ???????????
 * @param cause ???????????????
 * @param retryable ????????
 * @returns ????? IPC ?????
 */
function createIpcError(code, message, detail, cause, retryable) {
    return {
        code,
        message,
        detail,
        cause,
        retryable
    };
}
/**
 * ????? IPC ???????
 *
 * @param data ???????
 * @param meta ?????????
 * @returns ??? IPC ?????
 */
function createIpcSuccessResult(data, meta) {
    return {
        ok: true,
        data,
        meta
    };
}
/**
 * ?????????????? IPC ???????
 *
 * @param code ??? IPC ????
 * @param message ??????????
 * @param detail ???????????
 * @param cause ???????????????
 * @param retryable ????????
 * @param meta ?????????
 * @returns ??? IPC ?????
 */
function createIpcErrorResult(code, message, detail, cause, retryable, meta) {
    return {
        ok: false,
        error: createIpcError(code, message, detail, cause, retryable),
        meta
    };
}

}, {}],
"electron/ipcBus/shared/zod.js": [function(require, module, exports) {
"use strict";
/**
 * @file ??? IPC ?????????? zod ?????????????
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.z = exports.SimpleZodSchema = exports.ZodValidationError = void 0;
/**
 * ??????????????????????
 *
 * @param path ???????????
 * @returns ???????????????
 */
function formatPath(path) {
    if (path.length === 0) {
        return 'value';
    }
    return path
        .map((segment, index) => {
        if (typeof segment === 'number') {
            return `[${segment}]`;
        }
        return index === 0 ? segment : `.${segment}`;
    })
        .join('');
}
/**
 * ???????????????
 *
 * @param path ?????????
 * @param message ???????
 * @returns ?????????
 */
function createValidationError(path, message) {
    return new ZodValidationError([
        {
            path: formatPath(path),
            message
        }
    ]);
}
/**
 * ????????????????
 *
 * @param value ??????????
 * @returns ??????????? `true`?
 */
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
/**
 * ??????????? zod ???????
 */
class ZodValidationError extends Error {
    /**
     * ???????????
     *
     * @param issues ??????????????
     */
    constructor(issues) {
        super(issues.map((issue) => `${issue.path}: ${issue.message}`).join('; '));
        this.name = 'ZodValidationError';
        this.issues = issues;
    }
}
exports.ZodValidationError = ZodValidationError;
/**
 * ???? IPC ???????????? API?
 */
class SimpleZodSchema {
    /**
     * ??????????????
     *
     * @param parser ???????????????
     */
    constructor(parser) {
        this.parser = parser;
    }
    /**
     * ??????????
     *
     * @param input ???????
     * @returns ??????
     */
    parse(input) {
        return this.parseAtPath(input, []);
    }
    /**
     * ??????????????
     *
     * @param input ???????
     * @param path ???????????
     * @returns ??????
     */
    parseAtPath(input, path) {
        return this.parser(input, path);
    }
    /**
     * ??????????????????????
     *
     * @param input ???????
     * @returns ???????????
     */
    safeParse(input) {
        try {
            return {
                success: true,
                data: this.parse(input)
            };
        }
        catch (error) {
            if (error instanceof ZodValidationError) {
                return {
                    success: false,
                    error
                };
            }
            throw error;
        }
    }
    /**
     * ????????? `undefined`?
     *
     * @returns ?? `undefined` ?????????
     */
    optional() {
        return new SimpleZodSchema((input, path) => {
            if (input === undefined) {
                return undefined;
            }
            return this.parseAtPath(input, path);
        });
    }
    /**
     * ????????? `null`?
     *
     * @returns ?? `null` ?????????
     */
    nullable() {
        return new SimpleZodSchema((input, path) => {
            if (input === null) {
                return null;
            }
            return this.parseAtPath(input, path);
        });
    }
    /**
     * ????????????????
     *
     * @returns ???????????????
     */
    array() {
        return array(this);
    }
    /**
     * ???? `undefined` ???????
     *
     * @param defaultValue ??????
     * @returns ?????????????
     */
    default(defaultValue) {
        return new SimpleZodSchema((input, path) => {
            if (input === undefined) {
                return defaultValue;
            }
            return this.parseAtPath(input, path);
        });
    }
}
exports.SimpleZodSchema = SimpleZodSchema;
/**
 * ????????????????
 *
 * @param options ???????????
 * @returns ????????
 */
function string(options = {}) {
    return new SimpleZodSchema((input, path) => {
        if (typeof input !== 'string') {
            throw createValidationError(path, 'Expected a string.');
        }
        const value = options.trim ? input.trim() : input;
        if (options.minLength !== undefined && value.length < options.minLength) {
            throw createValidationError(path, `Expected at least ${options.minLength} characters.`);
        }
        if (options.maxLength !== undefined && value.length > options.maxLength) {
            throw createValidationError(path, `Expected at most ${options.maxLength} characters.`);
        }
        return value;
    });
}
/**
 * ???????????????
 *
 * @param options ??????????
 * @returns ???????
 */
function number(options = {}) {
    return new SimpleZodSchema((input, path) => {
        if (typeof input !== 'number' || Number.isNaN(input) || !Number.isFinite(input)) {
            throw createValidationError(path, 'Expected a finite number.');
        }
        if (options.integer && !Number.isInteger(input)) {
            throw createValidationError(path, 'Expected an integer.');
        }
        if (options.min !== undefined && input < options.min) {
            throw createValidationError(path, `Expected a number greater than or equal to ${options.min}.`);
        }
        if (options.max !== undefined && input > options.max) {
            throw createValidationError(path, `Expected a number less than or equal to ${options.max}.`);
        }
        return input;
    });
}
/**
 * ??????????
 *
 * @returns ????????
 */
function boolean() {
    return new SimpleZodSchema((input, path) => {
        if (typeof input !== 'boolean') {
            throw createValidationError(path, 'Expected a boolean.');
        }
        return input;
    });
}
/**
 * ???????????????
 *
 * @returns ???????????????
 */
function unknown() {
    return new SimpleZodSchema((input) => input);
}
/**
 * ???????????????????
 *
 * @param expectedValue ?????????
 * @returns ????????
 */
function literal(expectedValue) {
    return new SimpleZodSchema((input, path) => {
        if (input !== expectedValue) {
            throw createValidationError(path, `Expected the literal value ${String(expectedValue)}.`);
        }
        return expectedValue;
    });
}
/**
 * ??????????????????
 *
 * @param values ??????????
 * @returns ??????????
 */
function enumeration(values) {
    return new SimpleZodSchema((input, path) => {
        if (typeof input !== 'string' || !values.includes(input)) {
            throw createValidationError(path, `Expected one of: ${values.join(', ')}.`);
        }
        return input;
    });
}
/**
 * ????????????????
 *
 * @param itemSchema ??????????????
 * @param options ??????????
 * @returns ???????
 */
function array(itemSchema, options = {}) {
    return new SimpleZodSchema((input, path) => {
        if (!Array.isArray(input)) {
            throw createValidationError(path, 'Expected an array.');
        }
        if (options.minLength !== undefined && input.length < options.minLength) {
            throw createValidationError(path, `Expected at least ${options.minLength} items.`);
        }
        if (options.maxLength !== undefined && input.length > options.maxLength) {
            throw createValidationError(path, `Expected at most ${options.maxLength} items.`);
        }
        return input.map((item, index) => itemSchema.parseAtPath(item, [...path, index]));
    });
}
/**
 * ?????????????????
 *
 * @param shape ??????????????
 * @returns ???????
 */
function object(shape) {
    return new SimpleZodSchema((input, path) => {
        if (!isRecord(input)) {
            throw createValidationError(path, 'Expected an object.');
        }
        const source = input;
        const result = {};
        for (const key of Object.keys(shape)) {
            const fieldSchema = shape[key];
            const fieldValue = source[key];
            const parsedValue = fieldSchema.parseAtPath(fieldValue, [...path, key]);
            result[key] = parsedValue;
        }
        return result;
    });
}
/**
 * ?????????????????????
 *
 * @param schemas ???????????????
 * @returns ???????
 */
function union(schemas) {
    return new SimpleZodSchema((input, path) => {
        const issues = [];
        for (const schema of schemas) {
            const result = schema.safeParse(input);
            if (result.success) {
                return result.data;
            }
            issues.push(...result.error.issues);
        }
        if (issues.length > 0) {
            throw new ZodValidationError(issues);
        }
        throw createValidationError(path, 'Expected a matching union member.');
    });
}
/**
 * ???? IPC ???????? zod ?????????
 */
exports.z = {
    string,
    number,
    boolean,
    unknown,
    literal,
    enum: enumeration,
    array,
    object,
    union
};

}, {}],
"electron/windows/shared/window-schemas.js": [function(require, module, exports) {
"use strict";
/**
 * @file 窗口管理系统的 zod schema 定义，用于 IPC 请求/响应/事件校验。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentWindowResponseSchema = exports.getInitPayloadResponseSchema = exports.windowRouteChangedEventSchema = exports.windowStateChangedEventSchema = exports.setWindowTitleRequestSchema = exports.windowListResponseSchema = exports.windowRefSchema = exports.windowControlResponseSchema = exports.windowControlRequestSchema = exports.openWindowResponseSchema = exports.openWindowRequestSchema = void 0;
const zod_1 = require("../../ipcBus/shared/zod");
const window_types_1 = require("./window-types");
/**
 * 打开窗口请求 schema。
 */
exports.openWindowRequestSchema = zod_1.z.object({
    role: zod_1.z.enum(window_types_1.WINDOW_ROLES),
    routeName: zod_1.z.string({ minLength: 1 }).optional(),
    params: zod_1.z.object({}).optional(),
    query: zod_1.z.object({}).optional(),
    payload: zod_1.z.unknown().optional(),
    displayTarget: zod_1.z.enum(['primary', 'cursor', 'parent', 'last', 'explicit']).optional(),
    parentWindowId: zod_1.z.number({ integer: true, min: 1 }).optional(),
    title: zod_1.z.string({ minLength: 1, maxLength: 256 }).optional()
});
/**
 * 打开窗口响应 schema。
 */
exports.openWindowResponseSchema = zod_1.z.object({
    windowId: zod_1.z.number({ integer: true, min: 1 }),
    role: zod_1.z.enum(window_types_1.WINDOW_ROLES),
    instanceKey: zod_1.z.string({ minLength: 1 }),
    created: zod_1.z.boolean(),
    route: zod_1.z.string({ minLength: 1 })
});
/**
 * 窗口操作请求 schema（minimize/maximize/close/restore 等）。
 */
exports.windowControlRequestSchema = zod_1.z.object({
    windowId: zod_1.z.number({ integer: true, min: 1 }).optional(),
    role: zod_1.z.enum(window_types_1.WINDOW_ROLES).optional()
});
/**
 * 窗口操作响应 schema。
 */
exports.windowControlResponseSchema = zod_1.z.object({
    windowId: zod_1.z.number({ integer: true, min: 1 }),
    state: zod_1.z.enum(['minimized', 'maximized', 'unmaximized', 'normal', 'closed', 'hidden', 'shown', 'focused', 'restored'])
});
/**
 * 窗口引用 schema（对外安全结构）。
 */
exports.windowRefSchema = zod_1.z.object({
    id: zod_1.z.number({ integer: true, min: 1 }),
    role: zod_1.z.enum(window_types_1.WINDOW_ROLES),
    instanceKey: zod_1.z.string({ minLength: 1 }),
    title: zod_1.z.string(),
    route: zod_1.z.string(),
    createdAt: zod_1.z.number({ min: 0 }),
    focusedAt: zod_1.z.number({ min: 0 }),
    isFocused: zod_1.z.boolean(),
    isVisible: zod_1.z.boolean(),
    isDestroyed: zod_1.z.boolean(),
    isMaximized: zod_1.z.boolean(),
    isMinimized: zod_1.z.boolean(),
    isFullScreen: zod_1.z.boolean(),
    isAlwaysOnTop: zod_1.z.boolean(),
    bounds: zod_1.z.object({
        x: zod_1.z.number({ integer: true }),
        y: zod_1.z.number({ integer: true }),
        width: zod_1.z.number({ integer: true, min: 1 }),
        height: zod_1.z.number({ integer: true, min: 1 })
    }),
    parentId: zod_1.z.number({ integer: true, min: 1 }).optional()
});
/**
 * 窗口列表响应 schema。
 */
exports.windowListResponseSchema = zod_1.z.object({
    windows: zod_1.z.array(exports.windowRefSchema)
});
/**
 * 设置窗口标题请求 schema。
 */
exports.setWindowTitleRequestSchema = zod_1.z.object({
    title: zod_1.z.string({ minLength: 1, maxLength: 256 })
});
/**
 * 窗口状态变化事件 schema。
 */
exports.windowStateChangedEventSchema = zod_1.z.object({
    windowId: zod_1.z.number({ integer: true, min: 1 }),
    role: zod_1.z.enum(window_types_1.WINDOW_ROLES),
    state: zod_1.z.enum([
        'focused',
        'blurred',
        'minimized',
        'maximized',
        'unmaximized',
        'restored',
        'shown',
        'hidden',
        'closed'
    ])
});
/**
 * 窗口路由变化事件 schema。
 */
exports.windowRouteChangedEventSchema = zod_1.z.object({
    windowId: zod_1.z.number({ integer: true, min: 1 }),
    role: zod_1.z.enum(window_types_1.WINDOW_ROLES),
    route: zod_1.z.string({ minLength: 1 })
});
/**
 * 获取初始化数据响应 schema。
 */
exports.getInitPayloadResponseSchema = zod_1.z.object({
    token: zod_1.z.string({ minLength: 1 }),
    payload: zod_1.z.unknown(),
    role: zod_1.z.enum(window_types_1.WINDOW_ROLES)
});
/**
 * 获取当前窗口信息响应 schema。
 */
exports.getCurrentWindowResponseSchema = zod_1.z.object({
    windowId: zod_1.z.number({ integer: true, min: 1 }),
    role: zod_1.z.enum(window_types_1.WINDOW_ROLES),
    instanceKey: zod_1.z.string({ minLength: 1 }),
    permissions: zod_1.z.array(zod_1.z.string({ minLength: 1 }))
});

}, {"../../ipcBus/shared/zod":"electron/ipcBus/shared/zod.js","./window-types":"electron/windows/shared/window-types.js"}],
"electron/windows/shared/window-types.js": [function(require, module, exports) {
"use strict";
/**
 * @file 窗口管理系统全部 TypeScript 类型定义，是 main / preload / renderer 三端的唯一类型契约。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WINDOW_PERMISSIONS = exports.WINDOW_ROUTES = exports.WINDOW_ROLES = void 0;
/* ───────────────────────── 窗口角色 ───────────────────────── */
/**
 * 系统支持的全部窗口角色枚举。
 *
 * 每个角色对应一种用途的窗口，配置集中声明在 window-config.ts。
 */
exports.WINDOW_ROLES = [
    'main',
    'login',
    'settings',
    'about',
    'detail',
    'editor',
    'taskCenter',
    'logViewer',
    'devtoolsPanel',
    'floatingToolbox',
    'trayPanel',
    'modal',
    'child',
    'hiddenWorker'
];
/* ───────────────────────── 路由定义 ───────────────────────── */
/**
 * 系统支持的全部页面路由名称。
 */
exports.WINDOW_ROUTES = [
    '/',
    '/login',
    '/settings',
    '/about',
    '/detail/:id',
    '/task-center',
    '/log-viewer',
    '/modal/:type',
    '/forbidden',
    '/not-found'
];
/* ───────────────────────── 窗口权限 ───────────────────────── */
exports.WINDOW_PERMISSIONS = [
    'window:open',
    'window:close:self',
    'window:close:any',
    'window:focus',
    'window:list',
    'window:control:self',
    'window:control:any',
    'window:devtools',
    'route:settings',
    'route:admin',
    'route:detail',
    'route:task-center',
    'app:quit',
    'app:read',
    'file:read',
    'file:write',
    'task:run',
    'task:cancel'
];

}, {}],
"electron/ipcBus/preload/desktop-api.js": [function(require, module, exports) {
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

}, {"../shared":"electron/ipcBus/shared/index.js"}]
  }
  var __preloadCache = {}
  var __externalRequire = typeof require === 'function' ? require : null

  /**
   * 加载 bundle 内部模块。
   *
   * @param {string} moduleId 模块 ID。
   * @returns {unknown} 模块导出值。
   */
  function __preloadRequire(moduleId) {
    if (__preloadCache[moduleId]) {
      return __preloadCache[moduleId].exports
    }

    var record = __preloadModules[moduleId]
    if (!record) {
      throw new Error('preload module not found: ' + moduleId)
    }

    var module = { exports: {} }
    __preloadCache[moduleId] = module

    /**
     * 解析当前模块的相对依赖。
     *
     * @param {string} request 原始 require 请求。
     * @returns {unknown} 依赖模块导出值。
     */
    function localRequire(request) {
      var dependencyId = record[1][request]
      if (!dependencyId) {
      if (typeof __externalRequire === 'function') {
        return __externalRequire(request)
      }
      throw new Error('preload dependency not found: ' + moduleId + ' -> ' + request)
      }
      return __preloadRequire(dependencyId)
    }

    record[0](localRequire, module, module.exports)
    return module.exports
  }

  __preloadRequire("electron/preload.js")
})()
