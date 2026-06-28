/**
 * @file 鉴权 IPC 处理器,桥接渲染进程与 AuthService。
 *
 * IPC handler 不写业务逻辑,只调用 AuthService 并做 token 校验。
 * login / verify / currentUser / logout 均为 public 权限,
 * 真实鉴权通过 token 在 handler 内部完成。
 */

import { IPC_CHANNELS, requestContracts } from '../../shared'
import type { IpcMainBus } from '../ipc-main-bus'
import { createIpcError } from '../ipc-errors'
import type { AuthService } from '../../../services/auth.service'

interface AuthLoginInput {
  username: string
  password: string
}

interface AuthTokenInput {
  token: string
}

interface AuthChangePasswordInput {
  token: string
  oldPassword: string
  newPassword: string
}

export interface AuthIpcModuleOptions {
  bus: IpcMainBus
  authService: AuthService
}

/**
 * 注册鉴权 IPC 处理器。
 *
 * @param options 模块选项。
 */
export function registerAuthIpc(options: AuthIpcModuleOptions): void {
  const { bus, authService } = options

  // 登录:校验密码并换取 token
  bus.registerHandler(requestContracts[IPC_CHANNELS.authLogin], async ({ input }) => {
    const loginInput = input as AuthLoginInput
    const result = authService.login(loginInput.username, loginInput.password)
    return {
      user: result.user,
      token: result.token,
      permissions: result.permissions,
      mustChangePassword: result.mustChangePassword
    }
  })

  // 登出:销毁会话 token
  bus.registerHandler(requestContracts[IPC_CHANNELS.authLogout], async ({ input }) => {
    const tokenInput = input as AuthTokenInput
    authService.logout(tokenInput.token)
    return { success: true }
  })

  // 校验 token:返回用户与权限
  bus.registerHandler(requestContracts[IPC_CHANNELS.authVerify], async ({ input }) => {
    const tokenInput = input as AuthTokenInput
    try {
      const result = authService.verifyToken(tokenInput.token)
      return {
        user: result.user,
        permissions: result.permissions
      }
    } catch (error) {
      throw createIpcError('IPC_HANDLER_NOT_FOUND', error instanceof Error ? error.message : 'token 无效')
    }
  })

  // 修改密码:先校验 token 得到 userId,再修改密码
  bus.registerHandler(requestContracts[IPC_CHANNELS.authChangePassword], async ({ input }) => {
    const changeInput = input as AuthChangePasswordInput
    const verified = authService.verifyToken(changeInput.token)
    authService.changePassword(verified.user.id, changeInput.oldPassword, changeInput.newPassword)
    return { success: true }
  })

  // 获取当前用户:依据 token 返回用户与权限
  bus.registerHandler(requestContracts[IPC_CHANNELS.authCurrentUser], async ({ input }) => {
    const tokenInput = input as AuthTokenInput
    try {
      const result = authService.verifyToken(tokenInput.token)
      return {
        user: result.user,
        permissions: result.permissions
      }
    } catch (error) {
      throw createIpcError('IPC_HANDLER_NOT_FOUND', error instanceof Error ? error.message : 'token 无效')
    }
  })
}
