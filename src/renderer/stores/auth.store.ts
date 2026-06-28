/**
 * @file 认证 Store，管理登录态、用户信息、token。
 *
 * 通过 IPC 调用主进程 AuthService 完成本地鉴权:
 * - login 调用 window.desktop.auth.login 校验密码并换取 token
 * - logout 调用 window.desktop.auth.logout 销毁会话
 * - restoreSession 启动时校验本地 token 是否仍然有效
 *
 * token 持久化到 localStorage,主进程会话表为真实来源。
 */

import { defineState, computedRef, storage, registerStore } from './base'
import type { StoreBase } from './base'
import { STORAGE_KEYS } from '../constants'
import { authClient } from '../services/auth.client'
import { usePermissionStore } from './permission.store'

/**
 * 用户信息。
 */
export interface AuthUser {
  id: string
  username: string
  displayName: string
  avatar?: string
  roles: string[]
  /** 是否需要强制修改密码 */
  mustChangePassword?: boolean
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
  /** 恢复会话(校验本地 token 是否仍然有效) */
  restoreSession: () => Promise<void>
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
   * 登录:调用主进程 AuthService 校验密码并换取 token。
   *
   * 成功后持久化 token 与用户信息,并把权限下发给 permissionStore。
   */
  async function login(username: string, password: string): Promise<AuthUser> {
    state.loginLoading = true
    state.loginError = null
    try {
      const result = await authClient.login({ username, password })

      const user: AuthUser = {
        id: result.user.id,
        username: result.user.username,
        displayName: result.user.displayName,
        roles: result.user.roles,
        mustChangePassword: result.mustChangePassword
      }

      state.token = result.token
      state.user = user
      storage.set(STORAGE_KEYS.AUTH_TOKEN, result.token)
      storage.set(STORAGE_KEYS.AUTH_USER, user)

      // 把登录下发的权限交给 permissionStore
      usePermissionStore().setPermissions(result.permissions)

      return user
    } catch (error) {
      state.loginError = error instanceof Error ? error.message : String(error)
      throw error
    } finally {
      state.loginLoading = false
    }
  }

  /**
   * 登出:通知主进程销毁会话,并清理全部敏感状态。
   */
  async function logout(): Promise<void> {
    const token = state.token
    if (token) {
      try {
        await authClient.logout({ token })
      } catch {
        // 主进程销毁失败不阻塞本地清理
      }
    }
    state.token = null
    state.user = null
    storage.remove(STORAGE_KEYS.AUTH_TOKEN)
    storage.remove(STORAGE_KEYS.AUTH_USER)
    storage.remove(STORAGE_KEYS.PERMISSIONS)
    // 清空权限 Store
    usePermissionStore().clear()
  }

  /**
   * 恢复会话:从本地存储读取 token,并调用主进程校验其仍然有效。
   *
   * token 失效或过期时清空本地登录态。
   */
  async function restoreSession(): Promise<void> {
    const token = storage.get<string | null>(STORAGE_KEYS.AUTH_TOKEN, null)
    if (!token) {
      state.restored = true
      return
    }

    try {
      const result = await authClient.verify({ token })
      const user: AuthUser = {
        id: result.user.id,
        username: result.user.username,
        displayName: result.user.displayName,
        roles: result.user.roles,
        mustChangePassword: result.user.mustChangePassword
      }
      state.token = token
      state.user = user
      storage.set(STORAGE_KEYS.AUTH_USER, user)
      usePermissionStore().setPermissions(result.permissions)
    } catch {
      // token 无效或已过期,清空本地登录态
      state.token = null
      state.user = null
      storage.remove(STORAGE_KEYS.AUTH_TOKEN)
      storage.remove(STORAGE_KEYS.AUTH_USER)
      storage.remove(STORAGE_KEYS.PERMISSIONS)
      usePermissionStore().clear()
    } finally {
      state.restored = true
    }
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
