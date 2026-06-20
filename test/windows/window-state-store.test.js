/**
 * @file 窗口状态持久化存储测试。
 */

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')

const { WindowStateStore } = require('../../dist/electron/windows/main/window-state-store.js')

const PRIMARY_DISPLAY = {
  id: 1,
  bounds: { x: 0, y: 0, width: 1920, height: 1080 }
}

function createMockScreen(displays = []) {
  return {
    getAllDisplays() { return displays }
  }
}

function createTempFilePath() {
  return path.join(os.tmpdir(), `window-state-test-${Date.now()}-${Math.random().toString(36).slice(2)}.json`)
}

test('保存并恢复单例窗口状态', () => {
  const filePath = createTempFilePath()
  const screen = createMockScreen([PRIMARY_DISPLAY])
  const store = new WindowStateStore({ filePath, screen })

  store.saveNow('main', {
    bounds: { x: 100, y: 200, width: 1280, height: 800 },
    isMaximized: false,
    isFullScreen: false,
    displayId: 1,
    lastRoute: '/',
    lastFocusedAt: Date.now()
  })

  const restored = store.restore('main', 1024, 640)
  assert.ok(restored)
  assert.equal(restored.bounds.x, 100)
  assert.equal(restored.bounds.y, 200)
  assert.equal(restored.bounds.width, 1280)
  assert.equal(restored.bounds.height, 800)
  assert.equal(restored.lastRoute, '/')

  try { fs.unlinkSync(filePath) } catch { /* ignore */ }
})

test('恢复时自动校正离屏窗口到可见区域', () => {
  const filePath = createTempFilePath()
  const screen = createMockScreen([PRIMARY_DISPLAY])
  const store = new WindowStateStore({ filePath, screen })

  store.saveNow('main', {
    bounds: { x: -5000, y: -5000, width: 1280, height: 800 },
    isMaximized: false,
    isFullScreen: false,
    displayId: 1,
    lastRoute: '/',
    lastFocusedAt: Date.now()
  })

  const restored = store.restore('main', 1024, 640)
  assert.ok(restored)
  assert.ok(restored.bounds.x >= -100, `x 应被校正到可见区域，实际为 ${restored.bounds.x}`)
  assert.ok(restored.bounds.y >= -100, `y 应被校正到可见区域，实际为 ${restored.bounds.y}`)
})

test('恢复时自动校正过小尺寸', () => {
  const filePath = createTempFilePath()
  const screen = createMockScreen([PRIMARY_DISPLAY])
  const store = new WindowStateStore({ filePath, screen })

  store.saveNow('main', {
    bounds: { x: 100, y: 100, width: 10, height: 10 },
    isMaximized: false,
    isFullScreen: false,
    displayId: 1,
    lastRoute: '/',
    lastFocusedAt: Date.now()
  })

  const restored = store.restore('main', 1024, 640)
  assert.ok(restored.bounds.width >= 1024, `width 应被校正到 >= 1024，实际为 ${restored.bounds.width}`)
  assert.ok(restored.bounds.height >= 640, `height 应被校正到 >= 640，实际为 ${restored.bounds.height}`)
})

test('显示器不存在时回退到主显示器', () => {
  const filePath = createTempFilePath()
  const screen = createMockScreen([PRIMARY_DISPLAY])
  const store = new WindowStateStore({ filePath, screen })

  store.saveNow('main', {
    bounds: { x: 100, y: 200, width: 1280, height: 800 },
    isMaximized: false,
    isFullScreen: false,
    displayId: 999,
    lastRoute: '/',
    lastFocusedAt: Date.now()
  })

  const restored = store.restore('main', 1024, 640)
  assert.ok(restored)
  assert.ok(restored.bounds.x >= 0)
  assert.ok(restored.bounds.y >= 0)
})

test('配置文件损坏时回退默认值', () => {
  const filePath = createTempFilePath()
  fs.writeFileSync(filePath, '{ invalid json }}}')

  const screen = createMockScreen([PRIMARY_DISPLAY])
  const store = new WindowStateStore({ filePath, screen })

  const restored = store.restore('main', 1024, 640)
  assert.equal(restored, undefined, '损坏文件时应返回 undefined 以便使用默认值')
})

test('多实例窗口按 instanceKey 保存', () => {
  const filePath = createTempFilePath()
  const screen = createMockScreen([PRIMARY_DISPLAY])
  const store = new WindowStateStore({ filePath, screen })

  store.saveNow('detail:42', {
    bounds: { x: 100, y: 100, width: 1000, height: 720 },
    isMaximized: false,
    isFullScreen: false,
    displayId: 1,
    lastRoute: '/detail/42',
    lastFocusedAt: Date.now()
  })
  store.saveNow('detail:99', {
    bounds: { x: 200, y: 200, width: 1000, height: 720 },
    isMaximized: false,
    isFullScreen: false,
    displayId: 1,
    lastRoute: '/detail/99',
    lastFocusedAt: Date.now()
  })

  const state42 = store.restore('detail:42', 800, 560)
  const state99 = store.restore('detail:99', 800, 560)
  assert.ok(state42)
  assert.ok(state99)
  assert.equal(state42.lastRoute, '/detail/42')
  assert.equal(state99.lastRoute, '/detail/99')
  assert.notEqual(state42.bounds.x, state99.bounds.x)
})

test('clearWindowState 清除指定角色状态', () => {
  const filePath = createTempFilePath()
  const screen = createMockScreen([PRIMARY_DISPLAY])
  const store = new WindowStateStore({ filePath, screen })

  store.saveNow('main', {
    bounds: { x: 100, y: 200, width: 1280, height: 800 },
    isMaximized: false,
    isFullScreen: false,
    displayId: 1,
    lastRoute: '/',
    lastFocusedAt: Date.now()
  })

  store.clearWindowState('main')

  const restored = store.restore('main', 1024, 640)
  assert.equal(restored, undefined)
})

test('saveAllNow 持久化全部待保存状态', () => {
  const filePath = createTempFilePath()
  const screen = createMockScreen([PRIMARY_DISPLAY])
  const store = new WindowStateStore({ filePath, screen })

  store.save('main', {
    bounds: { x: 100, y: 200, width: 1280, height: 800 },
    isMaximized: true,
    isFullScreen: false,
    displayId: 1,
    lastRoute: '/',
    lastFocusedAt: Date.now()
  })
  store.save('settings', {
    bounds: { x: 200, y: 300, width: 900, height: 680 },
    isMaximized: false,
    isFullScreen: false,
    displayId: 1,
    lastRoute: '/settings',
    lastFocusedAt: Date.now()
  })

  store.saveAllNow()

  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  assert.ok(data.main)
  assert.ok(data.settings)
  assert.equal(data.main.isMaximized, true)
  assert.equal(data.settings.lastRoute, '/settings')
})

test('getDefaultState 返回居中的默认状态', () => {
  const filePath = createTempFilePath()
  const screen = createMockScreen([PRIMARY_DISPLAY])
  const store = new WindowStateStore({ filePath, screen })

  const defaultState = store.getDefaultState(1280, 800, '/')
  assert.ok(defaultState.bounds.width === 1280)
  assert.ok(defaultState.bounds.height === 800)
  assert.ok(defaultState.bounds.x >= 0)
  assert.ok(defaultState.bounds.y >= 0)
  assert.equal(defaultState.lastRoute, '/')
})
