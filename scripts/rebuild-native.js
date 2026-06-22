/**
 * @file 原生依赖 ABI 重建脚本。
 *
 * 在 Electron 和普通 Node 之间切换 better-sqlite3 的原生模块 ABI。
 * 同时把 pnpm/npm 下载缓存固定到项目目录内，避免 Windows 全局 Node 安装目录权限问题。
 */

const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const projectRoot = path.resolve(__dirname, '..')
const localCacheDir = path.join(projectRoot, '.pnpm-cache')

/**
 * 确保本地缓存目录存在。
 *
 * @returns {void}
 */
function ensureLocalCacheDir() {
  fs.mkdirSync(localCacheDir, { recursive: true })
}

/**
 * 判断当前平台是否为 Windows。
 *
 * @returns {boolean} 当前平台是否为 Windows。
 */
function isWindows() {
  return process.platform === 'win32'
}

/**
 * 获取可执行命令在当前平台下的文件名。
 *
 * @param {string} command 基础命令名。
 * @returns {string} 平台适配后的命令名。
 */
function resolveCommand(command) {
  return isWindows() ? `${command}.cmd` : command
}

/**
 * 创建带本地缓存配置的子进程环境变量。
 *
 * @returns {NodeJS.ProcessEnv} 子进程环境变量。
 */
function createRebuildEnv() {
  return {
    ...process.env,
    npm_config_cache: localCacheDir
  }
}

/**
 * 执行命令并继承当前终端输出。
 *
 * @param {string} command 要执行的命令。
 * @param {string[]} args 命令参数。
 * @returns {void}
 */
function runCommand(command, args) {
  const result = isWindows()
    ? spawnSync(buildWindowsCommandLine(command, args), {
      cwd: projectRoot,
      env: createRebuildEnv(),
      shell: true,
      stdio: 'inherit'
    })
    : spawnSync(resolveCommand(command), args, {
      cwd: projectRoot,
      env: createRebuildEnv(),
      stdio: 'inherit'
    })

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

/**
 * 转义 Windows shell 参数。
 *
 * @param {string} value 待转义参数。
 * @returns {string} 转义后的参数。
 */
function quoteWindowsShellArg(value) {
  if (/^[A-Za-z0-9_./:@+-]+$/.test(value)) {
    return value
  }

  return `"${value.replace(/"/g, '\\"')}"`
}

/**
 * 拼接 Windows shell 命令行。
 *
 * @param {string} command 要执行的命令。
 * @param {string[]} args 命令参数。
 * @returns {string} Windows shell 命令行。
 */
function buildWindowsCommandLine(command, args) {
  return [resolveCommand(command), ...args].map(quoteWindowsShellArg).join(' ')
}

/**
 * 为 Electron 运行时重建 better-sqlite3。
 *
 * @returns {void}
 */
function rebuildForElectron() {
  runCommand('pnpm', ['exec', 'electron-rebuild', '-f', '-w', 'better-sqlite3'])
}

/**
 * 为当前 Node.js 运行时重建 better-sqlite3。
 *
 * @returns {void}
 */
function rebuildForNode() {
  runCommand('pnpm', ['rebuild', 'better-sqlite3'])
}

/**
 * 解析脚本模式参数。
 *
 * @returns {'electron' | 'node'} 重建目标模式。
 */
function parseMode() {
  const mode = process.argv[2]

  if (mode === 'electron' || mode === 'node') {
    return mode
  }

  throw new Error('Usage: node scripts/rebuild-native.js <electron|node>')
}

/**
 * 执行原生依赖重建流程。
 *
 * @returns {void}
 */
function main() {
  const mode = parseMode()
  ensureLocalCacheDir()

  if (mode === 'electron') {
    rebuildForElectron()
    return
  }

  rebuildForNode()
}

main()
