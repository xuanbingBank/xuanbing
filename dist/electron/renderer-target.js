"use strict";
/**
 * @file 解析 Electron 窗口需要加载的渲染目标与 preload bundle 路径。
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveRendererTarget = resolveRendererTarget;
exports.resolvePreloadPath = resolvePreloadPath;
const node_path_1 = __importDefault(require("node:path"));
/**
 * 根据运行环境解析窗口应加载的渲染目标。
 *
 * @param options 渲染目标解析选项。
 * @returns 开发服务 URL 或本地 HTML 文件目标。
 */
function resolveRendererTarget(options) {
    const devServerUrl = options.devServerUrl?.trim();
    if (!options.isPackaged && devServerUrl) {
        return {
            kind: 'url',
            url: devServerUrl
        };
    }
    return {
        kind: 'file',
        filePath: node_path_1.default.join(options.appRoot, 'index.html')
    };
}
/**
 * 根据应用根目录解析编译后的 preload bundle 路径。
 *
 * @param appRoot Electron 应用根目录。
 * @returns preload bundle 绝对路径。
 */
function resolvePreloadPath(appRoot) {
    return node_path_1.default.join(appRoot, 'dist', 'electron', 'preload.bundle.js');
}
