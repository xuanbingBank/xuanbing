/**
 * @file 测试主进程 IPC 总线的生命周期、校验、权限、超时、取消与窗口安全发送行为。
 */

const test = require('node:test')
const assert = require('node:assert/strict')

const { IpcMainBus } = require('../../dist/electron/ipcBus/main/ipc-main-bus.js')
const { IpcLogger } = require('../../dist/electron/ipcBus/main/ipc-logger.js')
const { WindowManager } = require('../../dist/electron/ipcBus/main/window-manager.js')
const { requestContracts, eventContracts, IPC_CHANNELS, IPC_EVENTS } = require('../../dist/electron/ipcBus/shared/index.js')
const { createAbortError, createIpcError } = require('../../dist/electron/ipcBus/main/ipc-errors.js')

/**
 * 创建假的 ipcMain 适配器。
 *
 * @returns {{handle: Function, removeHandler: Function, emitInvoke: Function, handlers: Map<string, Function>}} 假的 ipcMain。
 */
function createFakeIpcMain() {
  const handlers = new Map()

  return {
    handlers,
    handle(channel, listener) {
      handlers.set(channel, listener)
    },
    removeHandler(channel) {
      handlers.delete(channel)
    },
    async emitInvoke(channel, event, payload) {
      const listener = handlers.get(channel)

      if (!listener) {
        throw new Error(`Missing handler for ${channel}`)
      }

      return listener(event, payload)
    }
  }
}

/**
 * 创建假的窗口记录。
 *
 * @param {number} id 窗口标识。
 * @param {string} role 窗口角色。
 * @returns {object} 假窗口记录。
 */
function createWindowRecord(id, role) {
  const sent = []
  let destroyed = false

  return {
    id,
    role,
    sent,
    setDestroyed(value) {
      destroyed = value
    },
    isDestroyed() {
      return destroyed
    },
    webContents: {
      id,
      getURL() {
        return 'https://app.local/'
      },
      isDestroyed() {
        return destroyed
      },
      send(channel, payload) {
        sent.push({ channel, payload })
      }
    }
  }
}

/**
 * 创建测试总线运行环境。
 *
 * @returns {object} 测试运行环境。
 */
function createHarness() {
  const ipcMain = createFakeIpcMain()
  const logger = new IpcLogger({ environment: 'test', slowRequestThresholdMs: 5 })
  const windowManager = new WindowManager()
  const mainWindow = createWindowRecord(1, 'main')

  windowManager.registerWindow(mainWindow, { windowId: 1, role: 'main' })

  const bus = new IpcMainBus({
    ipcMain,
    logger,
    windowManager,
    environment: 'test'
  })

  return {
    bus,
    ipcMain,
    logger,
    windowManager,
    mainWindow,
    invoke(channel, payload) {
      return ipcMain.emitInvoke(
        channel,
        {
          senderFrame: { url: 'https://app.local/' },
          sender: { id: 1 },
          processId: 100,
          frameId: 10
        },
        payload
      )
    }
  }
}

test('未注册处理器时返回标准错误结构', async () => {
  const { bus, invoke } = createHarness()

  await bus.start()

  const response = await invoke(IPC_CHANNELS.appInfoGet, {})

  assert.equal(response.ok, false)
  assert.equal(response.error.code, 'IPC_HANDLER_NOT_FOUND')
})

test('入参在进入处理器前完成校验', async () => {
  const { bus, invoke } = createHarness()

  bus.registerHandler(requestContracts[IPC_CHANNELS.fileDialogOpen], async () => ({
    canceled: true,
    filePaths: []
  }))

  await bus.start()

  const response = await invoke(IPC_CHANNELS.fileDialogOpen, { properties: ['bad-property'] })

  assert.equal(response.ok, false)
  assert.equal(response.error.code, 'IPC_VALIDATION_ERROR')
})

test('权限不足时拒绝调用', async () => {
  const { bus, ipcMain } = createHarness()

  bus.registerHandler(requestContracts[IPC_CHANNELS.windowClose], async () => ({
    windowId: 1,
    state: 'closed'
  }))

  await bus.start()

  const response = await ipcMain.emitInvoke(
    IPC_CHANNELS.windowClose,
    {
      senderFrame: { url: 'https://app.local/' },
      sender: { id: 2 },
      processId: 100,
      frameId: 10
    },
    {}
  )

  assert.equal(response.ok, false)
  assert.equal(response.error.code, 'IPC_FORBIDDEN')
})

test('成功调用返回统一成功结构', async () => {
  const { bus, invoke } = createHarness()

  bus.registerHandler(requestContracts[IPC_CHANNELS.appInfoGet], async () => ({
    appName: 'All In One',
    appVersion: '1.0.0',
    electronVersion: '42.4.1',
    chromeVersion: '136.0.0.0',
    platform: 'win32',
    isPackaged: false
  }))

  await bus.start()

  const response = await invoke(IPC_CHANNELS.appInfoGet, {})

  assert.equal(response.ok, true)
  assert.equal(response.data.appName, 'All In One')
  assert.equal(typeof response.meta.requestId, 'string')
})

test('抛出的错误会被转成标准 IPC 错误', async () => {
  const { bus, invoke } = createHarness()

  bus.registerHandler(requestContracts[IPC_CHANNELS.appInfoGet], async () => {
    throw new Error('boom')
  })

  await bus.start()

  const response = await invoke(IPC_CHANNELS.appInfoGet, {})

  assert.equal(response.ok, false)
  assert.equal(response.error.code, 'IPC_INTERNAL_ERROR')
})

test('请求支持超时控制', async () => {
  const { bus, invoke } = createHarness()

  bus.registerHandler(
    requestContracts[IPC_CHANNELS.appInfoGet],
    async ({ signal }) =>
      new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => reject(createAbortError('timed out')), { once: true })
        setTimeout(() => resolve({
          appName: 'late',
          appVersion: '1.0.0',
          electronVersion: '42.4.1',
          chromeVersion: '136.0.0.0',
          platform: 'win32',
          isPackaged: false
        }), 50)
      }),
    { timeoutMs: 5 }
  )

  await bus.start()

  const response = await invoke(IPC_CHANNELS.appInfoGet, {})

  assert.equal(response.ok, false)
  assert.equal(response.error.code, 'IPC_TIMEOUT')
})

test('请求支持显式取消错误', async () => {
  const { bus, invoke } = createHarness()

  bus.registerHandler(requestContracts[IPC_CHANNELS.taskCancel], async ({ input, signal }) => {
    signal.throwIfAborted()
    throw createIpcError('IPC_ABORTED', `Task ${input.taskId} canceled`, undefined, 'abort', false)
  })

  await bus.start()

  const response = await invoke(IPC_CHANNELS.taskCancel, { taskId: 'task-1', reason: undefined })

  assert.equal(response.ok, false)
  assert.equal(response.error.code, 'IPC_ABORTED')
})

test('订阅清理后不会再向已销毁窗口发送事件', async () => {
  const { bus, mainWindow } = createHarness()
  let cleaned = false

  bus.registerSubscription(eventContracts[IPC_EVENTS.taskProgress], ({ send }) => {
    send({ taskId: 'task-1', phase: 'running', percent: 50, message: 'Half way' })

    return () => {
      cleaned = true
    }
  })

  bus.activateSubscription(1, IPC_EVENTS.taskProgress, { taskId: 'task-1' })
  assert.equal(mainWindow.sent.length, 1)

  mainWindow.setDestroyed(true)
  bus.sendToWindow(1, IPC_EVENTS.taskProgress, {
    taskId: 'task-1',
    phase: 'running',
    percent: 60,
    message: 'Skipped'
  })

  assert.equal(mainWindow.sent.length, 1)

  bus.cleanupWindow(1)
  assert.equal(cleaned, true)
})

test('处理器输出也会经过契约校验', async () => {
  const { bus, invoke } = createHarness()

  bus.registerHandler(requestContracts[IPC_CHANNELS.appInfoGet], async () => ({
    appName: 'All In One'
  }))

  await bus.start()

  const response = await invoke(IPC_CHANNELS.appInfoGet, {})

  assert.equal(response.ok, false)
  assert.equal(response.error.code, 'IPC_VALIDATION_ERROR')
})
