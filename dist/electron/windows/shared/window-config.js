"use strict";
/**
 * @file 全部窗口角色的集中配置，启动时经 zod 校验。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.windowConfigs = exports.windowConfigSchema = void 0;
exports.validateWindowConfigs = validateWindowConfigs;
exports.getWindowConfig = getWindowConfig;
exports.resolveWindowConfig = resolveWindowConfig;
const zod_1 = require("../../ipcBus/shared/zod");
const window_types_1 = require("./window-types");
/**
 * 预加载脚本路径（统一使用项目 preload.js）。
 */
const DEFAULT_PRELOAD = '__PRELOAD__';
/**
 * 窗口配置的 zod 校验模型。
 *
 * 启动时逐条校验，不合法时开发环境直接抛错。
 */
exports.windowConfigSchema = zod_1.z.object({
    role: zod_1.z.string({ minLength: 1 }),
    title: zod_1.z.string({ minLength: 1 }),
    route: zod_1.z.string({ minLength: 1 }),
    entry: zod_1.z.string().optional(),
    singleton: zod_1.z.boolean(),
    parentRole: zod_1.z.string().optional(),
    modal: zod_1.z.boolean(),
    width: zod_1.z.number({ min: 1, integer: true }),
    height: zod_1.z.number({ min: 1, integer: true }),
    minWidth: zod_1.z.number({ min: 1, integer: true }),
    minHeight: zod_1.z.number({ min: 1, integer: true }),
    maxWidth: zod_1.z.number({ min: 1, integer: true }).optional(),
    maxHeight: zod_1.z.number({ min: 1, integer: true }).optional(),
    resizable: zod_1.z.boolean(),
    minimizable: zod_1.z.boolean(),
    maximizable: zod_1.z.boolean(),
    closable: zod_1.z.boolean(),
    fullscreenable: zod_1.z.boolean(),
    alwaysOnTop: zod_1.z.boolean(),
    frame: zod_1.z.boolean(),
    transparent: zod_1.z.boolean(),
    backgroundColor: zod_1.z.string().optional(),
    showOnReady: zod_1.z.boolean(),
    rememberBounds: zod_1.z.boolean(),
    rememberLastRoute: zod_1.z.boolean(),
    center: zod_1.z.boolean(),
    skipTaskbar: zod_1.z.boolean(),
    trafficLightPosition: zod_1.z.object({
        x: zod_1.z.number({ integer: true }),
        y: zod_1.z.number({ integer: true })
    }).optional(),
    titleBarStyle: zod_1.z.enum(['default', 'hidden', 'hiddenInset', 'customButtonsOnHover']).optional(),
    devTools: zod_1.z.boolean(),
    permissions: zod_1.z.array(zod_1.z.string({ minLength: 1 })),
    preload: zod_1.z.string({ minLength: 1 }),
    routeParamsSchema: zod_1.z.unknown().optional(),
    querySchema: zod_1.z.unknown().optional(),
    allowMultiple: zod_1.z.boolean(),
    maxInstances: zod_1.z.number({ min: 1, integer: true }),
    closeBehavior: zod_1.z.enum(['close', 'hide', 'minimize', 'ask', 'prevent', 'custom']),
    onSecondOpen: zod_1.z.enum(['focus', 'recreate', 'newInstance', 'ignore']),
    environment: zod_1.z.enum(['devOnly', 'prodOnly', 'all']),
    displayTarget: zod_1.z.enum(['primary', 'cursor', 'parent', 'last', 'explicit']).optional(),
    closeWithParent: zod_1.z.boolean().optional(),
    centerToParent: zod_1.z.boolean().optional(),
    singletonPerParent: zod_1.z.boolean().optional()
});
/**
 * 全部窗口配置映射表。
 *
 * 每个角色必须声明全部字段，不允许遗漏。
 */
exports.windowConfigs = {
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
        routeParamsSchema: zod_1.z.object({
            id: zod_1.z.string({ minLength: 1 })
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
        routeParamsSchema: zod_1.z.object({
            type: zod_1.z.string({ minLength: 1 })
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
};
/**
 * 校验全部窗口配置。
 *
 * @returns 校验通过的全部配置数组。
 * @throws 配置不合法时抛出错误（开发环境直接中断）。
 */
function validateWindowConfigs() {
    const configs = Object.values(exports.windowConfigs);
    const errors = [];
    for (const config of configs) {
        const result = exports.windowConfigSchema.safeParse(config);
        if (!result.success) {
            errors.push(`[${config.role}] ${result.error.message}`);
        }
        if (!window_types_1.WINDOW_ROUTES.includes(config.route) && !config.route.includes(':')) {
            errors.push(`[${config.role}] route "${config.route}" is not in WINDOW_ROUTES`);
        }
        if (!config.singleton && !config.allowMultiple && config.maxInstances > 1) {
            errors.push(`[${config.role}] non-singleton window must allowMultiple when maxInstances > 1`);
        }
        if (config.singleton && config.maxInstances > 1) {
            errors.push(`[${config.role}] singleton window must have maxInstances = 1`);
        }
    }
    if (errors.length > 0) {
        throw new Error(`Window config validation failed:\n${errors.join('\n')}`);
    }
    return configs;
}
/**
 * 获取指定角色的配置。
 *
 * @param role 窗口角色。
 * @returns 窗口配置。
 * @throws 角色不存在时抛出错误。
 */
function getWindowConfig(role) {
    const config = exports.windowConfigs[role];
    if (!config) {
        throw new Error(`Window role "${role}" is not configured.`);
    }
    return config;
}
/**
 * 将配置中的 preload 占位符替换为实际路径。
 *
 * @param role 窗口角色。
 * @param preloadPath 实际 preload 脚本路径。
 * @returns 更新后的配置。
 */
function resolveWindowConfig(role, preloadPath) {
    const config = getWindowConfig(role);
    return {
        ...config,
        preload: config.preload === DEFAULT_PRELOAD ? preloadPath : config.preload
    };
}
