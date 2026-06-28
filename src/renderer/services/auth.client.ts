/**
 * @file 鉴权客户端,renderer 唯一访问本地鉴权的入口。
 *
 * 封装 window.desktop.auth 的 IPC 调用,提供类型安全的鉴权方法。
 */

import type {
  AuthChangePasswordInput,
  AuthChangePasswordOutput,
  AuthCurrentUserInput,
  AuthCurrentUserOutput,
  AuthLoginInput,
  AuthLoginOutput,
  AuthLogoutInput,
  AuthLogoutOutput,
  AuthVerifyInput,
  AuthVerifyOutput
} from '../../../electron/ipcBus/renderer/desktop-api'

/**
 * 获取 desktop API。
 */
function getDesktop(): Window['desktop'] {
  if (typeof window === 'undefined' || !window.desktop) {
    throw new Error('window.desktop is not available. Preload may not have loaded.')
  }
  return window.desktop
}

/**
 * 鉴权客户端。
 */
export const authClient = {
  /**
   * 登录,校验密码并换取会话 token。
   */
  async login(input: AuthLoginInput): Promise<AuthLoginOutput> {
    return getDesktop().auth.login(input)
  },

  /**
   * 登出,销毁当前会话 token。
   */
  async logout(input: AuthLogoutInput): Promise<AuthLogoutOutput> {
    return getDesktop().auth.logout(input)
  },

  /**
   * 校验会话 token 有效性,返回用户与权限。
   */
  async verify(input: AuthVerifyInput): Promise<AuthVerifyOutput> {
    return getDesktop().auth.verify(input)
  },

  /**
   * 修改当前用户密码。
   */
  async changePassword(input: AuthChangePasswordInput): Promise<AuthChangePasswordOutput> {
    return getDesktop().auth.changePassword(input)
  },

  /**
   * 依据 token 获取当前登录用户信息与权限。
   */
  async currentUser(input: AuthCurrentUserInput): Promise<AuthCurrentUserOutput> {
    return getDesktop().auth.currentUser(input)
  }
}
