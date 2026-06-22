/**
 * @file 设置 IPC 处理器（CRUD）。
 *
 * IPC handler 不写复杂 SQL，只调用 SettingService。
 */

import { IPC_CHANNELS, requestContracts } from '../../shared'
import type { IpcMainBus } from '../ipc-main-bus'
import type { SettingService } from '../../../services/setting.service'

interface SettingGetInput {
  namespace: string
  key: string
}

interface SettingSetInput {
  namespace: string
  key: string
  value: unknown
  valueType?: string
  description?: string
}

interface SettingListInput {
  namespace: string
}

export interface SettingIpcModuleOptions {
  bus: IpcMainBus
  settingService: SettingService
}

/**
 * 注册设置 IPC 处理器。
 *
 * @param options 模块选项。
 */
export function registerSettingIpc(options: SettingIpcModuleOptions): void {
  const { bus, settingService } = options

  bus.registerHandler(requestContracts[IPC_CHANNELS.settingGet], async ({ input }) => {
    const getInput = input as SettingGetInput
    return settingService.get(getInput.namespace, getInput.key)
  })

  bus.registerHandler(requestContracts[IPC_CHANNELS.settingSet], async ({ input }) => {
    const setInput = input as SettingSetInput
    return settingService.set({
      namespace: setInput.namespace,
      key: setInput.key,
      value: setInput.value,
      valueType: setInput.valueType as 'string' | 'number' | 'boolean' | 'json' | 'null' | undefined,
      description: setInput.description
    })
  })

  bus.registerHandler(requestContracts[IPC_CHANNELS.settingListByNamespace], async ({ input }) => {
    const listInput = input as SettingListInput
    return settingService.listByNamespace(listInput.namespace)
  })

  bus.registerHandler(requestContracts[IPC_CHANNELS.settingDelete], async ({ input }) => {
    const deleteInput = input as SettingGetInput
    const deleted = settingService.delete(deleteInput.namespace, deleteInput.key)
    return { deleted }
  })
}
