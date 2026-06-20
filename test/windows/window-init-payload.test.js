/**
 * @file 窗口初始化数据机制测试。
 */

const test = require('node:test')
const assert = require('node:assert/strict')

const { WindowInitPayloadStore } = require('../../dist/electron/windows/main/window-init-payload.js')

test('创建 init payload 后返回 token', () => {
  const store = new WindowInitPayloadStore({})
  const token = store.create(1, 'detail', { id: 42, name: 'test' })

  assert.ok(token)
  assert.equal(typeof token, 'string')
})

test('通过 token + windowId 消费 payload', () => {
  const store = new WindowInitPayloadStore({})
  const token = store.create(1, 'detail', { id: 42 })
  const consumed = store.consume(token, 1)

  assert.ok(consumed)
  assert.equal(consumed.token, token)
  assert.deepEqual(consumed.payload, { id: 42 })
  assert.equal(consumed.role, 'detail')
})

test('payload 消费后不可再次读取', () => {
  const store = new WindowInitPayloadStore({})
  const token = store.create(1, 'detail', { id: 42 })

  store.consume(token, 1)

  assert.throws(() => {
    store.consume(token, 1)
  }, (err) => err.code === 'WINDOW_INIT_PAYLOAD_NOT_FOUND')
})

test('其他窗口无法读取不属于自己的 payload', () => {
  const store = new WindowInitPayloadStore({})
  const token = store.create(1, 'detail', { id: 42 })

  assert.throws(() => {
    store.consume(token, 2)
  }, (err) => err.code === 'WINDOW_FORBIDDEN')
})

test('过期 payload 无法消费', (t, done) => {
  const store = new WindowInitPayloadStore({ ttlMs: 1 })
  const token = store.create(1, 'detail', { id: 42 })

  setTimeout(() => {
    assert.throws(() => {
      store.consume(token, 1)
    }, (err) => err.code === 'WINDOW_INIT_PAYLOAD_EXPIRED')
    done()
  }, 10)
})

test('清理指定窗口的 payload', () => {
  const store = new WindowInitPayloadStore({})
  const token1 = store.create(1, 'detail', { id: 42 })
  const token2 = store.create(2, 'settings', { tab: 'profile' })

  store.cleanupForWindow(1)

  assert.throws(() => {
    store.consume(token1, 1)
  }, (err) => err.code === 'WINDOW_INIT_PAYLOAD_NOT_FOUND')

  const consumed = store.consume(token2, 2)
  assert.ok(consumed)
})

test('拒绝过大 payload', () => {
  const store = new WindowInitPayloadStore({ maxPayloadBytes: 100 })
  assert.throws(() => {
    store.create(1, 'detail', { data: 'x'.repeat(200) })
  }, (err) => err.code === 'WINDOW_PAYLOAD_TOO_LARGE')
})

test('peek 查看但不消费 payload', () => {
  const store = new WindowInitPayloadStore({})
  const token = store.create(1, 'detail', { id: 42 })

  const peeked = store.peek(token)
  assert.ok(peeked)
  assert.equal(peeked.role, 'detail')

  // peek 后仍可消费
  const consumed = store.consume(token, 1)
  assert.ok(consumed)
})

test('size 返回当前存储条目数', () => {
  const store = new WindowInitPayloadStore({})
  assert.equal(store.size(), 0)

  store.create(1, 'detail', { id: 1 })
  store.create(2, 'detail', { id: 2 })
  assert.equal(store.size(), 2)
})

test('clear 清空全部 payload', () => {
  const store = new WindowInitPayloadStore({})
  store.create(1, 'detail', { id: 1 })
  store.create(2, 'detail', { id: 2 })

  store.clear()
  assert.equal(store.size(), 0)
})
