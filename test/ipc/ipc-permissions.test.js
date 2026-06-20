/**
 * @file 测试 IPC 权限模型。
 */

const test = require('node:test')
const assert = require('node:assert/strict')

const { createPermissionChecker } = require('../../dist/electron/ipcBus/main/ipc-permissions.js')
const { requestContracts, IPC_CHANNELS } = require('../../dist/electron/ipcBus/shared/index.js')

test('主窗口角色可以访问 public 能力', () => {
  const canAccess = createPermissionChecker({
    environment: 'test',
    rolePermissions: {
      main: ['public', 'app:read']
    }
  })

  const decision = canAccess({
    contract: requestContracts[IPC_CHANNELS.appInfoGet],
    senderWindowId: 1,
    windowRole: 'main'
  })

  assert.equal(decision.allowed, true)
})

test('缺少权限时拒绝访问', () => {
  const canAccess = createPermissionChecker({
    environment: 'test',
    rolePermissions: {
      main: ['public']
    }
  })

  const decision = canAccess({
    contract: requestContracts[IPC_CHANNELS.windowClose],
    senderWindowId: 1,
    windowRole: 'main'
  })

  assert.equal(decision.allowed, false)
  assert.equal(decision.reason, 'missing-permission')
})

test('未声明权限时视为配置错误', () => {
  const canAccess = createPermissionChecker({
    environment: 'test',
    rolePermissions: {
      main: ['public']
    }
  })

  const decision = canAccess({
    contract: {
      ...requestContracts[IPC_CHANNELS.appInfoGet],
      permission: undefined
    },
    senderWindowId: 1,
    windowRole: 'main'
  })

  assert.equal(decision.allowed, false)
  assert.equal(decision.reason, 'missing-contract-permission')
})
