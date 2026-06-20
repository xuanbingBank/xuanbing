/**
 * @file 路由守卫单元测试，验证认证、权限、窗口角色、devOnly 等守卫逻辑。
 */

const { test } = require('node:test')
const assert = require('node:assert')

// 由于项目使用 CommonJS + tsc 编译，测试编译后的 JS
const { executeGuards, checkRouteExists, checkAuth, checkPermission, checkDevOnly } =
  require('../../dist/src/renderer/router/guards')

/** 构造 mock 路由 */
function mockRoute(overrides) {
  return {
    path: '/',
    name: 'home',
    params: {},
    query: {},
    meta: {
      title: '首页',
      windowRole: 'main',
      requiresAuth: false,
      permissions: [],
      keepAlive: true,
      layout: 'basic',
      allowDirectOpen: true,
      closeBehavior: 'close',
      devOnly: false
    },
    matched: { path: '/', name: 'home', component: 'home', meta: {} },
    matchedChain: [],
    ...overrides
  }
}

test('checkRouteExists: notFound 路由且路径非 /404 时返回 false', () => {
  const route = mockRoute({ name: 'notFound', path: '/unknown' })
  assert.equal(checkRouteExists(route), false)
})

test('checkRouteExists: notFound 路由且路径为 /404 时返回 true', () => {
  const route = mockRoute({ name: 'notFound', path: '/404' })
  assert.equal(checkRouteExists(route), true)
})

test('checkAuth: requiresAuth=false 时始终允许', () => {
  const route = mockRoute({ meta: { requiresAuth: false, permissions: [] } })
  assert.equal(checkAuth(route, false), true)
  assert.equal(checkAuth(route, true), true)
})

test('checkAuth: requiresAuth=true 时未认证拒绝', () => {
  const route = mockRoute({ meta: { requiresAuth: true, permissions: [] } })
  assert.equal(checkAuth(route, false), false)
  assert.equal(checkAuth(route, true), true)
})

test('checkPermission: 无权限要求时始终允许', () => {
  const route = mockRoute({ meta: { permissions: [] } })
  assert.equal(checkPermission(route, []), true)
  assert.equal(checkPermission(route, ['user:read']), true)
})

test('checkPermission: 有权限要求时校验全部权限', () => {
  const route = mockRoute({ meta: { permissions: ['user:read', 'user:write'] } })
  assert.equal(checkPermission(route, ['user:read']), false)
  assert.equal(checkPermission(route, ['user:read', 'user:write']), true)
})

test('checkDevOnly: 非 devOnly 路由始终允许', () => {
  const route = mockRoute({ meta: { devOnly: false } })
  assert.equal(checkDevOnly(route, true), true)
  assert.equal(checkDevOnly(route, false), true)
})

test('checkDevOnly: devOnly 路由在生产环境拒绝', () => {
  const route = mockRoute({ meta: { devOnly: true } })
  assert.equal(checkDevOnly(route, true), true)
  assert.equal(checkDevOnly(route, false), false)
})

test('executeGuards: 路由不存在时重定向到 /404', () => {
  const route = mockRoute({ name: 'notFound', path: '/unknown' })
  const result = executeGuards(route, null, {
    windowRole: 'main',
    permissions: [],
    isAuthenticated: true
  })
  assert.equal(result.allowed, false)
  assert.equal(result.redirect, '/404')
})

test('executeGuards: allowDirectOpen 路由直接放行', () => {
  const route = mockRoute({
    path: '/403',
    name: 'forbidden',
    meta: { allowDirectOpen: true, requiresAuth: false, permissions: [] }
  })
  const result = executeGuards(route, null, {
    windowRole: 'main',
    permissions: [],
    isAuthenticated: false
  })
  assert.equal(result.allowed, true)
})
