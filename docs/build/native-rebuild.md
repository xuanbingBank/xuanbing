# 原生模块重编译

xuanbing（All In One）依赖 `better-sqlite3` 这个原生 C++ 模块。由于 Electron 内置的 Node 运行时与系统 Node 的 ABI（Application Binary Interface）不同，同一个 `.node` 二进制不能同时在两端加载。本文档说明重编译脚本的设计与使用。

## 1. 为什么需要重编译

`better-sqlite3` 通过 `node-gyp` 编译 C++ 源码生成 `.node` 文件，编译产物绑定到特定的 Node ABI 版本：

- **Electron 运行时**：使用 Electron 内置的 Node，ABI 版本由 `electron` 包决定（本项目 `electron@^42.4.1`）。
- **系统 Node 运行时**：测试通过 `node --test` 直接运行，使用系统安装的 Node，ABI 版本与系统 Node 版本对应。

如果用错 ABI，加载时会抛出类似 `was compiled against a different Node.js version using NODE_MODULE_VERSION XX` 的错误。因此：

- 启动 Electron 前，必须重编译到 **Electron ABI**。
- 跑测试前，必须重编译到 **Node ABI**。

## 2. 脚本入口

源文件：[scripts/rebuild-native.js](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/scripts/rebuild-native.js)

调用方式：`node scripts/rebuild-native.js <electron|node>`，模式参数由 `parseMode()` 解析，未提供或非法时抛出 `Usage: node scripts/rebuild-native.js <electron|node>`。

`package.json` 暴露两条快捷脚本：

| 脚本 | 实际命令 | 目标 ABI |
| --- | --- | --- |
| `rebuild:native:electron` | `node scripts/rebuild-native.js electron` | Electron |
| `rebuild:native:node` | `node scripts/rebuild-native.js node` | 系统 Node |

## 3. 核心逻辑

`main()` 是脚本主流程：

1. `parseMode()` 从 `process.argv[2]` 读取模式，只接受 `electron` 或 `node`。
2. `ensureLocalCacheDir()` 在项目根目录创建 `.pnpm-cache/`，把 pnpm/npm 的下载缓存固定到项目内，避免 Windows 全局 Node 安装目录的权限问题。
3. 根据模式调用 `rebuildForElectron()` 或 `rebuildForNode()`。

### 3.1 Electron 模式

```js
function rebuildForElectron() {
  runCommand('pnpm', ['exec', 'electron-rebuild', '-f', '-w', 'better-sqlite3'])
}
```

等价于 `pnpm exec electron-rebuild -f -w better-sqlite3`，关键参数：

- `-f`（`--force`）：强制重编译，即使 ABI 看起来已匹配。
- `-w better-sqlite3`（`--which better-sqlite3`）：只重编译指定模块，避免全量扫描 `node_modules`。

`electron-rebuild` 来自 `@electron/rebuild`（`devDependencies` 中声明 `^4.0.4`），内部调用 `node-gyp` 使用 Electron 的头文件重新构建 `.node` 文件。

### 3.2 Node 模式

```js
function rebuildForNode() {
  runCommand('pnpm', ['rebuild', 'better-sqlite3'])
}
```

等价于 `pnpm rebuild better-sqlite3`，使用系统 Node 的头文件重新构建，恢复到 Node ABI。该模式专供 `npm test` / `pnpm test` 使用——测试进程是普通 Node，必须用 Node ABI 才能加载 `better-sqlite3`。

## 4. 跨平台命令执行

`runCommand(command, args)` 用 `child_process.spawnSync` 同步执行命令，做了两层适配：

1. **命令名解析**：Windows 下 `pnpm` 实际是 `pnpm.cmd`，通过 `resolveCommand(command)` 在 Windows 上追加 `.cmd` 后缀。
2. **Shell 调用方式**：
   - Windows：`spawnSync(buildWindowsCommandLine(command, args), { shell: true, ... })`，借助 `shell: true` 让系统解析 `.cmd` 批处理。
   - 其他平台：`spawnSync(resolveCommand(command), args, ...)`，直接执行。
3. **参数转义**：`quoteWindowsShellArg(value)` 对包含特殊字符的参数加双引号并转义内部引号；纯字母数字下划线等安全字符原样输出。
4. **环境变量**：`createRebuildEnv()` 在 `process.env` 基础上覆盖 `npm_config_cache`，把缓存指向 `.pnpm-cache/`。
5. **错误处理**：`result.error` 表示命令启动失败（如找不到可执行文件）则抛出；`result.status !== 0` 表示命令返回非零退出码，则 `process.exit(result.status ?? 1)` 透传退出码。

`stdio: 'inherit'` 让子进程直接继承当前终端，构建日志实时可见。

## 5. 单元测试

源文件：[scripts/rebuild-native.test.js](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/scripts/rebuild-native.test.js)

测试用 `node:test` 框架，主要校验 `package.json` 中的脚本配置是否正确串联了重编译步骤，而非真正执行重编译（避免测试时触发耗时编译）。

### 测试 1：start 脚本会先重建 better-sqlite3 到 Electron ABI

```js
test('start 脚本会在 Electron 启动前重建 better-sqlite3', () => {
  const pkg = readPackageJson()

  assert.equal(pkg.scripts['rebuild:native:electron'], 'node scripts/rebuild-native.js electron')
  assert.match(pkg.scripts.start, /^pnpm run rebuild:native:electron && /)
  assert.match(pkg.scripts.start, /electron \.$/)
  assert.ok(pkg.devDependencies['@electron/rebuild'])
})
```

关键断言：

- `rebuild:native:electron` 脚本指向 `rebuild-native.js electron`。
- `start` 脚本以 `pnpm run rebuild:native:electron &&` 开头，确保重编译在 `tsc`、bundle、`electron .` 之前执行。
- `start` 脚本以 `electron .` 结尾，确认最终会拉起 Electron。
- `devDependencies` 中声明了 `@electron/rebuild`，保证 `electron-rebuild` 可用。

### 测试 2：test 脚本会先恢复 better-sqlite3 的 Node ABI

```js
test('test 脚本会在 Node 测试前恢复 better-sqlite3 的 Node ABI', () => {
  const pkg = readPackageJson()

  assert.equal(pkg.scripts['rebuild:native:node'], 'node scripts/rebuild-native.js node')
  assert.match(pkg.scripts.test, /^pnpm run rebuild:native:node && /)
  assert.match(pkg.scripts.test, /node --test/)
  assert.match(pkg.scripts.test, /test\/renderer\/\*\.test\.js/)
})
```

关键断言：

- `rebuild:native:node` 脚本指向 `rebuild-native.js node`。
- `test` 脚本以 `pnpm run rebuild:native:node &&` 开头，确保测试前 ABI 已切换到 Node。
- `test` 脚本包含 `node --test`，验证测试运行器配置。
- `test` 脚本包含 `test/renderer/*.test.js`，验证测试文件清单完整。

这两个测试是「配置回归」性质：防止有人误删 `start` / `test` 中的重编译前置步骤，导致运行时 ABI 错配。

## 6. 常见问题

### 6.1 ABI 不匹配错误

报错示例：

```
Error: The module '...\better-sqlite3\build\Release\better_sqlite3.node'
was compiled against a different Node.js version using NODE_MODULE_VERSION 108.
This version of Node.js requires NODE_MODULE_VERSION 136.
```

排查步骤：

1. 确认目标运行时：Electron 还是 Node。
2. 跑对应的重编译脚本：Electron 用 `pnpm run rebuild:native:electron`，测试用 `pnpm run rebuild:native:node`。
3. 如果仍然报错，加 `-f` 强制重编译（脚本已默认带 `-f`）。

### 6.2 node-gyp 依赖

`node-gyp` 需要 Python 3 与 C++ 编译工具链。`@electron/rebuild` 内部调用 `node-gyp`，因此首次构建必须满足：

- **Windows**：安装 [windows-build-tools](https://github.com/felixrieseberg/windows-build-tools) 或 Visual Studio Build Tools（含 C++ 桌面开发工作负载）与 Python 3。
- **macOS**：安装 Xcode Command Line Tools（`xcode-select --install`）。
- **Linux**：安装 `build-essential`、`python3`。

### 6.3 Windows 构建工具

本项目针对 Windows 做了两项额外适配：

1. **本地 pnpm 缓存**：`ensureLocalCacheDir()` 把缓存指向 `.pnpm-cache/`，避免全局 Node 安装目录（如 `C:\Program Files\nodejs\`）的写入权限问题。
2. **`.cmd` 后缀解析**：Windows 下 `pnpm` 是批处理脚本，必须通过 `shell: true` 或追加 `.cmd` 才能正确执行；`resolveCommand()` 与 `buildWindowsCommandLine()` 负责这一适配。

### 6.4 切换 Node 版本后

若用 `nvm` / `fnm` 切换了系统 Node 版本，旧的 `.node` 二进制会失效，需要重新跑 `pnpm run rebuild:native:node`。Electron ABI 不受系统 Node 版本影响，但若升级了 `electron` 包版本，也需要重新跑 `pnpm run rebuild:native:electron`。

## 7. 相关文件索引

- [scripts/rebuild-native.js](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/scripts/rebuild-native.js)
- [scripts/rebuild-native.test.js](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/scripts/rebuild-native.test.js)
- [package.json](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/package.json)
