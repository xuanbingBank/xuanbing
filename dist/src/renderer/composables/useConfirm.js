"use strict";
/**
 * @file 确认对话框组合式函数，提供 Promise 风格的确认交互。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.useConfirm = useConfirm;
const base_1 = require("../stores/base");
/** 确认对话框全局状态（单例） */
const confirmState = (0, base_1.defineState)({
    visible: false,
    title: '确认操作',
    content: '',
    confirmText: '确认',
    cancelText: '取消',
    danger: false,
    resolver: null
});
/**
 * 确认对话框组合式函数。
 *
 * @returns 确认操作方法。
 */
function useConfirm() {
    function confirm(options) {
        confirmState.title = options.title ?? '确认操作';
        confirmState.content = options.content ?? '';
        confirmState.confirmText = options.confirmText ?? '确认';
        confirmState.cancelText = options.cancelText ?? '取消';
        confirmState.danger = options.danger ?? false;
        confirmState.visible = true;
        return new Promise((resolve) => {
            confirmState.resolver = resolve;
        });
    }
    function resolve(value) {
        if (confirmState.resolver) {
            confirmState.resolver(value);
            confirmState.resolver = null;
        }
        confirmState.visible = false;
    }
    return {
        state: confirmState,
        confirm,
        resolve
    };
}
