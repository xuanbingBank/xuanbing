"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveRendererTarget = resolveRendererTarget;
const node_path_1 = __importDefault(require("node:path"));
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
