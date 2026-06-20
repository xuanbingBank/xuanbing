/**
 * @file 解析 Electron 窗口需要加载的渲染目标与 preload bundle 路径。
 */

import path from 'node:path'

export interface RendererTargetOptions {
  appRoot: string
  devServerUrl?: string
  isPackaged: boolean
}

export type RendererTarget =
  | { kind: 'url'; url: string }
  | { kind: 'file'; filePath: string }

/**
 * 根据运行环境解析窗口应加载的渲染目标。
 *
 * @param options 渲染目标解析选项。
 * @returns 开发服务 URL 或本地 HTML 文件目标。
 */
export function resolveRendererTarget(options: RendererTargetOptions): RendererTarget {
  const devServerUrl = options.devServerUrl?.trim()

  if (!options.isPackaged && devServerUrl) {
    return {
      kind: 'url',
      url: devServerUrl
    }
  }

  return {
    kind: 'file',
    filePath: path.join(options.appRoot, 'index.html')
  }
}

/**
 * 根据应用根目录解析编译后的 preload bundle 路径。
 *
 * @param appRoot Electron 应用根目录。
 * @returns preload bundle 绝对路径。
 */
export function resolvePreloadPath(appRoot: string): string {
  return path.join(appRoot, 'dist', 'electron', 'preload.bundle.js')
}