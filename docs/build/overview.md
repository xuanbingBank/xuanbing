# 构建系统概览

xuanbing（All In One）Electron 桌面应用采用「纯 `tsc` + 自研打包脚本」的构建方案，**不依赖 Vite / Webpack / Rollup**。本文档梳理整体流水线、各脚本职责、产物结构以及设计取舍。

## 1. 总体流水线

一次完整的构建由三段串联组成，对应 `package.json` 中 `start` / `build` / `test` 三条入口脚本：

1. **原生模块重编译**（`scripts/rebuild-native.js`）：把 `better-sqlite3` 的 C++ 二进制重新编译到目标运行时的 ABI（Electron 或 Node）。详见 [native-rebuild.md](./native-rebuild.md)。
2. **TypeScript 编译**（`tsc`）：依据 [tsconfig.json](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/tsconfig.json) 将 `electron/**/*.ts` 与 `src/**/*.ts` 全量编译为 CommonJS JavaScript，输出到 `dist/`。
3. **渲染层打包**（`scripts/build-renderer-bundle.js`）：把渲染层与 preload 层的相对依赖打包成单文件 bundle，预编译 Vue 模板，按需编译 Tailwind v4，复制静态资源。

`start` 脚本三段全跑；`build` 跳过第 1 步；`test` 在第 1 步切换到 Node ABI，并追加 `node --test` 阶段。

## 2. package.json scripts 详解

来源：[package.json](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/package.json)

| 脚本 | 命令 | 用途 |
| --- | --- | --- |
| `typecheck` | `tsc --noEmit` | 仅做类型检查，不产出文件 |
| `build` | `tsc && node scripts/build-renderer-bundle.js` | 产出可运行产物 |
| `rebuild:native:electron` | `node scripts/rebuild-native.js electron` | 重编译到 Electron ABI |
| `rebuild:native:node` | `node scripts/rebuild-native.js node` | 重编译到 Node ABI（测试用） |
| `start` | `pnpm run rebuild:native:electron && tsc && node scripts/build-renderer-bundle.js && electron .` | 一键启动 Electron |
| `test` | `pnpm run rebuild:native:node && tsc && node scripts/build-renderer-bundle.js && node --test scripts/*.test.js test/*.test.js test/renderer/*.test.js test/ipc/*.test.js test/windows/*.test.js test/database/*.test.js` | 全量测试 |

注意：`test` 脚本前置了完整构建链，因为大量测试会 `require('../../dist/...')` 引用编译产物，必须先把 `dist/` 准备好。

## 3. TypeScript 编译阶段

[tsconfig.json](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/tsconfig.json) 的关键配置：

- `target: ES2020`、`module: commonjs`、`moduleResolution: node`：Electron 主进程直接用 Node CommonJS 加载。
- `outDir: dist`、`rootDir: .`：保持源码相对路径，输出镜像在 `dist/` 下。
- `strict: true`：开启全部严格类型检查。
- `lib: ["ES2020", "DOM"]`：主进程需要 ES2020，渲染层需要 DOM。
- `include: ["electron/**/*.ts", "electron/**/*.d.ts", "src/**/*.ts", "types/**/*.d.ts"]`：编译范围限定为 electron 主进程、渲染层源码与类型声明。

`tsconfig.json` 顶部留有 TODO，建议后续开启 `noUnusedLocals` / `noUnusedParameters` / `noImplicitReturns` / `noFallthroughCasesInSwitch` / `forceConsistentCasingInFileNames` 以提升类型严格度。

## 4. build-renderer-bundle.js 详解

源文件：[scripts/build-renderer-bundle.js](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/scripts/build-renderer-bundle.js)

该脚本负责把渲染层与 preload 层的相对依赖打包成 Electron 可直接加载的单文件脚本，并将 Vue `template` 预编译为静态 `render` 函数，避免在严格 CSP 下触发运行时 `unsafe-eval`。整体流程如下：

### 4.1 依赖收集

入口 `buildBundle(config)` 调用 `collectModule(absolutePath, config, modules)` 递归遍历依赖图：

1. 用 `toModuleId(absolutePath)` 把绝对路径标准化为相对 `distRoot` 的模块 ID（反斜杠转正斜杠），保证跨平台一致。
2. 读入模块源码，对源码做预处理（见 4.2）。
3. 用 `extractRequires(code)` 通过正则 `/require\((['"])(.+?)\1\)/g` 提取 `require(...)` 调用，得到依赖请求列表。
4. 对每个请求调用 `resolveDependency(ownerPath, request, config)`：
   - 若请求不以 `.` 开头，视为外部依赖：`allowExternalRequire` 为真时返回 `null`（运行时回退到原生 `require`），否则直接抛错。
   - 若是相对请求，依次尝试 `basePath`、`basePath.js`、`basePath/index.js` 三个候选路径。
5. 把解析到的依赖路径递归加入 `modules` 表，依赖图按 Map 插入顺序天然形成拓扑结构。

> 注意：依赖收集发生在 `dist/` 下的编译产物上，而不是 `src/` 原始 TS，所以 `extractRequires` 只需处理 CommonJS `require`。

### 4.2 Vue 模板预编译

`preprocessModuleCode` 在 `config.precompileVueTemplates` 为真时调用 `precompileVueTemplates(code, moduleId)`：

1. 用正则 `/\btemplate\s*:\s*/g` 定位 `template:` 属性。
2. 紧随其后的字符必须是反引号 `` ` ``，否则跳过（保留原样）。
3. `readTemplateLiteral` 手写扫描反引号字符串，正确处理 `\` 转义，直到匹配的闭合反引号。
4. `compileVueTemplate(template, moduleId)` 调用 `@vue/compiler-dom` 的 `compile`，关键选项：
   - `mode: 'function'`：生成可在任意作用域调用的 render 函数体。
   - `prefixIdentifiers: true`：标识符前置绑定，避免依赖 `with` 语句（CSP 友好）。
   - `hoistStatic: false`、`cacheHandlers: false`、`comments: false`：最小化输出。
5. 把原始 `template: \`...\`` 替换为 `render: (function () { <compiled code> })()`，运行时直接得到 render 函数。

Vue 编译器路径通过 `resolveVueCompilerPath()` 解析：先尝试 `require.resolve('@vue/compiler-dom')`，失败则在 `node_modules/.pnpm/@vue+compiler-dom@*` 目录下查找，兼容 pnpm 的隔离布局。

### 4.3 Bundle 拼接

`renderBundle(config, modules)` 生成最终 IIFE 文本：

1. 把每个模块包装成 `"<moduleId>": [function(require, module, exports) { <code> }, <deps JSON>]` 形式，存入 `__rendererModules` / `__preloadModules` 模块表。
2. 维护 `__rendererCache` / `__preloadCache` 缓存表，模拟 CommonJS 模块缓存语义。
3. 定义 `<runtimeName>(moduleId)` 加载函数：命中缓存则直接返回 `module.exports`；否则取出 `[factory, deps]`，构造 `localRequire(request)`，调用 `factory(localRequire, module, module.exports)`。
4. `localRequire` 先查 `record[1][request]`（即依赖映射表），未命中时根据 `allowExternalRequire` 决定回退到全局 `__externalRequire` 或抛错。
5. 最后立即执行入口模块：`<runtimeName>("<entryId>")`。

两个 bundle 的配置差异：

| 配置项 | renderer bundle | preload bundle |
| --- | --- | --- |
| `entryPath` | `dist/src/renderer.js` | `dist/electron/preload.js` |
| `outputPath` | `dist/src/renderer.bundle.js` | `dist/electron/preload.bundle.js` |
| `allowExternalRequire` | `false`（纯沙箱，禁止外部依赖） | `true`（允许回退到 Node `require`） |
| `precompileVueTemplates` | `true` | `false` |

### 4.4 Tailwind v4 按需编译

`buildRendererStylesheet()` 负责生成渲染层样式：

1. `collectTailwindCandidates()` 递归列出 `src/` 下 `.ts` / `.js` / `.html` 文件，外加根目录 `index.html`。
2. `extractTailwindCandidates(content)` 用宽松正则 `[A-Za-z0-9_!:\/[\]().,%#-]+` 抽取所有可能的类名候选，过滤掉以 `-` 开头且不含字母的 token。
3. 调用 `tailwindcss.compile('@import "tailwindcss";', { base, from, loadStylesheet })` 拿到编译器实例，再用 `compiledTailwind.build(candidates)` 生成最小化 CSS。
4. `loadTailwindStylesheet(id, base)` 处理 `@import "tailwindcss"` 与 `tailwindcss/...` 形式的导入，解析到 `tailwindcss/index.css` 等入口。
5. `inlineCssImports(srcStylePath)` 把 `src/renderer/styles/index.css` 中的本地 `@import` 递归内联，避免运行时多次文件请求。
6. 最终输出 `dist/src/renderer/styles/index.css`，由 Tailwind 编译产物 + 应用自定义 CSS 拼接而成。

### 4.5 静态资源复制

`buildAllBundles()` 主体流程按以下顺序调用：

1. `copyMigrationFiles()`：复制 `electron/database/migrations/*.sql` 到 `dist/electron/database/migrations/`。`tsc` 不处理 `.sql`，必须手动复制。
2. `copyRendererRuntimeAssets()`：
   - `src/renderer/styles/` → `dist/src/renderer/styles/`（原始 CSS 资源）。
   - `node_modules/daisyui/` → `dist/node_modules/daisyui/`（运行时 CSS 依赖）。
   - `node_modules/vue/dist/vue.runtime.global.prod.js` → `dist/vendor/vue.runtime.global.prod.js`（CDN 全局 Vue）。
3. `buildRendererStylesheet()`：生成最终 CSS。
4. `buildBundle(renderer)` 与 `buildBundle(preload)`：生成两个 bundle。

`copyDirectoryRecursive` 与 `copyRuntimeFile` 是通用工具，前者递归复制目录，后者复制单文件并在缺失时抛错。

## 5. 输出目录结构

构建完成后 `dist/` 的关键产物：

```
dist/
├── electron/
│   ├── main.js                              # Electron 主进程入口
│   ├── preload.js                           # tsc 产物（中间文件）
│   ├── preload.bundle.js                    # preload 打包产物
│   ├── database/migrations/*.sql            # 复制的迁移文件
│   ├── ipcBus/...                           # 主进程 IPC 模块
│   ├── windows/...                          # 窗口管理模块
│   └── ...                                  # 其他主进程子模块
├── src/
│   ├── renderer.js                          # tsc 产物（中间文件）
│   ├── renderer.bundle.js                   # 渲染层打包产物
│   └── renderer/
│       └── styles/index.css                 # 编译后的 Tailwind + 应用 CSS
├── vendor/
│   └── vue.runtime.global.prod.js           # Vue 运行时全局构建
└── node_modules/
    └── daisyui/                             # 运行时样式依赖
```

`package.json` 的 `main` 字段指向 `dist/electron/main.js`，Electron 启动时由此进入主进程；`index.html` 在生产环境直接引用 `./dist/src/renderer.bundle.js` 与 `./dist/src/renderer/styles/index.css`。

## 6. 为什么不用 Vite

本项目的若干约束让自研打包比 Vite 更合适：

1. **CDN 全局加载 Vue**：渲染层通过 `<script>` 引入 `vue.runtime.global.prod.js`，Vue 是全局变量而非 ESM 依赖，Vite 的模块图机制反而会冲突。
2. **严格 CSP**：Electron 生产环境禁用 `unsafe-eval`，必须在构建期把 Vue 模板预编译为 render 函数；自研脚本通过 `@vue/compiler-dom` 直接完成，无需 Vite 插件链。
3. **体积可控**：渲染层 bundle 只打包项目内相对依赖，外部依赖（Vue、daisyui）走 vendor 目录，产物大小完全可控。
4. **无开发服务器开销**：项目不需要 HMR / dev server，纯静态 `file://` 加载，省去 Vite 的开发服务器进程与依赖。
5. **与 tsc 产物直接对接**：依赖收集发生在 `dist/` 编译产物上，复用 `tsc` 的路径解析能力，无需重复实现 TS 转译。

## 7. 开发模式与生产模式

- **生产模式**：`index.html` 直接引用 `./dist/...`，渲染层通过 `file://` 协议加载，全部资源本地化。
- **开发模式**：通过环境变量 `ELECTRON_RENDERER_URL` 指向 dev server（如简易 HTTP 服务）加载渲染层；主进程 `electron/renderer-target.ts` 负责在两种模式间切换 `loadURL` / `loadFile`。本仓库当前未启用 dev server，主要依赖 `tsc --watch` + 重启 Electron 的循环。

## 8. 相关文件索引

- [package.json](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/package.json)
- [tsconfig.json](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/tsconfig.json)
- [scripts/build-renderer-bundle.js](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/scripts/build-renderer-bundle.js)
- [scripts/rebuild-native.js](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/scripts/rebuild-native.js)
- [index.html](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/index.html)
