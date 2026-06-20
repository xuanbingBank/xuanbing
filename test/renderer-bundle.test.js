/**
 * @file 验证渲染层 HTML、bundle、preload bundle 与全局样式入口的启动约束。
 */

const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const assert = require('node:assert/strict')

const rootDir = path.resolve(__dirname, '..')

/**
 * 读取项目根目录下的文件内容。
 *
 * @param {string} relativePath 相对项目根目录的路径。
 * @returns {string} 文件文本内容。
 */
function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), 'utf8')
}

/**
 * 验证 HTML 使用 CSP 兼容的 Vue runtime 与渲染层 bundle。
 */
test('index.html 使用渲染层 bundle 并声明 CSP 安全约束', () => {
  const html = readProjectFile('index.html')

  assert.match(html, /http-equiv="Content-Security-Policy"/)
  assert.doesNotMatch(html, /unsafe-eval/)
  assert.match(html, /vue\.runtime\.global\.prod\.js/)
  assert.doesNotMatch(html, /vue\.global\.prod\.js/)
  assert.match(html, /\.\/dist\/src\/renderer\.bundle\.js/)
  assert.doesNotMatch(html, /\.\/dist\/src\/renderer\.js"/)
})

/**
 * 验证渲染层 bundle 已生成并且模板已预编译为 render 函数。
 */
test('渲染层 bundle 构建产物存在并预编译 Vue 模板', () => {
  const bundlePath = path.join(rootDir, 'dist', 'src', 'renderer.bundle.js')
  const bundle = fs.readFileSync(bundlePath, 'utf8')

  assert.equal(fs.existsSync(bundlePath), true)
  assert.match(bundle, /__rendererRequire/)
  assert.match(bundle, /render:\s*\(function \(\) \{/)
  assert.doesNotMatch(bundle, /template:\s*`/)
})

/**
 * 验证 preload 也被打成单文件 bundle，避免 Electron sandbox 解析本地模块失败。
 */
test('preload bundle 构建产物存在并包含本地依赖', () => {
  const bundlePath = path.join(rootDir, 'dist', 'electron', 'preload.bundle.js')
  const bundle = fs.readFileSync(bundlePath, 'utf8')

  assert.equal(fs.existsSync(bundlePath), true)
  assert.match(bundle, /__preloadRequire/)
  assert.match(bundle, /"\.\/ipcBus\/preload\/expose-api":"electron\/ipcBus\/preload\/expose-api\.js"/)
  assert.match(bundle, /function localRequire\(request\)/)
  assert.match(bundle, /electron/)
})

/**
 * 验证样式入口引用 daisyUI 实际发布的 CSS 文件。
 */
test('样式入口引用 daisyUI 实际存在的 CSS', () => {
  const css = readProjectFile('src/renderer/styles/index.css')

  assert.match(css, /daisyui\/daisyui\.css/)
  assert.match(css, /daisyui\/themes\.css/)
  assert.doesNotMatch(css, /daisyui\/build\.css/)
})