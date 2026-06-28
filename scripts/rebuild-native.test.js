/**
 * @file 原生依赖重建脚本配置测试。
 *
 * 确保 Electron 启动前会把 better-sqlite3 重建到 Electron ABI，
 * 同时 Node 测试前会恢复到普通 Node ABI。
 */

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

/**
 * 读取当前项目的 package.json。
 *
 * @returns {Record<string, any>} package.json 内容。
 */
function readPackageJson() {
  const packagePath = path.join(__dirname, '..', 'package.json')
  return JSON.parse(fs.readFileSync(packagePath, 'utf8'))
}

test('start 脚本会在 Electron 启动前重建 better-sqlite3', () => {
  const pkg = readPackageJson()

  assert.equal(pkg.scripts['rebuild:native:electron'], 'node scripts/rebuild-native.js electron')
  assert.match(pkg.scripts.start, /^pnpm run rebuild:native:electron && /)
  assert.match(pkg.scripts.start, /electron \.$/)
  assert.ok(pkg.devDependencies['@electron/rebuild'])
})

test('test 脚本会在 Node 测试前恢复 better-sqlite3 的 Node ABI', () => {
  const pkg = readPackageJson()

  assert.equal(pkg.scripts['rebuild:native:node'], 'node scripts/rebuild-native.js node')
  assert.match(pkg.scripts.test, /^pnpm run rebuild:native:node && /)
  assert.match(pkg.scripts.test, /node --test/)
  assert.match(pkg.scripts.test, /test\/renderer\/\*\.test\.js/)
})

/**
 * 验证原生模块占用提示包含可操作信息。
 *
 * @returns {void}
 */
function testLockedBindingMessage() {
  const { formatLockedBindingMessage } = require('./rebuild-native')
  const message = formatLockedBindingMessage([
    {
      pid: 32820,
      name: 'electron',
      path: 'E:\\zhuomian\\xuanbing-all\\all-in-one\\xuanbing\\node_modules\\electron\\dist\\electron.exe'
    }
  ])

  assert.ok(message.includes('better-sqlite3 的原生模块正在被以下进程占用'))
  assert.match(message, /PID 32820/)
  assert.match(message, /electron/)
  assert.ok(message.includes('请先关闭旧的应用窗口或结束这些进程'))
}

test('重建前发现原生模块被占用时会生成可操作提示', testLockedBindingMessage)
