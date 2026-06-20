"use strict";
/**
 * @file ʵ�������̲�ͳһ IPC ���ߣ�����ע�ᡢУ�顢Ȩ�ޡ���ʱ����־���¼��·���
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IpcMainBus = void 0;
const node_crypto_1 = require("node:crypto");
const contracts_1 = require("../shared/contracts");
const zod_1 = require("../shared/zod");
const ipc_context_1 = require("./ipc-context");
const ipc_errors_1 = require("./ipc-errors");
const ipc_permissions_1 = require("./ipc-permissions");
/**
 * ͳһ���������� IPC ������ʵ�֡�
 */
class IpcMainBus {
    /**
     * ��ʼ�����������ߡ�
     *
     * @param options ���߳�ʼ�����á�
     */
    constructor(options) {
        this.handlers = new Map();
        this.eventRegistry = new Map();
        this.subscriptions = new Map();
        this.activeSubscriptions = new Map();
        this.rateLimitState = new Map();
        this.started = false;
        this.ipcMain = options.ipcMain;
        this.logger = options.logger;
        this.windowManager = options.windowManager;
        this.environment = options.environment;
        this.permissionChecker = (0, ipc_permissions_1.createPermissionChecker)({
            environment: options.environment,
            rolePermissions: options.rolePermissions ?? {}
        });
        for (const contract of Object.values(contracts_1.eventContracts)) {
            this.eventRegistry.set(contract.event, contract);
        }
    }
    /**
     * �������߲�Ϊ����������������ͨ������ͳһ��ڡ�
     */
    async start() {
        if (this.started) {
            return;
        }
        for (const contract of Object.values(contracts_1.requestContracts)) {
            this.ipcMain.handle(contract.channel, (event, payload) => this.dispatchInvoke(contract.channel, event, payload));
        }
        this.started = true;
    }
    /**
     * �������߲��������������붩�ġ�
     */
    dispose() {
        for (const contract of Object.values(contracts_1.requestContracts)) {
            this.ipcMain.removeHandler(contract.channel);
        }
        for (const windowId of [...this.activeSubscriptions.keys()]) {
            this.cleanupWindow(windowId);
        }
        this.started = false;
    }
    /**
     * ע��һ������������
     *
     * @param contract ������Լ��
     * @param handler ������ʵ�֡�
     * @param options ����ʱѡ�
     */
    registerHandler(contract, handler, options = {}) {
        if (this.handlers.has(contract.channel)) {
            throw (0, ipc_errors_1.createIpcError)('IPC_CONFLICT', `IPC handler already registered for ${contract.channel}.`);
        }
        this.handlers.set(contract.channel, {
            contract: contract,
            handler: handler,
            options
        });
    }
    /**
     * ע��һ������������
     *
     * @param channel ����ͨ����
     */
    unregisterHandler(channel) {
        this.handlers.delete(channel);
    }
    /**
     * ע��һ���¼���Լ��
     *
     * @param contract �¼���Լ��
     */
    registerEvent(contract) {
        this.eventRegistry.set(contract.event, contract);
    }
    /**
     * ע��һ�������̵���Ⱦ���̵Ķ���Դ��
     *
     * @param contract �¼���Լ��
     * @param subscribe ��������������
     */
    registerSubscription(contract, subscribe) {
        this.subscriptions.set(contract.event, {
            contract: contract,
            subscribe: subscribe
        });
    }
    /**
     * ����ָ�������ϵ�һ�����ġ�
     *
     * @param windowId ���ڱ�ʶ��
     * @param eventChannel �¼�ͨ����
     * @param input �������롣
     * @returns ȡ�����ĺ�����
     */
    activateSubscription(windowId, eventChannel, input) {
        const subscription = this.subscriptions.get(eventChannel);
        if (!subscription) {
            throw (0, ipc_errors_1.createIpcError)('IPC_HANDLER_NOT_FOUND', `Subscription ${eventChannel} is not registered.`);
        }
        const cleanup = subscription.subscribe({
            input: input,
            windowId,
            send: (payload) => {
                this.sendToWindow(windowId, eventChannel, payload);
            }
        });
        const windowSubscriptions = this.activeSubscriptions.get(windowId) ?? new Map();
        const channelSubscriptions = windowSubscriptions.get(eventChannel) ?? new Set();
        const unsubscribe = () => {
            cleanup?.();
            channelSubscriptions.delete(unsubscribe);
        };
        channelSubscriptions.add(unsubscribe);
        windowSubscriptions.set(eventChannel, channelSubscriptions);
        this.activeSubscriptions.set(windowId, windowSubscriptions);
        return unsubscribe;
    }
    /**
     * ����ĳ�������µ����ж��ġ�
     *
     * @param windowId ���ڱ�ʶ��
     */
    cleanupWindow(windowId) {
        const windowSubscriptions = this.activeSubscriptions.get(windowId);
        if (!windowSubscriptions) {
            return;
        }
        for (const callbacks of windowSubscriptions.values()) {
            for (const callback of callbacks.values()) {
                callback();
            }
        }
        this.activeSubscriptions.delete(windowId);
    }
    /**
     * �ж�ĳ������ͨ���Ƿ��Ѿ�ע�ᴦ������
     *
     * @param channel ����ͨ����
     * @returns �Ƿ���ע�ᡣ
     */
    hasHandler(channel) {
        return this.handlers.has(channel);
    }
    /**
     * �г���ǰ������ע������������
     *
     * @returns ����ͨ���б���
     */
    listHandlers() {
        return [...this.handlers.keys()];
    }
    /**
     * ��ָ�����ڷ���У�����¼���
     *
     * @param windowId ���ڱ�ʶ��
     * @param eventChannel �¼�ͨ����
     * @param payload �¼��غɡ�
     * @returns �Ƿ��ͳɹ���
     */
    sendToWindow(windowId, eventChannel, payload) {
        const contract = this.requireEventContract(eventChannel);
        const parsedPayload = this.parseSchema(contract.payloadSchema, payload, eventChannel, 'output');
        return this.windowManager.sendToWindow(windowId, eventChannel, parsedPayload);
    }
    /**
     * �����д��ڹ㲥У�����¼���
     *
     * @param eventChannel �¼�ͨ����
     * @param payload �¼��غɡ�
     * @returns ʵ���ʹ�Ĵ���������
     */
    broadcast(eventChannel, payload) {
        const contract = this.requireEventContract(eventChannel);
        const parsedPayload = this.parseSchema(contract.payloadSchema, payload, eventChannel, 'output');
        return this.windowManager.broadcast(eventChannel, parsedPayload);
    }
    /**
     * ��ǰ���㴰�ڷ����¼���
     *
     * @param eventChannel �¼�ͨ����
     * @param payload �¼��غɡ�
     * @returns �Ƿ��ͳɹ���
     */
    sendToFocusedWindow(eventChannel, payload) {
        const contract = this.requireEventContract(eventChannel);
        const parsedPayload = this.parseSchema(contract.payloadSchema, payload, eventChannel, 'output');
        return this.windowManager.sendToFocusedWindow(eventChannel, parsedPayload);
    }
    /**
     * ִ��һ��ͳһ��������������á�
     *
     * @param channel ����ͨ����
     * @param event ԭʼ Electron �¼���
     * @param rawInput ԭʼ�����غɡ�
     * @returns ͳһ����ṹ��
     */
    async dispatchInvoke(channel, event, rawInput) {
        const requestId = this.createRequestId();
        const startedAt = Date.now();
        const payloadSize = this.measurePayloadBytes(rawInput);
        let timedOut = false;
        let aborted = false;
        try {
            const record = this.handlers.get(channel);
            if (!record) {
                throw (0, ipc_errors_1.createIpcError)('IPC_HANDLER_NOT_FOUND', `No IPC handler is registered for ${channel}.`);
            }
            const senderWindowId = this.windowManager.getWindowIdBySenderId(event.sender?.id);
            const windowRole = this.windowManager.getWindowRole(senderWindowId);
            const permissionDecision = this.permissionChecker({
                contract: record.contract,
                senderWindowId,
                windowRole
            });
            if (!permissionDecision.allowed) {
                throw (0, ipc_errors_1.createIpcError)('IPC_FORBIDDEN', `The renderer is not allowed to call ${channel}.`, {
                    reason: permissionDecision.reason
                });
            }
            const payloadLimit = record.options.maxPayloadBytes ?? record.contract.maxPayloadBytes;
            if (payloadLimit !== undefined && payloadSize > payloadLimit) {
                throw (0, ipc_errors_1.createIpcError)('IPC_PAYLOAD_TOO_LARGE', `The request payload for ${channel} is too large.`, {
                    payloadSize,
                    payloadLimit
                });
            }
            this.enforceRateLimit(channel, senderWindowId, record.contract);
            const parsedInput = this.parseSchema(record.contract.inputSchema, rawInput, channel, 'input');
            const controller = new AbortController();
            const timeoutMs = record.options.timeoutMs ?? record.contract.timeoutMs ?? 15000;
            const context = (0, ipc_context_1.createIpcContext)({
                channel,
                event,
                logger: this.logger,
                requestId,
                signal: controller.signal,
                startedAt,
                windowManager: this.windowManager
            });
            const timer = setTimeout(() => {
                timedOut = true;
                controller.abort();
            }, timeoutMs);
            try {
                const rawOutput = await Promise.race([
                    record.handler({
                        ...context,
                        input: parsedInput
                    }),
                    new Promise((_resolve, reject) => {
                        controller.signal.addEventListener('abort', () => {
                            if (timedOut) {
                                reject((0, ipc_errors_1.createIpcError)('IPC_TIMEOUT', `${channel} timed out after ${timeoutMs}ms.`, undefined, 'timeout', true));
                                return;
                            }
                            aborted = true;
                            reject((0, ipc_errors_1.createIpcError)('IPC_ABORTED', `${channel} was canceled.`, undefined, 'abort', true));
                        }, { once: true });
                    })
                ]);
                const parsedOutput = this.parseSchema(record.contract.outputSchema, rawOutput, channel, 'output');
                return this.buildSuccessResult(parsedOutput, {
                    requestId,
                    startedAt,
                    payloadSize,
                    channel,
                    senderWindowId
                });
            }
            finally {
                clearTimeout(timer);
            }
        }
        catch (error) {
            const normalized = (0, ipc_errors_1.normalizeIpcError)(timedOut
                ? (0, ipc_errors_1.createIpcError)('IPC_TIMEOUT', `${channel} timed out.`, undefined, 'timeout', true)
                : error, this.environment);
            return this.buildErrorResult(normalized, {
                requestId,
                startedAt,
                payloadSize,
                channel,
                senderWindowId: this.windowManager.getWindowIdBySenderId(event.sender?.id),
                timedOut,
                aborted
            });
        }
    }
    /**
     * ʹ����Լģ��У������������
     *
     * @param schema У��ģ�͡�
     * @param value ��У��ֵ��
     * @param channel ��ǰͨ����
     * @param phase ��ǰ�׶Ρ�
     * @returns У����ֵ��
     */
    parseSchema(schema, value, channel, phase) {
        try {
            if (typeof schema.safeParse === 'function') {
                const result = schema.safeParse(value);
                if (!result.success) {
                    throw result.error;
                }
                return result.data;
            }
            return schema.parse(value);
        }
        catch (error) {
            if (error instanceof zod_1.ZodValidationError || error instanceof Error) {
                throw (0, ipc_errors_1.createIpcError)('IPC_VALIDATION_ERROR', `The ${phase} for ${channel} is invalid.`, error);
            }
            throw error;
        }
    }
    /**
     * ִ�����������ж���
     *
     * @param channel ��ǰͨ����
     * @param senderWindowId ������õĴ��ڱ�ʶ��
     * @param contract ������Լ��
     */
    enforceRateLimit(channel, senderWindowId, contract) {
        if (!contract.rateLimit || senderWindowId === undefined) {
            return;
        }
        const key = `${senderWindowId}:${channel}`;
        const now = Date.now();
        const windowStart = now - contract.rateLimit.windowMs;
        const history = (this.rateLimitState.get(key) ?? []).filter((timestamp) => timestamp >= windowStart);
        if (history.length >= contract.rateLimit.maxCalls) {
            throw (0, ipc_errors_1.createIpcError)('IPC_RATE_LIMITED', `Too many ${channel} calls were made.`, undefined, 'rate-limit', true);
        }
        history.push(now);
        this.rateLimitState.set(key, history);
    }
    /**
     * ��ȡ�¼���Լ��δע��ʱ�׳���׼����
     *
     * @param eventChannel �¼�ͨ����
     * @returns ��Ӧ�¼���Լ��
     */
    requireEventContract(eventChannel) {
        const contract = this.eventRegistry.get(eventChannel);
        if (!contract) {
            throw (0, ipc_errors_1.createIpcError)('IPC_UNKNOWN_CHANNEL', `Unknown event channel ${eventChannel}.`);
        }
        return contract;
    }
    /**
     * �����غ����л���Ľ����ֽڴ�С��
     *
     * @param payload ԭʼ�غɡ�
     * @returns �����ֽڴ�С��
     */
    measurePayloadBytes(payload) {
        if (payload === undefined) {
            return 0;
        }
        return new TextEncoder().encode(JSON.stringify(payload)).length;
    }
    /**
     * ���������ʶ��
     *
     * @returns �����ʶ�ַ�����
     */
    createRequestId() {
        try {
            return (0, node_crypto_1.randomUUID)();
        }
        catch {
            return `ipc-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        }
    }
    /**
     * ���ɳɹ���Ӧ��д��־��
     *
     * @param data �ɹ����ݡ�
     * @param metrics ��־��Ԫ��Ϣ��
     * @returns ͳһ�ɹ������
     */
    buildSuccessResult(data, metrics) {
        const durationMs = Date.now() - metrics.startedAt;
        this.logger.log({
            requestId: metrics.requestId,
            channel: metrics.channel,
            senderWindowId: metrics.senderWindowId,
            durationMs,
            result: 'success',
            payloadSize: metrics.payloadSize,
            timestamp: new Date(metrics.startedAt).toISOString(),
            environment: this.environment,
            timedOut: false,
            aborted: false
        });
        return {
            ok: true,
            data,
            meta: {
                requestId: metrics.requestId,
                durationMs
            }
        };
    }
    /**
     * ����ʧ����Ӧ��д��־��
     *
     * @param error ��׼���������
     * @param metrics ��־��Ԫ��Ϣ��
     * @returns ͳһʧ�ܽ����
     */
    buildErrorResult(error, metrics) {
        const durationMs = Date.now() - metrics.startedAt;
        this.logger.log({
            requestId: metrics.requestId,
            channel: metrics.channel,
            senderWindowId: metrics.senderWindowId,
            durationMs,
            result: 'failure',
            errorCode: error.code,
            payloadSize: metrics.payloadSize,
            timestamp: new Date(metrics.startedAt).toISOString(),
            environment: this.environment,
            timedOut: metrics.timedOut,
            aborted: metrics.aborted
        });
        return {
            ok: false,
            error,
            meta: {
                requestId: metrics.requestId,
                durationMs
            }
        };
    }
}
exports.IpcMainBus = IpcMainBus;
