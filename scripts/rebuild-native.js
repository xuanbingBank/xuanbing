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
const nativeBindingRequest = 'better-sqlite3/build/Release/better_sqlite3.node'

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
 * 定义占用进程信息。
 *
 * @typedef {object} LockingProcess
 * @property {number} pid 进程 ID。
 * @property {string} name 进程名称。
 * @property {string} path 进程路径。
 */

/**
 * 获取 better-sqlite3 原生模块路径。
 *
 * @returns {string} 原生模块绝对路径。
 */
function resolveNativeBindingPath() {
  return require.resolve(nativeBindingRequest, { paths: [projectRoot] })
}

/**
 * 解析 PowerShell 输出的进程 JSON。
 *
 * @param {string} output PowerShell 输出内容。
 * @returns {LockingProcess[]} 占用进程列表。
 */
function parseLockingProcessesOutput(output) {
  const trimmedOutput = output.trim()

  if (!trimmedOutput) {
    return []
  }

  const parsedOutput = JSON.parse(trimmedOutput)
  const processItems = Array.isArray(parsedOutput) ? parsedOutput : [parsedOutput]

  return processItems.map(normalizeLockingProcess)
}

/**
 * 标准化单个占用进程记录。
 *
 * @param {Record<string, any>} processItem PowerShell 输出的进程记录。
 * @returns {LockingProcess} 标准化后的进程记录。
 */
function normalizeLockingProcess(processItem) {
  return {
    pid: Number(processItem.pid),
    name: String(processItem.name ?? ''),
    path: String(processItem.path ?? '')
  }
}

/**
 * 查找占用原生模块的进程。
 *
 * @param {string} nativeBindingPath better-sqlite3 原生模块绝对路径。
 * @returns {LockingProcess[]} 占用进程列表。
 */
function findProcessesUsingNativeBinding(nativeBindingPath) {
  if (!isWindows()) {
    return []
  }

  const powershellScript = `
$target = [System.IO.Path]::GetFullPath($env:XUANBING_NATIVE_BINDING_PATH)
$items = @()
Get-Process -Name electron,node -ErrorAction SilentlyContinue | ForEach-Object {
  $process = $_
  try {
    foreach ($module in $process.Modules) {
      if ($module.FileName -and ([System.IO.Path]::GetFullPath($module.FileName) -ieq $target)) {
        $items += [pscustomobject]@{
          pid = $process.Id
          name = $process.ProcessName
          path = $process.Path
        }
        break
      }
    }
  } catch {}
}
$items | ConvertTo-Json -Compress
`

  const result = spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', powershellScript], {
    cwd: projectRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      XUANBING_NATIVE_BINDING_PATH: nativeBindingPath
    }
  })

  if (result.error || result.status !== 0) {
    return []
  }

  return parseLockingProcessesOutput(result.stdout)
}

/**
 * 生成原生模块占用提示。
 *
 * @param {LockingProcess[]} lockingProcesses 占用进程列表。
 * @returns {string} 可读错误提示。
 */
function formatLockedBindingMessage(lockingProcesses) {
  const processLines = lockingProcesses.map(formatLockingProcessLine)

  return [
    'better-sqlite3 的原生模块正在被以下进程占用，Windows 无法在重建时覆盖它：',
    ...processLines,
    '',
    '请先关闭旧的应用窗口或结束这些进程，然后重新运行 pnpm run start。'
  ].join('\n')
}

/**
 * 格式化单个占用进程行。
 *
 * @param {LockingProcess} lockingProcess 占用进程。
 * @returns {string} 进程提示行。
 */
function formatLockingProcessLine(lockingProcess) {
  const processPath = lockingProcess.path ? ' (' + lockingProcess.path + ')' : ''
  return '- PID ' + lockingProcess.pid + ' ' + lockingProcess.name + processPath
}

/**
 * 确认原生模块未被占用。
 *
 * @returns {void}
 */
function assertNativeBindingIsFree() {
  const nativeBindingPath = resolveNativeBindingPath()
  const lockingProcesses = findProcessesUsingNativeBinding(nativeBindingPath)

  if (lockingProcesses.length === 0) {
    return
  }

  console.error(formatLockedBindingMessage(lockingProcesses))
  process.exit(1)
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
  assertNativeBindingIsFree()

  if (mode === 'electron') {
    rebuildForElectron()
    return
  }

  rebuildForNode()
}

if (require.main === module) {
  main()
}

module.exports = {
  findProcessesUsingNativeBinding,
  formatLockedBindingMessage,
  parseLockingProcessesOutput
}
