/**
 * @file 应用设置组合式函数，集中管理用户偏好的加载与持久化。
 *
 * 通过 settingClient 将偏好写入 SQLite（app_settings 表），
 * 每次调用返回同一单例状态，跨组件共享。
 *
 * 主题 / 侧栏折叠 / 跟随系统 已由 themeStore / layoutStore 管理，
 * 此处仅负责其余偏好（语言、启动行为、外观密度、通知、安全等）。
 */

import { defineState, computedRef } from '../stores/base'
import { settingClient } from '../services/setting.client'

/**
 * 设置命名空间。
 */
const NS_GENERAL = 'general'
const NS_APPEARANCE = 'appearance'
const NS_NOTIFICATION = 'notification'
const NS_SECURITY = 'security'

/**
 * 应用设置状态。
 */
export interface AppSettingsState {
  /** 界面语言 */
  language: string
  /** 启动时打开的页面：'dashboard' | 'home' | 'last' */
  startup: string
  /** 信息密度：'comfortable' | 'compact' */
  density: string
  /** 字体大小：'small' | 'medium' | 'large' */
  fontSize: string
  /** 是否减弱动效 */
  reducedMotion: boolean
  /** 是否启用桌面通知 */
  notifyDesktop: boolean
  /** 是否启用声音提醒 */
  notifySound: boolean
  /** Toast 显示位置 */
  toastPosition: string
  /** 是否自动检查更新 */
  autoUpdate: boolean
  /** 是否启用两步验证 */
  twoFactor: boolean
  /** 是否已加载完成 */
  loaded: boolean
  /** 加载错误 */
  loadError: string
}

/** 默认值 */
const DEFAULTS: Omit<AppSettingsState, 'loaded' | 'loadError'> = {
  language: 'zh-CN',
  startup: 'dashboard',
  density: 'comfortable',
  fontSize: 'medium',
  reducedMotion: false,
  notifyDesktop: true,
  notifySound: false,
  toastPosition: 'top-right',
  autoUpdate: true,
  twoFactor: false
}

/**
 * 设置项的（命名空间、键、类型）映射表。
 */
const SETTING_KEYS: Array<{ ns: string; key: string; type: 'string' | 'boolean' }> = [
  { ns: NS_GENERAL, key: 'language', type: 'string' },
  { ns: NS_GENERAL, key: 'startup', type: 'string' },
  { ns: NS_APPEARANCE, key: 'density', type: 'string' },
  { ns: NS_APPEARANCE, key: 'fontSize', type: 'string' },
  { ns: NS_APPEARANCE, key: 'reducedMotion', type: 'boolean' },
  { ns: NS_NOTIFICATION, key: 'desktop', type: 'boolean' },
  { ns: NS_NOTIFICATION, key: 'sound', type: 'boolean' },
  { ns: NS_NOTIFICATION, key: 'toastPosition', type: 'string' },
  { ns: NS_NOTIFICATION, key: 'autoUpdate', type: 'boolean' },
  { ns: NS_SECURITY, key: 'twoFactor', type: 'boolean' }
]

/**
 * 将状态字段名映射到（命名空间、键）。
 */
function resolveSettingLocation(field: keyof AppSettingsState): { ns: string; key: string } | null {
  const map: Record<string, { ns: string; key: string }> = {
    language: { ns: NS_GENERAL, key: 'language' },
    startup: { ns: NS_GENERAL, key: 'startup' },
    density: { ns: NS_APPEARANCE, key: 'density' },
    fontSize: { ns: NS_APPEARANCE, key: 'fontSize' },
    reducedMotion: { ns: NS_APPEARANCE, key: 'reducedMotion' },
    notifyDesktop: { ns: NS_NOTIFICATION, key: 'desktop' },
    notifySound: { ns: NS_NOTIFICATION, key: 'sound' },
    toastPosition: { ns: NS_NOTIFICATION, key: 'toastPosition' },
    autoUpdate: { ns: NS_NOTIFICATION, key: 'autoUpdate' },
    twoFactor: { ns: NS_SECURITY, key: 'twoFactor' }
  }
  return map[field as string] ?? null
}

/** 单例状态 */
const state = defineState<AppSettingsState>({
  ...DEFAULTS,
  loaded: false,
  loadError: ''
})

/** 单例标记，避免重复加载 */
let loadPromise: Promise<void> | null = null

/**
 * 应用设置组合式函数。
 *
 * @returns 响应式状态与操作方法。
 */
export function useAppSettings() {
  /**
   * 从 settingClient 读取一个布尔型设置项。
   */
  async function readBool(ns: string, key: string, fallback: boolean): Promise<boolean> {
    try {
      const item = await settingClient.get(ns, key)
      if (item && typeof item.value === 'boolean') return item.value
      if (item && typeof item.value === 'string') return item.value === 'true'
      return fallback
    } catch {
      return fallback
    }
  }

  /**
   * 从 settingClient 读取一个字符串型设置项。
   */
  async function readString(ns: string, key: string, fallback: string): Promise<string> {
    try {
      const item = await settingClient.get(ns, key)
      if (item && typeof item.value === 'string') return item.value
      return fallback
    } catch {
      return fallback
    }
  }

  /**
   * 加载全部设置项。
   */
  async function load(): Promise<void> {
    if (loadPromise) return loadPromise
    loadPromise = (async () => {
      state.loadError = ''
      try {
        const [
          language,
          startup,
          density,
          fontSize,
          reducedMotion,
          notifyDesktop,
          notifySound,
          toastPosition,
          autoUpdate,
          twoFactor
        ] = await Promise.all([
          readString(NS_GENERAL, 'language', DEFAULTS.language),
          readString(NS_GENERAL, 'startup', DEFAULTS.startup),
          readString(NS_APPEARANCE, 'density', DEFAULTS.density),
          readString(NS_APPEARANCE, 'fontSize', DEFAULTS.fontSize),
          readBool(NS_APPEARANCE, 'reducedMotion', DEFAULTS.reducedMotion),
          readBool(NS_NOTIFICATION, 'desktop', DEFAULTS.notifyDesktop),
          readBool(NS_NOTIFICATION, 'sound', DEFAULTS.notifySound),
          readString(NS_NOTIFICATION, 'toastPosition', DEFAULTS.toastPosition),
          readBool(NS_NOTIFICATION, 'autoUpdate', DEFAULTS.autoUpdate),
          readBool(NS_SECURITY, 'twoFactor', DEFAULTS.twoFactor)
        ])

        state.language = language
        state.startup = startup
        state.density = density
        state.fontSize = fontSize
        state.reducedMotion = reducedMotion
        state.notifyDesktop = notifyDesktop
        state.notifySound = notifySound
        state.toastPosition = toastPosition
        state.autoUpdate = autoUpdate
        state.twoFactor = twoFactor
        state.loaded = true
      } catch (err) {
        state.loadError = err instanceof Error ? err.message : String(err)
        state.loaded = true
      } finally {
        loadPromise = null
      }
    })()
    return loadPromise
  }

  /**
   * 更新并持久化单个设置项。
   *
   * 写入失败时仅返回 false，不回滚本地状态（偏好丢失不阻塞业务）。
   */
  async function update<K extends keyof AppSettingsState>(
    field: K,
    value: AppSettingsState[K]
  ): Promise<boolean> {
    // 先更新本地状态
    ;(state[field] as AppSettingsState[K]) = value

    const loc = resolveSettingLocation(field as keyof AppSettingsState)
    if (!loc) return false

    try {
      await settingClient.set({
        namespace: loc.ns,
        key: loc.key,
        value: value as unknown,
        valueType: typeof value === 'boolean' ? 'boolean' : 'string',
        description: ''
      })
      return true
    } catch (err) {
      console.warn('[useAppSettings] persist failed', field, err)
      return false
    }
  }

  /**
   * 重置全部偏好为默认值（仅本地，不删除数据库记录）。
   */
  function resetLocal(): void {
    Object.assign(state, DEFAULTS)
  }

  const isReady = computedRef<boolean>(() => state.loaded)

  return {
    state,
    isReady,
    load,
    update,
    resetLocal,
    /** 暴露设置键清单，供调试 / 关于页展示 */
    settingKeys: SETTING_KEYS
  }
}
