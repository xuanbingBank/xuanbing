"use strict";
/**
 * @file 错误工具函数。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeError = normalizeError;
exports.isChunkLoadError = isChunkLoadError;
exports.isNetworkError = isNetworkError;
exports.formatErrorMessage = formatErrorMessage;
/**
 * 将未知错误格式化为 AppError。
 *
 * @param error 未知错误。
 * @param context 错误上下文（用于日志）。
 * @returns 格式化的应用错误。
 */
function normalizeError(error, context) {
    if (error instanceof Error) {
        return {
            code: 'UNKNOWN_ERROR',
            message: error.message,
            cause: error,
            retryable: true
        };
    }
    if (typeof error === 'string') {
        return {
            code: 'STRING_ERROR',
            message: error,
            retryable: true
        };
    }
    if (typeof error === 'object' && error !== null && 'message' in error) {
        const e = error;
        return {
            code: typeof e.code === 'string' ? e.code : 'OBJECT_ERROR',
            message: String(e.message),
            cause: error,
            retryable: true
        };
    }
    return {
        code: 'UNKNOWN_ERROR',
        message: context ? `${context} 发生未知错误` : '发生未知错误',
        cause: error,
        retryable: false
    };
}
/**
 * 判断是否为 chunk load 错误（懒加载失败）。
 *
 * @param error 错误对象。
 * @returns 是否为 chunk load 错误。
 */
function isChunkLoadError(error) {
    if (!(error instanceof Error))
        return false;
    const message = error.message.toLowerCase();
    return (message.includes('importing a module script failed') ||
        message.includes('error loading dynamically imported module') ||
        message.includes('failed to fetch dynamically imported module') ||
        message.includes('chunk load failed'));
}
/**
 * 判断是否为网络错误。
 *
 * @param error 错误对象。
 * @returns 是否为网络错误。
 */
function isNetworkError(error) {
    if (!(error instanceof Error))
        return false;
    const message = error.message.toLowerCase();
    return message.includes('network') || message.includes('fetch') || message.includes('timeout');
}
/**
 * 格式化错误为用户可读消息（生产环境脱敏）。
 *
 * @param error 错误对象。
 * @param isDev 是否开发环境。
 * @returns 用户可读消息。
 */
function formatErrorMessage(error, isDev) {
    const appError = normalizeError(error);
    if (isDev) {
        return `[${appError.code}] ${appError.message}`;
    }
    // 生产环境脱敏
    if (isNetworkError(error)) {
        return '网络连接异常，请检查网络后重试';
    }
    if (isChunkLoadError(error)) {
        return '页面资源加载失败，请刷新页面重试';
    }
    return appError.message || '操作失败，请稍后重试';
}
