"use strict";
/**
 * @file ʵ�� preload �ڲ�ʹ�õİ�ȫ IPC �ͻ��ˣ�����ͳһ��������У���¼����������ġ�
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSafeParseSchema = isSafeParseSchema;
exports.parseWithSchema = parseWithSchema;
exports.unwrapIpcResult = unwrapIpcResult;
exports.createPreloadClient = createPreloadClient;
const shared_1 = require("../shared");
/**
 * �ж�ģ���Ƿ�֧�� `safeParse`��
 *
 * @param schema �����ģ�͡�
 * @returns �Ƿ�֧�� `safeParse`��
 */
function isSafeParseSchema(schema) {
    return 'safeParse' in schema;
}
/**
 * ʹ��ģ�ͽ�������ֵ��
 *
 * @param schema ģ�͡�
 * @param value ԭʼֵ��
 * @returns У����ֵ��
 */
function parseWithSchema(schema, value) {
    if (isSafeParseSchema(schema)) {
        const result = schema.safeParse(value);
        if (!result.success) {
            throw result.error;
        }
        return result.data;
    }
    return schema.parse(value);
}
/**
 * ͳһ��������̷��ص� Result �ṹ��
 *
 * @param value �����̷���ֵ��
 * @returns �����ĳɹ����ݡ�
 */
function unwrapIpcResult(value) {
    const parsedResult = parseWithSchema(shared_1.ipcResultSchema, value);
    if (!parsedResult.ok) {
        throw parsedResult.error;
    }
    return parsedResult.data;
}
/**
 * ���� preload IPC �ͻ��ˡ�
 *
 * @param dependencies ����ʱ������
 * @returns preload �ͻ���ʵ����
 */
function createPreloadClient(dependencies) {
    const subscriptions = new Set();
    let disposed = false;
    /**
     * �ͷ����ж��ġ�
     */
    function dispose() {
        if (disposed) {
            return;
        }
        disposed = true;
        for (const unsubscribe of [...subscriptions]) {
            unsubscribe();
        }
        subscriptions.clear();
        if (dependencies.windowTarget) {
            dependencies.windowTarget.removeEventListener('unload', dispose);
        }
    }
    if (dependencies.windowTarget) {
        dependencies.windowTarget.addEventListener('unload', dispose, { once: true });
    }
    return {
        /**
         * ����ԭʼ���󲢷���δ��������
         */
        async rawInvoke(channel, payload) {
            return dependencies.ipcRenderer.invoke(channel, payload);
        },
        /**
         * �������󡢽��ͳһ������ٴ���Ŀ��ģ��У��ɹ����ݡ�
         */
        async safeInvoke(channel, schema, payload) {
            const rawResult = await dependencies.ipcRenderer.invoke(channel, payload);
            const unwrapped = unwrapIpcResult(rawResult);
            return parseWithSchema(schema, unwrapped);
        },
        /**
         * �����������¼����ڻص�ǰ������У�顣
         */
        subscribe(channel, schema, listener, options = {}) {
            let subscriptionDisposed = false;
            /**
             * ����һ���¼��ص���
             *
             * @param _event ԭʼ�¼����󣬿��ⶪ����
             * @param payload ԭʼ�غɡ�
             */
            function handleIpcEvent(_event, payload) {
                try {
                    listener(parseWithSchema(schema, payload));
                }
                catch (error) {
                    options.onError?.(error);
                }
            }
            /**
             * ȡ����ǰ���ġ�
             */
            function unsubscribe() {
                if (subscriptionDisposed) {
                    return;
                }
                subscriptionDisposed = true;
                dependencies.ipcRenderer.removeListener(channel, handleIpcEvent);
                subscriptions.delete(unsubscribe);
            }
            dependencies.ipcRenderer.on(channel, handleIpcEvent);
            subscriptions.add(unsubscribe);
            return unsubscribe;
        },
        dispose
    };
}
