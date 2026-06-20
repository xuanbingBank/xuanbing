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
