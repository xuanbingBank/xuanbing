/**
 * @file 窗口权限与路由守卫测试。
 */

const test = require('node:test')
const assert = require('node:assert/strict')

const { hasPermission, DEFAULT_WINDOW_ROLE_PERMISSIONS } = require('../../dist/electron/windows/shared/window-permissions.js')
const { isRouteAllowedForRole, matchRoutePattern, getDefaultRoute, WINDOW_ROUTE_MAP } = require('../../dist/electron/windows/shared/window-routes.js')
const { validateOpenRequest, checkPermission, shouldAllowDevTools } = require('../../dist/electron/windows/main/window-guards.js')

/* ───────────────────────── 权限测试 ───────────────────────── */

test('main 角色拥有 window:open 权限', () => {
  assert.equal(hasPermission('main', 'window:open'), true)
})

test('login 角色没有 window:open 权限', () => {
  assert.equal(hasPermission('login', 'window:open'), false)
})

test('settings 角色拥有 route:settings 权限', () => {
  assert.equal(hasPermission('settings', 'route:settings'), true)
})

test('detail 角色没有 route:settings 权限', () => {
  assert.equal(hasPermission('detail', 'route:settings'), false)
})

test('hiddenWorker 权限最小化', () => {
  assert.equal(hasPermission('hiddenWorker', 'app:read'), true)
  assert.equal(hasPermission('hiddenWorker', 'window:open'), false)
  assert.equal(hasPermission('hiddenWorker', 'window:control:self'), false)
})

test('每个角色都有权限定义', () => {
  for (const role of Object.keys(DEFAULT_WINDOW_ROLE_PERMISSIONS)) {
    const perms = DEFAULT_WINDOW_ROLE_PERMISSIONS[role]
    assert.ok(Array.isArray(perms), `角色 ${role} 权限应为数组`)
  }
})

/* ───────────────────────── 路由匹配测试 ───────────────────────── */

test('matchRoutePattern 匹配静态路由', () => {
  assert.equal(matchRoutePattern('/settings', '/settings'), true)
  assert.equal(matchRoutePattern('/settings', '/about'), false)
})

test('matchRoutePattern 匹配带参数路由', () => {
  assert.equal(matchRoutePattern('/detail/:id', '/detail/42'), true)
  assert.equal(matchRoutePattern('/detail/:id', '/detail/'), false)
  assert.equal(matchRoutePattern('/detail/:id', '/detail'), false)
})

test('matchRoutePattern 匹配多参数路由', () => {
  assert.equal(matchRoutePattern('/modal/:type', '/modal/confirm'), true)
  assert.equal(matchRoutePattern('/modal/:type', '/modal/'), false)
})

test('isRouteAllowedForRole 允许 main 窗口打开首页', () => {
  assert.equal(isRouteAllowedForRole('main', '/'), true)
})

test('isRouteAllowedForRole 禁止 login 窗口打开 settings', () => {
  assert.equal(isRouteAllowedForRole('login', '/settings'), false)
})

test('isRouteAllowedForRole 允许 settings 窗口打开 settings', () => {
  assert.equal(isRouteAllowedForRole('settings', '/settings'), true)
})

test('isRouteAllowedForRole 允许 detail 窗口打开带参数路由', () => {
  assert.equal(isRouteAllowedForRole('detail', '/detail/42'), true)
})

test('isRouteAllowedForRole 禁止 main 窗口直接打开 settings', () => {
  assert.equal(isRouteAllowedForRole('main', '/settings'), false)
})

test('getDefaultRoute 返回角色默认路由', () => {
  assert.equal(getDefaultRoute('main'), '/')
  assert.equal(getDefaultRoute('settings'), '/settings')
  assert.equal(getDefaultRoute('login'), '/login')
})

test('每个角色都有默认路由', () => {
  for (const role of Object.keys(WINDOW_ROUTE_MAP)) {
    const defaultRoute = getDefaultRoute(role)
    assert.ok(defaultRoute, `角色 ${role} 应有默认路由`)
  }
})

/* ───────────────────────── 守卫函数测试 ───────────────────────── */

test('validateOpenRequest 拒绝不存在的角色', () => {
  const result = validateOpenRequest('nonexistent', {}, undefined, 'development')
  assert.equal(result.allowed, false)
})

test('validateOpenRequest 拒绝 devOnly 窗口在生产环境打开', () => {
  const result = validateOpenRequest('devtoolsPanel', {}, undefined, 'production')
  assert.equal(result.allowed, false)
})

test('validateOpenRequest 允许 devOnly 窗口在开发环境打开', () => {
  const result = validateOpenRequest('devtoolsPanel', {}, undefined, 'development')
  assert.equal(result.allowed, true)
})

test('validateOpenRequest 拒绝过大 payload', () => {
  const largePayload = { data: 'x'.repeat(512 * 1024) }
  const result = validateOpenRequest('detail', { payload: largePayload }, undefined, 'development')
  assert.equal(result.allowed, false)
})

test('checkPermission 允许角色控制自身窗口', () => {
  const result = checkPermission('main', 'window:control:self', 'main')
  assert.equal(result.allowed, true)
})

test('checkPermission 拒绝 login 角色 open 窗口', () => {
  const result = checkPermission('login', 'window:open', 'login')
  assert.equal(result.allowed, false)
})

test('shouldAllowDevTools 开发环境允许', () => {
  const result = shouldAllowDevTools('main', 'development')
  assert.equal(result.allowed, true)
})

test('shouldAllowDevTools 生产环境按配置决定', () => {
  const mainResult = shouldAllowDevTools('main', 'production')
  assert.equal(mainResult.allowed, true, 'main 配置了 devTools: true 应允许')

  const loginResult = shouldAllowDevTools('login', 'production')
  assert.equal(loginResult.allowed, false, 'login 配置了 devTools: false 应禁止')

  const aboutResult = shouldAllowDevTools('about', 'production')
  assert.equal(aboutResult.allowed, false, 'about 配置了 devTools: false 应禁止')
})
