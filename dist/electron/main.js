"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const electron_1 = require("electron");
const renderer_target_1 = require("./renderer-target");
const APP_NAME = 'All In One';
const DEFAULT_WINDOW_WIDTH = 960;
const DEFAULT_WINDOW_HEIGHT = 640;
const WINDOW_STATE_FILE = 'window-state.json';
const DEV_SERVER_URL = process.env.ELECTRON_RENDERER_URL;
let mainWindow = null;
const gotInstanceLock = electron_1.app.requestSingleInstanceLock();
if (!gotInstanceLock) {
    electron_1.app.quit();
}
process.on('uncaughtException', (error) => {
    console.error('[main] Uncaught exception', error);
    electron_1.dialog.showErrorBox('Application Error', `${error.message}\n\nPlease restart the app.`);
});
process.on('unhandledRejection', (reason) => {
    console.error('[main] Unhandled promise rejection', reason);
});
function getStateFilePath() {
    return node_path_1.default.join(electron_1.app.getPath('userData'), WINDOW_STATE_FILE);
}
function loadWindowState() {
    try {
        const filePath = getStateFilePath();
        if (node_fs_1.default.existsSync(filePath)) {
            return JSON.parse(node_fs_1.default.readFileSync(filePath, 'utf-8'));
        }
    }
    catch (error) {
        console.warn('[window] Failed to read window state', error);
    }
    return {
        width: DEFAULT_WINDOW_WIDTH,
        height: DEFAULT_WINDOW_HEIGHT
    };
}
function saveWindowState(win) {
    try {
        const bounds = win.getBounds();
        const state = {
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
            isMaximized: win.isMaximized()
        };
        node_fs_1.default.writeFileSync(getStateFilePath(), JSON.stringify(state, null, 2));
    }
    catch (error) {
        console.warn('[window] Failed to save window state', error);
    }
}
function getWindowOptions() {
    const savedState = loadWindowState();
    return {
        x: savedState.x,
        y: savedState.y,
        width: savedState.width,
        height: savedState.height,
        minWidth: 720,
        minHeight: 480,
        title: APP_NAME,
        show: false,
        backgroundColor: electron_1.nativeTheme.shouldUseDarkColors ? '#1e1e1e' : '#ffffff',
        autoHideMenuBar: true,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            webviewTag: false,
            allowRunningInsecureContent: false,
            javascript: true,
            images: true
        }
    };
}
async function loadPageContent(win) {
    const target = (0, renderer_target_1.resolveRendererTarget)({
        appRoot: node_path_1.default.join(__dirname, '..', '..'),
        devServerUrl: DEV_SERVER_URL,
        isPackaged: electron_1.app.isPackaged
    });
    if (target.kind === 'url') {
        await win.loadURL(target.url);
        return;
    }
    await win.loadFile(target.filePath);
}
function createWindow() {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.focus();
        return;
    }
    mainWindow = new electron_1.BrowserWindow(getWindowOptions());
    mainWindow.once('ready-to-show', () => {
        if (!mainWindow) {
            return;
        }
        if (loadWindowState().isMaximized) {
            mainWindow.maximize();
        }
        mainWindow.show();
        mainWindow.focus();
    });
    mainWindow.on('close', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            saveWindowState(mainWindow);
        }
    });
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
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
    void loadPageContent(mainWindow).catch((error) => {
        console.error('[renderer] Failed to initialize page', error);
        electron_1.dialog.showErrorBox('Startup Failed', error.message);
    });
    if (!electron_1.app.isPackaged) {
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
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
    createWindow();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('before-quit', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        saveWindowState(mainWindow);
    }
});
