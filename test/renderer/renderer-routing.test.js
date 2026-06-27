/**
 * @file 渲染层路由守卫与页面渲染上下文回归测试。
 *
 * 覆盖登录页重定向顺序，以及根组件必须向布局层提供当前页面组件与页面参数。
 */

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

/**
 * 读取项目根目录下的源码文件。
 *
 * @param {string} relativePath 相对项目根目录的文件路径。
 * @returns {string} 文件文本内容。
 */
function readSource(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', '..', relativePath), 'utf8')
}

test('production HTML references dist runtime assets only', () => {
  const html = readSource('index.html')

  assert.doesNotMatch(html, /cdn\.tailwindcss\.com/)
  assert.doesNotMatch(html, /node_modules\//)
  assert.doesNotMatch(html, /\.\/src\/renderer\/styles/)
  assert.match(html, /\.\/dist\/src\/renderer\.bundle\.js/)
  assert.match(html, /\.\/dist\/src\/renderer\/styles\/index\.css/)
})
