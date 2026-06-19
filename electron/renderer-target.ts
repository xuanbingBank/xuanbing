import path from 'node:path'

export interface RendererTargetOptions {
  appRoot: string
  devServerUrl?: string
  isPackaged: boolean
}

export type RendererTarget =
  | { kind: 'url'; url: string }
  | { kind: 'file'; filePath: string }

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
