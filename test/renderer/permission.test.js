/**
 * @file 权限工具单元测试。
 */

const { test } = require('node:test')
const assert = require('node:assert')

const {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasRole,
  filterRoutesByPermission
} = require('../../dist/src/renderer/utils/permission')

test('hasPermission: 拥有权限返回 true', () => {
  assert.equal(hasPermission(['user:read'], 'user:read'), true)
})

test('hasPermission: 不拥有权限返回 false', () => {
  assert.equal(hasPermission(['user:read'], 'user:write'), false)
})

test('hasAnyPermission: 空需求列表返回 true', () => {
  assert.equal(hasAnyPermission(['user:read'], []), true)
})

test('hasAnyPermission: 拥有任一权限返回 true', () => {
  assert.equal(hasAnyPermission(['user:read', 'user:write'], ['user:write']), true)
})

test('hasAnyPermission: 全部不拥有返回 false', () => {
  assert.equal(hasAnyPermission(['user:read'], ['user:write', 'user:delete']), false)
})

test('hasAllPermissions: 空需求列表返回 true', () => {
  assert.equal(hasAllPermissions(['user:read'], []), true)
})

test('hasAllPermissions: 全部拥有返回 true', () => {
  assert.equal(
    hasAllPermissions(['user:read', 'user:write', 'user:delete'], ['user:read', 'user:write']),
    true
  )
})

test('hasAllPermissions: 部分缺失返回 false', () => {
  assert.equal(
    hasAllPermissions(['user:read'], ['user:read', 'user:write']),
    false
  )
})

test('hasRole: 拥有角色返回 true', () => {
  assert.equal(hasRole(['admin', 'user'], 'admin'), true)
})

test('hasRole: 不拥有角色返回 false', () => {
  assert.equal(hasRole(['user'], 'admin'), false)
})

test('filterRoutesByPermission: 过滤无权限路由', () => {
  const routes = [
    { name: 'a', meta: { permissions: [] } },
    { name: 'b', meta: { permissions: ['user:read'] } },
    { name: 'c', meta: { permissions: ['user:read', 'user:write'] } }
  ]
  const filtered = filterRoutesByPermission(routes, ['user:read'])
  const names = filtered.map((r) => r.name)
  assert.ok(names.includes('a'))
  assert.ok(names.includes('b'))
  assert.ok(!names.includes('c'))
})
