/**
 * @file 管理 BrowserWindow 稳定标识符、角色信息与安全事件分发。
 */

export interface WindowLike {
  id: number
  isDestroyed(): boolean
  minimize?(): void
  maximize?(): void
  unmaximize?(): void
  isMaximized?(): boolean
  close?(): void
  focus?(): void
  webContents: {
    id: number
    isDestroyed(): boolean
    getURL(): string
    send(channel: string, payload: unknown): void
  }
}

export interface WindowRegistration {
  windowId: number
  role: string
}

interface WindowRecord {
  role: string
  window: WindowLike
}

/**
 * 提供窗口注册、查找和安全事件分发。
 */
export class WindowManager {
  private readonly windows = new Map<number, WindowRecord>()

  private focusedWindowId?: number

  /**
   * 注册窗口及其角色。
   *
   * @param window 窗口对象。
   * @param registration 注册信息。
   */
  public registerWindow(window: WindowLike, registration: WindowRegistration): void {
    this.windows.set(registration.windowId, {
      role: registration.role,
      window
    })
    if (this.focusedWindowId === undefined) {
      this.focusedWindowId = registration.windowId
    }
  }

  /**
   * 注销窗口。
   *
   * @param windowId 窗口标识符。
   */
  public unregisterWindow(windowId: number): void {
    this.windows.delete(windowId)

    if (this.focusedWindowId === windowId) {
      this.focusedWindowId = undefined
    }
  }

  /**
   * 设置当前聚焦窗口。
   *
   * @param windowId 窗口标识符。
   */
  public setFocusedWindow(windowId: number): void {
    if (this.windows.has(windowId)) {
      this.focusedWindowId = windowId
    }
  }

  /**
   * 根据窗口标识符获取窗口对象。
   *
   * @param windowId 窗口标识符。
   * @returns 窗口对象。
   */
  public getWindow(windowId?: number): WindowLike | undefined {
    if (windowId === undefined) {
      return undefined
    }

    return this.windows.get(windowId)?.window
  }

  /**
   * 获取当前聚焦窗口标识符。
   *
   * @returns 聚焦窗口标识符。
   */
  public getFocusedWindowId(): number | undefined {
    return this.focusedWindowId
  }

  /**
   * 获取窗口角色。
   *
   * @param windowId 窗口标识符。
   * @returns 窗口角色。
   */
  public getWindowRole(windowId?: number): string | undefined {
    if (windowId === undefined) {
      return undefined
    }

    return this.windows.get(windowId)?.role
  }

  /**
   * 根据 webContents 标识符查找窗口标识符。
   *
   * @param senderId webContents 标识符。
   * @returns 窗口标识符。
   */
  public getWindowIdBySenderId(senderId?: number): number | undefined {
    if (senderId === undefined) {
      return undefined
    }

    for (const [windowId, record] of this.windows.entries()) {
      if (record.window.isDestroyed() || record.window.webContents.isDestroyed()) {
        continue
      }
      if (record.window.webContents.id === senderId) {
        return windowId
      }
    }

    return undefined
  }

  /**
   * 向指定窗口发送事件。
   *
   * @param windowId 窗口标识符。
   * @param channel 事件通道名。
   * @param payload 事件载荷。
   * @returns 是否发送成功。
   */
  public sendToWindow(windowId: number, channel: string, payload: unknown): boolean {
    const record = this.windows.get(windowId)

    if (!record || record.window.isDestroyed() || record.window.webContents.isDestroyed()) {
      return false
    }

    record.window.webContents.send(channel, payload)
    return true
  }

  /**
   * 向所有窗口广播事件。
   *
   * @param channel 事件通道名。
   * @param payload 事件载荷。
   * @returns 成功送达的窗口数量。
   */
  public broadcast(channel: string, payload: unknown): number {
    let delivered = 0

    for (const windowId of this.windows.keys()) {
      if (this.sendToWindow(windowId, channel, payload)) {
        delivered += 1
      }
    }

    return delivered
  }

  /**
   * 向聚焦窗口发送事件。
   *
   * @param channel 事件通道名。
   * @param payload 事件载荷。
   * @returns 是否发送成功。
   */
  public sendToFocusedWindow(channel: string, payload: unknown): boolean {
    if (this.focusedWindowId === undefined) {
      return false
    }

    return this.sendToWindow(this.focusedWindowId, channel, payload)
  }
}
