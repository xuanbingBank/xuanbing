"use strict";
/**
 * @file ���������ڲ��쳣��һ��Ϊ�ɰ�ȫ�·�����Ⱦ���̵� IPC ����ṹ��
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IpcError = void 0;
exports.createIpcError = createIpcError;
exports.createAbortError = createAbortError;
exports.isIpcError = isIpcError;
exports.normalizeIpcError = normalizeIpcError;
exports.sanitizeIpcError = sanitizeIpcError;
exports.sanitizeDetail = sanitizeDetail;
/**
 * �����������ڲ�ʹ�õĽṹ���������͡�
 */
class IpcError extends Error {
    /**
     * ����һ���ṹ�� IPC ����
     *
     * @param code �����롣
     * @param message �û��ɶ���Ϣ��
     * @param options ���ӽṹ����Ϣ��
     */
    constructor(code, message, options = {}) {
        super(message);
        this.name = 'IpcError';
        this.code = code;
        this.causeCode = options.cause;
        this.detail = options.detail;
        this.retryable = options.retryable ?? false;
    }
}
exports.IpcError = IpcError;
/**
 * �����ṹ�� IPC ����ʵ����
 *
 * @param code �����롣
 * @param message �û��ɶ���Ϣ��
 * @param detail ���ӽṹ����Ϣ��
 * @param cause ԭ���ʶ��
 * @param retryable �Ƿ�����ԡ�
 * @returns �ṹ������ʵ����
 */
function createIpcError(code, message, detail, cause, retryable) {
    return new IpcError(code, message, {
        cause,
        detail,
        retryable
    });
}
/**
 * ������׼ȡ������
 *
 * @param message ȡ����Ϣ��
 * @returns ȡ������ʵ����
 */
function createAbortError(message) {
    return createIpcError('IPC_ABORTED', message, undefined, 'abort', false);
}
/**
 * �ж�δ֪�쳣�Ƿ�Ϊ�ṹ�� IPC ����
 *
 * @param error δ֪�쳣��
 * @returns �Ƿ�Ϊ�ṹ�� IPC ����
 */
function isIpcError(error) {
    return error instanceof IpcError;
}
/**
 * ��δ֪�쳣��׼��Ϊ���·�����Ⱦ���̵Ĵ������
 *
 * @param error δ֪�쳣��
 * @param environment ��ǰ���л�����
 * @returns ��׼���������
 */
function normalizeIpcError(error, environment) {
    if (isIpcError(error)) {
        return sanitizeIpcError(error, environment);
    }
    if (error instanceof Error) {
        return sanitizeIpcError(createIpcError('IPC_INTERNAL_ERROR', '��������ִ��ʧ�ܡ�', environment === 'production' ? undefined : { message: error.message }, error.name), environment);
    }
    return sanitizeIpcError(createIpcError('IPC_INTERNAL_ERROR', '��������ִ��ʧ�ܡ�', environment === 'production' ? undefined : error), environment);
}
/**
 * �Դ���ϸ��������������
 *
 * @param error �ṹ������ʵ����
 * @param environment ��ǰ���л�����
 * @returns ������Ĵ������
 */
function sanitizeIpcError(error, environment) {
    return {
        code: error.code,
        message: error.message,
        cause: error.causeCode,
        retryable: error.retryable,
        detail: environment === 'production' ? undefined : sanitizeDetail(error.detail)
    };
}
/**
 * �������Ӵ���ϸ�ڣ�����·���������������Ϣй¶��
 *
 * @param detail ԭʼϸ�ڶ���
 * @returns �������ϸ�ڶ���
 */
function sanitizeDetail(detail) {
    if (detail === undefined || detail === null) {
        return detail;
    }
    if (typeof detail === 'string') {
        return detail.replace(/[A-Za-z]:\\[^"'\s]+/g, '[redacted-path]');
    }
    if (Array.isArray(detail)) {
        return detail.slice(0, 10).map((item) => sanitizeDetail(item));
    }
    if (typeof detail === 'object') {
        const entries = Object.entries(detail).slice(0, 20).map(([key, value]) => {
            if (/(token|secret|password|env|path|stack)/i.test(key)) {
                return [key, '[redacted]'];
            }
            return [key, sanitizeDetail(value)];
        });
        return Object.fromEntries(entries);
    }
    return detail;
}
