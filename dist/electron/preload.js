"use strict";
/**
 * @file ���� preload �ŽӲ���¶���� API��
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.exposeDesktopApi = void 0;
const expose_api_1 = require("./ipcBus/preload/expose-api");
Object.defineProperty(exports, "exposeDesktopApi", { enumerable: true, get: function () { return expose_api_1.exposeDesktopApi; } });
(0, expose_api_1.exposeDesktopApi)();
