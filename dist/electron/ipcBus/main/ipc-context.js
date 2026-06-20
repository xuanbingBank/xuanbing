"use strict";
/**
 * @file ���� IPC ������ʹ�õı�׼���������ġ�
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createIpcContext = createIpcContext;
/**
 * ���� Electron invoke �¼����������������ġ�
 *
 * @param options �����Ĺ���������
 * @returns ��׼����Ĵ����������ġ�
 */
function createIpcContext(options) {
    const senderWindowId = options.windowManager.getWindowIdBySenderId(options.event.sender?.id);
    return {
        requestId: options.requestId,
        channel: options.channel,
        senderWindowId,
        senderFrameUrl: options.event.senderFrame?.url,
        startedAt: options.startedAt,
        logger: options.logger,
        signal: options.signal,
        permissions: {
            role: options.windowManager.getWindowRole(senderWindowId)
        }
    };
}
