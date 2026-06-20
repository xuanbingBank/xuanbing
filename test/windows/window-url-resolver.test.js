/**
 * @file 窗口 URL 解析器测试。
 */

const test = require('node:test')
const assert = require('node:assert/strict')

const { WindowUrlResolver } = require('../../dist/electron/windows/main/window-url-resolver.js')

test('开发环境生成 dev server URL + hash 路由', () => {
  const resolver = new WindowUrlResolver({
    isPackaged: false,
    devServerUrl: 'http://localhost:5173',
    indexHtmlPath: '/app/index.html'
  })

  const url = resolver.resolveUrl('main', '/')
  assert.equal(url, 'http://localhost:5173/#/')
})

test('开发环境带参数路由正确编码', () => {
  const resolver = new WindowUrlResolver({
    isPackaged: false,
    devServerUrl: 'http://localhost:5173',
    indexHtmlPath: '/app/index.html'
  })

  const url = resolver.resolveUrl('detail', '/detail/:id', { id: '42' })
  assert.equal(url, 'http://localhost:5173/#/detail/42')
})

test('开发环境带查询串路由正确编码', () => {
  const resolver = new WindowUrlResolver({
    isPackaged: false,
    devServerUrl: 'http://localhost:5173',
    indexHtmlPath: '/app/index.html'
  })

  const url = resolver.resolveUrl('main', '/', undefined, { tab: 'home', filter: 'all' })
  assert.ok(url.includes('tab=home'))
  assert.ok(url.includes('filter=all'))
})

test('生产环境生成 file:// + hash 路由', () => {
  const resolver = new WindowUrlResolver({
    isPackaged: true,
    devServerUrl: undefined,
    indexHtmlPath: '/app/index.html'
  })

  const url = resolver.resolveUrl('settings', '/settings')
  assert.ok(url.startsWith('file://'))
  assert.ok(url.includes('#/settings'))
})

test('生产环境带参数路由正确编码', () => {
  const resolver = new WindowUrlResolver({
    isPackaged: true,
    devServerUrl: undefined,
    indexHtmlPath: '/app/index.html'
  })

  const url = resolver.resolveUrl('detail', '/detail/:id', { id: '42' })
  assert.ok(url.includes('#/detail/42'))
})

test('路由不在角色白名单时拒绝', () => {
  const resolver = new WindowUrlResolver({
    isPackaged: false,
    devServerUrl: 'http://localhost:5173',
    indexHtmlPath: '/app/index.html'
  })

  assert.throws(() => {
    resolver.resolveUrl('login', '/settings')
  }, (err) => err.code === 'WINDOW_ROUTE_NOT_ALLOWED' && /not allowed/.test(err.message))
})

test('缺少路由参数时拒绝', () => {
  const resolver = new WindowUrlResolver({
    isPackaged: false,
    devServerUrl: 'http://localhost:5173',
    indexHtmlPath: '/app/index.html'
  })

  assert.throws(() => {
    resolver.resolveUrl('detail', '/detail/:id', {})
  }, (err) => err.code === 'WINDOW_VALIDATION_ERROR' && /Missing route param/.test(err.message))
})

test('参数值被 URL 编码', () => {
  const resolver = new WindowUrlResolver({
    isPackaged: false,
    devServerUrl: 'http://localhost:5173',
    indexHtmlPath: '/app/index.html'
  })

  const url = resolver.resolveUrl('detail', '/detail/:id', { id: 'hello world&evil' })
  assert.ok(url.includes('hello%20world'))
  assert.ok(!url.includes('hello world'))
})

test('isInternalUrl 判断是否为内部 URL', () => {
  const resolver = new WindowUrlResolver({
    isPackaged: false,
    devServerUrl: 'http://localhost:5173',
    indexHtmlPath: '/app/index.html'
  })

  assert.equal(resolver.isInternalUrl('http://localhost:5173/#/settings'), true)
  assert.equal(resolver.isInternalUrl('https://evil.com'), false)
})

test('isRouteAllowed 判断路由是否允许', () => {
  const resolver = new WindowUrlResolver({
    isPackaged: false,
    devServerUrl: 'http://localhost:5173',
    indexHtmlPath: '/app/index.html'
  })

  assert.equal(resolver.isRouteAllowed('main', '/'), true)
  assert.equal(resolver.isRouteAllowed('login', '/settings'), false)
})

test('getAllowedRoutes 返回角色允许的路由列表', () => {
  const resolver = new WindowUrlResolver({
    isPackaged: false,
    devServerUrl: 'http://localhost:5173',
    indexHtmlPath: '/app/index.html'
  })

  const routes = resolver.getAllowedRoutes('main')
  assert.ok(routes.includes('/'))
  assert.ok(routes.includes('/task-center'))
})
test('开发环境未配置 dev server 时回退到本地 index.html', () => {
  const resolver = new WindowUrlResolver({
    isPackaged: false,
    devServerUrl: undefined,
    indexHtmlPath: '/app/index.html'
  })

  const url = resolver.resolveUrl('main', '/')
  assert.equal(url, 'file:///app/index.html#/')
})
