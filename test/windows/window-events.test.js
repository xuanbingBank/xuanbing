/**
 * @file 窗口事件总线测试。
 */

const test = require('node:test')
const assert = require('node:assert/strict')

const { WindowEventBus } = require('../../dist/electron/windows/main/window-events.js')

test('emit 触发已注册的事件处理器', () => {
  const bus = new WindowEventBus()
  let received = null

  bus.on('window:created', (payload) => {
    received = payload
  })

  bus.emit({
    type: 'window:created',
    windowId: 1,
    role: 'main',
    timestamp: Date.now()
  })

  assert.ok(received)
  assert.equal(received.windowId, 1)
  assert.equal(received.role, 'main')
})

test('off 取消事件处理器', () => {
  const bus = new WindowEventBus()
  let callCount = 0

  const handler = () => { callCount++ }
  bus.on('window:focused', handler)

  bus.emit({
    type: 'window:focused',
    windowId: 1,
    role: 'main',
    timestamp: Date.now()
  })
  assert.equal(callCount, 1)

  bus.off('window:focused', handler)

  bus.emit({
    type: 'window:focused',
    windowId: 1,
    role: 'main',
    timestamp: Date.now()
  })
  assert.equal(callCount, 1)
})

test('不同事件类型互不干扰', () => {
  const bus = new WindowEventBus()
  let focusedCount = 0
  let blurredCount = 0

  bus.on('window:focused', () => { focusedCount++ })
  bus.on('window:blurred', () => { blurredCount++ })

  bus.emit({ type: 'window:focused', windowId: 1, role: 'main', timestamp: Date.now() })
  bus.emit({ type: 'window:focused', windowId: 1, role: 'main', timestamp: Date.now() })
  bus.emit({ type: 'window:blurred', windowId: 1, role: 'main', timestamp: Date.now() })

  assert.equal(focusedCount, 2)
  assert.equal(blurredCount, 1)
})

test('getRecentEvents 返回最近事件', () => {
  const bus = new WindowEventBus()

  bus.emit({ type: 'window:created', windowId: 1, role: 'main', timestamp: Date.now() })
  bus.emit({ type: 'window:focused', windowId: 1, role: 'main', timestamp: Date.now() })

  const recent = bus.getRecentEvents()
  assert.ok(recent.length >= 2)
  assert.equal(recent[0].type, 'window:created')
  assert.equal(recent[1].type, 'window:focused')
})

test('同一事件类型可注册多个处理器', () => {
  const bus = new WindowEventBus()
  let count1 = 0
  let count2 = 0

  // window:created 不在去抖列表中，会同步分发
  bus.on('window:created', () => { count1++ })
  bus.on('window:created', () => { count2++ })

  bus.emit({ type: 'window:created', windowId: 1, role: 'main', timestamp: Date.now() })

  assert.equal(count1, 1)
  assert.equal(count2, 1)
})

test('on 返回取消订阅函数', () => {
  const bus = new WindowEventBus()
  let callCount = 0

  const unsubscribe = bus.on('window:closed', () => { callCount++ })

  bus.emit({ type: 'window:closed', windowId: 1, role: 'main', timestamp: Date.now() })
  assert.equal(callCount, 1)

  unsubscribe()

  bus.emit({ type: 'window:closed', windowId: 1, role: 'main', timestamp: Date.now() })
  assert.equal(callCount, 1)
})
