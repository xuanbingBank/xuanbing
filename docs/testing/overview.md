# 测试体系

xuanbing（All In One）使用 Node.js 内置的 `node:test` 框架构建测试体系，不引入 Jest / Mocha 等外部依赖。本文档梳理测试框架用法、测试文件清单、各文件覆盖范围与运行方式。

## 1. node:test 框架简介

`node:test` 是 Node.js 内置的测试运行器（Node 18+ 稳定），本项目通过以下 API 组织测试：

| API | 作用 |
| --- | --- |
| `const test = require('node:test')` | 引入测试运行器 |
| `test(name, fn)` | 定义一个测试用例 |
| `const assert = require('node:assert/strict')` | 引入严格模式断言 |
| `assert.equal(actual, expected)` | 严格相等断言（`===`） |
| `assert.match(string, regex)` | 断言字符串匹配正则 |
| `assert.doesNotMatch(string, regex)` | 断言字符串不匹配正则 |
| `assert.ok(value)` | 断言真值 |

特点：

- **零外部依赖**：无需安装 Jest / Mocha / Chai，跟随 Node 自带。
- **同步 / 异步**：测试函数若为 `async` 或返回 Promise，运行器会自动等待。
- **进程级隔离**：所有测试在同一 Node 进程内顺序执行，可通过 `node --test` 的并发选项调整。
- **断言失败即用例失败**：`assert/strict` 抛出的错误会被运行器捕获并标记为失败。

## 2. 测试运行命令

来源：[package.json](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/package.json) 的 `test` 脚本：

```bash
pnpm test
# 等价于
pnpm run rebuild:native:node && tsc && node scripts/build-renderer-bundle.js && \
  node --test scripts/*.test.js test/*.test.js test/renderer/*.test.js test/ipc/*.test.js test/windows/*.test.js test/database/*.test.js
```

执行链：

1. `rebuild:native:node`：把 `better-sqlite3` 重编译到 Node ABI，供测试进程加载。详见 [native-rebuild.md](../build/native-rebuild.md)。
2. `tsc`：编译 TS 产物到 `dist/`，测试通过 `require('../../dist/...')` 引用编译产物。
3. `node scripts/build-renderer-bundle.js`：生成渲染层 bundle 与 CSS，部分测试会断言 bundle 产物。
4. `node --test <globs>`：运行所有匹配的测试文件。

测试文件 glob 清单：

- `scripts/*.test.js`：构建脚本测试
- `test/*.test.js`：根级测试
- `test/renderer/*.test.js`：渲染层测试
- `test/ipc/*.test.js`：IPC 总线测试
- `test/windows/*.test.js`：窗口管理测试
- `test/database/*.test.js`：数据库测试

## 3. 测试文件清单

| 文件 | 测试内容 | 关键断言 |
| --- | --- | --- |
| [scripts/rebuild-native.test.js](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/scripts/rebuild-native.test.js) | `package.json` 中重编译脚本配置 | `start` 以 `rebuild:native:electron` 开头；`test` 以 `rebuild:native:node` 开头 |
| [test/database/db-migrator-line-ending.test.js](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/test/database/db-migrator-line-ending.test.js) | 迁移文件换行符归一化 | LF 与 CRLF 版本 migration 的 `hash` 相等 |
| [test/database/xuanbing-importer.test.js](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/test/database/xuanbing-importer.test.js) | `.xuanbing` 导入 rename 策略 | 源码包含 `eventId = importSuffix ? ...` 重写逻辑 |
| [test/ipc/ipc-main-bus.test.js](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/test/ipc/ipc-main-bus.test.js) | IPC 总线序列化失败与权限 | 不可序列化 payload 返回 `IPC_PAYLOAD_UNSERIALIZABLE`；主窗口权限含 `window:control:any` |
| [test/renderer/renderer-routing.test.js](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/test/renderer/renderer-routing.test.js) | 生产 HTML 资源引用、CSS 编译、首页布局 | HTML 不引用 CDN / `node_modules`；CSS 含 `.min-h-screen` / `.flex`；首页用 `FluentPage` 等组件 |
| [test/windows/window-manager-behavior.test.js](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/test/windows/window-manager-behavior.test.js) | 窗口单例、关闭策略、DevTools 守卫 | 二次打开聚焦原窗口；`hide` 隐藏不销毁；`prevent` 忽略关闭；生产环境禁用 DevTools |

## 4. 逐文件详解

### 4.1 scripts/rebuild-native.test.js

源文件：[scripts/rebuild-native.test.js](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/scripts/rebuild-native.test.js)

**测试目标**：确保 `package.json` 中的 `start` 与 `test` 脚本在执行链最前置了对应的重编译步骤。属于「配置回归」测试，不真正执行编译。

**测试 1：`start 脚本会在 Electron 启动前重建 better-sqlite3`**

- 断言 `scripts['rebuild:native:electron']` 等于 `'node scripts/rebuild-native.js electron'`。
- 断言 `scripts.start` 匹配 `/^pnpm run rebuild:native:electron && /`，确保重编译在最前。
- 断言 `scripts.start` 匹配 `/electron \.$/`，确保最终拉起 Electron。
- 断言 `devDependencies['@electron/rebuild']` 存在。

**测试 2：`test 脚本会在 Node 测试前恢复 better-sqlite3 的 Node ABI`**

- 断言 `scripts['rebuild:native:node']` 等于 `'node scripts/rebuild-native.js node'`。
- 断言 `scripts.test` 匹配 `/^pnpm run rebuild:native:node && /`。
- 断言 `scripts.test` 包含 `node --test`。
- 断言 `scripts.test` 包含 `test/renderer/*.test.js`。

### 4.2 test/database/db-migrator-line-ending.test.js

源文件：[test/database/db-migrator-line-ending.test.js](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/test/database/db-migrator-line-ending.test.js)

**测试目标**：覆盖同一 migration 在 LF 与 CRLF 换行下应生成一致 `hash`，避免跨平台 git 检出后启动失败。

**测试：`migration hash 对 LF 与 CRLF 换行保持一致`**

1. `createMigrationDir(content)` 用 `fs.mkdtempSync` 在系统临时目录下创建临时 migrations 目录，写入 `0001_initial.sql`。
2. 分别构造 LF 版本（`\n`）与 CRLF 版本（`\r\n`）的 migration 内容，内容除换行外完全相同：
   ```
   -- migration: 0001_initial
   CREATE TABLE demo (id TEXT);
   ```
3. 调用 `require('../../dist/electron/database/db-migrator.js').loadMigrationFiles(dir)` 加载两个目录。
4. 断言 `crlfMigration.hash === lfMigration.hash`，证明 `db-migrator` 在计算 hash 前对换行做了归一化。

该测试属于回归性质：早期版本若直接对原始字节做 hash，跨平台协作时 git 自动转换换行会导致 hash 漂移，触发「migration 已执行」误判。

### 4.3 test/database/xuanbing-importer.test.js

源文件：[test/database/xuanbing-importer.test.js](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/test/database/xuanbing-importer.test.js)

**测试目标**：覆盖 rename 导入策略必须同步重写事件 ID，避免重复导入时 `task_events` 主键冲突。

**测试：`rename 导入策略会为关联事件生成新事件 ID`**

这是「源码回归」测试，不执行导入逻辑，而是直接读取 [electron/file-db/xuanbing-file-importer.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/xuanbing-file-importer.ts) 源码文本，断言关键代码模式存在：

1. `assert.match(source, /const eventId =/)`：必须声明 `eventId` 局部变量。
2. `assert.match(source, /const eventId = importSuffix \? \`\$\{event\.id\}-\$\{importSuffix\}` : event\.id/)`：rename 模式下（`importSuffix` 非空）事件 ID 必须拼接后缀，原样保留则会导致主键冲突。
3. `assert.doesNotMatch(source, /run\(\s*\n\s*event\.id,\s*\n\s*id,/)`：禁止出现直接用 `event.id` 作为参数的旧写法。

这种源码扫描测试的优点是无需构造完整数据库 fixture，缺点是重构时容易误报，需要与实现强耦合。

### 4.4 test/ipc/ipc-main-bus.test.js

源文件：[test/ipc/ipc-main-bus.test.js](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/test/ipc/ipc-main-bus.test.js)

**测试目标**：覆盖不可 JSON 序列化 payload 的错误包装，以及主窗口跨窗口控制权限配置。

**测试 1：`不可序列化的 IPC payload 会返回统一错误结果`**

1. `createSilentLogger()` 创建不输出到控制台的日志器，避免测试输出污染。
2. `createLegacyWindowManager()` 构造注册了主窗口（id=1，webContents.id=101）的 `WindowManager`，模拟旧版窗口管理器。
3. 用模拟的 `ipcMain`（仅实现 `handle` / `removeHandler`）构造 `IpcMainBus`，配置 `rolePermissions: { main: ['public', 'app:read'] }`。
4. 注册 `appInfoGet` handler，返回固定元数据。
5. 构造循环引用对象 `circular`，`circular.self = circular`，作为 payload 调用 handler。
6. 断言 `result.ok === false`，`result.error.code === 'IPC_PAYLOAD_UNSERIALIZABLE'`，证明 `IpcMainBus` 捕获了序列化异常并包装为统一错误结果。

**测试 2：`默认主窗口权限包含跨窗口控制权限`**

- 读取 `DEFAULT_WINDOW_ROLE_PERMISSIONS.main`。
- 断言包含 `'window:control:any'`（控制任意窗口）与 `'window:close:any'`（关闭任意窗口）。

### 4.5 test/renderer/renderer-routing.test.js

源文件：[test/renderer/renderer-routing.test.js](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/test/renderer/renderer-routing.test.js)

**测试目标**：覆盖渲染层的资源引用正确性与首页布局规范。属于「产物 + 源码」混合断言。

**测试 1：`production HTML references dist runtime assets only`**

读取 [index.html](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/index.html)，断言：

- 不包含 `cdn.tailwindcss.com`（禁止 CDN）。
- 不包含 `node_modules/`（禁止直接引用源码依赖）。
- 不包含 `./src/renderer/styles`（禁止引用未编译 CSS）。
- 包含 `./dist/src/renderer.bundle.js`（必须引用打包产物）。
- 包含 `./dist/src/renderer/styles/index.css`（必须引用编译后 CSS）。

**测试 2：`renderer css includes compiled Tailwind utility classes`**

读取 `dist/src/renderer/styles/index.css`，断言：

- 包含 `.min-h-screen` 与 `.flex`，证明 Tailwind 按需编译生效。
- 不包含 `../../../node_modules`，证明 CSS `@import` 已被内联。

**测试 3：`home page uses Fluent layout components instead of legacy bare classes`**

读取 [src/renderer/pages/index.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/pages/index.ts)，截取 `export const HomePage` 到详情页注释之间的片段，断言：

- `components` 中包含 `FluentPage`、`FluentCard`、`FluentButton`。
- 模板中使用 `<FluentPage`。
- 不再使用 `class="actions"` / `class="status"` / `class="muted"` 等遗留裸类名。

### 4.6 test/windows/window-manager-behavior.test.js

源文件：[test/windows/window-manager-behavior.test.js](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/test/windows/window-manager-behavior.test.js)

**测试目标**：覆盖新窗口管理器的二次打开与关闭行为，包含单例策略、`closeBehavior` 的 `hide` / `prevent` 分支，以及生产环境 DevTools 守卫。

测试通过自建 mock 工厂模拟 `BrowserWindow` 与 `webContents`，避免依赖真实 Electron：

- `createEmitter()`：通用事件发射器，支持 `on` / `once` / `off` / `emit`。
- `createMockWebContents(id)`：模拟 `webContents`，含 `loadURL` / `loadFile` / `setWindowOpenHandler` 等方法。
- `createMockWindow(options)`：模拟 `BrowserWindow`，维护 `destroyed` / `hidden` / `minimized` / `closed` 状态，`close()` 触发 `close` + `closed` 事件。
- `createWindowManagerFixture()`：构造真实 `WindowManager`，注入 mock `browserWindowFactory`、`screen`、临时 `stateFilePath`，`environment: 'test'`，`isPackaged: true`。

**测试 1：`singleton second open follows focus strategy instead of guard rejection`**

- 连续两次 `manager.openWindow('settings')`。
- 断言第二次返回的 `windowId` 等于第一次，且 `created === false`，证明单例窗口走「聚焦已有窗口」策略，而非被守卫拒绝。

**测试 2：`closeBehavior hide hides the window instead of destroying it`**

- `manager.openWindow('taskCenter')` 后调用 `manager.closeWindow(windowId)`。
- 断言窗口 `hidden === true` 且 `closed === false`，证明 `closeBehavior: 'hide'` 隐藏窗口而非销毁。

**测试 3：`closeBehavior prevent ignores close requests`**

- `manager.openWindow('hiddenWorker')` 后调用 `manager.closeWindow(windowId)`。
- 断言窗口 `closed === false` 且 `hidden === false`，证明 `closeBehavior: 'prevent'` 完全忽略关闭请求（适用于后台 worker 窗口）。

**测试 4：`devTools are blocked in production even when config enables them`**

- 调用 `shouldAllowDevTools('main', 'production')`。
- 断言 `result.allowed === false`，证明生产环境下 DevTools 守卫优先于配置，强制禁用。

## 5. 测试覆盖范围与缺口

### 已覆盖

- **构建配置**：`package.json` 脚本串联正确性（重编译前置）。
- **数据库迁移**：跨平台换行符 hash 一致性。
- **文件导入**：rename 策略事件 ID 重写（源码扫描）。
- **IPC 总线**：序列化失败错误包装、主窗口跨窗口权限。
- **渲染层产物**：HTML 资源引用、Tailwind 编译、首页组件规范。
- **窗口管理**：单例二次打开、`hide` / `prevent` 关闭策略、生产 DevTools 守卫。

### 已知缺口

- **端到端测试缺失**：无真实 Electron 启动测试，mock 无法覆盖主进程与渲染层的真实交互。
- **数据库迁移全流程**：仅测 hash 一致性，未覆盖多 migration 顺序执行、回滚、版本跳跃。
- **IPC 全通道**：仅测 `appInfoGet` 的序列化失败，其他通道（`task` / `file` / `setting` 等）未覆盖。
- **渲染层路由守卫**：测试名为 `renderer-routing`，但实际未直接测试 `router/guards.ts` 的执行顺序，主要测的是产物资源引用与首页组件。
- **preload bundle**：无针对 preload 脚本的测试。
- **窗口状态持久化**：`window-state-store.ts` 的读写未单独测试（仅在 fixture 中使用临时文件）。
- **better-sqlite3 真实查询**：测试依赖 mock 或源码扫描，未对真实数据库做查询断言。

后续可优先补齐 IPC 全通道契约测试与数据库迁移全流程集成测试。

## 6. 相关文件索引

- [package.json](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/package.json)
- [scripts/rebuild-native.test.js](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/scripts/rebuild-native.test.js)
- [test/database/db-migrator-line-ending.test.js](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/test/database/db-migrator-line-ending.test.js)
- [test/database/xuanbing-importer.test.js](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/test/database/xuanbing-importer.test.js)
- [test/ipc/ipc-main-bus.test.js](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/test/ipc/ipc-main-bus.test.js)
- [test/renderer/renderer-routing.test.js](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/test/renderer/renderer-routing.test.js)
- [test/windows/window-manager-behavior.test.js](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/test/windows/window-manager-behavior.test.js)
