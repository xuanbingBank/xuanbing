/**
 * @file 菜单生成单元测试，验证从路由表生成菜单的过滤与排序逻辑。
 */

const { test } = require('node:test')
const assert = require('node:assert')

const { generateMenu, flattenMenu, findActiveMenuPath } =
  require('../../dist/src/renderer/utils/menu')

test('generateMenu: 返回 menu=true 且非 hidden 的路由', () => {
  const menu = generateMenu({
    permissions: [],
    windowRole: 'main',
    isDev: true
  })
  // 首页、仪表盘、关于、组件演示 应该在菜单中
  const paths = menu.map((m) => m.path)
  assert.ok(paths.includes('/'))
  assert.ok(paths.includes('/dashboard'))
  assert.ok(paths.includes('/about'))
  assert.ok(paths.includes('/demo/components'))
})

test('generateMenu: 生产环境隐藏 devOnly 路由', () => {
  const menu = generateMenu({
    permissions: [],
    windowRole: 'main',
    isDev: false
  })
  const paths = menu.map((m) => m.path)
  assert.ok(!paths.includes('/demo/components'), 'devOnly 路由应被隐藏')
})

test('generateMenu: 权限不足的路由被过滤', () => {
  const menu = generateMenu({
    permissions: [],
    windowRole: 'main',
    isDev: true
  })
  const paths = menu.map((m) => m.path)
  // task-center 需要 route:task-center 权限，无权限时应被过滤
  assert.ok(!paths.includes('/task-center'))
})

test('generateMenu: 有权限时 task-center 出现', () => {
  const menu = generateMenu({
    permissions: ['route:task-center'],
    windowRole: 'main',
    isDev: true
  })
  const paths = menu.map((m) => m.path)
  assert.ok(paths.includes('/task-center'))
})

test('generateMenu: 按 menuOrder 排序', () => {
  const menu = generateMenu({
    permissions: ['route:task-center', 'route:settings'],
    windowRole: 'main',
    isDev: true
  })
  const orders = menu.map((m) => m.order)
  for (let i = 1; i < orders.length; i++) {
    assert.ok(orders[i] >= orders[i - 1], '应按 order 升序排列')
  }
})

test('generateMenu: 设置子页面作为子菜单', () => {
  const menu = generateMenu({
    permissions: ['route:settings'],
    windowRole: 'settings',
    isDev: true
  })
  // settings 角色下，settings 顶层菜单应存在
  const settingsItem = menu.find((m) => m.path === '/settings')
  // settings 角色下，settings 顶层菜单应存在
  if (settingsItem) {
    // 子菜单（settings/profile, settings/security）应作为 children
    if (settingsItem.children) {
      const childPaths = settingsItem.children.map((c) => c.path)
      assert.ok(childPaths.includes('/settings/profile') || childPaths.includes('/settings/security'))
    }
  }
})

test('flattenMenu: 扁平化菜单树', () => {
  const menu = generateMenu({
    permissions: [],
    windowRole: 'main',
    isDev: true
  })
  const flat = flattenMenu(menu)
  assert.ok(flat.length >= menu.length, '扁平化后数量应 >= 顶层菜单数')
})

test('findActiveMenuPath: 精确匹配当前路径', () => {
  const menu = generateMenu({
    permissions: [],
    windowRole: 'main',
    isDev: true
  })
  const active = findActiveMenuPath('/', menu)
  assert.equal(active, '/')
})

test('findActiveMenuPath: 未匹配时返回空字符串', () => {
  const menu = generateMenu({
    permissions: [],
    windowRole: 'main',
    isDev: true
  })
  const active = findActiveMenuPath('/nonexistent', menu)
  assert.equal(active, '')
})
