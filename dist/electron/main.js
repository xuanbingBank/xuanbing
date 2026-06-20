"use strict";
/**
 * @file 应用主进程入口，负责窗口创建、安全策略与 IPC Runtime 装配。
 */
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const main_1 = require("./ipcBus/main");
const shared_1 = require("./ipcBus/shared");
const APP_NAME = 'All In One';
const MAIN_WINDOW_ROLE = 'main';
const DEV_SERVER_URL = process.env.ELECTRON_RENDERER_URL;
let mainWindow = null;
let ipcRuntime = null;
const gotInstanceLock = electron_1.app.requestSingleInstanceLock();
if (!gotInstanceLock) {
    electron_1.app.quit();
}
process.on('uncaughtException', (error) => {
    console.error('[main] Uncaught exception', error);
    electron_1.dialog.showErrorBox('Application Error', `${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease restart the app.`);
});
process.on('unhandledRejection', (reason) => {
    console.error('[main] Unhandled promise rejection', reason);
});
/**
 * 将新 WindowManager 创建的窗口注册到旧 WindowManager，使 IpcMainBus 能解析 sender 与分发事件。
 *
 * @param windowInstance 由新 WindowManager 工厂创建的 BrowserWindow。
 */
function registerWindowWithRuntime(windowInstance) {
    if (!ipcRuntime) {
        return;
    }
    ipcRuntime.windowManager.registerWindow(windowInstance, {
        windowId: windowInstance.id,
        role: MAIN_WINDOW_ROLE
    });
    windowInstance.on('focus', () => {
        ipcRuntime?.windowManager.setFocusedWindow(windowInstance.id);
        ipcRuntime?.bus.broadcast(shared_1.IPC_EVENTS.windowFocusChanged, {
            windowId: windowInstance.id,
            focused: true
        });
    });
    windowInstance.on('blur', () => {
        ipcRuntime?.bus.broadcast(shared_1.IPC_EVENTS.windowFocusChanged, {
            windowId: windowInstance.id,
            focused: false
        });
    });
    windowInstance.on('closed', () => {
        ipcRuntime?.bus.cleanupWindow(windowInstance.id);
        ipcRuntime?.taskRegistry.cleanupWindow(windowInstance.id);
        ipcRuntime?.windowManager.unregisterWindow(windowInstance.id);
    });
}
/**
 * 创建主窗口。
 *
 * 使用新 WindowManager 的 openWindow 创建窗口，再将底层 BrowserWindow 注册到旧 WindowManager。
 */
function createWindow() {
    if (!ipcRuntime) {
        return;
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.focus();
        return;
    }
    // 通过新 WindowManager 打开主窗口，由其负责创建 BrowserWindow、加载 URL、绑定生命周期。
    const openResult = ipcRuntime.newWindowManager.openWindow(MAIN_WINDOW_ROLE);
    const windowInstance = electron_1.BrowserWindow.fromId(openResult.windowId);
    if (!windowInstance) {
        console.error('[main] Failed to resolve BrowserWindow from new WindowManager.');
        return;
    }
    mainWindow = windowInstance;
    registerWindowWithRuntime(mainWindow);
    mainWindow.webContents.on('did-fail-load', (_event, code, description) => {
        console.error('[renderer] Failed to load page', code, description);
        electron_1.dialog.showErrorBox('Page Load Failed', `Error code: ${code}\n${description}`);
    });
    mainWindow.webContents.on('render-process-gone', (_event, details) => {
        console.error('[renderer] Render process exited', details.reason);
        void electron_1.dialog.showMessageBox(mainWindow, {
            type: 'error',
            title: 'Renderer Crashed',
            message: 'The renderer process exited unexpectedly.',
            detail: `Reason: ${details.reason}`,
            buttons: ['Reload', 'Close']
        }).then(({ response }) => {
            if (response === 0 && mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.reload();
                return;
            }
            mainWindow?.close();
        });
    });
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
    if (!electron_1.app.isPackaged) {
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
}
/**
 * 初始化应用运行时。
 */
async function bootstrapApplication() {
    ipcRuntime = await (0, main_1.createMainIpcRuntime)({
        appName: APP_NAME
    });
    createWindow();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
}
electron_1.app.on('second-instance', () => {
    if (!mainWindow) {
        return;
    }
    if (mainWindow.isMinimized()) {
        mainWindow.restore();
    }
    mainWindow.focus();
});
electron_1.app.whenReady().then(() => {
    void bootstrapApplication().catch((error) => {
        console.error('[main] Failed to bootstrap application', error);
        electron_1.dialog.showErrorBox('Startup Failed', error instanceof Error ? error.message : 'Unknown bootstrap error');
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('before-quit', () => {
    ipcRuntime?.taskRegistry.cancelAll();
    ipcRuntime?.bus.dispose();
    ipcRuntime?.newWindowManager.saveAllState();
});
