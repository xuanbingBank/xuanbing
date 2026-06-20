"use strict";
/**
 * @file �ṩ��Ⱦ���̰�ȫʹ������ API �ĸ���������״̬��������
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDesktopApi = getDesktopApi;
exports.createIdleInvokeState = createIdleInvokeState;
exports.createLoadingInvokeState = createLoadingInvokeState;
exports.createSuccessInvokeState = createSuccessInvokeState;
exports.createErrorInvokeState = createErrorInvokeState;
exports.isInvokeLoading = isInvokeLoading;
exports.composeDesktopUnsubscribe = composeDesktopUnsubscribe;
/**
 * ��ȡ preload ��¶��ȫ�ִ��ڶ����ϵ����� API��
 *
 * @returns ���� API��
 */
function getDesktopApi() {
    return window.desktop;
}
/**
 * ��������״̬��
 *
 * @returns ����״̬����
 */
function createIdleInvokeState() {
    return {
        status: 'idle',
        data: undefined,
        error: undefined
    };
}
/**
 * ��������״̬��
 *
 * @param input ��ǰ�������롣
 * @returns ����״̬����
 */
function createLoadingInvokeState(input) {
    return {
        status: 'loading',
        input,
        data: undefined,
        error: undefined
    };
}
/**
 * �����ɹ�״̬��
 *
 * @param data �ɹ����ݡ�
 * @returns �ɹ�״̬����
 */
function createSuccessInvokeState(data) {
    return {
        status: 'success',
        data,
        error: undefined
    };
}
/**
 * ����ʧ��״̬��
 *
 * @param error �������ݡ�
 * @returns ʧ��״̬����
 */
function createErrorInvokeState(error) {
    return {
        status: 'error',
        data: undefined,
        error
    };
}
/**
 * �жϵ�ǰ״̬�Ƿ�Ϊ�����С�
 *
 * @param state ��ǰ����״̬��
 * @returns �Ƿ��ڼ����С�
 */
function isInvokeLoading(state) {
    return state.status === 'loading';
}
/**
 * �����ȡ�����ĺ�����ϳ�һ����
 *
 * @param unsubscribes ���ȡ�����ĺ�����
 * @returns ��Ϻ��ȡ�����ĺ�����
 */
function composeDesktopUnsubscribe(...unsubscribes) {
    let disposed = false;
    /**
     * ͳһִ��������
     */
    function unsubscribeAll() {
        if (disposed) {
            return;
        }
        disposed = true;
        for (const unsubscribe of unsubscribes) {
            unsubscribe();
        }
    }
    return unsubscribeAll;
}
