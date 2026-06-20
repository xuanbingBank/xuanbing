"use strict";
/**
 * @file 注册应用信息相关�?IPC 能力�? */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAppIpc = registerAppIpc;
const shared_1 = require("../../shared");
/**
 * 注册 `app.getInfo` 示例能力�? *
 * 为什么必须在 main�? * 应用版本、打包状态与桌面运行时信息属�?Electron 主进程可信上下文�? *
 * renderer 能拿到什么：
 * 只拿到经�?schema 校验的只读应用信息对象�? *
 * renderer 不能拿到什么：
 * 拿不�?`app` 实例、`process.env`、原�?Electron 对象或其他系统能力�? *
 * 输入如何校验�? * 使用共享契约中的空对象模型，只允许无参数调用�? *
 * 输出如何校验�? * 使用共享契约中的 `appInfoResponseSchema` 校验返回值�? *
 * 失败如何返回�? * 统一由总线转换为标�?`IpcError` 结果结构�? *
 * 窗口关闭如何清理�? * 该能力是一次�?request/response，不保留窗口级资源，无额外清理项�? *
 * @param bus 主进�?IPC 总线�? * @param dependencies 应用信息依赖�? */
function registerAppIpc(bus, dependencies) {
    bus.registerHandler(shared_1.requestContracts[shared_1.IPC_CHANNELS.appInfoGet], async () => ({
        appName: dependencies.appName,
        appVersion: dependencies.appVersion,
        electronVersion: dependencies.electronVersion,
        chromeVersion: dependencies.chromeVersion,
        platform: dependencies.platform,
        isPackaged: dependencies.isPackaged
    }));
}
