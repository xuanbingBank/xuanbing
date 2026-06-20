/**
 * @file 校验共享 IPC 契约层的导出、元数据与模型行为。
 */

const test = require('node:test')
const assert = require('node:assert/strict')

/**
 * 加载编译后的共享 IPC 模块。
 *
 * @returns {Record<string, unknown>} 共享 IPC 导出对象。
 */
function loadIpcSharedModule() {
  return require('../../dist/electron/ipcBus/shared/index.js')
}

/**
 * 校验稳定导出。
 */
function verifyStableExports() {
  test('导出稳定的共享 IPC 表面', () => {
    const ipcShared = loadIpcSharedModule()

    assert.ok(ipcShared.IPC_CHANNELS)
    assert.ok(ipcShared.IPC_EVENTS)
    assert.ok(ipcShared.IPC_PERMISSIONS)
    assert.ok(ipcShared.IPC_ERROR_CODES)
    assert.ok(ipcShared.DEFAULT_IPC_TIMEOUT_MS)
    assert.ok(ipcShared.DEFAULT_IPC_MAX_PAYLOAD_BYTES)
    assert.ok(ipcShared.requestContracts)
    assert.ok(ipcShared.eventContracts)
    assert.ok(ipcShared.ipcResultSchema)
    assert.ok(ipcShared.ipcErrorSchema)
  })
}

/**
 * 校验常量与错误码。
 */
function verifyConstants() {
  test('定义稳定的通道、权限与错误码', () => {
    const ipcShared = loadIpcSharedModule()

    assert.equal(ipcShared.IPC_CHANNELS.appInfoGet, 'app:info.get')
    assert.equal(ipcShared.IPC_CHANNELS.fileDialogOpen, 'file:dialog.open')
    assert.equal(ipcShared.IPC_CHANNELS.windowMinimize, 'window:minimize')
    assert.equal(ipcShared.IPC_CHANNELS.windowMaximize, 'window:maximize')
    assert.equal(ipcShared.IPC_CHANNELS.windowClose, 'window:close')
    assert.equal(ipcShared.IPC_CHANNELS.taskStart, 'task:start')
    assert.equal(ipcShared.IPC_CHANNELS.taskCancel, 'task:cancel')

    assert.equal(ipcShared.IPC_EVENTS.taskProgress, 'task:progress')
    assert.equal(ipcShared.IPC_EVENTS.taskCompleted, 'task:completed')
    assert.equal(ipcShared.IPC_EVENTS.taskFailed, 'task:failed')
    assert.equal(ipcShared.IPC_EVENTS.windowFocusChanged, 'window:focus.changed')

    assert.equal(ipcShared.IPC_PERMISSIONS.public, 'public')
    assert.equal(ipcShared.IPC_PERMISSIONS.appRead, 'app:read')
    assert.equal(ipcShared.IPC_PERMISSIONS.fileRead, 'file:read')
    assert.equal(ipcShared.IPC_PERMISSIONS.windowControl, 'window:control')
    assert.equal(ipcShared.IPC_PERMISSIONS.taskRun, 'task:run')
    assert.equal(ipcShared.IPC_PERMISSIONS.taskCancel, 'task:cancel')

    assert.equal(ipcShared.IPC_ERROR_CODES.unknownChannel, 'IPC_UNKNOWN_CHANNEL')
    assert.equal(ipcShared.IPC_ERROR_CODES.handlerNotFound, 'IPC_HANDLER_NOT_FOUND')
    assert.equal(ipcShared.IPC_ERROR_CODES.validationError, 'IPC_VALIDATION_ERROR')
    assert.equal(ipcShared.IPC_ERROR_CODES.forbidden, 'IPC_FORBIDDEN')
    assert.equal(ipcShared.IPC_ERROR_CODES.timeout, 'IPC_TIMEOUT')
    assert.equal(ipcShared.IPC_ERROR_CODES.aborted, 'IPC_ABORTED')
    assert.equal(ipcShared.IPC_ERROR_CODES.internalError, 'IPC_INTERNAL_ERROR')
    assert.equal(ipcShared.IPC_ERROR_CODES.windowNotFound, 'IPC_WINDOW_NOT_FOUND')
    assert.equal(ipcShared.IPC_ERROR_CODES.windowDestroyed, 'IPC_WINDOW_DESTROYED')
    assert.equal(ipcShared.IPC_ERROR_CODES.rateLimited, 'IPC_RATE_LIMITED')
    assert.equal(ipcShared.IPC_ERROR_CODES.payloadTooLarge, 'IPC_PAYLOAD_TOO_LARGE')
    assert.equal(ipcShared.IPC_ERROR_CODES.unsupported, 'IPC_UNSUPPORTED')
    assert.equal(ipcShared.IPC_ERROR_CODES.conflict, 'IPC_CONFLICT')
    assert.equal(ipcShared.IPC_ERROR_CODES.notReady, 'IPC_NOT_READY')
  })
}

/**
 * 校验请求契约与模型行为。
 */
function verifyRequestContracts() {
  test('定义请求契约、权限与模型校验', () => {
    const ipcShared = loadIpcSharedModule()
    const { requestContracts, IPC_CHANNELS, IPC_PERMISSIONS } = ipcShared

    const appInfoContract = requestContracts[IPC_CHANNELS.appInfoGet]
    assert.equal(appInfoContract.permission, IPC_PERMISSIONS.public)
    assert.equal(appInfoContract.timeoutMs, ipcShared.DEFAULT_IPC_TIMEOUT_MS)
    assert.equal(appInfoContract.maxPayloadBytes, ipcShared.DEFAULT_IPC_MAX_PAYLOAD_BYTES)
    assert.deepEqual(appInfoContract.inputSchema.parse({}), {})

    const appInfoResult = appInfoContract.outputSchema.parse({
      appName: 'All In One',
      appVersion: '1.0.0',
      electronVersion: '42.4.1',
      chromeVersion: '136.0.0.0',
      platform: 'win32',
      isPackaged: false
    })
    assert.equal(appInfoResult.appName, 'All In One')

    const fileDialogContract = requestContracts[IPC_CHANNELS.fileDialogOpen]
    assert.equal(fileDialogContract.permission, IPC_PERMISSIONS.fileRead)
    assert.equal(fileDialogContract.audit, true)
    assert.equal(fileDialogContract.rateLimit?.maxCalls, 5)
    assert.equal(fileDialogContract.maxPayloadBytes, 32 * 1024)

    const fileDialogRequest = fileDialogContract.inputSchema.parse({
      title: 'Open a file',
      defaultPath: 'C:/workspace',
      buttonLabel: 'Select',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg'] }]
    })
    assert.equal(fileDialogRequest.properties.length, 2)

    assert.equal(
      fileDialogContract.inputSchema.safeParse({
        title: 'Bad filter',
        filters: [{ name: 'Broken', extensions: [] }]
      }).success,
      false
    )

    const taskStartContract = requestContracts[IPC_CHANNELS.taskStart]
    assert.equal(taskStartContract.permission, IPC_PERMISSIONS.taskRun)
    assert.equal(taskStartContract.audit, true)
    assert.equal(taskStartContract.timeoutMs, 30_000)
    assert.equal(taskStartContract.rateLimit?.maxCalls, 10)
    assert.equal(
      taskStartContract.inputSchema.safeParse({
        taskId: '',
        kind: 'sync',
        payload: undefined,
        abortable: true
      }).success,
      false
    )
  })
}

/**
 * 校验事件契约与事件载荷。
 */
function verifyEventContracts() {
  test('定义事件契约、方向与事件载荷模型', () => {
    const ipcShared = loadIpcSharedModule()
    const { eventContracts, IPC_EVENTS, IPC_PERMISSIONS } = ipcShared

    const progressContract = eventContracts[IPC_EVENTS.taskProgress]
    assert.equal(progressContract.direction, 'main-to-renderer')
    assert.equal(progressContract.permission, IPC_PERMISSIONS.taskRun)
    assert.equal(progressContract.audit, false)

    const progressPayload = progressContract.payloadSchema.parse({
      taskId: 'task-123',
      phase: 'running',
      percent: 50,
      completedUnits: 5,
      totalUnits: 10,
      message: 'Halfway there'
    })
    assert.equal(progressPayload.percent, 50)

    const failedContract = eventContracts[IPC_EVENTS.taskFailed]
    const failedResult = failedContract.payloadSchema.safeParse({
      taskId: 'task-123',
      error: {
        code: ipcShared.IPC_ERROR_CODES.internalError,
        message: 'Boom'
      }
    })
    assert.equal(failedResult.success, true)

    const focusContract = eventContracts[IPC_EVENTS.windowFocusChanged]
    assert.equal(focusContract.permission, IPC_PERMISSIONS.windowControl)
    assert.equal(focusContract.payloadSchema.safeParse({ windowId: 1, focused: true }).success, true)
  })
}

/**
 * 校验统一结果与错误模型。
 */
function verifySharedSchemas() {
  test('校验统一结果与错误载荷', () => {
    const ipcShared = loadIpcSharedModule()

    const successResult = ipcShared.ipcResultSchema.parse({
      ok: true,
      data: { taskId: 'task-123' },
      meta: { requestId: 'req-1', durationMs: 12 }
    })
    assert.equal(successResult.ok, true)

    const errorResult = ipcShared.ipcResultSchema.parse({
      ok: false,
      error: {
        code: ipcShared.IPC_ERROR_CODES.forbidden,
        message: 'No permission',
        detail: { permission: 'task:run' }
      },
      meta: { requestId: 'req-2', durationMs: 20 }
    })
    assert.equal(errorResult.error.code, ipcShared.IPC_ERROR_CODES.forbidden)

    assert.equal(
      ipcShared.ipcErrorSchema.safeParse({
        code: 'NOT_A_REAL_CODE',
        message: 'Broken'
      }).success,
      false
    )
  })
}

verifyStableExports()
verifyConstants()
verifyRequestContracts()
verifyEventContracts()
verifySharedSchemas()
