"use strict";
/**
 * @file �ṩ����ֹ�첽�����ĳ�ʱ����������
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.withTimeout = withTimeout;
/**
 * Ϊ�첽�������ӳ�ʱ����ֹ���ơ�
 *
 * @param operation �첽������
 * @param timeoutMs ��ʱʱ����
 * @param controller ��������ֹ��������
 * @returns ����������Ƿ�ʱ��ǡ�
 */
async function withTimeout(operation, timeoutMs, controller) {
    let timedOut = false;
    const timeoutPromise = new Promise((_resolve, reject) => {
        const timer = setTimeout(() => {
            timedOut = true;
            controller.abort();
            reject(new Error('IPC_TIMEOUT'));
        }, timeoutMs);
        controller.signal.addEventListener('abort', () => {
            clearTimeout(timer);
        }, { once: true });
    });
    try {
        const value = await Promise.race([operation(), timeoutPromise]);
        return { value, timedOut };
    }
    finally {
        if (!controller.signal.aborted) {
            controller.abort();
        }
    }
}
