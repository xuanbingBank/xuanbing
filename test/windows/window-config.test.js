/**
 * @file 窗口配置 schema 校验测试。
 */

const test = require('node:test')
const assert = require('node:assert/strict')

const { validateWindowConfigs, getWindowConfig, windowConfigs } = require('../../dist/electron/windows/shared/window-config.js')
const { WINDOW_ROLES } = require('../../dist/electron/windows/shared/window-types.js')

test('全部窗口配置通过 zod 校验', () => {
  const configs = validateWindowConfigs()
  assert.ok(configs.length >= 5, '至少应有 5 个窗口配置')
})

test('每个角色都有对应配置', () => {
  for (const role of WINDOW_ROLES) {
    const config = getWindowConfig(role)
    assert.equal(config.role, role)
  }
})

test('单例窗口 maxInstances 必须为 1', () => {
  for (const config of Object.values(windowConfigs)) {
    if (config.singleton) {
      assert.equal(config.maxInstances, 1, `角色 ${config.role} 是单例但 maxInstances 不为 1`)
    }
  }
})

test('多实例窗口必须 allowMultiple', () => {
  for (const config of Object.values(windowConfigs)) {
    if (config.maxInstances > 1) {
      assert.equal(config.allowMultiple, true, `角色 ${config.role} 的 maxInstances > 1 但未开启 allowMultiple`)
    }
  }
})

test('main 窗口配置正确', () => {
  const main = getWindowConfig('main')
  assert.equal(main.singleton, true)
  assert.equal(main.rememberBounds, true)
  assert.equal(main.rememberLastRoute, true)
  assert.equal(main.showOnReady, true)
  assert.ok(main.width >= 1024, '主窗口宽度应至少 1024')
  assert.ok(main.minWidth >= 640, '主窗口最小宽度应至少 640')
})

test('settings 窗口配置正确', () => {
  const settings = getWindowConfig('settings')
  assert.equal(settings.singleton, true)
  assert.equal(settings.parentRole, 'main')
  assert.equal(settings.closeWithParent, true)
})

test('detail 窗口支持多实例', () => {
  const detail = getWindowConfig('detail')
  assert.equal(detail.singleton, false)
  assert.equal(detail.allowMultiple, true)
  assert.ok(detail.maxInstances > 1, 'detail 应允许多开')
})

test('login 窗口权限最小化', () => {
  const login = getWindowConfig('login')
  assert.equal(login.devTools, false, 'login 窗口生产环境不应开启 devTools')
  assert.ok(!login.permissions.includes('window:open'), 'login 不应有 window:open 权限')
})

test('devtoolsPanel 仅开发环境可用', () => {
  const devtools = getWindowConfig('devtoolsPanel')
  assert.equal(devtools.environment, 'devOnly')
})

test('hiddenWorker 窗口不可见', () => {
  const worker = getWindowConfig('hiddenWorker')
  assert.equal(worker.showOnReady, false)
  assert.equal(worker.skipTaskbar, true)
  assert.equal(worker.closeBehavior, 'prevent')
})
