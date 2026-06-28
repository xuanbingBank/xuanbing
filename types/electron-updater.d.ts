/**
 * @file electron-updater 类型声明 shim。
 *
 * 当 electron-updater 尚未安装时,提供最小化类型声明使 typecheck 通过。
 * 安装 electron-updater 后此文件可删除(npm 包自带类型)。
 */

declare module 'electron-updater' {
  export interface UpdateInfo {
    version: string
    releaseName?: string | null
    releaseNotes?: string | Array<{ version: string; note: string }> | null
    releaseDate?: string
    stagingPercentage?: number
    downloadedFile?: string
  }

  export interface ProgressInfo {
    total: number
    delta: number
    transferred: number
    percent: number
    bytesPerSecond: number
  }

  export interface UpdaterEvents {
    'checking-for-update': () => void
    'update-available': (info: UpdateInfo) => void
    'update-not-available': (info: UpdateInfo) => void
    'error': (error: Error) => void
    'download-progress': (progress: ProgressInfo) => void
    'update-downloaded': (info: UpdateInfo) => void
  }

  export type UpdaterEventName = keyof UpdaterEvents

  export interface UpdateCheckResult {
    updateInfo: UpdateInfo
    downloadPromise?: Promise<string[]> | null
    cancellationToken?: { cancel: () => void } | null
    versionInfo: UpdateInfo
  }

  export interface AppUpdater {
    autoDownload: boolean
    autoInstallOnAppQuit: boolean
    logger: unknown | null
    checkForUpdates(): Promise<UpdateCheckResult | null>
    checkForUpdatesAndNotify(): Promise<UpdateCheckResult | null>
    downloadUpdate(cancellationToken?: { cancel: () => void }): Promise<string[]>
    quitAndInstall(isSilent?: boolean, isForceRunAfter?: boolean): void
    on<E extends UpdaterEventName>(event: E, listener: UpdaterEvents[E]): this
    off<E extends UpdaterEventName>(event: E, listener: UpdaterEvents[E]): this
    removeAllListeners(event?: UpdaterEventName): this
  }

  export const autoUpdater: AppUpdater
}
