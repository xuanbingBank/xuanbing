"use strict";
/**
 * @file Store 统一导出与初始化入口。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStore = exports.registerStore = exports.storage = exports.computedRef = exports.defineState = exports.useNotificationStore = exports.createNotificationStore = exports.useTabStore = exports.createTabStore = exports.useWindowStore = exports.createWindowStore = exports.initLayoutResizeListener = exports.useLayoutStore = exports.createLayoutStore = exports.useThemeStore = exports.createThemeStore = exports.usePermissionStore = exports.createPermissionStore = exports.useAuthStore = exports.createAuthStore = exports.useAppStore = exports.createAppStore = void 0;
exports.initStores = initStores;
const app_store_1 = require("./app.store");
Object.defineProperty(exports, "createAppStore", { enumerable: true, get: function () { return app_store_1.createAppStore; } });
Object.defineProperty(exports, "useAppStore", { enumerable: true, get: function () { return app_store_1.useAppStore; } });
const auth_store_1 = require("./auth.store");
Object.defineProperty(exports, "createAuthStore", { enumerable: true, get: function () { return auth_store_1.createAuthStore; } });
Object.defineProperty(exports, "useAuthStore", { enumerable: true, get: function () { return auth_store_1.useAuthStore; } });
const permission_store_1 = require("./permission.store");
Object.defineProperty(exports, "createPermissionStore", { enumerable: true, get: function () { return permission_store_1.createPermissionStore; } });
Object.defineProperty(exports, "usePermissionStore", { enumerable: true, get: function () { return permission_store_1.usePermissionStore; } });
const theme_store_1 = require("./theme.store");
Object.defineProperty(exports, "createThemeStore", { enumerable: true, get: function () { return theme_store_1.createThemeStore; } });
Object.defineProperty(exports, "useThemeStore", { enumerable: true, get: function () { return theme_store_1.useThemeStore; } });
const layout_store_1 = require("./layout.store");
Object.defineProperty(exports, "createLayoutStore", { enumerable: true, get: function () { return layout_store_1.createLayoutStore; } });
Object.defineProperty(exports, "useLayoutStore", { enumerable: true, get: function () { return layout_store_1.useLayoutStore; } });
Object.defineProperty(exports, "initLayoutResizeListener", { enumerable: true, get: function () { return layout_store_1.initLayoutResizeListener; } });
const window_store_1 = require("./window.store");
Object.defineProperty(exports, "createWindowStore", { enumerable: true, get: function () { return window_store_1.createWindowStore; } });
Object.defineProperty(exports, "useWindowStore", { enumerable: true, get: function () { return window_store_1.useWindowStore; } });
const tab_store_1 = require("./tab.store");
Object.defineProperty(exports, "createTabStore", { enumerable: true, get: function () { return tab_store_1.createTabStore; } });
Object.defineProperty(exports, "useTabStore", { enumerable: true, get: function () { return tab_store_1.useTabStore; } });
const notification_store_1 = require("./notification.store");
Object.defineProperty(exports, "createNotificationStore", { enumerable: true, get: function () { return notification_store_1.createNotificationStore; } });
Object.defineProperty(exports, "useNotificationStore", { enumerable: true, get: function () { return notification_store_1.useNotificationStore; } });
var base_1 = require("./base");
Object.defineProperty(exports, "defineState", { enumerable: true, get: function () { return base_1.defineState; } });
Object.defineProperty(exports, "computedRef", { enumerable: true, get: function () { return base_1.computedRef; } });
Object.defineProperty(exports, "storage", { enumerable: true, get: function () { return base_1.storage; } });
Object.defineProperty(exports, "registerStore", { enumerable: true, get: function () { return base_1.registerStore; } });
Object.defineProperty(exports, "getStore", { enumerable: true, get: function () { return base_1.getStore; } });
/**
 * 初始化全部 Store（在应用启动时调用）。
 */
function initStores() {
    (0, app_store_1.createAppStore)();
    (0, auth_store_1.createAuthStore)();
    (0, permission_store_1.createPermissionStore)();
    (0, theme_store_1.createThemeStore)();
    (0, layout_store_1.createLayoutStore)();
    (0, window_store_1.createWindowStore)();
    (0, tab_store_1.createTabStore)();
    (0, notification_store_1.createNotificationStore)();
}
