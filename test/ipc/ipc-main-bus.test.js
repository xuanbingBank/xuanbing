/**
 * @file IPC 总线边界回归测试。
 *
 * 覆盖不可 JSON 序列化 payload 的错误包装，以及主窗口跨窗口控制权限配置。
 */

const test = require('node:test')
const assert = require('node:assert/strict')

/**
 * 创建不会输出到控制台的测试日志器。
 *
 * @returns {{entries: unknown[], log: Function}} 测试日志器。
 */
function createSilentLogger() {
  const entries = []
  return {
    entries,
    log(entry) {
      entries.push(entry)
    }
  }
}

/**
 * 创建注册了主窗口的旧 IPC 窗口管理器。
 *
 * @returns {import('../../dist/electron/ipcBus/main/window-manager').WindowManager} 窗口管理器。
 */
function createLegacyWindowManager() {
  const { WindowManager } = require('../../dist/electron/ipcBus/main/window-manager')
  const manager = new WindowManager()
  manager.registerWindow({
    id: 1,
    isDestroyed: () => false,
    webContents: {
      id: 101,
      isDestroyed: () => false,
      getURL: () => 'file:///index.html',
      send: () => undefined
    }
  }, {
    windowId: 1,
    role: 'main'
  })
  return manager
}

test('不可序列化的 IPC payload 会返回统一错误结果', async () => {
  const { IpcMainBus } = require('../../dist/electron/ipcBus/main/ipc-main-bus')
  const { requestContracts, IPC_CHANNELS } = require('../../dist/electron/ipcBus/shared')
  const handlers = new Map()
  const bus = new IpcMainBus({
    ipcMain: {
      handle(channel, listener) {
        handlers.set(channel, listener)
      },
      removeHandler() {}
    },
    logger: createSilentLogger(),
    windowManager: createLegacyWindowManager(),
    environment: 'test',
    rolePermissions: {
      main: ['public', 'app:read']
    }
  })

  bus.registerHandler(requestContracts[IPC_CHANNELS.appInfoGet], async () => ({
    appName: 'All In One',
    appVersion: '1.0.0',
    electronVersion: '42.0.0',
    chromeVersion: '140.0.0',
    platform: 'test',
    isPackaged: false
  }))
  await bus.start()

  const circular = {}
  circular.self = circular
  const result = await handlers.get(IPC_CHANNELS.appInfoGet)({ sender: { id: 101 } }, circular)

  assert.equal(result.ok, false)
  assert.equal(result.error.code, 'IPC_PAYLOAD_UNSERIALIZABLE')
})

test('默认主窗口权限包含跨窗口控制权限', () => {
  const { DEFAULT_WINDOW_ROLE_PERMISSIONS } = require('../../dist/electron/windows/shared/window-permissions')

  assert.ok(DEFAULT_WINDOW_ROLE_PERMISSIONS.main.includes('window:control:any'))
  assert.ok(DEFAULT_WINDOW_ROLE_PERMISSIONS.main.includes('window:close:any'))
})
