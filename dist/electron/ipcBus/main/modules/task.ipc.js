"use strict";
/**
 * @file ע�᳤���񡢽���������ȡ����ص� IPC ������
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTaskIpc = registerTaskIpc;
const shared_1 = require("../../shared");
const ipc_errors_1 = require("../ipc-errors");
/**
 * ע���������������
 *
 * Ϊʲô������ main��
 * ��������ȡ�ȡ�����ơ��細��·����ϵͳ��Դ���ƶ��������������ƹܡ�
 *
 * renderer ���õ�ʲô��
 * ֻ���õ��������������ȡ��������Լ�������ɸѡ��Ľ���/���/ʧ���¼���
 *
 * renderer �����õ�ʲô��
 * �ò��� `AbortController`����ʱ���������������������ڲ�����ϸ�ڡ�
 *
 * �������У�飺
 * ʹ�ù�����Լ�е�����������ȡ��ģ�ͣ�Լ�� `taskId`��`kind` ���ֶΡ�
 *
 * ������У�飺
 * request/response ���¼���ͨ��������Լģ��У�顣
 *
 * ʧ����η��أ�
 * ������ͻ��ȡ��ʧ�ܡ������쳣ͳһ�߱�׼ `IpcError`��
 *
 * ���ڹر����������
 * ���ڹر�ʱ�� `TaskRegistry.cleanupWindow` ͳһ��ֹ�ô��ڳ��е�����
 *
 * @param options ����ģ��������
 */
function registerTaskIpc(options) {
    const { bus, taskRegistry } = options;
    bus.registerEvent(shared_1.eventContracts[shared_1.IPC_EVENTS.taskProgress]);
    bus.registerEvent(shared_1.eventContracts[shared_1.IPC_EVENTS.taskCompleted]);
    bus.registerEvent(shared_1.eventContracts[shared_1.IPC_EVENTS.taskFailed]);
    bus.registerHandler(shared_1.requestContracts[shared_1.IPC_CHANNELS.taskStart], async ({ input, senderWindowId }) => {
        const taskStartInput = input;
        if (senderWindowId === undefined) {
            throw (0, ipc_errors_1.createIpcError)('IPC_NOT_READY', 'The current window is not ready for task routing.');
        }
        const record = taskRegistry.createTask(taskStartInput.taskId, senderWindowId);
        let percent = 0;
        const intervalId = setInterval(() => {
            if (record.controller.signal.aborted) {
                clearInterval(intervalId);
                bus.sendToWindow(senderWindowId, shared_1.IPC_EVENTS.taskProgress, {
                    taskId: taskStartInput.taskId,
                    phase: 'canceled',
                    percent,
                    message: 'Task canceled'
                });
                bus.sendToWindow(senderWindowId, shared_1.IPC_EVENTS.taskFailed, {
                    taskId: taskStartInput.taskId,
                    error: {
                        code: 'IPC_ABORTED',
                        message: 'Task canceled',
                        retryable: false,
                        cause: 'abort'
                    },
                    failedAt: new Date().toISOString()
                });
                taskRegistry.finishTask(taskStartInput.taskId);
                return;
            }
            percent += 20;
            bus.sendToWindow(senderWindowId, shared_1.IPC_EVENTS.taskProgress, {
                taskId: taskStartInput.taskId,
                phase: percent >= 100 ? 'completed' : 'running',
                percent,
                completedUnits: percent,
                totalUnits: 100,
                message: percent >= 100 ? 'Task completed' : 'Task running'
            });
            if (percent >= 100) {
                clearInterval(intervalId);
                bus.sendToWindow(senderWindowId, shared_1.IPC_EVENTS.taskCompleted, {
                    taskId: taskStartInput.taskId,
                    result: {
                        kind: taskStartInput.kind
                    },
                    completedAt: new Date().toISOString()
                });
                taskRegistry.finishTask(taskStartInput.taskId);
            }
        }, 300);
        record.cleanup = () => {
            clearInterval(intervalId);
        };
        bus.sendToWindow(senderWindowId, shared_1.IPC_EVENTS.taskProgress, {
            taskId: taskStartInput.taskId,
            phase: 'queued',
            percent: 0,
            message: 'Task queued'
        });
        return {
            taskId: taskStartInput.taskId,
            accepted: true,
            status: 'running'
        };
    });
    bus.registerHandler(shared_1.requestContracts[shared_1.IPC_CHANNELS.taskCancel], async ({ input }) => {
        const taskCancelInput = input;
        return {
            taskId: taskCancelInput.taskId,
            cancelled: taskRegistry.cancelTask(taskCancelInput.taskId)
        };
    });
}
