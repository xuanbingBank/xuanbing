/**
 * @file .xuanbing 文件 IPC 处理器（对话框、预览、校验、导出、dryRun 导入、正式导入）。
 *
 * renderer 不传任意路径，通过 dialog 生成 fileRef / token。
 * fileRef 有过期时间。
 * import 必须先 dryRun。
 * readPreview 不返回敏感 payload。
 * 所有文件操作记录审计日志（由 service 层完成）。
 */

import { dialog } from 'electron'
import { IPC_CHANNELS, XUANBING_DOT_EXTENSION, requestContracts } from '../../shared'
import type { IpcMainBus } from '../ipc-main-bus'
import type { XuanbingFileService } from '../../../services/xuanbing-file.service'
import type { XuanbingFileRef } from '../../../file-db/xuanbing-file-types'
import type { XuanbingConflictStrategy, XuanbingFileType } from '../../shared/database'

interface FileDialogInput {
  title?: string
  defaultPath?: string
}

interface FileRefInput {
  fileRef: XuanbingFileRef
}

interface ExportPackageInput {
  fileRef: XuanbingFileRef
  type: string
  metadata?: {
    name?: string
    description?: string
    author?: string
    tags?: string[]
  }
  redact?: boolean
}

interface DryRunImportInput {
  fileRef: XuanbingFileRef
  conflictStrategy?: string
}

interface ImportPackageInput {
  fileRef: XuanbingFileRef
  plan: {
    fileRef: XuanbingFileRef
    fileType: string
    schemaVersion: number
    items: Array<{
      key: string
      action: string
      reason?: string
      existingId?: string
    }>
    summary: {
      create: number
      update: number
      skip: number
      conflict: number
      error: number
      total: number
    }
    conflictStrategy: string
    dryRunChecksum?: string
  }
}

export interface XuanbingFileIpcModuleOptions {
  bus: IpcMainBus
  xuanbingFileService: XuanbingFileService
}

/**
 * 注册 .xuanbing 文件 IPC 处理器。
 *
 * @param options 模块选项。
 */
export function registerXuanbingFileIpc(options: XuanbingFileIpcModuleOptions): void {
  const { bus, xuanbingFileService } = options

  bus.registerHandler(requestContracts[IPC_CHANNELS.xuanbingFileOpenDialog], async ({ input }) => {
    const dialogInput = input as FileDialogInput

    const result = await dialog.showOpenDialog({
      title: dialogInput.title ?? '选择 .xuanbing 文件',
      defaultPath: dialogInput.defaultPath,
      properties: ['openFile'],
      filters: [
        { name: 'Xuanbing File', extensions: [XUANBING_DOT_EXTENSION.slice(1)] }
      ]
    })

    if (result.canceled || result.filePaths.length === 0) {
      return {
        canceled: true,
        fileRef: null
      }
    }

    const fileRef = xuanbingFileService.registerFileRef(result.filePaths[0], 'read')
    return {
      canceled: false,
      fileRef
    }
  })

  bus.registerHandler(requestContracts[IPC_CHANNELS.xuanbingFileSaveDialog], async ({ input }) => {
    const dialogInput = input as FileDialogInput

    const result = await dialog.showSaveDialog({
      title: dialogInput.title ?? '保存 .xuanbing 文件',
      defaultPath: dialogInput.defaultPath ?? `export-${Date.now()}${XUANBING_DOT_EXTENSION}`,
      filters: [
        { name: 'Xuanbing File', extensions: [XUANBING_DOT_EXTENSION.slice(1)] }
      ]
    })

    if (result.canceled || !result.filePath) {
      return {
        canceled: true,
        fileRef: null
      }
    }

    const fileRef = xuanbingFileService.registerFileRef(result.filePath, 'write')
    return {
      canceled: false,
      fileRef
    }
  })

  bus.registerHandler(requestContracts[IPC_CHANNELS.xuanbingFileReadPreview], async ({ input }) => {
    const refInput = input as FileRefInput
    return xuanbingFileService.readPreview(refInput.fileRef)
  })

  bus.registerHandler(requestContracts[IPC_CHANNELS.xuanbingFileValidate], async ({ input }) => {
    const refInput = input as FileRefInput
    return xuanbingFileService.validate(refInput.fileRef)
  })

  bus.registerHandler(requestContracts[IPC_CHANNELS.xuanbingFileExportPackage], async ({ input }) => {
    const exportInput = input as ExportPackageInput

    // 通过 fileRef 解析真实路径（renderer 不持有路径）；导出必须使用 write 模式引用
    const filePath = xuanbingFileService.resolveFilePath(exportInput.fileRef.token, 'write')

    const result = await xuanbingFileService.exportPackage(
      filePath,
      exportInput.type as XuanbingFileType,
      exportInput.metadata,
      exportInput.redact
    )

    return {
      fileRef: result.fileRef,
      fileType: result.fileType,
      size: result.size,
      checksum: result.checksum,
      exportedAt: result.exportedAt
    }
  })

  bus.registerHandler(requestContracts[IPC_CHANNELS.xuanbingFileDryRunImport], async ({ input }) => {
    const dryRunInput = input as DryRunImportInput

    const strategy = (dryRunInput.conflictStrategy ?? 'skip') as XuanbingConflictStrategy
    const plan = xuanbingFileService.dryRunImport(dryRunInput.fileRef, strategy)

    return {
      fileRef: plan.fileRef,
      fileType: plan.fileType,
      schemaVersion: plan.schemaVersion,
      items: plan.items.map((item) => ({
        key: item.key,
        action: item.action,
        reason: item.reason,
        existingId: item.existingId
      })),
      summary: plan.summary,
      conflictStrategy: plan.conflictStrategy,
      dryRunChecksum: plan.dryRunChecksum
    }
  })

  bus.registerHandler(requestContracts[IPC_CHANNELS.xuanbingFileImportPackage], async ({ input }) => {
    const importInput = input as ImportPackageInput

    const planWithFileType = {
      ...importInput.plan,
      fileType: importInput.plan.fileType as XuanbingFileType,
      items: importInput.plan.items.map((item) => ({
        ...item,
        action: item.action as 'create' | 'update' | 'skip' | 'conflict' | 'error'
      })),
      conflictStrategy: importInput.plan.conflictStrategy as XuanbingConflictStrategy
    }
    const result = xuanbingFileService.importPackage(importInput.fileRef, planWithFileType)

    return {
      success: result.success,
      imported: result.imported,
      skipped: result.skipped,
      errors: result.errors,
      rolledBack: result.rolledBack,
      importedAt: result.importedAt
    }
  })
}
