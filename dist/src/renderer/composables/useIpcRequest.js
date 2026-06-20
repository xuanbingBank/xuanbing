"use strict";
/**
 * @file IPC 请求组合式函数，封装 IPC 调用的 loading/error/data 状态管理。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.useIpcRequest = useIpcRequest;
const base_1 = require("../stores/base");
const error_1 = require("../utils/error");
/**
 * IPC 请求组合式函数。
 *
 * @param fn IPC 调用函数。
 * @returns 请求状态与方法。
 */
function useIpcRequest(fn) {
    const state = (0, base_1.defineState)({
        data: null,
        error: null,
        status: 'idle'
    });
    const data = (0, base_1.computedRef)(() => state.data);
    const error = (0, base_1.computedRef)(() => state.error);
    const status = (0, base_1.computedRef)(() => state.status);
    const loading = (0, base_1.computedRef)(() => state.status === 'loading');
    const isSuccess = (0, base_1.computedRef)(() => state.status === 'success');
    const isError = (0, base_1.computedRef)(() => state.status === 'error');
    async function execute(input) {
        state.status = 'loading';
        state.error = null;
        try {
            const result = await fn(input);
            state.data = result;
            state.status = 'success';
            return result;
        }
        catch (err) {
            state.error = (0, error_1.normalizeError)(err);
            state.status = 'error';
            throw err;
        }
    }
    function reset() {
        state.data = null;
        state.error = null;
        state.status = 'idle';
    }
    return {
        data,
        error,
        status,
        loading,
        isSuccess,
        isError,
        execute,
        reset
    };
}
