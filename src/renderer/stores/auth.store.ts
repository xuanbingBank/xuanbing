/**
 * @file 认证 Store，管理登录态、用户信息、token。
 *
 * 注意：Electron 环境下 token 存储应使用安全存储（keytar / safeStorage），
 * 本实现使用 localStorage 作为占位，生产环境需替换。
 */

import { defineState, computedRef, storage, registerStore } from './base'
import type { StoreBase } from './base'
import { STORAGE_KEYS } from '../constants'

/**
 * 用户信息。
 */
export interface AuthUser {
  id: string
  username: string
  displayName: string
  avatar?: string
  roles: string[]
}

/**
 * 认证 Store 状态。
 */
interface AuthState {
  token: string | null
  user: AuthUser | null
  loginLoading: boolean
  loginError: string | null
  /** 会话恢复是否完成 */
  restored: boolean
}

/**
 * 认证 Store 实例类型。
 */
export interface AuthStore extends StoreBase {
  state: AuthState
  /** 是否已登录 */
  isLoggedIn: ReturnType<typeof Vue.computed>
  /** 当前用户角色列表 */
  userRoles: ReturnType<typeof Vue.computed>
  /** 登录 */
  login: (username: string, password: string) => Promise<AuthUser>
  /** 登出 */
  logout: () => Promise<void>
  /** 恢复会话 */
  restoreSession: () => void
  /** 设置 token */
  setToken: (token: string | null) => void
  /** 设置用户 */
  setUser: (user: AuthUser | null) => void
}

/** 认证 Store 单例 */
let authStoreInstance: AuthStore | null = null

/**
 * 创建认证 Store。
 */
export function createAuthStore(): AuthStore {
  if (authStoreInstance) return authStoreInstance

  const state = defineState<AuthState>({
    token: null,
    user: storage.get<AuthUser | null>(STORAGE_KEYS.AUTH_USER, null),
    loginLoading: false,
    loginError: null,
    restored: false
  })

  const isLoggedIn = computedRef<boolean>(() => !!state.token && !!state.user)
  const userRoles = computedRef<string[]>(() => state.user?.roles ?? [])

  /**
   * 占位登录实现（无实际认证后端）。
   *
   * 生产环境应替换为真实 IPC 或 HTTP 调用。
   */
  async function login(username: string, _password: string): Promise<AuthUser> {
    state.loginLoading = true
    state.loginError = null
    try {
      // 模拟登录延迟
      await new Promise((resolve) => setTimeout(resolve, 500))

      const user: AuthUser = {
        id: `user-${Date.now()}`,
        username,
        displayName: username,
        roles: ['user']
      }

      const token = `desktop-session-${Date.now()}`
      state.token = token
      state.user = user
      storage.set(STORAGE_KEYS.AUTH_USER, user)

      return user
    } catch (error) {
      state.loginError = error instanceof Error ? error.message : String(error)
      throw error
    } finally {
      state.loginLoading = false
    }
  }

  /**
   * 登出，清理全部敏感状态。
   */
  async function logout(): Promise<void> {
    state.token = null
    state.user = null
    storage.remove(STORAGE_KEYS.AUTH_TOKEN)
    storage.remove(STORAGE_KEYS.AUTH_USER)
    storage.remove(STORAGE_KEYS.PERMISSIONS)
  }

  /**
   * 恢复会话（从本地存储读取 token 与用户）。
   */
  function restoreSession(): void {
    // state 初始化时已读取，此处仅标记恢复完成
    state.restored = true
  }

  function setToken(token: string | null): void {
    state.token = token
    storage.remove(STORAGE_KEYS.AUTH_TOKEN)
  }

  function setUser(user: AuthUser | null): void {
    state.user = user
    if (user) {
      storage.set(STORAGE_KEYS.AUTH_USER, user)
    } else {
      storage.remove(STORAGE_KEYS.AUTH_USER)
    }
  }

  const store: AuthStore = {
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
      state.token = null
      state.user = null
      state.loginLoading = false
      state.loginError = null
      storage.remove(STORAGE_KEYS.AUTH_TOKEN)
      storage.remove(STORAGE_KEYS.AUTH_USER)
    }
  }

  registerStore(store)
  authStoreInstance = store
  return store
}

/**
 * 获取认证 Store 单例。
 */
export function useAuthStore(): AuthStore {
  if (!authStoreInstance) {
    return createAuthStore()
  }
  return authStoreInstance
}
