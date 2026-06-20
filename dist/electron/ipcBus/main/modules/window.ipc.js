"use strict";
/**
 * @file 注册窗口控制与窗口事件相关的 IPC 处理器。
 *
 * 本模块使用 electron/windows/main 中的新 WindowManager，通过最小接口 WindowManagerLike 注入，
 * 避免直接依赖完整 WindowManager 类。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerWindowIpc = registerWindowIpc;
const shared_1 = require("../../shared");
const ipc_errors_1 = require("../ipc-errors");
/* ───────────────────────── 辅助函数 ───────────────────────── */
/**
 * 窗口状态映射：将窗口事件类型映射为 windowStateChanged 事件的 state 字段值。
 */
const WINDOW_EVENT_TO_STATE = {
    'window:focused': 'focused',
    'window:blurred': 'blurred',
    'window:minimized': 'minimized',
    'window:maximized': 'maximized',
    'window:unmaximized': 'unmaximized',
    'window:restored': 'restored',
    'window:shown': 'shown',
    'window:hidden': 'hidden',
    'window:closed': 'closed'
};
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
function assertControlPermission(windowManager, senderWindowId, targetWindowId, permission) {
    if (senderWindowId === targetWindowId) {
        return;
    }
    if (senderWindowId === undefined) {
        throw (0, ipc_errors_1.createIpcError)('IPC_FORBIDDEN', 'Sender window could not be resolved; cross-window control is not allowed.');
    }
    const senderRef = windowManager.getWindow(senderWindowId);
    if (!senderRef) {
        throw (0, ipc_errors_1.createIpcError)('IPC_WINDOW_NOT_FOUND', `Sender window ${senderWindowId} is unavailable.`);
    }
    const allowed = hasControlPermission(senderRef.role, permission);
    if (!allowed) {
        throw (0, ipc_errors_1.createIpcError)('IPC_FORBIDDEN', `Sender role "${senderRef.role}" lacks permission "${permission}" to control window ${targetWindowId}.`);
    }
}
/**
 * 检查角色是否拥有指定控制权限。
 *
 * @param role 窗口角色。
 * @param permission 权限名称。
 * @returns 是否拥有。
 */
function hasControlPermission(role, permission) {
    // 延迟导入避免循环依赖；使用 windows/shared 的权限映射。
    // 此处直接使用 require 以兼容 CommonJS。
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { DEFAULT_WINDOW_ROLE_PERMISSIONS } = require('../../../windows/shared/window-permissions');
    const perms = DEFAULT_WINDOW_ROLE_PERMISSIONS[role] ?? [];
    return perms.includes(permission);
}
/**
 * 解析控制操作的目标窗口 ID。
 *
 * @param senderWindowId 发送方窗口 ID。
 * @param input 控制请求输入。
 * @returns 目标窗口 ID。
 * @throws IpcError 无法解析时抛出。
 */
function resolveTargetWindowId(senderWindowId, input) {
    const targetWindowId = input.windowId ?? senderWindowId;
    if (targetWindowId === undefined) {
        throw (0, ipc_errors_1.createIpcError)('IPC_WINDOW_NOT_FOUND', 'Unable to resolve a target window for this request.');
    }
    return targetWindowId;
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
 */
function registerWindowIpc(bus, windowManager) {
    /* ── windowOpen ── */
    bus.registerHandler(shared_1.requestContracts[shared_1.IPC_CHANNELS.windowOpen], async ({ input }) => {
        const openInput = input;
        const result = windowManager.openWindow(openInput.role, {
            routeName: openInput.routeName,
            params: openInput.params,
            query: openInput.query,
            payload: openInput.payload,
            displayTarget: openInput.displayTarget,
            parentWindowId: openInput.parentWindowId,
            title: openInput.title
        });
        return result;
    });
    /* ── windowMinimize ── */
    bus.registerHandler(shared_1.requestContracts[shared_1.IPC_CHANNELS.windowMinimize], async ({ input, senderWindowId }) => {
        const controlInput = input;
        const targetWindowId = resolveTargetWindowId(senderWindowId, controlInput);
        assertControlPermission(windowManager, senderWindowId, targetWindowId, 'window:control:any');
        windowManager.minimizeWindow(targetWindowId);
        return { windowId: targetWindowId, state: 'minimized' };
    });
    /* ── windowMaximize ── */
    bus.registerHandler(shared_1.requestContracts[shared_1.IPC_CHANNELS.windowMaximize], async ({ input, senderWindowId }) => {
        const controlInput = input;
        const targetWindowId = resolveTargetWindowId(senderWindowId, controlInput);
        assertControlPermission(windowManager, senderWindowId, targetWindowId, 'window:control:any');
        windowManager.toggleMaximize(targetWindowId);
        const ref = windowManager.getWindow(targetWindowId);
        return {
            windowId: targetWindowId,
            state: ref?.isMaximized ? 'maximized' : 'unmaximized'
        };
    });
    /* ── windowClose ── */
    bus.registerHandler(shared_1.requestContracts[shared_1.IPC_CHANNELS.windowClose], async ({ input, senderWindowId }) => {
        const controlInput = input;
        const targetWindowId = resolveTargetWindowId(senderWindowId, controlInput);
        assertControlPermission(windowManager, senderWindowId, targetWindowId, 'window:control:any');
        windowManager.closeWindow(targetWindowId);
        return { windowId: targetWindowId, state: 'closed' };
    });
    /* ── windowRestore ── */
    bus.registerHandler(shared_1.requestContracts[shared_1.IPC_CHANNELS.windowRestore], async ({ input, senderWindowId }) => {
        const controlInput = input;
        const targetWindowId = resolveTargetWindowId(senderWindowId, controlInput);
        assertControlPermission(windowManager, senderWindowId, targetWindowId, 'window:control:any');
        windowManager.restoreWindow(targetWindowId);
        return { windowId: targetWindowId, state: 'restored' };
    });
    /* ── windowHide ── */
    bus.registerHandler(shared_1.requestContracts[shared_1.IPC_CHANNELS.windowHide], async ({ input, senderWindowId }) => {
        const controlInput = input;
        const targetWindowId = resolveTargetWindowId(senderWindowId, controlInput);
        assertControlPermission(windowManager, senderWindowId, targetWindowId, 'window:control:any');
        windowManager.hideWindow(targetWindowId);
        return { windowId: targetWindowId, state: 'hidden' };
    });
    /* ── windowShow ── */
    bus.registerHandler(shared_1.requestContracts[shared_1.IPC_CHANNELS.windowShow], async ({ input, senderWindowId }) => {
        const controlInput = input;
        const targetWindowId = resolveTargetWindowId(senderWindowId, controlInput);
        assertControlPermission(windowManager, senderWindowId, targetWindowId, 'window:control:any');
        windowManager.showWindow(targetWindowId);
        return { windowId: targetWindowId, state: 'shown' };
    });
    /* ── windowFocus ── */
    bus.registerHandler(shared_1.requestContracts[shared_1.IPC_CHANNELS.windowFocus], async ({ input, senderWindowId }) => {
        const controlInput = input;
        // 优先按角色聚焦。
        if (controlInput.role) {
            windowManager.focusByRole(controlInput.role);
            const ref = windowManager.getWindow(resolveTargetWindowId(senderWindowId, controlInput));
            return {
                windowId: ref?.id ?? 0,
                state: 'focused'
            };
        }
        const targetWindowId = resolveTargetWindowId(senderWindowId, controlInput);
        assertControlPermission(windowManager, senderWindowId, targetWindowId, 'window:control:any');
        windowManager.focusWindow(targetWindowId);
        return { windowId: targetWindowId, state: 'focused' };
    });
    /* ── windowReload ── */
    bus.registerHandler(shared_1.requestContracts[shared_1.IPC_CHANNELS.windowReload], async ({ input, senderWindowId }) => {
        const controlInput = input;
        const targetWindowId = resolveTargetWindowId(senderWindowId, controlInput);
        assertControlPermission(windowManager, senderWindowId, targetWindowId, 'window:control:any');
        windowManager.reloadWindow(targetWindowId);
        return { windowId: targetWindowId, state: 'normal' };
    });
    /* ── windowList ── */
    bus.registerHandler(shared_1.requestContracts[shared_1.IPC_CHANNELS.windowList], async () => {
        return { windows: windowManager.listWindows() };
    });
    /* ── windowGetCurrent ── */
    // windowId 始终从 IPC sender 解析，不信任 renderer 提供的 windowId。
    bus.registerHandler(shared_1.requestContracts[shared_1.IPC_CHANNELS.windowGetCurrent], async ({ senderWindowId }) => {
        if (senderWindowId === undefined) {
            throw (0, ipc_errors_1.createIpcError)('IPC_WINDOW_NOT_FOUND', 'Unable to resolve the current window from the IPC sender.');
        }
        const ref = windowManager.getWindow(senderWindowId);
        if (!ref) {
            throw (0, ipc_errors_1.createIpcError)('IPC_WINDOW_NOT_FOUND', `Window ${senderWindowId} is unavailable.`);
        }
        // 从角色配置中获取权限列表。
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { getWindowConfig } = require('../../../windows/shared/window-config');
        const permissions = getWindowConfig(ref.role).permissions;
        return {
            windowId: ref.id,
            role: ref.role,
            instanceKey: ref.instanceKey,
            permissions
        };
    });
    /* ── windowSetTitle ── */
    bus.registerHandler(shared_1.requestContracts[shared_1.IPC_CHANNELS.windowSetTitle], async ({ input, senderWindowId }) => {
        const titleInput = input;
        const targetWindowId = titleInput.windowId ?? senderWindowId;
        if (targetWindowId === undefined) {
            throw (0, ipc_errors_1.createIpcError)('IPC_WINDOW_NOT_FOUND', 'Unable to resolve a target window for setting title.');
        }
        assertControlPermission(windowManager, senderWindowId, targetWindowId, 'window:control:any');
        windowManager.updateWindowTitle(targetWindowId, titleInput.title);
        return { windowId: targetWindowId, title: titleInput.title };
    });
    /* ── windowGetInitPayload ── */
    // windowId 始终从 IPC sender 解析，不信任 renderer 提供的 windowId。
    bus.registerHandler(shared_1.requestContracts[shared_1.IPC_CHANNELS.windowGetInitPayload], async ({ senderWindowId }) => {
        if (senderWindowId === undefined) {
            throw (0, ipc_errors_1.createIpcError)('IPC_WINDOW_NOT_FOUND', 'Unable to resolve the current window from the IPC sender.');
        }
        const result = windowManager.consumeInitPayload(senderWindowId);
        if (!result) {
            throw (0, ipc_errors_1.createIpcError)('IPC_NOT_READY', 'No init payload available for this window.');
        }
        return result;
    });
    /* ── windowCloseAll ── */
    bus.registerHandler(shared_1.requestContracts[shared_1.IPC_CHANNELS.windowCloseAll], async () => {
        const before = windowManager.listWindows().length;
        windowManager.closeAll();
        return { count: before };
    });
    /* ── windowCloseByRole ── */
    bus.registerHandler(shared_1.requestContracts[shared_1.IPC_CHANNELS.windowCloseByRole], async ({ input }) => {
        const roleInput = input;
        const before = windowManager.listWindows().filter((w) => w.role === roleInput.role).length;
        windowManager.closeByRole(roleInput.role);
        return { count: before };
    });
    /* ── 事件注册 ── */
    bus.registerEvent(shared_1.eventContracts[shared_1.IPC_EVENTS.windowFocusChanged]);
    bus.registerEvent(shared_1.eventContracts[shared_1.IPC_EVENTS.windowStateChanged]);
    bus.registerEvent(shared_1.eventContracts[shared_1.IPC_EVENTS.windowRouteChanged]);
    bus.registerEvent(shared_1.eventContracts[shared_1.IPC_EVENTS.windowCreated]);
    /* ── 桥接窗口事件总线到 IPC 事件 ── */
    bridgeWindowEvents(bus, windowManager);
}
/**
 * 将新 WindowManager 的事件总线桥接到 IPC 总线，使渲染进程能订阅 windowStateChanged / windowRouteChanged / windowCreated。
 *
 * @param bus IPC 总线。
 * @param windowManager 窗口管理器。
 */
function bridgeWindowEvents(bus, windowManager) {
    const eventBus = windowManager.getEventBus();
    // 窗口状态变化 → windowStateChanged
    const stateEvents = [
        'window:focused',
        'window:blurred',
        'window:minimized',
        'window:maximized',
        'window:unmaximized',
        'window:restored',
        'window:shown',
        'window:hidden',
        'window:closed'
    ];
    for (const eventType of stateEvents) {
        eventBus.on(eventType, (payload) => {
            const state = WINDOW_EVENT_TO_STATE[eventType];
            if (!state) {
                return;
            }
            bus.broadcast(shared_1.IPC_EVENTS.windowStateChanged, {
                windowId: payload.windowId,
                role: payload.role,
                state
            });
        });
    }
    // 路由变化 → windowRouteChanged
    eventBus.on('window:route-changed', (payload) => {
        const route = payload.data?.route ?? '';
        if (!route) {
            return;
        }
        bus.broadcast(shared_1.IPC_EVENTS.windowRouteChanged, {
            windowId: payload.windowId,
            role: payload.role,
            route
        });
    });
    // 窗口创建 → windowCreated
    eventBus.on('window:created', (payload) => {
        const ref = windowManager.getWindow(payload.windowId);
        if (!ref) {
            return;
        }
        bus.broadcast(shared_1.IPC_EVENTS.windowCreated, {
            windowId: ref.id,
            role: ref.role,
            instanceKey: ref.instanceKey,
            route: ref.route,
            timestamp: payload.timestamp
        });
    });
}
