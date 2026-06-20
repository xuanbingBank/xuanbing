/**
 * @file 错误工具单元测试。
 */

const { test } = require('node:test')
const assert = require('node:assert')

const {
  normalizeError,
  isChunkLoadError,
  isNetworkError,
  formatErrorMessage
} = require('../../dist/src/renderer/utils/error')

test('normalizeError: Error 对象转换为 AppError', () => {
  const err = new Error('测试错误')
  const appError = normalizeError(err)
  assert.equal(appError.code, 'UNKNOWN_ERROR')
  assert.equal(appError.message, '测试错误')
  assert.equal(appError.retryable, true)
})

test('normalizeError: 字符串错误', () => {
  const appError = normalizeError('字符串错误')
  assert.equal(appError.code, 'STRING_ERROR')
  assert.equal(appError.message, '字符串错误')
})

test('normalizeError: 带 code 的对象错误', () => {
  const appError = normalizeError({ message: '对象错误', code: 'CUSTOM_CODE' })
  assert.equal(appError.code, 'CUSTOM_CODE')
  assert.equal(appError.message, '对象错误')
})

test('normalizeError: 未知类型错误', () => {
  const appError = normalizeError(123, '测试上下文')
  assert.equal(appError.code, 'UNKNOWN_ERROR')
  assert.ok(appError.message.includes('测试上下文'))
})

test('isChunkLoadError: chunk load 错误返回 true', () => {
  const err = new Error('Error loading dynamically imported module')
  assert.equal(isChunkLoadError(err), true)
})

test('isChunkLoadError: 普通错误返回 false', () => {
  const err = new Error('普通错误')
  assert.equal(isChunkLoadError(err), false)
})

test('isNetworkError: 网络错误返回 true', () => {
  const err = new Error('network request failed')
  assert.equal(isNetworkError(err), true)
})

test('isNetworkError: 超时错误返回 true', () => {
  const err = new Error('request timeout')
  assert.equal(isNetworkError(err), true)
})

test('isNetworkError: 普通错误返回 false', () => {
  const err = new Error('普通错误')
  assert.equal(isNetworkError(err), false)
})

test('formatErrorMessage: 开发环境显示详细错误', () => {
  const err = new Error('测试错误')
  const msg = formatErrorMessage(err, true)
  assert.ok(msg.includes('UNKNOWN_ERROR'))
  assert.ok(msg.includes('测试错误'))
})

test('formatErrorMessage: 生产环境网络错误脱敏', () => {
  const err = new Error('network request failed')
  const msg = formatErrorMessage(err, false)
  assert.equal(msg, '网络连接异常，请检查网络后重试')
})

test('formatErrorMessage: 生产环境 chunk load 错误脱敏', () => {
  const err = new Error('Error loading dynamically imported module')
  const msg = formatErrorMessage(err, false)
  assert.equal(msg, '页面资源加载失败，请刷新页面重试')
})
