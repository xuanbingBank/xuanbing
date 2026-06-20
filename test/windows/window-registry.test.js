/**
 * @file 窗口注册表测试。
 */

const test = require('node:test')
const assert = require('node:assert/strict')

const { WindowRegistry } = require('../../dist/electron/windows/main/window-registry.js')

/**
 * 创建模拟窗口对象。
 *
 * @param {number} id 窗口 ID。
 * @returns 模拟窗口。
 */
function createMockWindow(id) {
  const handlers = {}
  return {
    id,
    destroyed: false,
    isDestroyed() { return this.destroyed },
    on(event, handler) { (handlers[event] ??= []).push(handler) },
    off(event, handler) {
      if (handlers[event]) {
        handlers[event] = handlers[event].filter((h) => h !== handler)
      }
    },
    emit(event, ...args) {
      for (const h of (handlers[event] ?? [])) {
        h(...args)
      }
    }
  }
}

test('注册窗口后可通过 windowId 查找', () => {
  const registry = new WindowRegistry()
  registry.register({
    window: createMockWindow(1),
    role: 'main',
    instanceKey: 'main',
    route: '/'
  })

  const entry = registry.get(1)
  assert.ok(entry)
  assert.equal(entry.role, 'main')
  assert.equal(entry.route, '/')
})

test('注册窗口后可通过 role 查找', () => {
  const registry = new WindowRegistry()
  registry.register({
    window: createMockWindow(1),
    role: 'main',
    instanceKey: 'main',
    route: '/'
  })

  const ids = registry.getByRole('main')
  assert.deepEqual(ids, [1])
})

test('注册窗口后可通过 instanceKey 查找', () => {
  const registry = new WindowRegistry()
  registry.register({
    window: createMockWindow(1),
    role: 'main',
    instanceKey: 'main',
    route: '/'
  })

  const id = registry.getByInstanceKey('main')
  assert.equal(id, 1)
})

test('重复注册同一 windowId 时抛出错误', () => {
  const registry = new WindowRegistry()
  registry.register({
    window: createMockWindow(1),
    role: 'main',
    instanceKey: 'main',
    route: '/'
  })

  assert.throws(() => {
    registry.register({
      window: createMockWindow(1),
      role: 'settings',
      instanceKey: 'settings',
      route: '/settings'
    })
  }, (err) => err.code === 'WINDOW_VALIDATION_ERROR' && /already registered/.test(err.message))
})

test('重复注册同一 instanceKey 时抛出错误', () => {
  const registry = new WindowRegistry()
  registry.register({
    window: createMockWindow(1),
    role: 'main',
    instanceKey: 'main',
    route: '/'
  })

  assert.throws(() => {
    registry.register({
      window: createMockWindow(2),
      role: 'main',
      instanceKey: 'main',
      route: '/'
    })
  }, (err) => err.code === 'WINDOW_SINGLETON_EXISTS' && /already in use/.test(err.message))
})

test('注销窗口后无法再查找', () => {
  const registry = new WindowRegistry()
  registry.register({
    window: createMockWindow(1),
    role: 'main',
    instanceKey: 'main',
    route: '/'
  })

  registry.unregister(1)
  assert.equal(registry.get(1), undefined)
  assert.equal(registry.getByInstanceKey('main'), undefined)
  assert.deepEqual(registry.getByRole('main'), [])
})

test('多实例窗口可注册多个', () => {
  const registry = new WindowRegistry()
  registry.register({
    window: createMockWindow(1),
    role: 'detail',
    instanceKey: 'detail:42',
    route: '/detail/42',
    entityId: '42'
  })
  registry.register({
    window: createMockWindow(2),
    role: 'detail',
    instanceKey: 'detail:99',
    route: '/detail/99',
    entityId: '99'
  })

  assert.deepEqual(registry.getByRole('detail'), [1, 2])
  assert.equal(registry.getByInstanceKey('detail:42'), 1)
  assert.equal(registry.getByInstanceKey('detail:99'), 2)
})

test('可通过 entityId 查找窗口', () => {
  const registry = new WindowRegistry()
  registry.register({
    window: createMockWindow(1),
    role: 'detail',
    instanceKey: 'detail:42',
    route: '/detail/42',
    entityId: '42'
  })

  const ids = registry.getByEntityId('42')
  assert.deepEqual(ids, [1])
})

test('可通过 route 查找窗口', () => {
  const registry = new WindowRegistry()
  registry.register({
    window: createMockWindow(1),
    role: 'main',
    instanceKey: 'main',
    route: '/'
  })

  const ids = registry.getByRoute('/')
  assert.deepEqual(ids, [1])
})

test('窗口销毁后自动反注册', () => {
  const registry = new WindowRegistry()
  const win = createMockWindow(1)
  registry.register({
    window: win,
    role: 'main',
    instanceKey: 'main',
    route: '/'
  })

  win.destroyed = true
  win.emit('closed')

  assert.equal(registry.get(1), undefined)
})

test('getAllEntries 返回全部注册条目', () => {
  const registry = new WindowRegistry()
  registry.register({
    window: createMockWindow(1),
    role: 'main',
    instanceKey: 'main',
    route: '/'
  })
  registry.register({
    window: createMockWindow(2),
    role: 'settings',
    instanceKey: 'settings',
    route: '/settings'
  })

  const all = registry.getAllEntries()
  assert.equal(all.length, 2)
})

test('getAllWindowIds 返回全部窗口 ID', () => {
  const registry = new WindowRegistry()
  registry.register({
    window: createMockWindow(1),
    role: 'main',
    instanceKey: 'main',
    route: '/'
  })
  registry.register({
    window: createMockWindow(2),
    role: 'settings',
    instanceKey: 'settings',
    route: '/settings'
  })

  const ids = registry.getAllWindowIds()
  assert.equal(ids.length, 2)
  assert.ok(ids.includes(1))
  assert.ok(ids.includes(2))
})

test('countByRole 返回指定角色的窗口数', () => {
  const registry = new WindowRegistry()
  registry.register({
    window: createMockWindow(1),
    role: 'detail',
    instanceKey: 'detail:1',
    route: '/detail/1'
  })
  registry.register({
    window: createMockWindow(2),
    role: 'detail',
    instanceKey: 'detail:2',
    route: '/detail/2'
  })

  assert.equal(registry.countByRole('detail'), 2)
  assert.equal(registry.countByRole('main'), 0)
})

test('getFirstByRole 返回角色的第一个窗口', () => {
  const registry = new WindowRegistry()
  registry.register({
    window: createMockWindow(1),
    role: 'main',
    instanceKey: 'main',
    route: '/'
  })

  assert.equal(registry.getFirstByRole('main'), 1)
  assert.equal(registry.getFirstByRole('settings'), undefined)
})

test('dumpTree 输出窗口树结构', () => {
  const registry = new WindowRegistry()
  registry.register({
    window: createMockWindow(1),
    role: 'main',
    instanceKey: 'main',
    route: '/'
  })
  registry.register({
    window: createMockWindow(2),
    role: 'settings',
    instanceKey: 'settings',
    route: '/settings',
    parentId: 1
  })

  const tree = registry.dumpTree()
  assert.ok(Array.isArray(tree))
  assert.ok(tree.length >= 1)
})
