/**
 * @file 注册文件对话框相关的 IPC 能力。
 */

import { IPC_CHANNELS, requestContracts } from '../../shared'
import { createIpcError } from '../ipc-errors'
import type { IpcMainBus } from '../ipc-main-bus'

export interface OpenDialogLike {
  title?: string
  defaultPath?: string
  buttonLabel?: string
  properties?: readonly string[]
  filters?: ReadonlyArray<{
    name: string
    extensions: readonly string[]
  }>
}

export interface DialogLike {
  showOpenDialog(options: OpenDialogLike): Promise<{
    canceled: boolean
    filePaths: string[]
  }>
}

interface FileDialogInput {
  title?: string
  defaultPath?: string
  buttonLabel?: string
  properties?: readonly string[]
  filters?: ReadonlyArray<{
    name: string
    extensions: readonly string[]
  }>
}

/**
 * 注册 `file.openDialog` 示例能力。
 *
 * 为什么必须在 main：
 * 原生文件对话框与本地路径选择属于系统级能力，必须由主进程调用。
 *
 * renderer 能拿到什么：
 * 只能拿到用户明确选择后的 `canceled` 与 `filePaths` 结果。
 *
 * renderer 不能拿到什么：
 * 拿不到 `dialog` 实例、任意文件系统读写能力或未被用户选择的路径。
 *
 * 输入如何校验：
 * 使用共享契约中的文件对话框请求模型，限制标题、按钮、属性与过滤器格式。
 *
 * 输出如何校验：
 * 使用共享契约中的文件对话框响应模型校验返回结果。
 *
 * 失败如何返回：
 * 统一返回标准 `IpcError`，并对内部错误细节做脱敏。
 *
 * 窗口关闭如何清理：
 * 该能力是一次性 request/response，不保留窗口级监听资源。
 *
 * @param bus 主进程 IPC 总线。
 * @param dialog 原生对话框适配器。
 */
export function registerFileIpc(bus: IpcMainBus, dialog: DialogLike): void {
  bus.registerHandler(requestContracts[IPC_CHANNELS.fileDialogOpen], async ({ input }) => {
    const fileDialogInput = input as FileDialogInput

    if (fileDialogInput.properties?.includes('openDirectory') && fileDialogInput.properties?.includes('openFile')) {
      throw createIpcError('IPC_UNSUPPORTED', 'Mixed file and directory selection is not supported in this example.')
    }

    return dialog.showOpenDialog({
      title: fileDialogInput.title,
      defaultPath: fileDialogInput.defaultPath,
      buttonLabel: fileDialogInput.buttonLabel,
      properties: fileDialogInput.properties,
      filters: fileDialogInput.filters
    })
  })
}
