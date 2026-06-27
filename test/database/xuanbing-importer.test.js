/**
 * @file .xuanbing 导入策略源码回归测试。
 *
 * 覆盖 rename 导入必须同步重写事件 ID，避免重复导入时 task_events 主键冲突。
 */

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

/**
 * 读取导入器源码。
 *
 * @returns {string} 导入器源码文本。
 */
function readImporterSource() {
  return fs.readFileSync(path.join(__dirname, '..', '..', 'electron', 'file-db', 'xuanbing-file-importer.ts'), 'utf8')
}

test('rename 导入策略会为关联事件生成新事件 ID', () => {
  const source = readImporterSource()

  assert.match(source, /const eventId =/)
  assert.match(source, /const eventId = importSuffix \? `\$\{event\.id\}-\$\{importSuffix\}` : event\.id/)
  assert.doesNotMatch(source, /run\(\s*\n\s*event\.id,\s*\n\s*id,/)
})
