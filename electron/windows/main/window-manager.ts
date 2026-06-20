/**
 * @file 窗口管理器核心，组合注册表、状态存储、URL 解析、事件总线、初始化数据与生命周期绑定。
 *
 * BrowserWindow 仅通过注入的 browserWindowFactory 创建，本模块不直接依赖 electron。
 * 所有公开方法返回安全的 WindowRef，不暴露 BrowserWindow 实例。
 */

import { getWindowConfig, resolveWindowConfig } from '../shared/window-config'
import { WINDOW_ERROR_CODES, createWindowError } from '../shared/window-errors'
import type { WindowError } from '../shared/window-errors'
import type {
  WindowRole,
  WindowRef,
  WindowConfig,
  OpenWindowOptions,
  OpenWindowResult,
  WindowStateRecord,
  WindowEventPayload
} from '../shared/window-types'
import { hasPermission } from '../shared/window-permissions'
import {
  WindowRegistry,
  type BrowserWindowLike as RegistryBrowserWindowLike
} from './window-registry'
import { WindowStateStore } from './window-state-store'
import { WindowUrlResolver } from './window-url-resolver'
import { WindowEventBus } from './window-events'
import { WindowInitPayloadStore } from './window-init-payload'
import type { InitPayloadReadResult } from './window-init-payload'
import { WindowLifecycle } from './window-lifecycle'
import {
  validateOpenRequest,
  checkPermission,
  shouldAllowDevTools,
  type WindowEnvironment
} from './window-guards'
import {
  autoCorrectBounds,
  centerToDisplay,
  centerToParentWindow,
  selectTargetDisplay,
  type ScreenLike,
  type DisplayInfo,
  type ParentWindowLike
} from './window-display'

/**
 * webContents 最小接口。
 */
export interface WebContentsLike {
  id: number
  isDestroyed(): boolean
  getURL(): string
  send(channel: string, payload: unknown): void
  on(event: string, handler: (...args: unknown[]) => void): void
  once(event: string, handler: (...args: unknown[]) => void): void
  off(event: string, handler: (...args: unknown[]) => void): void
  setWindowOpenHandler(handler: (details: unknown) => { action: 'deny' } | { action: 'allow'; overrideBrowserWindowOptions?: unknown }): void
  reload(): void
  openDevTools(opts?: { mode?: string }): void
  loadURL(url: string): Promise<void> | void
  loadFile(path: string): Promise<void> | void
}

/**
 * 浏览器窗口接口（完整版，供窗口管理器使用）。
 */
export interface BrowserWindowLike {
  id: number
  isDestroyed(): boolean
  getBounds(): { x: number; y: number; width: number; height: number }
  setBounds(bounds: { x: number; y: number; width: number; height: number }): void
  minimize(): void
  maximize(): void
  unmaximize(): void
  isMaximized(): boolean
  isMinimized(): boolean
  isFullScreen(): boolean
  isAlwaysOnTop(): boolean
  close(): void
  destroy(): void
  focus(): void
  show(): void
  hide(): void
  restore(): void
  reload(): void
  setAlwaysOnTop(flag: boolean): void
  on(event: string, handler: (...args: unknown[]) => void): void
  once(event: string, handler: (...args: unknown[]) => void): void
  off(event: string, handler: (...args: unknown[]) => void): void
  setTitle?(title: string): void
  getTitle?(): string
  setBadgeCount?(count: number): void
  webContents: WebContentsLike
}

/**
 * 安全的 webPreferences 配置。
 */
export interface SafeWebPreferences {
  contextIsolation: true
  nodeIntegration: false
  sandbox: true
  webSecurity: true
  allowRunningInsecureContent: false
  webviewTag: false
  nativeWindowOpen: false
  preload: string
  devTools: boolean
}

/**
 * BrowserWindow 构造参数。
 */
export interface BrowserWindowConstructorOptions {
  width?: number
  height?: number
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
  x?: number
  y?: number
  resizable?: boolean
  minimizable?: boolean
  maximizable?: boolean
  closable?: boolean
  fullscreenable?: boolean
  alwaysOnTop?: boolean
  frame?: boolean
  transparent?: boolean
  backgroundColor?: string
  show?: boolean
  skipTaskbar?: boolean
  title?: string
  modal?: boolean
  parent?: BrowserWindowLike
  webPreferences?: SafeWebPreferences
  trafficLightPosition?: { x: number; y: number }
  titleBarStyle?: 'default' | 'hidden' | 'hiddenInset' | 'customButtonsOnHover'
}

/**
 * BrowserWindow 工厂函数类型。
 */
export type BrowserWindowFactory = (options: BrowserWindowConstructorOptions) => BrowserWindowLike

/**
 * shell.openExternal 注入函数类型。
 */
export type ShellOpenExternalFn = (url: string) => void

/**
 * 窗口管理器构造参数。
 */
export interface WindowManagerOptions {
  browserWindowFactory: BrowserWindowFactory
  screen: ScreenLike
  preloadPath: string
  isPackaged: boolean
  devServerUrl?: string
  indexHtmlPath: string
  stateFilePath: string
  environment: WindowEnvironment
  shellOpenExternal?: ShellOpenExternalFn
}

/**
 * 内部窗口记录（包含窗口引用与配置）。
 */
interface InternalWindowRecord {
  window: BrowserWindowLike
  role: WindowRole
  instanceKey: string
  config: WindowConfig
  route: string
  title: string
  badge: number
  initToken?: string
}

/** 初始化 token 通道。 */
const INIT_TOKEN_CHANNEL = 'window:init-token'

/**
 * 窗口管理器。
 */
export class WindowManager {
  private readonly registry: WindowRegistry

  private readonly stateStore: WindowStateStore

  private readonly urlResolver: WindowUrlResolver

  private readonly eventBus: WindowEventBus

  private readonly initPayloadStore: WindowInitPayloadStore

  private readonly lifecycle: WindowLifecycle

  private readonly browserWindowFactory: BrowserWindowFactory

  private readonly screen: ScreenLike

  private readonly preloadPath: string

  private readonly isPackaged: boolean

  private readonly environment: WindowEnvironment

  private readonly shellOpenExternal?: ShellOpenExternalFn

  /** windowId -> 生命周期清理函数。 */
  private readonly cleanupFunctions = new Map<number, () => void>()

  /** windowId -> 内部记录。 */
  private readonly internalRecords = new Map<number, InternalWindowRecord>()

  /** role -> 实例计数器。 */
  private readonly counters = new Map<WindowRole, number>()

  /** 当前焦点窗口 ID。 */
  private focusedWindowId: number | undefined

  public constructor(options: WindowManagerOptions) {
    this.browserWindowFactory = options.browserWindowFactory
    this.screen = options.screen
    this.preloadPath = options.preloadPath
    this.isPackaged = options.isPackaged
    this.environment = options.environment
    this.shellOpenExternal = options.shellOpenExternal

    this.registry = new WindowRegistry()
    this.stateStore = new WindowStateStore({
      filePath: options.stateFilePath,
      screen: this.screen
    })
    this.urlResolver = new WindowUrlResolver({
      isPackaged: options.isPackaged,
      devServerUrl: options.devServerUrl,
      indexHtmlPath: options.indexHtmlPath
    })
    this.eventBus = new WindowEventBus()
    this.initPayloadStore = new WindowInitPayloadStore()
    this.lifecycle = new WindowLifecycle({
      eventBus: this.eventBus,
      registry: this.registry,
      stateStore: this.stateStore,
      initPayloadStore: this.initPayloadStore
    })

    this.stateStore.load()
    this.initPayloadStore.startCleanup()

    this.eventBus.on('window:focused', (payload: WindowEventPayload) => {
      this.focusedWindowId = payload.windowId
    })
    this.eventBus.on('window:destroyed', (payload: WindowEventPayload) => {
      if (this.focusedWindowId === payload.windowId) {
        this.focusedWindowId = undefined
      }
    })
  }

  /* ───────────────────────── 公开方法 ───────────────────────── */

  /**
   * 打开窗口（公开）。校验后根据 onSecondOpen 策略决定创建或聚焦。
   *
   * @param role 窗口角色。
   * @param options 打开参数。
   * @returns 打开结果。
   * @throws WindowError 校验失败时抛出。
   */
  public openWindow(
    role: WindowRole,
    options?: Partial<Omit<OpenWindowOptions, 'role'>>
  ): OpenWindowResult {
    const config = resolveWindowConfig(role, this.preloadPath)
    const mergedOptions: OpenWindowOptions = {
      role,
      routeName: options?.routeName,
      params: options?.params,
      query: options?.query,
      payload: options?.payload,
      displayTarget: options?.displayTarget,
      parentWindowId: options?.parentWindowId,
      title: options?.title
    }

    const existingCount = this.registry.countByRole(role)
    const guardResult = validateOpenRequest(
      role,
      mergedOptions,
      options?.parentWindowId,
      this.environment,
      existingCount
    )
    if (!guardResult.allowed) {
      throw createWindowError(
        WINDOW_ERROR_CODES.forbidden,
        guardResult.reason ?? 'Open request rejected.'
      )
    }

    if (options?.parentWindowId !== undefined) {
      const parentEntry = this.registry.get(options.parentWindowId)
      if (parentEntry) {
        const permResult = checkPermission(role, 'window:open', parentEntry.role)
        if (!permResult.allowed) {
          throw createWindowError(
            WINDOW_ERROR_CODES.forbidden,
            permResult.reason ?? 'Sender lacks window:open permission.'
          )
        }
      }
    }

    const instanceKey = this.resolveInstanceKey(role, config, options)
    const existingWindowId = this.registry.getByInstanceKey(instanceKey)

    if (existingWindowId !== undefined && config.onSecondOpen !== 'newInstance') {
      if (config.onSecondOpen === 'focus') {
        this.focusWindow(existingWindowId)
        const route = options?.routeName ?? config.route
        this.registry.updateRoute(existingWindowId, route)
        return {
          windowId: existingWindowId,
          role,
          instanceKey,
          created: false,
          route
        }
      }
      if (config.onSecondOpen === 'recreate') {
        this.closeWindow(existingWindowId)
      } else if (config.onSecondOpen === 'ignore') {
        const entry = this.registry.get(existingWindowId)
        return {
          windowId: existingWindowId,
          role,
          instanceKey,
          created: false,
          route: entry?.route ?? config.route
        }
      }
    }

    return this.createWindow(role, config, mergedOptions, instanceKey)
  }

  /**
   * 打开或聚焦窗口（公开）。若已存在则聚焦，否则创建。
   *
   * @param role 窗口角色。
   * @param options 打开参数。
   * @returns 打开结果。
   */
  public openOrFocus(
    role: WindowRole,
    options?: Partial<Omit<OpenWindowOptions, 'role'>>
  ): OpenWindowResult {
    const existingIds = this.registry.getByRole(role)
    if (existingIds.length > 0) {
      const windowId = existingIds[0] as number
      this.focusWindow(windowId)
      const entry = this.registry.get(windowId)
      return {
        windowId,
        role,
        instanceKey: entry?.instanceKey ?? role,
        created: false,
        route: entry?.route ?? getWindowConfig(role).route
      }
    }
    return this.openWindow(role, options)
  }

  /**
   * 关闭指定窗口。
   *
   * @param windowId 窗口 ID。
   */
  public closeWindow(windowId: number): void {
    const window = this.getInternalWindow(windowId)
    if (window && !window.isDestroyed()) {
      window.close()
    }
  }

  /**
   * 关闭指定角色的全部窗口。
   *
   * @param role 窗口角色。
   */
  public closeByRole(role: WindowRole): void {
    const ids = this.registry.getByRole(role)
    for (const id of ids) {
      this.closeWindow(id)
    }
  }

  /**
   * 关闭全部窗口。
   */
  public closeAll(): void {
    const ids = this.registry.getAllWindowIds()
    for (const id of ids) {
      this.closeWindow(id)
    }
  }

  /**
   * 隐藏窗口。
   *
   * @param windowId 窗口 ID。
   */
  public hideWindow(windowId: number): void {
    const window = this.getInternalWindow(windowId)
    if (window && !window.isDestroyed()) {
      window.hide()
    }
  }

  /**
   * 显示窗口。
   *
   * @param windowId 窗口 ID。
   */
  public showWindow(windowId: number): void {
    const window = this.getInternalWindow(windowId)
    if (window && !window.isDestroyed()) {
      window.show()
    }
  }

  /**
   * 聚焦窗口。
   *
   * @param windowId 窗口 ID。
   */
  public focusWindow(windowId: number): void {
    const window = this.getInternalWindow(windowId)
    if (window && !window.isDestroyed()) {
      window.focus()
      this.registry.markFocused(windowId)
      this.focusedWindowId = windowId
    }
  }

  /**
   * 聚焦指定角色的第一个窗口。
   *
   * @param role 窗口角色。
   */
  public focusByRole(role: WindowRole): void {
    const id = this.registry.getFirstByRole(role)
    if (id !== undefined) {
      this.focusWindow(id)
    }
  }

  /**
   * 最小化窗口。
   *
   * @param windowId 窗口 ID。
   */
  public minimizeWindow(windowId: number): void {
    const window = this.getInternalWindow(windowId)
    if (window && !window.isDestroyed()) {
      window.minimize()
    }
  }

  /**
   * 最大化窗口。
   *
   * @param windowId 窗口 ID。
   */
  public maximizeWindow(windowId: number): void {
    const window = this.getInternalWindow(windowId)
    if (window && !window.isDestroyed()) {
      window.maximize()
    }
  }

  /**
   * 取消最大化窗口。
   *
   * @param windowId 窗口 ID。
   */
  public unmaximizeWindow(windowId: number): void {
    const window = this.getInternalWindow(windowId)
    if (window && !window.isDestroyed()) {
      window.unmaximize()
    }
  }

  /**
   * 切换最大化状态。
   *
   * @param windowId 窗口 ID。
   */
  public toggleMaximize(windowId: number): void {
    const window = this.getInternalWindow(windowId)
    if (window && !window.isDestroyed()) {
      if (window.isMaximized()) {
        window.unmaximize()
      } else {
        window.maximize()
      }
    }
  }

  /**
   * 恢复窗口。
   *
   * @param windowId 窗口 ID。
   */
  public restoreWindow(windowId: number): void {
    const window = this.getInternalWindow(windowId)
    if (window && !window.isDestroyed()) {
      window.restore()
    }
  }

  /**
   * 重新加载窗口。
   *
   * @param windowId 窗口 ID。
   */
  public reloadWindow(windowId: number): void {
    const window = this.getInternalWindow(windowId)
    if (window && !window.isDestroyed() && !window.webContents.isDestroyed()) {
      window.webContents.reload()
    }
  }

  /**
   * 销毁窗口（强制，不触发 close 事件）。
   *
   * @param windowId 窗口 ID。
   */
  public destroyWindow(windowId: number): void {
    const window = this.getInternalWindow(windowId)
    if (window && !window.isDestroyed()) {
      window.destroy()
    }
    this.cleanupWindow(windowId)
  }

  /**
   * 获取窗口的安全引用。
   *
   * @param windowId 窗口 ID。
   * @returns 窗口引用，未找到时返回 undefined。
   */
  public getWindow(windowId: number): WindowRef | undefined {
    const entry = this.registry.get(windowId)
    if (!entry) {
      return undefined
    }
    const window = this.getInternalWindow(windowId)
    if (!window) {
      return undefined
    }
    return this.toWindowRef(window, entry)
  }

  /**
   * 获取指定角色的第一个窗口引用。
   *
   * @param role 窗口角色。
   * @returns 窗口引用，未找到时返回 undefined。
   */
  public getWindowByRole(role: WindowRole): WindowRef | undefined {
    const id = this.registry.getFirstByRole(role)
    if (id === undefined) {
      return undefined
    }
    return this.getWindow(id)
  }

  /**
   * 获取指定角色的全部窗口引用。
   *
   * @param role 窗口角色。
   * @returns 窗口引用数组。
   */
  public getWindowsByRole(role: WindowRole): WindowRef[] {
    const ids = this.registry.getByRole(role)
    const refs: WindowRef[] = []
    for (const id of ids) {
      const ref = this.getWindow(id)
      if (ref) {
        refs.push(ref)
      }
    }
    return refs
  }

  /**
   * 获取当前焦点窗口引用。
   *
   * @returns 窗口引用，无焦点时返回 undefined。
   */
  public getFocusedWindow(): WindowRef | undefined {
    if (this.focusedWindowId === undefined) {
      return undefined
    }
    return this.getWindow(this.focusedWindowId)
  }

  /**
   * 获取主窗口引用。
   *
   * @returns 主窗口引用，未找到时返回 undefined。
   */
  public getMainWindow(): WindowRef | undefined {
    return this.getWindowByRole('main')
  }

  /**
   * 判断指定角色是否存在窗口。
   *
   * @param role 窗口角色。
   * @returns 是否存在。
   */
  public hasWindow(role: WindowRole): boolean {
    return this.registry.countByRole(role) > 0
  }

  /**
   * 判断窗口是否存活。
   *
   * @param windowId 窗口 ID。
   * @returns 是否存活。
   */
  public isWindowAlive(windowId: number): boolean {
    const entry = this.registry.get(windowId)
    return entry !== undefined
  }

  /**
   * 向指定窗口发送 IPC 消息。
   *
   * @param windowId 窗口 ID。
   * @param channel 通道。
   * @param payload 负载。
   * @returns 是否发送成功。
   */
  public sendToWindow(windowId: number, channel: string, payload: unknown): boolean {
    const window = this.getInternalWindow(windowId)
    if (!window || window.isDestroyed() || window.webContents.isDestroyed()) {
      return false
    }
    window.webContents.send(channel, payload)
    return true
  }

  /**
   * 向指定角色的全部窗口发送 IPC 消息。
   *
   * @param role 窗口角色。
   * @param channel 通道。
   * @param payload 负载。
   * @returns 成功发送的窗口数。
   */
  public sendToRole(role: WindowRole, channel: string, payload: unknown): number {
    const ids = this.registry.getByRole(role)
    let delivered = 0
    for (const id of ids) {
      if (this.sendToWindow(id, channel, payload)) {
        delivered += 1
      }
    }
    return delivered
  }

  /**
   * 向全部窗口广播 IPC 消息。
   *
   * @param channel 通道。
   * @param payload 负载。
   * @returns 成功发送的窗口数。
   */
  public broadcast(channel: string, payload: unknown): number {
    const ids = this.registry.getAllWindowIds()
    let delivered = 0
    for (const id of ids) {
      if (this.sendToWindow(id, channel, payload)) {
        delivered += 1
      }
    }
    return delivered
  }

  /**
   * 获取窗口的持久化状态。
   *
   * @param windowId 窗口 ID。
   * @returns 状态记录，未找到时返回 undefined。
   */
  public getWindowState(windowId: number): WindowStateRecord | undefined {
    const record = this.internalRecords.get(windowId)
    if (!record) {
      return undefined
    }
    const key = this.stateKeyFor(record.role, record.instanceKey, record.config)
    return this.stateStore.restore(
      key,
      record.config.minWidth,
      record.config.minHeight,
      record.config.maxWidth,
      record.config.maxHeight
    )
  }

  /**
   * 更新窗口标题。
   *
   * @param windowId 窗口 ID。
   * @param title 新标题。
   */
  public updateWindowTitle(windowId: number, title: string): void {
    const record = this.internalRecords.get(windowId)
    if (!record) {
      return
    }
    record.title = title
    const window = record.window
    if (!window.isDestroyed() && typeof window.setTitle === 'function') {
      window.setTitle(title)
    }
    this.eventBus.emit({
      type: 'window:title-changed',
      windowId,
      role: record.role,
      timestamp: Date.now(),
      data: { title }
    })
  }

  /**
   * 消费指定窗口的初始化数据（一次性）。
   *
   * 由 IPC 层调用，根据 sender 的 windowId 从 init payload store 中读取并消费数据。
   * 数据只能被消费一次，过期或已消费后返回 undefined。
   *
   * @param windowId 窗口 ID。
   * @returns 初始化数据读取结果，无数据或已消费时返回 undefined。
   */
  public consumeInitPayload(windowId: number): InitPayloadReadResult | undefined {
    const record = this.internalRecords.get(windowId)
    if (!record || !record.initToken) {
      return undefined
    }
    const token = record.initToken
    try {
      return this.initPayloadStore.consume(token, windowId)
    } catch {
      return undefined
    }
  }

  /**
   * 更新窗口角标。
   *
   * @param windowId 窗口 ID。
   * @param badge 角标数字。
   */
  public updateWindowBadge(windowId: number, badge: number): void {
    const record = this.internalRecords.get(windowId)
    if (!record) {
      return
    }
    record.badge = badge
    const window = record.window
    if (!window.isDestroyed() && typeof window.setBadgeCount === 'function') {
      window.setBadgeCount(badge)
    }
  }

  /**
   * 列出全部窗口引用。
   *
   * @returns 窗口引用数组。
   */
  public listWindows(): WindowRef[] {
    const entries = this.registry.getAllEntries()
    const refs: WindowRef[] = []
    for (const entry of entries) {
      const window = this.getInternalWindow(entry.window.id)
      if (window) {
        const ref = this.toWindowRef(window, entry)
        refs.push(ref)
      }
    }
    return refs
  }

  /**
   * 完整清理指定窗口（事件监听、状态、注册、初始化数据）。
   *
   * @param windowId 窗口 ID。
   */
  public cleanupWindow(windowId: number): void {
    const cleanup = this.cleanupFunctions.get(windowId)
    if (cleanup) {
      cleanup()
      this.cleanupFunctions.delete(windowId)
    }
    this.initPayloadStore.cleanupForWindow(windowId)
    this.registry.unregister(windowId)
    this.internalRecords.delete(windowId)
  }

  /**
   * 销毁窗口管理器，释放全部资源。
   */
  public dispose(): void {
    this.stateStore.saveAllNow()
    this.stateStore.dispose()
    this.initPayloadStore.stopCleanup()
    this.initPayloadStore.clear()
    this.eventBus.dispose()
    this.registry.clear()
    this.cleanupFunctions.clear()
    this.internalRecords.clear()
    this.counters.clear()
    this.focusedWindowId = undefined
  }

  /**
   * 获取事件总线（用于外部订阅）。
   *
   * @returns 事件总线。
   */
  public getEventBus(): WindowEventBus {
    return this.eventBus
  }

  /**
   * 获取注册表（用于外部调试）。
   *
   * @returns 注册表。
   */
  public getRegistry(): WindowRegistry {
    return this.registry
  }

  /**
   * 保存全部窗口状态（退出前调用）。
   */
  public saveAllState(): void {
    for (const [windowId, record] of this.internalRecords.entries()) {
      if (record.config.rememberBounds && !record.window.isDestroyed()) {
        const bounds = record.window.getBounds()
        this.stateStore.saveNow(this.stateKeyFor(record.role, record.instanceKey, record.config), {
          bounds,
          isMaximized: record.window.isMaximized(),
          isFullScreen: record.window.isFullScreen(),
          displayId: 0,
          lastRoute: record.route,
          lastFocusedAt: Date.now()
        })
      }
      void windowId
    }
    this.stateStore.saveAllNow()
  }

  /* ───────────────────────── 内部方法 ───────────────────────── */

  /**
   * 从内部记录中获取完整的 BrowserWindowLike。
   *
   * @param windowId 窗口 ID。
   * @returns 窗口对象，未找到或已销毁时返回 undefined。
   */
  private getInternalWindow(windowId: number): BrowserWindowLike | undefined {
    const record = this.internalRecords.get(windowId)
    if (!record) {
      return undefined
    }
    if (record.window.isDestroyed()) {
      return undefined
    }
    return record.window
  }

  /**
   * 创建窗口（内部）。通过工厂创建 BrowserWindow，注册、绑定生命周期、加载 URL、发送初始化数据。
   *
   * @param role 窗口角色。
   * @param config 已解析的窗口配置。
   * @param options 打开参数。
   * @param instanceKey 实例键。
   * @returns 打开结果。
   * @throws WindowError 创建失败时抛出。
   */
  private createWindow(
    role: WindowRole,
    config: WindowConfig,
    options: OpenWindowOptions,
    instanceKey: string
  ): OpenWindowResult {
    const route = options.routeName ?? config.route
    const url = this.urlResolver.resolveUrl(role, route, options.params, options.query)

    const parentWindow = options.parentWindowId !== undefined
      ? this.getInternalWindow(options.parentWindowId)
      : undefined

    const bounds = this.resolveInitialBounds(role, config, options, parentWindow)

    const webPreferences = this.buildSafeWebPreferences(config)
    const constructorOptions: BrowserWindowConstructorOptions = {
      width: bounds.width,
      height: bounds.height,
      minWidth: config.minWidth,
      minHeight: config.minHeight,
      maxWidth: config.maxWidth,
      maxHeight: config.maxHeight,
      x: bounds.x,
      y: bounds.y,
      resizable: config.resizable,
      minimizable: config.minimizable,
      maximizable: config.maximizable,
      closable: config.closable,
      fullscreenable: config.fullscreenable,
      alwaysOnTop: config.alwaysOnTop,
      frame: config.frame,
      transparent: config.transparent,
      backgroundColor: config.backgroundColor,
      show: false,
      skipTaskbar: config.skipTaskbar,
      title: options.title ?? config.title,
      modal: config.modal,
      parent: parentWindow,
      webPreferences,
      trafficLightPosition: config.trafficLightPosition,
      titleBarStyle: config.titleBarStyle
    }

    const window = this.browserWindowFactory(constructorOptions)
    const windowId = window.id

    this.registry.register({
      window: window as unknown as RegistryBrowserWindowLike,
      role,
      instanceKey,
      parentId: options.parentWindowId,
      route,
      entityId: options.params ? options.params.id : undefined
    })

    const cleanup = this.lifecycle.bind(
      window as unknown as Parameters<WindowLifecycle['bind']>[0],
      windowId,
      role,
      config
    )
    this.cleanupFunctions.set(windowId, cleanup)

    const initToken = options.payload !== undefined
      ? this.initPayloadStore.create(windowId, role, options.payload)
      : undefined

    this.internalRecords.set(windowId, {
      window,
      role,
      instanceKey,
      config,
      route,
      title: options.title ?? config.title,
      badge: 0,
      initToken
    })

    this.setupSecurityHandlers(window, role)

    this.emitCreated(windowId, role)

    const loadPromise = window.webContents.loadURL(url)
    if (loadPromise && typeof (loadPromise as Promise<void>).catch === 'function') {
      ;(loadPromise as Promise<void>).catch((error: unknown) => {
        this.eventBus.emit({
          type: 'window:load-failed',
          windowId,
          role,
          timestamp: Date.now(),
          data: { error: String(error), url }
        })
      })
    }

    if (config.showOnReady) {
      window.once('ready-to-show', () => {
        if (window.isDestroyed()) {
          return
        }
        window.show()
        if (initToken !== undefined) {
          this.sendToWindow(windowId, INIT_TOKEN_CHANNEL, { token: initToken })
        }
      })
    } else if (initToken !== undefined) {
      window.webContents.once('did-finish-load', () => {
        this.sendToWindow(windowId, INIT_TOKEN_CHANNEL, { token: initToken })
      })
    }

    return {
      windowId,
      role,
      instanceKey,
      created: true,
      route
    }
  }

  /**
   * 构建安全的 webPreferences。
   *
   * @param config 窗口配置。
   * @returns 安全的 webPreferences。
   */
  private buildSafeWebPreferences(config: WindowConfig): SafeWebPreferences {
    const devToolsAllowed = shouldAllowDevTools(config.role, this.environment).allowed
    return {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
      nativeWindowOpen: false,
      preload: config.preload,
      devTools: devToolsAllowed
    }
  }

  /**
   * 设置安全处理器：禁止 window.open、拦截外部导航。
   *
   * @param window 目标窗口。
   * @param role 窗口角色。
   */
  private setupSecurityHandlers(window: BrowserWindowLike, role: WindowRole): void {
    const webContents = window.webContents

    webContents.setWindowOpenHandler(() => {
      return { action: 'deny' }
    })

    webContents.on('will-navigate', (event: unknown, url: unknown) => {
      if (typeof url !== 'string') {
        return
      }
      if (this.urlResolver.isInternalUrl(url)) {
        return
      }
      const preventDefault = (event as { preventDefault?: () => void }).preventDefault
      if (typeof preventDefault === 'function') {
        preventDefault.call(event)
      }
      if (this.shellOpenExternal) {
        this.shellOpenExternal(url)
      } else {
        console.warn(`[window-manager] blocked external navigation for role "${role}":`, url)
      }
    })
  }

  /**
   * 解析初始边界。
   *
   * @param role 窗口角色。
   * @param config 窗口配置。
   * @param options 打开参数。
   * @param parentWindow 父窗口。
   * @returns 初始边界。
   */
  private resolveInitialBounds(
    role: WindowRole,
    config: WindowConfig,
    options: OpenWindowOptions,
    parentWindow?: BrowserWindowLike
  ): { x: number; y: number; width: number; height: number } {
    const stateKey = this.stateKeyFor(role, this.resolveInstanceKey(role, config, options), config)
    const saved = this.stateStore.restore(
      stateKey,
      config.minWidth,
      config.minHeight,
      config.maxWidth,
      config.maxHeight
    )

    if (saved && config.rememberBounds) {
      return saved.bounds
    }

    const width = config.width
    const height = config.height

    if (config.centerToParent && parentWindow && !parentWindow.isDestroyed()) {
      const parentLike: ParentWindowLike = {
        getBounds: () => parentWindow.getBounds(),
        isDestroyed: () => parentWindow.isDestroyed()
      }
      return centerToParentWindow(parentLike, width, height)
    }

    const strategy = options.displayTarget ?? config.displayTarget ?? 'primary'
    const parentLike: ParentWindowLike | null = parentWindow && !parentWindow.isDestroyed()
      ? {
          getBounds: () => parentWindow.getBounds(),
          isDestroyed: () => parentWindow.isDestroyed()
        }
      : null

    const display = selectTargetDisplay(this.screen, strategy, {
      parent: parentLike,
      lastDisplayId: saved?.displayId
    })

    if (config.center) {
      return centerToDisplay(display, width, height)
    }

    const bounds = { x: display.bounds.x, y: display.bounds.y, width, height }
    return autoCorrectBounds(
      this.screen,
      bounds,
      config.minWidth,
      config.minHeight,
      config.maxWidth,
      config.maxHeight
    )
  }

  /**
   * 解析实例键。
   *
   * @param role 窗口角色。
   * @param config 窗口配置。
   * @param options 打开参数。
   * @returns 实例键。
   */
  private resolveInstanceKey(
    role: WindowRole,
    config: WindowConfig,
    options?: Partial<Omit<OpenWindowOptions, 'role'>>
  ): string {
    if (config.singleton) {
      if (config.singletonPerParent && options?.parentWindowId !== undefined) {
        return `${role}:${options.parentWindowId}`
      }
      return role
    }

    if (options?.params && Object.keys(options.params).length > 0) {
      const paramKey = Object.keys(options.params)
        .sort()
        .map((k) => `${k}=${options.params?.[k] ?? ''}`)
        .join('&')
      return `${role}:${paramKey}`
    }

    return `${role}:${this.nextCounter(role)}`
  }

  /**
   * 计算状态存储键。
   *
   * @param role 窗口角色。
   * @param instanceKey 实例键。
   * @param config 窗口配置。
   * @returns 状态键。
   */
  private stateKeyFor(role: WindowRole, instanceKey: string, config: WindowConfig): string {
    if (config.singleton) {
      return role
    }
    return instanceKey
  }

  /**
   * 获取下一个实例计数器。
   *
   * @param role 窗口角色。
   * @returns 计数器值。
   */
  private nextCounter(role: WindowRole): number {
    const current = this.counters.get(role) ?? 0
    const next = current + 1
    this.counters.set(role, next)
    return next
  }

  /**
   * 将注册条目转换为安全的窗口引用。
   *
   * @param window 窗口对象。
   * @param entry 注册条目。
   * @returns 窗口引用。
   */
  private toWindowRef(
    window: BrowserWindowLike,
    entry: {
      role: WindowRole
      instanceKey: string
      route: string
      parentId?: number
      createdAt: number
      focusedAt: number
    }
  ): WindowRef {
    const record = this.internalRecords.get(window.id)
    const isDestroyed = window.isDestroyed()
    return {
      id: window.id,
      role: entry.role,
      instanceKey: entry.instanceKey,
      title: record?.title ?? (typeof window.getTitle === 'function' ? window.getTitle() : ''),
      route: entry.route,
      createdAt: entry.createdAt,
      focusedAt: entry.focusedAt,
      isFocused: this.focusedWindowId === window.id,
      isVisible: !isDestroyed,
      isDestroyed,
      isMaximized: !isDestroyed && window.isMaximized(),
      isMinimized: !isDestroyed && window.isMinimized(),
      isFullScreen: !isDestroyed && window.isFullScreen(),
      isAlwaysOnTop: !isDestroyed && window.isAlwaysOnTop(),
      bounds: !isDestroyed ? window.getBounds() : { x: 0, y: 0, width: 0, height: 0 },
      parentId: entry.parentId
    }
  }

  /**
   * 发出 window:created 事件。
   *
   * @param windowId 窗口 ID。
   * @param role 窗口角色。
   */
  private emitCreated(windowId: number, role: WindowRole): void {
    this.eventBus.emit({
      type: 'window:created',
      windowId,
      role,
      timestamp: Date.now()
    })
  }
}

export type { WindowError, ScreenLike, DisplayInfo }
