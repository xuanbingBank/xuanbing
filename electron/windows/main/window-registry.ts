/**
 * @file 窗口注册表，维护 windowId -> 窗口引用、role -> windowId[]、instanceKey -> windowId 三套索引。
 *
 * 不直接依赖 electron，通过 BrowserWindowLike 接口与外部注入的窗口对象交互。
 * 窗口销毁时自动反注册，防止持有过期引用。
 */

import { WINDOW_ERROR_CODES, createWindowError } from '../shared/window-errors'
import type { WindowError } from '../shared/window-errors'
import type { WindowRole } from '../shared/window-types'

/**
 * 浏览器窗口的最小接口，仅暴露注册表需要的方法。
 */
export interface BrowserWindowLike {
  id: number
  isDestroyed(): boolean
  on(event: string, handler: (...args: unknown[]) => void): void
  off(event: string, handler: (...args: unknown[]) => void): void
}

/**
 * 注册条目结构。
 */
export interface WindowRegistryEntry {
  window: BrowserWindowLike
  role: WindowRole
  instanceKey: string
  parentId?: number
  route: string
  entityId?: string
  createdAt: number
  focusedAt: number
}

/**
 * 注册参数。
 */
export interface RegisterWindowOptions {
  window: BrowserWindowLike
  role: WindowRole
  instanceKey: string
  parentId?: number
  route: string
  entityId?: string
}

/**
 * dumpTree 输出条目。
 */
export interface WindowRegistryDumpEntry {
  windowId: number
  role: WindowRole
  instanceKey: string
  parentId?: number
  route: string
  entityId?: string
  isDestroyed: boolean
  createdAt: number
  focusedAt: number
  children: WindowRegistryDumpEntry[]
}

/**
 * 窗口注册表。
 */
export class WindowRegistry {
  /** windowId -> 注册条目。 */
  private readonly byId = new Map<number, WindowRegistryEntry>()

  /** role -> windowId[]。 */
  private readonly byRole = new Map<WindowRole, number[]>()

  /** instanceKey -> windowId。 */
  private readonly byInstanceKey = new Map<string, number>()

  /** route -> windowId[]。 */
  private readonly byRoute = new Map<string, number[]>()

  /** entityId -> windowId[]。 */
  private readonly byEntityId = new Map<string, number[]>()

  /** 已注册的销毁监听器取消函数。 */
  private readonly destroyListeners = new Map<number, () => void>()

  /**
   * 注册窗口。
   *
   * @param options 注册参数。
   * @throws WindowError 重复注册或参数非法时抛出。
   */
  public register(options: RegisterWindowOptions): WindowRegistryEntry {
    const windowId = options.window.id
    if (windowId === undefined || typeof windowId !== 'number' || windowId <= 0) {
      throw createWindowError(
        WINDOW_ERROR_CODES.validationError,
        `Invalid window id: ${String(windowId)}`
      )
    }

    if (options.window.isDestroyed()) {
      throw createWindowError(
        WINDOW_ERROR_CODES.windowDestroyed,
        `Cannot register destroyed window ${windowId}.`
      )
    }

    if (this.byId.has(windowId)) {
      throw createWindowError(
        WINDOW_ERROR_CODES.validationError,
        `Window ${windowId} is already registered.`
      )
    }

    if (this.byInstanceKey.has(options.instanceKey)) {
      throw createWindowError(
        WINDOW_ERROR_CODES.singletonExists,
        `Instance key "${options.instanceKey}" is already in use.`
      )
    }

    const now = Date.now()
    const entry: WindowRegistryEntry = {
      window: options.window,
      role: options.role,
      instanceKey: options.instanceKey,
      parentId: options.parentId,
      route: options.route,
      entityId: options.entityId,
      createdAt: now,
      focusedAt: now
    }

    this.byId.set(windowId, entry)
    this.addToIndex(this.byRole, options.role, windowId)
    this.byInstanceKey.set(options.instanceKey, windowId)
    this.addToIndex(this.byRoute, options.route, windowId)
    if (options.entityId !== undefined) {
      this.addToIndex(this.byEntityId, options.entityId, windowId)
    }

    const handler = (): void => {
      this.unregister(windowId)
    }
    options.window.on('closed', handler)
    this.destroyListeners.set(windowId, () => {
      options.window.off('closed', handler)
    })

    return entry
  }

  /**
   * 反注册窗口。
   *
   * @param windowId 窗口 ID。
   */
  public unregister(windowId: number): void {
    const entry = this.byId.get(windowId)
    if (!entry) {
      return
    }

    const off = this.destroyListeners.get(windowId)
    if (off) {
      off()
      this.destroyListeners.delete(windowId)
    }

    this.byId.delete(windowId)
    this.removeFromIndex(this.byRole, entry.role, windowId)
    this.byInstanceKey.delete(entry.instanceKey)
    this.removeFromIndex(this.byRoute, entry.route, windowId)
    if (entry.entityId !== undefined) {
      this.removeFromIndex(this.byEntityId, entry.entityId, windowId)
    }
  }

  /**
   * 获取注册条目。
   *
   * @param windowId 窗口 ID。
   * @returns 注册条目，未找到或已销毁时返回 undefined。
   */
  public get(windowId: number): WindowRegistryEntry | undefined {
    const entry = this.byId.get(windowId)
    if (!entry) {
      return undefined
    }
    if (entry.window.isDestroyed()) {
      this.unregister(windowId)
      return undefined
    }
    return entry
  }

  /**
   * 获取窗口对象。
   *
   * @param windowId 窗口 ID。
   * @returns 窗口对象，未找到或已销毁时返回 undefined。
   */
  public getWindow(windowId: number): BrowserWindowLike | undefined {
    return this.get(windowId)?.window
  }

  /**
   * 根据角色获取全部窗口 ID。
   *
   * @param role 窗口角色。
   * @returns 窗口 ID 数组（已过滤销毁窗口）。
   */
  public getByRole(role: WindowRole): number[] {
    const ids = this.byRole.get(role)
    if (!ids) {
      return []
    }
    return this.filterAlive(ids)
  }

  /**
   * 根据角色获取第一个窗口 ID（用于单例）。
   *
   * @param role 窗口角色。
   * @returns 窗口 ID，未找到时返回 undefined。
   */
  public getFirstByRole(role: WindowRole): number | undefined {
    const ids = this.getByRole(role)
    return ids.length > 0 ? ids[0] : undefined
  }

  /**
   * 根据 instanceKey 获取窗口 ID。
   *
   * @param instanceKey 实例键。
   * @returns 窗口 ID，未找到时返回 undefined。
   */
  public getByInstanceKey(instanceKey: string): number | undefined {
    const windowId = this.byInstanceKey.get(instanceKey)
    if (windowId === undefined) {
      return undefined
    }
    const entry = this.byId.get(windowId)
    if (!entry || entry.window.isDestroyed()) {
      this.unregister(windowId)
      return undefined
    }
    return windowId
  }

  /**
   * 根据路由获取窗口 ID 列表。
   *
   * @param route 路由路径。
   * @returns 窗口 ID 数组。
   */
  public getByRoute(route: string): number[] {
    const ids = this.byRoute.get(route)
    if (!ids) {
      return []
    }
    return this.filterAlive(ids)
  }

  /**
   * 根据 entityId 获取窗口 ID 列表。
   *
   * @param entityId 实体 ID。
   * @returns 窗口 ID 数组。
   */
  public getByEntityId(entityId: string): number[] {
    const ids = this.byEntityId.get(entityId)
    if (!ids) {
      return []
    }
    return this.filterAlive(ids)
  }

  /**
   * 获取指定角色下的实例数量。
   *
   * @param role 窗口角色。
   * @returns 实例数量。
   */
  public countByRole(role: WindowRole): number {
    return this.getByRole(role).length
  }

  /**
   * 获取全部窗口 ID。
   *
   * @returns 窗口 ID 数组（已过滤销毁窗口）。
   */
  public getAllWindowIds(): number[] {
    return this.filterAlive(Array.from(this.byId.keys()))
  }

  /**
   * 获取全部注册条目。
   *
   * @returns 注册条目数组。
   */
  public getAllEntries(): WindowRegistryEntry[] {
    const entries: WindowRegistryEntry[] = []
    for (const id of Array.from(this.byId.keys())) {
      const entry = this.get(id)
      if (entry) {
        entries.push(entry)
      }
    }
    return entries
  }

  /**
   * 更新窗口的 focusedAt 时间戳。
   *
   * @param windowId 窗口 ID。
   */
  public markFocused(windowId: number): void {
    const entry = this.byId.get(windowId)
    if (entry) {
      entry.focusedAt = Date.now()
    }
  }

  /**
   * 更新窗口的路由。
   *
   * @param windowId 窗口 ID。
   * @param route 新路由。
   */
  public updateRoute(windowId: number, route: string): void {
    const entry = this.byId.get(windowId)
    if (!entry) {
      return
    }
    if (entry.route !== route) {
      this.removeFromIndex(this.byRoute, entry.route, windowId)
      entry.route = route
      this.addToIndex(this.byRoute, route, windowId)
    }
  }

  /**
   * 更新窗口的 entityId。
   *
   * @param windowId 窗口 ID。
   * @param entityId 实体 ID。
   */
  public updateEntityId(windowId: number, entityId: string | undefined): void {
    const entry = this.byId.get(windowId)
    if (!entry) {
      return
    }
    if (entry.entityId !== undefined) {
      this.removeFromIndex(this.byEntityId, entry.entityId, windowId)
    }
    entry.entityId = entityId
    if (entityId !== undefined) {
      this.addToIndex(this.byEntityId, entityId, windowId)
    }
  }

  /**
   * 清空全部注册。
   */
  public clear(): void {
    for (const off of this.destroyListeners.values()) {
      off()
    }
    this.destroyListeners.clear()
    this.byId.clear()
    this.byRole.clear()
    this.byInstanceKey.clear()
    this.byRoute.clear()
    this.byEntityId.clear()
  }

  /**
   * 输出树状结构用于调试。
   *
   * @returns 注册表快照。
   */
  public dumpTree(): WindowRegistryDumpEntry[] {
    const entries = this.getAllEntries()
    const byId = new Map<number, WindowRegistryDumpEntry>()
    const roots: WindowRegistryDumpEntry[] = []

    for (const entry of entries) {
      const dump: WindowRegistryDumpEntry = {
        windowId: entry.window.id,
        role: entry.role,
        instanceKey: entry.instanceKey,
        parentId: entry.parentId,
        route: entry.route,
        entityId: entry.entityId,
        isDestroyed: entry.window.isDestroyed(),
        createdAt: entry.createdAt,
        focusedAt: entry.focusedAt,
        children: []
      }
      byId.set(dump.windowId, dump)
    }

    for (const dump of byId.values()) {
      if (dump.parentId !== undefined && byId.has(dump.parentId)) {
        byId.get(dump.parentId)?.children.push(dump)
      } else {
        roots.push(dump)
      }
    }

    return roots
  }

  /**
   * 向索引中添加值。
   *
   * @param map 索引映射。
   * @param key 索引键。
   * @param value 窗口 ID。
   */
  private addToIndex<K>(map: Map<K, number[]>, key: K, value: number): void {
    const list = map.get(key)
    if (list) {
      list.push(value)
    } else {
      map.set(key, [value])
    }
  }

  /**
   * 从索引中移除值。
   *
   * @param map 索引映射。
   * @param key 索引键。
   * @param value 窗口 ID。
   */
  private removeFromIndex<K>(map: Map<K, number[]>, key: K, value: number): void {
    const list = map.get(key)
    if (!list) {
      return
    }
    const idx = list.indexOf(value)
    if (idx >= 0) {
      list.splice(idx, 1)
    }
    if (list.length === 0) {
      map.delete(key)
    }
  }

  /**
   * 过滤已销毁窗口并触发反注册。
   *
   * @param ids 候选窗口 ID。
   * @returns 存活窗口 ID。
   */
  private filterAlive(ids: number[]): number[] {
    const alive: number[] = []
    for (const id of ids) {
      const entry = this.byId.get(id)
      if (!entry) {
        continue
      }
      if (entry.window.isDestroyed()) {
        this.unregister(id)
        continue
      }
      alive.push(id)
    }
    return alive
  }
}

export type { WindowError }
