/**
 * @file 提供结构化 IPC 日志记录能力，并在测试与开发环境中保留内存快照。
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
 * 保存结构化 IPC 日志，并在非生产环境输出到控制台。
 */
export class IpcLogger {
  private readonly entries: IpcLogEntry[] = []

  private readonly environment: string

  private readonly slowRequestThresholdMs: number

  /**
   * 创建日志记录器。
   *
   * @param options 日志配置。
   */
  public constructor(options: IpcLoggerOptions) {
    this.environment = options.environment
    this.slowRequestThresholdMs = options.slowRequestThresholdMs
  }

  /**
   * 记录一次 IPC 请求结果。
   *
   * @param entry 结构化日志条目。
   */
  public log(entry: IpcLogEntry): void {
    this.entries.push(entry)

    if (this.environment !== 'production') {
      console.info('[ipc]', entry)
    }

    if (entry.durationMs >= this.slowRequestThresholdMs) {
      console.warn('[ipc:slow]', entry.channel, entry.durationMs)
    }
  }

  /**
   * 获取当前日志快照。
   *
   * @returns 日志条目数组。
   */
  public getEntries(): IpcLogEntry[] {
    return [...this.entries]
  }
}
