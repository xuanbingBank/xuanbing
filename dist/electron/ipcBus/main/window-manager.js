"use strict";
/**
 * @file ���� BrowserWindow ���ȶ���ʶ����ɫ��Ϣ�밲ȫ�¼��·���
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WindowManager = void 0;
/**
 * �ṩ����ע�ᡢ���ҺͰ�ȫ����������
 */
class WindowManager {
    constructor() {
        this.windows = new Map();
    }
    /**
     * ע�ᴰ�������ɫ��
     *
     * @param window ���ڶ���
     * @param registration ע����Ϣ��
     */
    registerWindow(window, registration) {
        this.windows.set(registration.windowId, {
            role: registration.role,
            window
        });
        this.focusedWindowId = registration.windowId;
    }
    /**
     * ע�����ڡ�
     *
     * @param windowId ���ڱ�ʶ��
     */
    unregisterWindow(windowId) {
        this.windows.delete(windowId);
        if (this.focusedWindowId === windowId) {
            this.focusedWindowId = undefined;
        }
    }
    /**
     * ���µ�ǰ���㴰�ڡ�
     *
     * @param windowId ���ڱ�ʶ��
     */
    setFocusedWindow(windowId) {
        if (this.windows.has(windowId)) {
            this.focusedWindowId = windowId;
        }
    }
    /**
     * ���ݴ��ڱ�ʶ��ȡ���ڶ���
     *
     * @param windowId ���ڱ�ʶ��
     * @returns ���ڶ���
     */
    getWindow(windowId) {
        if (windowId === undefined) {
            return undefined;
        }
        return this.windows.get(windowId)?.window;
    }
    /**
     * ��ȡ��ǰ���㴰�ڱ�ʶ��
     *
     * @returns ���㴰�ڱ�ʶ��
     */
    getFocusedWindowId() {
        return this.focusedWindowId;
    }
    /**
     * ��ȡ���ڽ�ɫ��
     *
     * @param windowId ���ڱ�ʶ��
     * @returns ���ڽ�ɫ��
     */
    getWindowRole(windowId) {
        if (windowId === undefined) {
            return undefined;
        }
        return this.windows.get(windowId)?.role;
    }
    /**
     * ���� webContents ��ʶ���鴰�ڱ�ʶ��
     *
     * @param senderId webContents ��ʶ��
     * @returns ���ڱ�ʶ��
     */
    getWindowIdBySenderId(senderId) {
        if (senderId === undefined) {
            return undefined;
        }
        for (const [windowId, record] of this.windows.entries()) {
            if (record.window.webContents.id === senderId) {
                return windowId;
            }
        }
        return undefined;
    }
    /**
     * ��ָ�����ڷ����¼���
     *
     * @param windowId ���ڱ�ʶ��
     * @param channel �¼�ͨ����
     * @param payload �¼��غɡ�
     * @returns �Ƿ��ͳɹ���
     */
    sendToWindow(windowId, channel, payload) {
        const record = this.windows.get(windowId);
        if (!record || record.window.isDestroyed() || record.window.webContents.isDestroyed()) {
            return false;
        }
        record.window.webContents.send(channel, payload);
        return true;
    }
    /**
     * �����д��ڹ㲥�¼���
     *
     * @param channel �¼�ͨ����
     * @param payload �¼��غɡ�
     * @returns �ɹ��ʹ�Ĵ���������
     */
    broadcast(channel, payload) {
        let delivered = 0;
        for (const windowId of this.windows.keys()) {
            if (this.sendToWindow(windowId, channel, payload)) {
                delivered += 1;
            }
        }
        return delivered;
    }
    /**
     * �򽹵㴰�ڷ����¼���
     *
     * @param channel �¼�ͨ����
     * @param payload �¼��غɡ�
     * @returns �Ƿ��ͳɹ���
     */
    sendToFocusedWindow(channel, payload) {
        if (this.focusedWindowId === undefined) {
            return false;
        }
        return this.sendToWindow(this.focusedWindowId, channel, payload);
    }
}
exports.WindowManager = WindowManager;
