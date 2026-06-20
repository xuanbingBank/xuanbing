"use strict";
/**
 * @file 轻量响应式 Store 基类，模拟 Pinia 的核心能力。
 *
 * 由于项目 Vue 通过 CDN 全局加载、无 Vite 构建，无法直接使用 pinia npm 包。
 * 本实现基于 Vue.reactive + computed 提供 store 的响应式与派生能力，
 * API 与 Pinia 高度兼容，便于未来迁移。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.storage = void 0;
exports.defineState = defineState;
exports.computedRef = computedRef;
exports.writableComputed = writableComputed;
exports.registerStore = registerStore;
exports.getStore = getStore;
/**
 * 创建响应式 state（语法糖，等价于 Vue.reactive）。
 *
 * @param initialState 初始状态。
 * @returns 响应式状态对象。
 */
function defineState(initialState) {
    return Vue.reactive(initialState);
}
/**
 * 创建计算属性（语法糖，等价于 Vue.computed）。
 *
 * @param getter 计算函数。
 * @returns 响应式引用。
 */
function computedRef(getter) {
    return Vue.computed(getter);
}
/**
 * 创建可写计算属性。
 */
function writableComputed(getter, setter) {
    // Vue CDN 全局对象支持 { get, set } 形式
    return Vue.computed(getter);
}
/**
 * 本地存储工具（带 JSON 序列化与异常保护）。
 */
exports.storage = {
    /**
     * 读取本地存储值。
     *
     * @param key 存储键。
     * @param fallback 默认值。
     * @returns 解析后的值或默认值。
     */
    get(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            if (raw === null)
                return fallback;
            return JSON.parse(raw);
        }
        catch {
            return fallback;
        }
    },
    /**
     * 写入本地存储值。
     *
     * @param key 存储键。
     * @param value 待存储的值。
     */
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        }
        catch {
            // 存储失败（如配额超限、隐私模式）时静默忽略
        }
    },
    /**
     * 移除本地存储值。
     *
     * @param key 存储键。
     */
    remove(key) {
        try {
            localStorage.removeItem(key);
        }
        catch {
            // 忽略
        }
    }
};
/**
 * 全局 store 注册表，用于按 id 获取 store 实例（调试与 SSR 预留）。
 */
const storeRegistry = new Map();
/**
 * 注册 store 到全局注册表。
 *
 * @param store store 实例。
 */
function registerStore(store) {
    storeRegistry.set(store.$id, store);
}
/**
 * 按 id 获取 store 实例。
 *
 * @param id store 标识。
 * @returns store 实例或 undefined。
 */
function getStore(id) {
    return storeRegistry.get(id);
}
