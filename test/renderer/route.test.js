/**
 * @file 路由工具单元测试。
 */

const { test } = require('node:test')
const assert = require('node:assert')

const { buildBreadcrumbs, buildPageTitle, isSameRoute } =
  require('../../dist/src/renderer/utils/route')

/** 构造 mock 路由 */
function mockRoute(overrides) {
  return {
    path: '/',
    name: 'home',
    params: {},
    query: {},
    meta: { title: '首页' },
    matched: { path: '/', name: 'home', meta: { title: '首页' } },
    matchedChain: [
      { path: '/', name: 'home', meta: { title: '首页', breadcrumb: true } }
    ],
    ...overrides
  }
}

test('buildBreadcrumbs: 从 matchedChain 构建面包屑', () => {
  const route = mockRoute({
    matchedChain: [
      { path: '/', name: 'home', meta: { title: '首页', breadcrumb: true } },
      { path: '/settings', name: 'settings', meta: { title: '设置', breadcrumb: true } }
    ]
  })
  const breadcrumbs = buildBreadcrumbs(route)
  assert.equal(breadcrumbs.length, 2)
  assert.equal(breadcrumbs[0].title, '首页')
  assert.equal(breadcrumbs[1].title, '设置')
})

test('buildBreadcrumbs: 最后一项不可点击', () => {
  const route = mockRoute({
    matchedChain: [
      { path: '/', name: 'home', meta: { title: '首页', breadcrumb: true } },
      { path: '/settings', name: 'settings', meta: { title: '设置', breadcrumb: true } }
    ]
  })
  const breadcrumbs = buildBreadcrumbs(route)
  assert.equal(breadcrumbs[0].clickable, true)
  assert.equal(breadcrumbs[1].clickable, false)
})

test('buildBreadcrumbs: breadcrumb=false 的项不显示', () => {
  const route = mockRoute({
    matchedChain: [
      { path: '/', name: 'home', meta: { title: '首页', breadcrumb: true } },
      { path: '/hidden', name: 'hidden', meta: { title: '隐藏', breadcrumb: false } },
      { path: '/settings', name: 'settings', meta: { title: '设置', breadcrumb: true } }
    ]
  })
  const breadcrumbs = buildBreadcrumbs(route)
  assert.equal(breadcrumbs.length, 2)
  assert.ok(!breadcrumbs.some((b) => b.title === '隐藏'))
})

test('buildPageTitle: 拼接应用名', () => {
  const route = mockRoute({ meta: { title: '设置' } })
  const title = buildPageTitle(route, 'All In One')
  assert.equal(title, '设置 - All In One')
})

test('buildPageTitle: 无标题时只返回应用名', () => {
  const route = mockRoute({ meta: { title: '' } })
  const title = buildPageTitle(route, 'All In One')
  assert.equal(title, 'All In One')
})

test('isSameRoute: 相同路径与查询返回 true', () => {
  const a = mockRoute({ path: '/settings', query: { tab: 'info' } })
  const b = mockRoute({ path: '/settings', query: { tab: 'info' } })
  assert.equal(isSameRoute(a, b), true)
})

test('isSameRoute: 不同路径返回 false', () => {
  const a = mockRoute({ path: '/settings' })
  const b = mockRoute({ path: '/about' })
  assert.equal(isSameRoute(a, b), false)
})

test('isSameRoute: 不同查询返回 false', () => {
  const a = mockRoute({ path: '/settings', query: { tab: 'info' } })
  const b = mockRoute({ path: '/settings', query: { tab: 'security' } })
  assert.equal(isSameRoute(a, b), false)
})

test('isSameRoute: null 返回 false', () => {
  assert.equal(isSameRoute(null, null), false)
})
