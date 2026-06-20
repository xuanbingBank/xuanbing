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
