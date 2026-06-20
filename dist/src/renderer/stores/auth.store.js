"use strict";
/**
 * @file 认证 Store，管理登录态、用户信息、token。
 *
 * 注意：Electron 环境下 token 存储应使用安全存储（keytar / safeStorage），
 * 本实现使用 localStorage 作为占位，生产环境需替换。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuthStore = createAuthStore;
exports.useAuthStore = useAuthStore;
const base_1 = require("./base");
const constants_1 = require("../constants");
/** 认证 Store 单例 */
let authStoreInstance = null;
/**
 * 创建认证 Store。
 */
function createAuthStore() {
    if (authStoreInstance)
        return authStoreInstance;
    const state = (0, base_1.defineState)({
        token: base_1.storage.get(constants_1.STORAGE_KEYS.AUTH_TOKEN, null),
        user: base_1.storage.get(constants_1.STORAGE_KEYS.AUTH_USER, null),
        loginLoading: false,
        loginError: null,
        restored: false
    });
    const isLoggedIn = (0, base_1.computedRef)(() => !!state.token && !!state.user);
    const userRoles = (0, base_1.computedRef)(() => state.user?.roles ?? []);
    /**
     * 占位登录实现（无实际认证后端）。
     *
     * 生产环境应替换为真实 IPC 或 HTTP 调用。
     */
    async function login(username, _password) {
        state.loginLoading = true;
        state.loginError = null;
        try {
            // 模拟登录延迟
            await new Promise((resolve) => setTimeout(resolve, 500));
            const user = {
                id: `user-${Date.now()}`,
                username,
                displayName: username,
                roles: ['user']
            };
            const token = `mock-token-${Date.now()}`;
            state.token = token;
            state.user = user;
            base_1.storage.set(constants_1.STORAGE_KEYS.AUTH_TOKEN, token);
            base_1.storage.set(constants_1.STORAGE_KEYS.AUTH_USER, user);
            return user;
        }
        catch (error) {
            state.loginError = error instanceof Error ? error.message : String(error);
            throw error;
        }
        finally {
            state.loginLoading = false;
        }
    }
    /**
     * 登出，清理全部敏感状态。
     */
    async function logout() {
        state.token = null;
        state.user = null;
        base_1.storage.remove(constants_1.STORAGE_KEYS.AUTH_TOKEN);
        base_1.storage.remove(constants_1.STORAGE_KEYS.AUTH_USER);
        base_1.storage.remove(constants_1.STORAGE_KEYS.PERMISSIONS);
    }
    /**
     * 恢复会话（从本地存储读取 token 与用户）。
     */
    function restoreSession() {
        // state 初始化时已读取，此处仅标记恢复完成
        state.restored = true;
    }
    function setToken(token) {
        state.token = token;
        if (token) {
            base_1.storage.set(constants_1.STORAGE_KEYS.AUTH_TOKEN, token);
        }
        else {
            base_1.storage.remove(constants_1.STORAGE_KEYS.AUTH_TOKEN);
        }
    }
    function setUser(user) {
        state.user = user;
        if (user) {
            base_1.storage.set(constants_1.STORAGE_KEYS.AUTH_USER, user);
        }
        else {
            base_1.storage.remove(constants_1.STORAGE_KEYS.AUTH_USER);
        }
    }
    const store = {
        $id: 'auth',
        state,
        isLoggedIn,
        userRoles,
        login,
        logout,
        restoreSession,
        setToken,
        setUser,
        $reset: () => {
            state.token = null;
            state.user = null;
            state.loginLoading = false;
            state.loginError = null;
            base_1.storage.remove(constants_1.STORAGE_KEYS.AUTH_TOKEN);
            base_1.storage.remove(constants_1.STORAGE_KEYS.AUTH_USER);
        }
    };
    (0, base_1.registerStore)(store);
    authStoreInstance = store;
    return store;
}
/**
 * 获取认证 Store 单例。
 */
function useAuthStore() {
    if (!authStoreInstance) {
        return createAuthStore();
    }
    return authStoreInstance;
}
