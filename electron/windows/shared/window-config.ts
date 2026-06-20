/**
 * @file 全部窗口角色的集中配置，启动时经 zod 校验。
 */

import { z } from '../../ipcBus/shared/zod'
import { WINDOW_ROUTES } from './window-types'
import type { WindowConfig, WindowConfigMap } from './window-types'

/**
 * 预加载脚本路径（统一使用项目 preload.js）。
 */
const DEFAULT_PRELOAD = '__PRELOAD__'

/**
 * 窗口配置的 zod 校验模型。
 *
 * 启动时逐条校验，不合法时开发环境直接抛错。
 */
export const windowConfigSchema = z.object({
  role: z.string({ minLength: 1 }),
  title: z.string({ minLength: 1 }),
  route: z.string({ minLength: 1 }),
  entry: z.string().optional(),
  singleton: z.boolean(),
  parentRole: z.string().optional(),
  modal: z.boolean(),
  width: z.number({ min: 1, integer: true }),
  height: z.number({ min: 1, integer: true }),
  minWidth: z.number({ min: 1, integer: true }),
  minHeight: z.number({ min: 1, integer: true }),
  maxWidth: z.number({ min: 1, integer: true }).optional(),
  maxHeight: z.number({ min: 1, integer: true }).optional(),
  resizable: z.boolean(),
  minimizable: z.boolean(),
  maximizable: z.boolean(),
  closable: z.boolean(),
  fullscreenable: z.boolean(),
  alwaysOnTop: z.boolean(),
  frame: z.boolean(),
  transparent: z.boolean(),
  backgroundColor: z.string().optional(),
  showOnReady: z.boolean(),
  rememberBounds: z.boolean(),
  rememberLastRoute: z.boolean(),
  center: z.boolean(),
  skipTaskbar: z.boolean(),
  trafficLightPosition: z.object({
    x: z.number({ integer: true }),
    y: z.number({ integer: true })
  }).optional(),
  titleBarStyle: z.enum(['default', 'hidden', 'hiddenInset', 'customButtonsOnHover']).optional(),
  devTools: z.boolean(),
  permissions: z.array(z.string({ minLength: 1 })),
  preload: z.string({ minLength: 1 }),
  routeParamsSchema: z.unknown().optional(),
  querySchema: z.unknown().optional(),
  allowMultiple: z.boolean(),
  maxInstances: z.number({ min: 1, integer: true }),
  closeBehavior: z.enum(['close', 'hide', 'minimize', 'ask', 'prevent', 'custom']),
  onSecondOpen: z.enum(['focus', 'recreate', 'newInstance', 'ignore']),
  environment: z.enum(['devOnly', 'prodOnly', 'all']),
  displayTarget: z.enum(['primary', 'cursor', 'parent', 'last', 'explicit']).optional(),
  closeWithParent: z.boolean().optional(),
  centerToParent: z.boolean().optional(),
  singletonPerParent: z.boolean().optional()
})

/**
 * 全部窗口配置映射表。
 *
 * 每个角色必须声明全部字段，不允许遗漏。
 */
export const windowConfigs: WindowConfigMap = {
  main: {
    role: 'main',
    title: 'All In One',
    route: '/',
    singleton: true,
    modal: false,
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    resizable: true,
    minimizable: true,
    maximizable: true,
    closable: true,
    fullscreenable: true,
    alwaysOnTop: false,
    frame: true,
    transparent: false,
    showOnReady: true,
    rememberBounds: true,
    rememberLastRoute: true,
    center: true,
    skipTaskbar: false,
    devTools: true,
    permissions: [
      'window:open',
      'window:close:self',
      'window:focus',
      'window:list',
      'window:control:self',
      'app:read',
      'app:quit',
      'file:read',
      'file:write',
      'task:run',
      'task:cancel',
      'route:task-center',
      'route:detail'
    ],
    preload: DEFAULT_PRELOAD,
    allowMultiple: false,
    maxInstances: 1,
    closeBehavior: 'close',
    onSecondOpen: 'focus',
    environment: 'all',
    displayTarget: 'last'
  },
  login: {
    role: 'login',
    title: 'Login',
    route: '/login',
    singleton: true,
    modal: false,
    width: 480,
    height: 640,
    minWidth: 360,
    minHeight: 480,
    resizable: false,
    minimizable: true,
    maximizable: false,
    closable: true,
    fullscreenable: false,
    alwaysOnTop: false,
    frame: true,
    transparent: false,
    showOnReady: true,
    rememberBounds: false,
    rememberLastRoute: false,
    center: true,
    skipTaskbar: false,
    devTools: false,
    permissions: ['window:close:self', 'window:control:self', 'app:read'],
    preload: DEFAULT_PRELOAD,
    allowMultiple: false,
    maxInstances: 1,
    closeBehavior: 'close',
    onSecondOpen: 'focus',
    environment: 'all'
  },
  settings: {
    role: 'settings',
    title: 'Settings',
    route: '/settings',
    singleton: true,
    parentRole: 'main',
    modal: false,
    width: 900,
    height: 680,
    minWidth: 720,
    minHeight: 520,
    resizable: true,
    minimizable: true,
    maximizable: true,
    closable: true,
    fullscreenable: false,
    alwaysOnTop: false,
    frame: true,
    transparent: false,
    showOnReady: true,
    rememberBounds: true,
    rememberLastRoute: false,
    center: true,
    skipTaskbar: false,
    devTools: true,
    permissions: [
      'window:close:self',
      'window:control:self',
      'window:focus',
      'app:read',
      'file:read',
      'route:settings'
    ],
    preload: DEFAULT_PRELOAD,
    allowMultiple: false,
    maxInstances: 1,
    closeBehavior: 'close',
    onSecondOpen: 'focus',
    environment: 'all',
    closeWithParent: true
  },
  about: {
    role: 'about',
    title: 'About',
    route: '/about',
    singleton: true,
    parentRole: 'main',
    modal: true,
    width: 420,
    height: 360,
    minWidth: 360,
    minHeight: 300,
    resizable: false,
    minimizable: false,
    maximizable: false,
    closable: true,
    fullscreenable: false,
    alwaysOnTop: true,
    frame: true,
    transparent: false,
    showOnReady: true,
    rememberBounds: false,
    rememberLastRoute: false,
    center: true,
    skipTaskbar: false,
    devTools: false,
    permissions: ['window:close:self', 'window:control:self', 'app:read'],
    preload: DEFAULT_PRELOAD,
    allowMultiple: false,
    maxInstances: 1,
    closeBehavior: 'close',
    onSecondOpen: 'focus',
    environment: 'all',
    closeWithParent: true,
    centerToParent: true,
    singletonPerParent: true
  },
  detail: {
    role: 'detail',
    title: 'Detail',
    route: '/detail/:id',
    singleton: false,
    parentRole: 'main',
    modal: false,
    width: 1000,
    height: 720,
    minWidth: 800,
    minHeight: 560,
    resizable: true,
    minimizable: true,
    maximizable: true,
    closable: true,
    fullscreenable: true,
    alwaysOnTop: false,
    frame: true,
    transparent: false,
    showOnReady: true,
    rememberBounds: true,
    rememberLastRoute: false,
    center: true,
    skipTaskbar: false,
    devTools: true,
    permissions: ['window:close:self', 'window:control:self', 'app:read', 'route:detail'],
    preload: DEFAULT_PRELOAD,
    allowMultiple: true,
    maxInstances: 10,
    closeBehavior: 'close',
    onSecondOpen: 'newInstance',
    environment: 'all',
    routeParamsSchema: z.object({
      id: z.string({ minLength: 1 })
    })
  },
  editor: {
    role: 'editor',
    title: 'Editor',
    route: '/not-found',
    singleton: false,
    modal: false,
    width: 1200,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    resizable: true,
    minimizable: true,
    maximizable: true,
    closable: true,
    fullscreenable: true,
    alwaysOnTop: false,
    frame: true,
    transparent: false,
    showOnReady: true,
    rememberBounds: true,
    rememberLastRoute: false,
    center: true,
    skipTaskbar: false,
    devTools: true,
    permissions: ['window:close:self', 'window:control:self', 'app:read'],
    preload: DEFAULT_PRELOAD,
    allowMultiple: true,
    maxInstances: 5,
    closeBehavior: 'ask',
    onSecondOpen: 'newInstance',
    environment: 'all'
  },
  taskCenter: {
    role: 'taskCenter',
    title: 'Task Center',
    route: '/task-center',
    singleton: true,
    parentRole: 'main',
    modal: false,
    width: 960,
    height: 700,
    minWidth: 760,
    minHeight: 520,
    resizable: true,
    minimizable: true,
    maximizable: true,
    closable: true,
    fullscreenable: false,
    alwaysOnTop: false,
    frame: true,
    transparent: false,
    showOnReady: true,
    rememberBounds: true,
    rememberLastRoute: false,
    center: true,
    skipTaskbar: false,
    devTools: true,
    permissions: [
      'window:close:self',
      'window:control:self',
      'app:read',
      'task:run',
      'task:cancel',
      'route:task-center'
    ],
    preload: DEFAULT_PRELOAD,
    allowMultiple: false,
    maxInstances: 1,
    closeBehavior: 'hide',
    onSecondOpen: 'focus',
    environment: 'all',
    closeWithParent: false
  },
  logViewer: {
    role: 'logViewer',
    title: 'Log Viewer',
    route: '/log-viewer',
    singleton: true,
    modal: false,
    width: 880,
    height: 620,
    minWidth: 680,
    minHeight: 460,
    resizable: true,
    minimizable: true,
    maximizable: true,
    closable: true,
    fullscreenable: false,
    alwaysOnTop: false,
    frame: true,
    transparent: false,
    showOnReady: true,
    rememberBounds: true,
    rememberLastRoute: false,
    center: true,
    skipTaskbar: false,
    devTools: true,
    permissions: ['window:close:self', 'window:control:self', 'app:read'],
    preload: DEFAULT_PRELOAD,
    allowMultiple: false,
    maxInstances: 1,
    closeBehavior: 'close',
    onSecondOpen: 'focus',
    environment: 'all'
  },
  devtoolsPanel: {
    role: 'devtoolsPanel',
    title: 'DevTools',
    route: '/not-found',
    singleton: false,
    modal: false,
    width: 600,
    height: 400,
    minWidth: 400,
    minHeight: 300,
    resizable: true,
    minimizable: true,
    maximizable: true,
    closable: true,
    fullscreenable: false,
    alwaysOnTop: true,
    frame: true,
    transparent: false,
    showOnReady: true,
    rememberBounds: false,
    rememberLastRoute: false,
    center: true,
    skipTaskbar: true,
    devTools: true,
    permissions: ['window:close:self', 'window:control:self', 'window:devtools'],
    preload: DEFAULT_PRELOAD,
    allowMultiple: true,
    maxInstances: 3,
    closeBehavior: 'close',
    onSecondOpen: 'newInstance',
    environment: 'devOnly'
  },
  floatingToolbox: {
    role: 'floatingToolbox',
    title: 'Toolbox',
    route: '/not-found',
    singleton: true,
    modal: false,
    width: 320,
    height: 480,
    minWidth: 240,
    minHeight: 360,
    resizable: true,
    minimizable: false,
    maximizable: false,
    closable: true,
    fullscreenable: false,
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    showOnReady: true,
    rememberBounds: true,
    rememberLastRoute: false,
    center: false,
    skipTaskbar: true,
    devTools: false,
    permissions: ['window:close:self', 'window:control:self', 'app:read'],
    preload: DEFAULT_PRELOAD,
    allowMultiple: false,
    maxInstances: 1,
    closeBehavior: 'hide',
    onSecondOpen: 'focus',
    environment: 'all'
  },
  trayPanel: {
    role: 'trayPanel',
    title: 'Tray',
    route: '/not-found',
    singleton: true,
    modal: false,
    width: 360,
    height: 500,
    minWidth: 300,
    minHeight: 400,
    resizable: false,
    minimizable: false,
    maximizable: false,
    closable: true,
    fullscreenable: false,
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    showOnReady: true,
    rememberBounds: false,
    rememberLastRoute: false,
    center: false,
    skipTaskbar: true,
    devTools: false,
    permissions: ['window:close:self', 'window:control:self', 'app:read'],
    preload: DEFAULT_PRELOAD,
    allowMultiple: false,
    maxInstances: 1,
    closeBehavior: 'hide',
    onSecondOpen: 'focus',
    environment: 'all'
  },
  modal: {
    role: 'modal',
    title: 'Modal',
    route: '/modal/:type',
    singleton: false,
    modal: true,
    width: 480,
    height: 360,
    minWidth: 360,
    minHeight: 280,
    resizable: false,
    minimizable: false,
    maximizable: false,
    closable: true,
    fullscreenable: false,
    alwaysOnTop: true,
    frame: true,
    transparent: false,
    showOnReady: true,
    rememberBounds: false,
    rememberLastRoute: false,
    center: true,
    skipTaskbar: true,
    devTools: false,
    permissions: ['window:close:self', 'window:control:self', 'app:read'],
    preload: DEFAULT_PRELOAD,
    allowMultiple: true,
    maxInstances: 5,
    closeBehavior: 'close',
    onSecondOpen: 'newInstance',
    environment: 'all',
    closeWithParent: true,
    centerToParent: true,
    singletonPerParent: true,
    routeParamsSchema: z.object({
      type: z.string({ minLength: 1 })
    })
  },
  child: {
    role: 'child',
    title: 'Child',
    route: '/not-found',
    singleton: false,
    modal: false,
    width: 800,
    height: 600,
    minWidth: 600,
    minHeight: 400,
    resizable: true,
    minimizable: true,
    maximizable: true,
    closable: true,
    fullscreenable: false,
    alwaysOnTop: false,
    frame: true,
    transparent: false,
    showOnReady: true,
    rememberBounds: true,
    rememberLastRoute: false,
    center: true,
    skipTaskbar: false,
    devTools: true,
    permissions: ['window:close:self', 'window:control:self', 'app:read'],
    preload: DEFAULT_PRELOAD,
    allowMultiple: true,
    maxInstances: 8,
    closeBehavior: 'close',
    onSecondOpen: 'newInstance',
    environment: 'all',
    closeWithParent: true
  },
  hiddenWorker: {
    role: 'hiddenWorker',
    title: 'Worker',
    route: '/not-found',
    singleton: true,
    modal: false,
    width: 1,
    height: 1,
    minWidth: 1,
    minHeight: 1,
    resizable: false,
    minimizable: false,
    maximizable: false,
    closable: false,
    fullscreenable: false,
    alwaysOnTop: false,
    frame: false,
    transparent: false,
    showOnReady: false,
    rememberBounds: false,
    rememberLastRoute: false,
    center: false,
    skipTaskbar: true,
    devTools: false,
    permissions: ['app:read'],
    preload: DEFAULT_PRELOAD,
    allowMultiple: false,
    maxInstances: 1,
    closeBehavior: 'prevent',
    onSecondOpen: 'ignore',
    environment: 'all'
  }
}

/**
 * 校验全部窗口配置。
 *
 * @returns 校验通过的全部配置数组。
 * @throws 配置不合法时抛出错误（开发环境直接中断）。
 */
export function validateWindowConfigs(): WindowConfig[] {
  const configs = Object.values(windowConfigs)
  const errors: string[] = []

  for (const config of configs) {
    const result = windowConfigSchema.safeParse(config)
    if (!result.success) {
      errors.push(`[${config.role}] ${result.error.message}`)
    }

    if (!WINDOW_ROUTES.includes(config.route as never) && !config.route.includes(':')) {
      errors.push(`[${config.role}] route "${config.route}" is not in WINDOW_ROUTES`)
    }

    if (!config.singleton && !config.allowMultiple && config.maxInstances > 1) {
      errors.push(`[${config.role}] non-singleton window must allowMultiple when maxInstances > 1`)
    }

    if (config.singleton && config.maxInstances > 1) {
      errors.push(`[${config.role}] singleton window must have maxInstances = 1`)
    }
  }

  if (errors.length > 0) {
    throw new Error(`Window config validation failed:\n${errors.join('\n')}`)
  }

  return configs
}

/**
 * 获取指定角色的配置。
 *
 * @param role 窗口角色。
 * @returns 窗口配置。
 * @throws 角色不存在时抛出错误。
 */
export function getWindowConfig(role: WindowConfig['role']): WindowConfig {
  const config = windowConfigs[role]
  if (!config) {
    throw new Error(`Window role "${role}" is not configured.`)
  }
  return config
}

/**
 * 将配置中的 preload 占位符替换为实际路径。
 *
 * @param role 窗口角色。
 * @param preloadPath 实际 preload 脚本路径。
 * @returns 更新后的配置。
 */
export function resolveWindowConfig(role: WindowConfig['role'], preloadPath: string): WindowConfig {
  const config = getWindowConfig(role)
  return {
    ...config,
    preload: config.preload === DEFAULT_PRELOAD ? preloadPath : config.preload
  }
}
