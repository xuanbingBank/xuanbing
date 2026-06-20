"use strict";
/**
 * @file ���ٳ�������������ڣ�֧�ֽ��ȡ�ȡ���봰�ڼ�������
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskRegistry = void 0;
const ipc_errors_1 = require("./ipc-errors");
/**
 * ������ȡ���ĳ�����
 */
class TaskRegistry {
    constructor() {
        this.tasks = new Map();
    }
    /**
     * ע��һ���µ�����
     *
     * @param taskId �����ʶ��
     * @param ownerWindowId �����������ڱ�ʶ��
     * @param cleanup �������ʱ������������
     * @returns �����¼��
     */
    createTask(taskId, ownerWindowId, cleanup) {
        if (this.tasks.has(taskId)) {
            throw (0, ipc_errors_1.createIpcError)('IPC_CONFLICT', `Task ${taskId} is already running.`, undefined, 'conflict', false);
        }
        const record = {
            taskId,
            ownerWindowId,
            controller: new AbortController(),
            startedAt: Date.now(),
            cleanup
        };
        this.tasks.set(taskId, record);
        return record;
    }
    /**
     * ��ȡ�����¼��
     *
     * @param taskId �����ʶ��
     * @returns �����¼��
     */
    getTask(taskId) {
        return this.tasks.get(taskId);
    }
    /**
     * ȡ��һ������
     *
     * @param taskId �����ʶ��
     * @returns �Ƿ�ȡ���ɹ���
     */
    cancelTask(taskId) {
        const record = this.tasks.get(taskId);
        if (!record) {
            return false;
        }
        record.controller.abort();
        record.cleanup?.();
        this.tasks.delete(taskId);
        return true;
    }
    /**
     * ���������ɡ�
     *
     * @param taskId �����ʶ��
     * @returns �Ƿ������ɹ���
     */
    finishTask(taskId) {
        const record = this.tasks.get(taskId);
        if (!record) {
            return false;
        }
        record.cleanup?.();
        this.tasks.delete(taskId);
        return true;
    }
    /**
     * ����ĳ������ӵ�е���������
     *
     * @param windowId ���ڱ�ʶ��
     */
    cleanupWindow(windowId) {
        for (const record of this.tasks.values()) {
            if (record.ownerWindowId === windowId) {
                this.cancelTask(record.taskId);
            }
        }
    }
    /**
     * ȡ�������������е�����
     */
    cancelAll() {
        for (const taskId of [...this.tasks.keys()]) {
            this.cancelTask(taskId);
        }
    }
}
exports.TaskRegistry = TaskRegistry;
