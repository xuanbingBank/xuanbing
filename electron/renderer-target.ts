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
    // 校验 dev server URL：仅允许 http/https 协议且主机为本地回环，
    // 防止环境变量被污染后加载任意远程页面。
    if (isSafeLocalDevServerUrl(devServerUrl)) {
      return {
        kind: 'url',
        url: devServerUrl
      }
    }

    console.warn(`[renderer-target] Blocked unsafe dev server URL, falling back to file mode: ${devServerUrl}`)
  }

  return {
    kind: 'file',
    filePath: path.join(options.appRoot, 'index.html')
  }
}

/**
 * 判断 dev server URL 是否为安全的本地地址。
 *
 * 仅允许 http:/https: 协议，且主机名为 localhost / 127.0.0.1 / ::1。
 *
 * @param url 待校验的 dev server URL。
 * @returns 是否安全。
 */
function isSafeLocalDevServerUrl(url: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false
  }

  const host = parsed.hostname
  return host === 'localhost' || host === '127.0.0.1' || host === '::1'
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