"use strict";
/**
 * @file 业务组件统一导出。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouteViewWrapper = exports.WindowPermissionGate = exports.PermissionGate = void 0;
var PermissionGate_1 = require("./PermissionGate");
Object.defineProperty(exports, "PermissionGate", { enumerable: true, get: function () { return PermissionGate_1.PermissionGate; } });
var WindowPermissionGate_1 = require("./WindowPermissionGate");
Object.defineProperty(exports, "WindowPermissionGate", { enumerable: true, get: function () { return WindowPermissionGate_1.WindowPermissionGate; } });
var RouteViewWrapper_1 = require("./RouteViewWrapper");
Object.defineProperty(exports, "RouteViewWrapper", { enumerable: true, get: function () { return RouteViewWrapper_1.RouteViewWrapper; } });
