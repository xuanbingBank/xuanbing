"use strict";
/**
 * @file �ṩ�ṹ�� IPC ��־��¼���������ڲ����뿪�������б����ڴ���ա�
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IpcLogger = void 0;
/**
 * ����ṹ�� IPC ��־�����ڷ������������������̨��
 */
class IpcLogger {
    /**
     * ������־��¼����
     *
     * @param options ��־���á�
     */
    constructor(options) {
        this.entries = [];
        this.environment = options.environment;
        this.slowRequestThresholdMs = options.slowRequestThresholdMs;
    }
    /**
     * ��¼һ�� IPC ��������
     *
     * @param entry �ṹ����־��Ŀ��
     */
    log(entry) {
        this.entries.push(entry);
        if (this.environment !== 'production') {
            console.info('[ipc]', entry);
        }
        if (entry.durationMs >= this.slowRequestThresholdMs) {
            console.warn('[ipc:slow]', entry.channel, entry.durationMs);
        }
    }
    /**
     * ��ȡ��ǰ��־���ա�
     *
     * @returns ��־��Ŀ���顣
     */
    getEntries() {
        return [...this.entries];
    }
}
exports.IpcLogger = IpcLogger;
