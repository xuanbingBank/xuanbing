/**
 * @file 校验 Electron 预加载桥接层只暴露业务域限定的桌面接口。
 */

const assert = require('node:assert/strict')
const Module = require('node:module')
const test = require('node:test')

/**
 * 在临时模拟 `electron` 模块的上下文中执行回调。
 *
 * @param {{ contextBridge: { exposeInMainWorld: (name: string, value: unknown) => void }, ipcRenderer: { invoke: (channel: string, payload?: unknown) => Promise<unknown>, on: (channel: string, listener: (...args: unknown[]) => void) => unknown, removeListener: (channel: string, listener: (...args: unknown[]) => void) => unknown } }} electronMock Electron 模块的测试替身。
 * @param {() => void} callback 模拟生效期间执行的回调。
 * @returns {void}
 */
function withMockedElectron(electronMock, callback) {
  const originalLoad = Module._load

  Module._load = function load(request, parent, isMain) {
    if (request === 'electron') {
      return electronMock
    }

    return originalLoad.call(this, request, parent, isMain)
  }

  try {
    callback()
  } finally {
    Module._load = originalLoad
  }
}

/**
 * 从 Node 的 require 缓存中清除一个 CommonJS 模块。
 *
 * @param {string} modulePath 需要清除的模块绝对路径。
 * @returns {void}
 */
function clearModule(modulePath) {
  delete require.cache[modulePath]
}

/**
 * 断言给定对象没有暴露通用 IPC 方法。
 *
 * @param {Record<string, unknown>} value 需要校验的接口对象。
 * @returns {void}
 */
function assertNoGenericIpcSurface(value) {
  assert.equal('ipcRenderer' in value, false)
  assert.equal('invoke' in value, false)
  assert.equal('send' in value, false)
  assert.equal('on' in value, false)
  assert.equal('rawInvoke' in value, false)
  assert.equal('safeInvoke' in value, false)
  assert.equal('subscribe' in value, false)
}

test('preload exposes only business-scoped desktop namespaces', () => {
  const preloadModulePath = require.resolve('../../dist/electron/preload.js')
  let exposedName = null
  let exposedValue = null

  clearModule(preloadModulePath)

  withMockedElectron(
    {
      contextBridge: {
        exposeInMainWorld(name, value) {
          exposedName = name
          exposedValue = value
        }
      },
      ipcRenderer: {
        invoke: async () => undefined,
        on: () => undefined,
        removeListener: () => undefined
      }
    },
    () => {
      require(preloadModulePath)
    }
  )

  assert.equal(exposedName, 'desktop')
  assert.ok(exposedValue)
  assert.deepEqual(Object.keys(exposedValue).sort(), ['app', 'file', 'task', 'window'])
  assertNoGenericIpcSurface(exposedValue)

  for (const namespaceName of ['app', 'file', 'task', 'window']) {
    const namespaceValue = exposedValue[namespaceName]

    assert.equal(typeof namespaceValue, 'object')
    assert.ok(namespaceValue)
    assertNoGenericIpcSurface(namespaceValue)
  }
})

test('exposeDesktopApi is exported as the stable preload entry point', () => {
  const exposeModulePath = require.resolve('../../dist/electron/ipcBus/preload/expose-api.js')

  clearModule(exposeModulePath)

  withMockedElectron(
    {
      contextBridge: {
        exposeInMainWorld() {}
      },
      ipcRenderer: {
        invoke: async () => undefined,
        on: () => undefined,
        removeListener: () => undefined
      }
    },
    () => {
      const preloadApi = require(exposeModulePath)

      assert.equal(typeof preloadApi.exposeDesktopApi, 'function')
    }
  )
})
