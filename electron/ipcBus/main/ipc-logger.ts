/**
 * @file 提供结构化 IPC 日志记录器，主进程内部调用流水保留在内存缓冲区。
 */

export interface IpcLogEntry {
  requestId: string
  channel: string
  senderWindowId?: number
  durationMs: number
  result: 'success' | 'failure'
  errorCode?: string
  payloadSize: number
  timestamp: string
  environment: string
  timedOut: boolean
  aborted: boolean
}

export interface IpcLoggerOptions {
  environment: string
  slowRequestThresholdMs: number
}

/**
 * 日志缓冲区上限，超过后保留最新条目，防止内存无限增长。
 */
const MAX_LOG_ENTRIES = 5000

/**
 * 结构化 IPC 日志器，负责主进程内部调用流水的控制台输出。
 */
export class IpcLogger {
  private readonly entries: IpcLogEntry[] = []

  private readonly environment: string

  private readonly slowRequestThresholdMs: number

  /**
   * 初始化日志记录器。
   *
   * @param options 日志配置。
   */
  public constructor(options: IpcLoggerOptions) {
    this.environment = options.environment
    this.slowRequestThresholdMs = options.slowRequestThresholdMs
  }

  /**
   * 记录一次 IPC 调用流水。
   *
   * @param entry 结构化日志条目。
   */
  public log(entry: IpcLogEntry): void {
    this.entries.push(entry)

    if (this.entries.length > MAX_LOG_ENTRIES) {
      this.entries.splice(0, this.entries.length - MAX_LOG_ENTRIES)
    }

    if (this.environment !== 'production') {
      // 防御性脱敏：若日志条目含 detail 字段，替换为 [redacted]，
      // 避免非生产环境控制台输出泄露敏感信息。
      const safeEntry = { ...entry } as IpcLogEntry & { detail?: unknown }
      if (safeEntry.detail !== undefined) {
        safeEntry.detail = '[redacted]'
      }
      console.info('[ipc]', safeEntry)
    }

    if (entry.durationMs >= this.slowRequestThresholdMs) {
      console.warn('[ipc:slow]', entry.channel, entry.durationMs)
    }
  }

  /**
   * 获取当前日志缓冲。
   *
   * @returns 日志条目数组。
   */
  public getEntries(): IpcLogEntry[] {
    return [...this.entries]
  }
}
