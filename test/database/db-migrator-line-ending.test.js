/**
 * @file 数据库迁移器换行规范化回归测试。
 *
 * 覆盖同一 migration 在 LF 与 CRLF 换行下应生成一致 hash，避免跨平台检出后启动失败。
 */

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

/**
 * 创建仅包含一个 migration 文件的临时目录。
 *
 * @param {string} content migration 文件内容。
 * @returns {string} 临时 migrations 目录路径。
 */
function createMigrationDir(content) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'xuanbing-migrations-'))
  fs.writeFileSync(path.join(dir, '0001_initial.sql'), content, 'utf8')
  return dir
}

test('migration hash 对 LF 与 CRLF 换行保持一致', () => {
  const { loadMigrationFiles } = require('../../dist/electron/database/db-migrator.js')
  const lfDir = createMigrationDir('-- migration: 0001_initial\nCREATE TABLE demo (id TEXT);\n')
  const crlfDir = createMigrationDir('-- migration: 0001_initial\r\nCREATE TABLE demo (id TEXT);\r\n')

  const [lfMigration] = loadMigrationFiles(lfDir)
  const [crlfMigration] = loadMigrationFiles(crlfDir)

  assert.equal(crlfMigration.hash, lfMigration.hash)
})
