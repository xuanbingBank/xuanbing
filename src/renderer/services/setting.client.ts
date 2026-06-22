/**
 * @file 设置客户端，renderer 唯一访问设置数据的入口。
 */

import type {
  SettingDeleteOutput,
  SettingItem,
  SettingListOutput,
  SettingSetInput
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
 * 设置客户端。
 */
export const settingClient = {
  /**
   * 获取设置项。
   */
  async get(namespace: string, key: string): Promise<SettingItem | null> {
    return getDesktop().setting.get(namespace, key)
  },

  /**
   * 写入设置项。
   */
  async set(input: SettingSetInput): Promise<SettingItem> {
    return getDesktop().setting.set(input)
  },

  /**
   * 按命名空间列出设置项。
   */
  async listByNamespace(namespace: string): Promise<SettingListOutput> {
    return getDesktop().setting.listByNamespace(namespace)
  },

  /**
   * 删除设置项。
   */
  async delete(namespace: string, key: string): Promise<SettingDeleteOutput> {
    return getDesktop().setting.delete(namespace, key)
  }
}
