/**
 * @file 验证 Electron 渲染目标与 preload bundle 路径解析。
 */

const path = require('node:path')
const test = require('node:test')
const assert = require('node:assert/strict')

const { resolvePreloadPath, resolveRendererTarget } = require('../dist/electron/renderer-target.js')

/**
 * 验证未配置开发服务地址时回退到本地 HTML。
 */
test('uses local index.html when no dev server URL is configured', () => {
  const target = resolveRendererTarget({
    appRoot: 'C:/workspace/all-in-one',
    isPackaged: false
  })

  assert.deepEqual(target, {
    kind: 'file',
    filePath: path.join('C:/workspace/all-in-one', 'index.html')
  })
})

/**
 * 验证配置开发服务地址时优先使用远程 URL。
 */
test('uses the configured dev server URL when provided', () => {
  const target = resolveRendererTarget({
    appRoot: 'C:/workspace/all-in-one',
    devServerUrl: 'http://localhost:5173',
    isPackaged: false
  })

  assert.deepEqual(target, {
    kind: 'url',
    url: 'http://localhost:5173'
  })
})

/**
 * 验证 preload 入口指向单文件 bundle，兼容 Electron sandbox。
 */
test('resolves preload bundle path from app root', () => {
  const preloadPath = resolvePreloadPath('C:/workspace/all-in-one')

  assert.equal(preloadPath, path.join('C:/workspace/all-in-one', 'dist', 'electron', 'preload.bundle.js'))
})