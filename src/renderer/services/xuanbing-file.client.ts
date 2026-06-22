/**
 * @file .xuanbing 文件客户端，renderer 唯一访问 .xuanbing 文件能力的入口。
 *
 * renderer 不传任意路径，通过 dialog 生成 fileRef / token。
 * fileRef 有过期时间。
 * import 必须先 dryRun。
 * readPreview 不返回敏感 payload。
 */

import type {
  XuanbingFileDialogInput,
  XuanbingFileDialogOutput,
  XuanbingFileDryRunImportInput,
  XuanbingFileDryRunImportOutput,
  XuanbingFileExportInput,
  XuanbingFileExportOutput,
  XuanbingFileImportInput,
  XuanbingFileImportOutput,
  XuanbingFilePreviewOutput,
  XuanbingFileRef,
  XuanbingFileValidateOutput
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
 * .xuanbing 文件客户端。
 */
export const xuanbingFileClient = {
  /**
   * 打开文件选择对话框。
   */
  async openDialog(input?: XuanbingFileDialogInput): Promise<XuanbingFileDialogOutput> {
    return getDesktop().xuanbingFile.openDialog(input)
  },

  /**
   * 打开文件保存对话框。
   */
  async saveDialog(input?: XuanbingFileDialogInput): Promise<XuanbingFileDialogOutput> {
    return getDesktop().xuanbingFile.saveDialog(input)
  },

  /**
   * 读取文件预览（不含 payload）。
   */
  async readPreview(fileRef: XuanbingFileRef): Promise<XuanbingFilePreviewOutput> {
    return getDesktop().xuanbingFile.readPreview(fileRef)
  },

  /**
   * 校验文件。
   */
  async validate(fileRef: XuanbingFileRef): Promise<XuanbingFileValidateOutput> {
    return getDesktop().xuanbingFile.validate(fileRef)
  },

  /**
   * 导出包。
   */
  async exportPackage(input: XuanbingFileExportInput): Promise<XuanbingFileExportOutput> {
    return getDesktop().xuanbingFile.exportPackage(input)
  },

  /**
   * dryRun 导入。
   */
  async dryRunImport(input: XuanbingFileDryRunImportInput): Promise<XuanbingFileDryRunImportOutput> {
    return getDesktop().xuanbingFile.dryRunImport(input)
  },

  /**
   * 正式导入。
   */
  async importPackage(input: XuanbingFileImportInput): Promise<XuanbingFileImportOutput> {
    return getDesktop().xuanbingFile.importPackage(input)
  }
}
