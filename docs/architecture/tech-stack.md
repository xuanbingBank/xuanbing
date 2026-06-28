# 技术栈与依赖

本文档基于 [package.json](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/package.json)，列出 xuanbing（All In One）的全部依赖、版本、用途分类、选型理由，以及 `scripts` 字段中每条命令的作用。

## 依赖清单

### dependencies（运行时）

| 依赖 | 版本 | 用途分类 | 说明 |
| --- | --- | --- | --- |
| `electron` | `^42.4.1` | 框架核心 | 桌面应用外壳，提供主进程 / preload / 渲染进程三端运行时。 |
| `vue` | `^3.5.38` | 框架核心 | 渲染层 UI 框架，使用 runtime-only 全局构建（CDN 加载）。 |
| `better-sqlite3` | `^12.11.1` | 数据库 | 主进程同步 SQLite 驱动，drizzle-orm 的底层引擎。 |
| `drizzle-orm` | `^0.45.2` | 数据库 | 类型安全的 SQL ORM，提供 schema 定义与查询构建。 |
| `zod` | `^4.1.12` | 校验 | 运行时类型校验。注意 IPC 共享层另有一套自研轻量实现。 |
| `tailwindcss` | `^4.3.1` | 样式 | 原子化 CSS 框架，v4 版本。 |
| `daisyui` | `^5.5.23` | 样式 | 基于 Tailwind 的组件层，提供主题与预置组件。 |

### devDependencies（构建与开发）

| 依赖 | 版本 | 用途分类 | 说明 |
| --- | --- | --- | --- |
| `typescript` | `^6.0.3` | 构建工具 | TS 编译器，纯 `tsc` 输出 CommonJS，无打包器。 |
| `@types/node` | `^26.0.0` | 类型定义 | Node.js 内置 API 类型。 |
| `@types/better-sqlite3` | `^7.6.13` | 类型定义 | better-sqlite3 的类型声明。 |
| `@electron/rebuild` | `^4.0.4` | 构建工具 | 针对 Electron ABI 重编译 better-sqlite3 等原生模块。 |
| `drizzle-kit` | `^0.31.10` | 数据库 | drizzle 的迁移工具链（schema 生成 / 迁移管理）。 |

## 用途分类总览

### 框架核心

- `electron` 42：主进程运行时、窗口管理、IPC 通道、session 安全策略。
- `vue` 3.5：渲染层响应式 UI。通过 `vue.runtime.global.prod.js` 全局脚本加载，不经过打包器。

### 数据库

- `better-sqlite3` 12：同步 API，详见选型理由。
- `drizzle-orm` 0.45：schema 定义见 [electron/database/schema/](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/schema/)，迁移脚本见 [electron/database/migrations/0001_initial.sql](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/migrations/0001_initial.sql)。
- `drizzle-kit` 0.31：开发期生成迁移。

### 校验

- `zod` 4：作为运行时校验库依赖。
- 自研 zod 实现（[electron/ipcBus/shared/zod.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/shared/zod.ts)）：IPC 共享层使用最小 API 集合，避免跨端副作用，详见选型理由。

### 样式

- `tailwindcss` 4：通过 [scripts/build-renderer-bundle.js](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/scripts/build-renderer-bundle.js) 在构建期编译，输出 [src/renderer/styles/index.css](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/styles/index.css)。
- `daisyui` 5：在 Tailwind 之上提供主题 token 与组件类。

### 构建工具

- `typescript` 6：`tsc --noEmit` 用于类型检查，`tsc` 用于产出 `dist/`。
- `@electron/rebuild`：在 Electron 与 Node 两种 ABI 间切换 better-sqlite3 原生模块。
- 自研 [build-renderer-bundle.js](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/scripts/build-renderer-bundle.js)：负责打包渲染层与 preload bundle，并预编译 Vue 模板。

### 类型定义

- `@types/node`、`@types/better-sqlite3`：补齐第三方类型；项目自有类型见 [types/node-shims.d.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/types/node-shims.d.ts) 与 [src/renderer/vue-global.d.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/vue-global.d.ts)。

## 关键依赖选型理由

### better-sqlite3 同步 API

主进程数据库连接由 [db-connection.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/db-connection.ts) 管理，PRAGMA 在 [db-pragmas.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/db-pragmas.ts) 中设置（WAL / foreign_keys / busy_timeout）。选择 better-sqlite3 的原因：

- **同步 API**：主进程处理 IPC 请求时直接返回查询结果，无需 `async/await` 串联与连接池，简化事务边界（见 [db-transaction.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/db-transaction.ts)）。
- **原生性能**：C++ 绑定，吞吐高于纯 JS 驱动。
- **事务语义清晰**：`transaction()` 包装保证原子性，配合迁移前备份（见 [db-backup.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/db-backup.ts)）降低数据损坏风险。

代价是必须针对 Electron ABI 重编译，由 [rebuild-native.js](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/scripts/rebuild-native.js) 与 `rebuild:native:*` 脚本承担。

### drizzle-orm 类型安全

Schema 定义在 [electron/database/schema/](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/schema/)（如 [task.schema.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/schema/task.schema.ts)、[setting.schema.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/schema/setting.schema.ts)）。选择 drizzle-orm 的原因：

- **类型推断**：查询结果类型由 schema 推断，无需手写接口。
- **SQL 透明**：不引入额外查询语言，迁移文件即 SQL（见 [migrations/](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/migrations/)）。
- **与 better-sqlite3 原生集成**：drizzle 提供 better-sqlite3 session 适配。

### Zod 自研实现的原因

项目 `dependencies` 中保留 `zod`，但 IPC 共享层在 [electron/ipcBus/shared/zod.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/shared/zod.ts) 实现了一套轻量 zod。原因：

- **跨端共享无副作用**：共享层同时被主进程（CommonJS）与渲染层（runtime-only global）引用，自研实现不依赖模块解析机制，避免打包器介入。
- **最小 API 集**：仅实现 `parse` / `safeParse` / `optional` / `nullable` / `array` / `default` / `parseAtPath`，足够覆盖契约校验需求。
- **错误类型耦合**：`ZodValidationError` 与 [IpcMainBus.parseSchema](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/ipc-main-bus.ts) 紧密协作，抛出标准 `IPC_VALIDATION_ERROR`。
- **体积可控**：渲染层 bundle 体积敏感，自研实现避免引入完整 zod 运行时。

## scripts 字段

以下命令定义在 [package.json](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/package.json) 的 `scripts` 字段，包管理器为 `pnpm@10.29.3`。

| 命令 | 脚本 | 作用 |
| --- | --- | --- |
| `typecheck` | `tsc --noEmit` | 仅做类型检查，不产出文件。 |
| `build` | `tsc && node scripts/build-renderer-bundle.js` | 先用 `tsc` 编译全部 TS 到 `dist/`，再运行自研 bundler 生成 `dist/src/renderer.bundle.js` 与 `dist/electron/preload.bundle.js`，并预编译 Vue 模板。 |
| `rebuild:native:electron` | `node scripts/rebuild-native.js electron` | 针对当前 Electron ABI 重编译 `better-sqlite3` 等原生模块，运行应用前必须执行。 |
| `rebuild:native:node` | `node scripts/rebuild-native.js node` | 针对 Node.js ABI 重编译原生模块，供 `node --test` 运行测试时使用（测试在 Node 而非 Electron 进程中执行）。 |
| `start` | `pnpm run rebuild:native:electron && tsc && node scripts/build-renderer-bundle.js && electron .` | 完整启动链：重编译原生模块 → 编译 TS → 构建 bundle → 启动 Electron。入口为 `dist/electron/main.js`（见 `package.json` 的 `main` 字段）。 |
| `test` | 见下方拆解 | 运行测试套件。 |

### test 命令拆解

```
pnpm run rebuild:native:node
  && tsc
  && node scripts/build-renderer-bundle.js
  && node --test
      scripts/*.test.js
      test/*.test.js
      test/renderer/*.test.js
      test/ipc/*.test.js
      test/windows/*.test.js
      test/database/*.test.js
```

- 先针对 Node ABI 重编译原生模块（因为测试用 `node --test` 而非 Electron 运行）。
- 再编译 TS 与构建 bundle（测试引用编译产物）。
- 最后用 Node 内置 `node --test` 运行 [scripts/](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/scripts/) 与 [test/](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/test/) 下分目录的测试。

## TypeScript 配置要点

[tsconfig.json](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/tsconfig.json) 关键项：

- `target: ES2020`、`module: commonjs`、`moduleResolution: node`：纯 CommonJS 输出，Electron 主进程可直接加载。
- `strict: true`：开启全部严格检查。
- `outDir: dist`、`rootDir: .`：输出到 `dist/`，保留源目录结构。
- `lib: ["ES2020", "DOM"]`：主进程用 ES2020，渲染层共享类型用 DOM。
- `include: ["electron/**/*.ts", "electron/**/*.d.ts", "src/**/*.ts", "types/**/*.d.ts"]`：编译范围。
- 文件内 TODO 注明后续可开启 `noUnusedLocals` / `noUnusedParameters` / `noImplicitReturns` / `noFallthroughCasesInSwitch` / `forceConsistentCasingInFileNames` 以提升严格度。

## 相关文档

- [架构总览](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/docs/architecture/overview.md)
- [目录结构详解](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/docs/architecture/directory-structure.md)
- [启动流程时序](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/docs/architecture/bootstrap-flow.md)
