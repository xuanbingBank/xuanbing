/**
 * @file 新窗口管理器的二次打开与关闭行为回归测试。
 *
 * 覆盖单例窗口 onSecondOpen 策略，以及 closeBehavior 配置的 hide / prevent 分支。
 */

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

/** 下一个模拟窗口 ID。 */
let nextWindowId = 1

/**
 * 创建事件监听能力。
 *
 * @returns {{on: Function, once: Function, off: Function, emit: Function}} 事件工具。
 */
function createEmitter() {
  const listeners = new Map()

  /**
   * 注册事件监听器。
   *
   * @param {string} event 事件名称。
   * @param {Function} handler 事件处理器。
   */
  function on(event, handler) {
    const set = listeners.get(event) ?? new Set()
    set.add(handler)
    listeners.set(event, set)
  }

  /**
   * 注册一次性事件监听器。
   *
   * @param {string} event 事件名称。
   * @param {Function} handler 事件处理器。
   */
  function once(event, handler) {
    const wrapper = (...args) => {
      off(event, wrapper)
      handler(...args)
    }
    on(event, wrapper)
  }

  /**
   * 移除事件监听器。
   *
   * @param {string} event 事件名称。
   * @param {Function} handler 事件处理器。
   */
  function off(event, handler) {
    listeners.get(event)?.delete(handler)
  }

  /**
   * 触发事件。
   *
   * @param {string} event 事件名称。
   * @param {...unknown} args 事件参数。
   */
  function emit(event, ...args) {
    for (const handler of [...(listeners.get(event) ?? [])]) {
      handler(...args)
    }
  }

  return { on, once, off, emit }
}

/**
 * 创建模拟 webContents。
 *
 * @param {number} id webContents 标识。
 * @returns {object} 模拟 webContents。
 */
function createMockWebContents(id) {
  const emitter = createEmitter()
  return {
    id: id + 10_000,
    loadedUrl: '',
    isDestroyed: () => false,
    getURL: () => '',
    send: () => undefined,
    on: emitter.on,
    once: emitter.once,
    off: emitter.off,
    setWindowOpenHandler: () => undefined,
    reload: () => undefined,
    openDevTools: () => undefined,
    loadURL(url) {
      this.loadedUrl = url
      return Promise.resolve()
    },
    loadFile: () => Promise.resolve()
  }
}

/**
 * 创建模拟 BrowserWindow。
 *
 * @param {object} options 窗口构造参数。
 * @returns {object} 模拟窗口对象。
 */
function createMockWindow(options) {
  const emitter = createEmitter()
  const id = nextWindowId++
  let destroyed = false
  let hidden = false
  let minimized = false
  let closed = false

  return {
    id,
    options,
    webContents: createMockWebContents(id),
    isDestroyed: () => destroyed,
    getBounds: () => ({ x: options.x ?? 0, y: options.y ?? 0, width: options.width ?? 800, height: options.height ?? 600 }),
    setBounds: () => undefined,
    minimize: () => { minimized = true },
    maximize: () => undefined,
    unmaximize: () => undefined,
    isMaximized: () => false,
    isMinimized: () => minimized,
    isFullScreen: () => false,
    isAlwaysOnTop: () => false,
    close: () => {
      closed = true
      destroyed = true
      emitter.emit('close')
      emitter.emit('closed')
    },
    destroy: () => {
      destroyed = true
      emitter.emit('closed')
    },
    focus: () => emitter.emit('focus'),
    show: () => { hidden = false },
    hide: () => { hidden = true },
    restore: () => { minimized = false },
    reload: () => undefined,
    setAlwaysOnTop: () => undefined,
    on: emitter.on,
    once: emitter.once,
    off: emitter.off,
    get closed() { return closed },
    get hidden() { return hidden },
    get minimized() { return minimized }
  }
}

/**
 * 创建窗口管理器测试实例。
 *
 * @returns {{manager: import('../../dist/electron/windows/main/window-manager').WindowManager, windows: object[]}} 测试上下文。
 */
function createWindowManagerFixture() {
  const { WindowManager } = require('../../dist/electron/windows/main/window-manager')
  const windows = []
  const manager = new WindowManager({
    browserWindowFactory: (options) => {
      const window = createMockWindow(options)
      windows.push(window)
      return window
    },
    screen: {
      getPrimaryDisplay: () => ({ id: 1, bounds: { x: 0, y: 0, width: 1920, height: 1080 }, workArea: { x: 0, y: 0, width: 1920, height: 1040 } }),
      getAllDisplays: () => [{ id: 1, bounds: { x: 0, y: 0, width: 1920, height: 1080 }, workArea: { x: 0, y: 0, width: 1920, height: 1040 } }],
      getCursorScreenPoint: () => ({ x: 10, y: 10 })
    },
    preloadPath: path.join(__dirname, 'preload.js'),
    isPackaged: true,
    indexHtmlPath: path.join(__dirname, 'index.html'),
    stateFilePath: path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'xb-window-')), 'state.json'),
    environment: 'test'
  })

  return { manager, windows }
}

test('singleton second open follows focus strategy instead of guard rejection', () => {
  const { manager } = createWindowManagerFixture()

  const first = manager.openWindow('settings')
  const second = manager.openWindow('settings')

  assert.equal(second.windowId, first.windowId)
  assert.equal(second.created, false)
  manager.dispose()
})

test('closeBehavior hide hides the window instead of destroying it', () => {
  const { manager, windows } = createWindowManagerFixture()

  const result = manager.openWindow('taskCenter')
  manager.closeWindow(result.windowId)

  assert.equal(windows[0].hidden, true)
  assert.equal(windows[0].closed, false)
  manager.dispose()
})

test('closeBehavior prevent ignores close requests', () => {
  const { manager, windows } = createWindowManagerFixture()

  const result = manager.openWindow('hiddenWorker')
  manager.closeWindow(result.windowId)

  assert.equal(windows[0].closed, false)
  assert.equal(windows[0].hidden, false)
  manager.dispose()
})


test('devTools are blocked in production even when config enables them', () => {
  const { shouldAllowDevTools } = require('../../dist/electron/windows/main/window-guards')

  const result = shouldAllowDevTools('main', 'production')

  assert.equal(result.allowed, false)
})
