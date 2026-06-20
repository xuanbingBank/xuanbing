"use strict";
/**
 * @file 组装主进程 IPC 总线、窗口管理和示例业务模块。
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMainIpcRuntime = createMainIpcRuntime;
const node_path_1 = __importDefault(require("node:path"));
const electron_1 = require("electron");
const ipc_logger_1 = require("./ipc-logger");
const ipc_main_bus_1 = require("./ipc-main-bus");
const app_ipc_1 = require("./modules/app.ipc");
const file_ipc_1 = require("./modules/file.ipc");
const task_ipc_1 = require("./modules/task.ipc");
const window_ipc_1 = require("./modules/window.ipc");
const task_registry_1 = require("./task-registry");
const window_manager_1 = require("./window-manager");
const window_manager_2 = require("../../windows/main/window-manager");
const renderer_target_1 = require("../../renderer-target");
/**
 * 创建并注册主进程 IPC 运行时。
 *
 * 同时创建两个窗口管理器：
 * - 旧 WindowManager（electron/ipcBus/main/window-manager）：供 IpcMainBus 解析 sender、分发事件。
 * - 新 WindowManager（electron/windows/main/window-manager）：供窗口 IPC 处理器执行窗口操作。
 *
 * @param options 运行时配置。
 * @returns 运行时对象。
 */
async function createMainIpcRuntime(options) {
    const windowManager = new window_manager_1.WindowManager();
    const taskRegistry = new task_registry_1.TaskRegistry();
    const appRoot = electron_1.app.getAppPath();
    const rendererTarget = (0, renderer_target_1.resolveRendererTarget)({
        appRoot,
        devServerUrl: process.env.ELECTRON_RENDERER_URL,
        isPackaged: electron_1.app.isPackaged
    });
    const preloadPath = (0, renderer_target_1.resolvePreloadPath)(appRoot);
    const indexHtmlPath = rendererTarget.kind === 'file'
        ? rendererTarget.filePath
        : node_path_1.default.join(appRoot, 'index.html');
    const stateFilePath = node_path_1.default.join(electron_1.app.getPath('userData'), 'window-state.json');
    const newWindowManager = new window_manager_2.WindowManager({
        browserWindowFactory: (constructorOptions) => {
            return new electron_1.BrowserWindow(constructorOptions);
        },
        screen: electron_1.screen,
        preloadPath,
        isPackaged: electron_1.app.isPackaged,
        devServerUrl: process.env.ELECTRON_RENDERER_URL,
        indexHtmlPath,
        stateFilePath,
        environment: electron_1.app.isPackaged ? 'production' : 'development',
        shellOpenExternal: (url) => {
            void electron_1.shell.openExternal(url);
        }
    });
    const logger = new ipc_logger_1.IpcLogger({
        environment: electron_1.app.isPackaged ? 'production' : 'development',
        slowRequestThresholdMs: 500
    });
    const bus = new ipc_main_bus_1.IpcMainBus({
        ipcMain: electron_1.ipcMain,
        logger,
        windowManager,
        environment: electron_1.app.isPackaged ? 'production' : 'development'
    });
    (0, app_ipc_1.registerAppIpc)(bus, {
        appName: options.appName,
        appVersion: electron_1.app.getVersion(),
        electronVersion: process.versions?.electron ?? 'unknown',
        chromeVersion: process.versions?.chrome ?? 'unknown',
        platform: process.platform,
        isPackaged: electron_1.app.isPackaged
    });
    (0, file_ipc_1.registerFileIpc)(bus, electron_1.dialog);
    (0, window_ipc_1.registerWindowIpc)(bus, newWindowManager);
    (0, task_ipc_1.registerTaskIpc)({
        bus,
        taskRegistry
    });
    await bus.start();
    return {
        bus,
        taskRegistry,
        windowManager,
        newWindowManager
    };
}
