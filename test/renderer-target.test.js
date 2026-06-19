const path = require('node:path')
const test = require('node:test')
const assert = require('node:assert/strict')

const { resolveRendererTarget } = require('../dist/electron/renderer-target.js')

test('uses local index.html when no dev server URL is configured', () => {
  const target = resolveRendererTarget({
    appRoot: 'C:/workspace/all-in-one',
    isPackaged: false
  })

  assert.deepEqual(target, {
    kind: 'file',
    filePath: path.join('C:/workspace/all-in-one', 'index.html')
  })
})

test('uses the configured dev server URL when provided', () => {
  const target = resolveRendererTarget({
    appRoot: 'C:/workspace/all-in-one',
    devServerUrl: 'http://localhost:5173',
    isPackaged: false
  })

  assert.deepEqual(target, {
    kind: 'url',
    url: 'http://localhost:5173'
  })
})
