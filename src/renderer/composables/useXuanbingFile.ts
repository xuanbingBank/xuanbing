/**
 * @file .xuanbing 文件操作组合式函数。
 *
 * 封装导入导出流程：
 * 1. openDialog / saveDialog 获取 fileRef。
 * 2. readPreview 预览。
 * 3. dryRunImport 生成导入计划。
 * 4. importPackage 正式导入。
 * 5. exportPackage 导出。
 */

import { defineState, computedRef } from '../stores/base'
import { xuanbingFileClient } from '../services/xuanbing-file.client'
import type {
  XuanbingFileDialogOutput,
  XuanbingFileDryRunImportOutput,
  XuanbingFileExportOutput,
  XuanbingFileImportOutput,
  XuanbingFilePreviewOutput,
  XuanbingFileRef,
  XuanbingFileValidateOutput
} from '../../../electron/ipcBus/renderer/desktop-api'

/**
 * useXuanbingFile 返回值。
 */
export interface UseXuanbingFileReturn {
  /** 当前 fileRef */
  fileRef: ReturnType<typeof computedRef<XuanbingFileRef | null>>
  /** 预览结果 */
  preview: ReturnType<typeof computedRef<XuanbingFilePreviewOutput | null>>
  /** dryRun 导入计划 */
  importPlan: ReturnType<typeof computedRef<XuanbingFileDryRunImportOutput | null>>
  /** 导入结果 */
  importResult: ReturnType<typeof computedRef<XuanbingFileImportOutput | null>>
  /** 导出结果 */
  exportResult: ReturnType<typeof computedRef<XuanbingFileExportOutput | null>>
  /** 校验结果 */
  validateResult: ReturnType<typeof computedRef<XuanbingFileValidateOutput | null>>
  /** 是否加载中 */
  loading: ReturnType<typeof computedRef<boolean>>
  /** 错误 */
  error: ReturnType<typeof computedRef<Error | null>>
  /** 打开文件对话框 */
  openFile: () => Promise<XuanbingFileDialogOutput | null>
  /** 保存文件对话框 */
  saveFile: () => Promise<XuanbingFileDialogOutput | null>
  /** 读取预览 */
  readPreview: () => Promise<XuanbingFilePreviewOutput | null>
  /** 校验文件 */
  validateFile: () => Promise<XuanbingFileValidateOutput | null>
  /** dryRun 导入 */
  dryRunImport: (conflictStrategy?: string) => Promise<XuanbingFileDryRunImportOutput | null>
  /** 正式导入 */
  importPackage: () => Promise<XuanbingFileImportOutput | null>
  /** 导出 */
  exportPackage: (input: {
    fileRef: XuanbingFileRef
    type: string
    metadata?: { name?: string; description?: string; author?: string; tags?: string[] }
    redact?: boolean
  }) => Promise<XuanbingFileExportOutput | null>
  /** 重置 */
  reset: () => void
}

/**
 * .xuanbing 文件操作组合式函数。
 *
 * @returns 文件操作状态与方法。
 */
export function useXuanbingFile(): UseXuanbingFileReturn {
  const state = defineState({
    fileRef: null as XuanbingFileRef | null,
    preview: null as XuanbingFilePreviewOutput | null,
    importPlan: null as XuanbingFileDryRunImportOutput | null,
    importResult: null as XuanbingFileImportOutput | null,
    exportResult: null as XuanbingFileExportOutput | null,
    validateResult: null as XuanbingFileValidateOutput | null,
    loading: false,
    error: null as Error | null
  })

  const fileRef = computedRef<XuanbingFileRef | null>(() => state.fileRef)
  const preview = computedRef<XuanbingFilePreviewOutput | null>(() => state.preview)
  const importPlan = computedRef<XuanbingFileDryRunImportOutput | null>(() => state.importPlan)
  const importResult = computedRef<XuanbingFileImportOutput | null>(() => state.importResult)
  const exportResult = computedRef<XuanbingFileExportOutput | null>(() => state.exportResult)
  const validateResult = computedRef<XuanbingFileValidateOutput | null>(() => state.validateResult)
  const loading = computedRef<boolean>(() => state.loading)
  const error = computedRef<Error | null>(() => state.error)

  async function openFile(): Promise<XuanbingFileDialogOutput | null> {
    state.loading = true
    state.error = null
    try {
      const result = await xuanbingFileClient.openDialog()
      if (!result.canceled && result.fileRef) {
        state.fileRef = result.fileRef
      }
      return result
    } catch (err) {
      state.error = err instanceof Error ? err : new Error(String(err))
      return null
    } finally {
      state.loading = false
    }
  }

  async function saveFile(): Promise<XuanbingFileDialogOutput | null> {
    state.loading = true
    state.error = null
    try {
      const result = await xuanbingFileClient.saveDialog()
      if (!result.canceled && result.fileRef) {
        state.fileRef = result.fileRef
      }
      return result
    } catch (err) {
      state.error = err instanceof Error ? err : new Error(String(err))
      return null
    } finally {
      state.loading = false
    }
  }

  async function readPreview(): Promise<XuanbingFilePreviewOutput | null> {
    if (!state.fileRef) return null
    state.loading = true
    state.error = null
    try {
      const result = await xuanbingFileClient.readPreview(state.fileRef)
      state.preview = result
      return result
    } catch (err) {
      state.error = err instanceof Error ? err : new Error(String(err))
      return null
    } finally {
      state.loading = false
    }
  }

  async function validateFile(): Promise<XuanbingFileValidateOutput | null> {
    if (!state.fileRef) return null
    state.loading = true
    state.error = null
    try {
      const result = await xuanbingFileClient.validate(state.fileRef)
      state.validateResult = result
      return result
    } catch (err) {
      state.error = err instanceof Error ? err : new Error(String(err))
      return null
    } finally {
      state.loading = false
    }
  }

  async function dryRunImport(conflictStrategy?: string): Promise<XuanbingFileDryRunImportOutput | null> {
    if (!state.fileRef) return null
    state.loading = true
    state.error = null
    try {
      const result = await xuanbingFileClient.dryRunImport({
        fileRef: state.fileRef,
        conflictStrategy
      })
      state.importPlan = result
      return result
    } catch (err) {
      state.error = err instanceof Error ? err : new Error(String(err))
      return null
    } finally {
      state.loading = false
    }
  }

  async function importPackage(): Promise<XuanbingFileImportOutput | null> {
    if (!state.fileRef || !state.importPlan) return null
    state.loading = true
    state.error = null
    try {
      const result = await xuanbingFileClient.importPackage({
        fileRef: state.fileRef,
        plan: state.importPlan
      })
      state.importResult = result
      return result
    } catch (err) {
      state.error = err instanceof Error ? err : new Error(String(err))
      return null
    } finally {
      state.loading = false
    }
  }

  async function exportPackage(input: {
    fileRef: XuanbingFileRef
    type: string
    metadata?: { name?: string; description?: string; author?: string; tags?: string[] }
    redact?: boolean
  }): Promise<XuanbingFileExportOutput | null> {
    state.loading = true
    state.error = null
    try {
      const result = await xuanbingFileClient.exportPackage({
        fileRef: input.fileRef,
        type: input.type,
        metadata: {
          name: input.metadata?.name,
          description: input.metadata?.description,
          author: input.metadata?.author,
          tags: input.metadata?.tags
        },
        redact: input.redact
      })
      state.exportResult = result
      return result
    } catch (err) {
      state.error = err instanceof Error ? err : new Error(String(err))
      return null
    } finally {
      state.loading = false
    }
  }

  function reset(): void {
    state.fileRef = null
    state.preview = null
    state.importPlan = null
    state.importResult = null
    state.exportResult = null
    state.validateResult = null
    state.loading = false
    state.error = null
  }

  return {
    fileRef,
    preview,
    importPlan,
    importResult,
    exportResult,
    validateResult,
    loading,
    error,
    openFile,
    saveFile,
    readPreview,
    validateFile,
    dryRunImport,
    importPackage,
    exportPackage,
    reset
  }
}
