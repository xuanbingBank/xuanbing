# 目录结构详解

本文档以树形结构展示 xuanbing（All In One）项目根目录（忽略 `node_modules/`、`dist/`、`.git/`），并逐目录说明职责。项目根目录为 `e:\zhuomian\xuanbing-all\all-in-one\xuanbing`。

## 根目录树

```
xuanbing/
├── docs/                      # 文档体系
├── electron/                  # 主进程代码
├── scripts/                   # 构建与原生模块脚本
├── src/                       # 渲染层代码
├── test/                      # 测试套件
├── types/                     # 全局类型补丁
├── .gitignore
├── README.md
├── index.html                 # 渲染层 HTML 宿主
├── package.json
├── pnpm-lock.yaml
└── tsconfig.json
```

## 顶层文件

| 文件 | 职责 |
| --- | --- |
| [index.html](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/index.html) | 渲染层 HTML 宿主，声明 CSP、引入 daisyUI CSS 与 Vue runtime-only 全局脚本，挂载点 `#app`。 |
| [package.json](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/package.json) | 包清单，入口 `dist/electron/main.js`，定义 `typecheck`/`build`/`start`/`test`/`rebuild:native:*` 脚本。 |
| [tsconfig.json](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/tsconfig.json) | TS 配置，`strict` + `commonjs` + `ES2020`，编译 `electron/`、`src/`、`types/`。 |
| `.gitignore` | Git 忽略规则。 |
| `pnpm-lock.yaml` | pnpm 锁文件，包管理器为 `pnpm@10.29.3`。 |
| `README.md` | 项目说明。 |

## electron/ — 主进程代码

```
electron/
├── main.ts                    # 主进程入口
├── preload.ts                 # preload 入口（仅 7 行）
├── renderer-target.ts         # 渲染目标与 preload 路径解析
├── database/                  # SQLite 数据库层
├── desktop-toast/             # 桌面 Toast 窗口管理
├── file-db/                   # .xuanbing 文件格式实现
├── ipcBus/                    # 契约化 IPC 总线（三端共享）
├── repositories/              # 数据访问层
├── services/                  # 业务服务层
└── windows/                   # 新 WindowManager 与窗口配置
```

### electron/database/

SQLite 连接、迁移、PRAGMA、事务、备份恢复。

| 文件 | 职责 |
| --- | --- |
| `index.ts` | 数据库层统一出口，导出 `resolveDbPaths` / `openConnection` / `runMigrations` / `closeConnection` 等。 |
| `db-connection.ts` | 维护 better-sqlite3 单例连接。 |
| `db-path.ts` | 解析数据库文件路径（`userData/app-data/db/app.sqlite`，支持 testMode）。 |
| `db-pragmas.ts` | 设置 WAL / foreign_keys / busy_timeout 等 PRAGMA。 |
| `db-migrator.ts` | 执行 pending migrations，迁移前自动备份。 |
| `db-transaction.ts` | 事务包装工具。 |
| `db-backup.ts` | 数据库备份。 |
| `db-restore.ts` | 数据库恢复。 |
| `db-health.ts` | 数据库健康检查。 |
| `migrations/0001_initial.sql` | 初始迁移 SQL。 |
| `schema/` | drizzle-orm schema 定义，按域拆分：`app` / `audit` / `file-asset` / `log` / `setting` / `sync` / `task` / `window-state`，`index.ts` 汇总。 |

### electron/desktop-toast/

| 文件 | 职责 |
| --- | --- |
| `ToastWindowManager.ts` | 独立透明窗口承载桌面级 Toast 通知，由 system IPC 模块驱动，在 `createMainIpcRuntime` 中 `init()`。 |

### electron/file-db/

自研 `.xuanbing` 文件格式实现。

| 文件 | 职责 |
| --- | --- |
| `index.ts` | 模块出口。 |
| `xuanbing-file-types.ts` | 文件格式类型定义。 |
| `xuanbing-file.schema.ts` | 文件结构 schema。 |
| `xuanbing-file-reader.ts` | 文件读取。 |
| `xuanbing-file-writer.ts` | 文件写入。 |
| `xuanbing-file-importer.ts` | 导入逻辑。 |
| `xuanbing-file-exporter.ts` | 导出逻辑。 |
| `xuanbing-file-validator.ts` | 格式校验。 |
| `xuanbing-file-checksum.ts` | 校验和计算。 |
| `atomic-write.ts` | 原子写实现，避免写中间态。 |
| `safe-file-path.ts` | 安全路径校验，防止路径穿越。 |

### electron/ipcBus/

契约化 IPC 总线，三端共享。`shared/` 同时被主进程与渲染层引用。

```
ipcBus/
├── main/                      # 主进程侧总线实现与模块
│   ├── index.ts               # createMainIpcRuntime 装配入口
│   ├── ipc-main-bus.ts        # IpcMainBus 统一分发
│   ├── ipc-context.ts         # 请求上下文
│   ├── ipc-errors.ts          # 标准 IPC 错误
│   ├── ipc-logger.ts          # IPC 调用日志
│   ├── ipc-permissions.ts     # 权限校验器
│   ├── ipc-timeout.ts         # 超时控制
│   ├── task-registry.ts       # 任务注册表
│   ├── window-manager.ts      # 旧 WindowManager（IPC 视角）
│   └── modules/               # 9 个业务 IPC 模块
│       ├── app.ipc.ts
│       ├── database.ipc.ts
│       ├── file.ipc.ts
│       ├── setting.ipc.ts
│       ├── system.ipc.ts
│       ├── task-data.ipc.ts
│       ├── task.ipc.ts
│       ├── window.ipc.ts
│       └── xuanbing-file.ipc.ts
├── preload/                   # preload 侧
│   ├── client.ts              # preload 客户端（封装 ipcRenderer）
│   ├── desktop-api.ts         # desktop API 实现
│   └── expose-api.ts          # 通过 contextBridge 暴露 window.desktop
├── renderer/                  # 渲染层侧
│   ├── desktop-api.ts         # 渲染层 desktop API 客户端
│   ├── global.d.ts            # window.desktop 全局类型
│   ├── helpers.ts
│   └── index.ts
└── shared/                    # 三端共享契约
    ├── contracts.ts           # 请求/事件契约定义
    ├── constants.ts           # IPC 事件常量
    ├── errors.ts
    ├── index.ts
    ├── schemas.ts
    ├── types.ts
    ├── zod.ts                 # 自研轻量 zod 实现
    └── database/              # 数据库共享类型与错误
        ├── constants.ts
        ├── db-errors.ts
        ├── db-types.ts
        ├── index.ts
        └── pagination.ts
```

### electron/repositories/

数据访问层，基于 drizzle-orm。

| 文件 | 职责 |
| --- | --- |
| `base.repository.ts` | 仓储基类。 |
| `audit.repository.ts` | 审计日志仓储，被 `IpcMainBus` 注入用于审计。 |
| `file-asset.repository.ts` | 文件资产仓储。 |
| `log.repository.ts` | 日志仓储。 |
| `setting.repository.ts` | 设置项仓储。 |
| `task.repository.ts` | 任务仓储。 |
| `window-state.repository.ts` | 窗口状态仓储。 |
| `index.ts` | 统一出口。 |

### electron/services/

业务服务层，封装仓储与领域逻辑。

| 文件 | 职责 |
| --- | --- |
| `index.ts` | 统一出口。 |
| `database.service.ts` | 数据库服务（备份/恢复/健康）。 |
| `setting.service.ts` | 设置项服务。 |
| `task.service.ts` | 任务服务。 |
| `window-state.service.ts` | 窗口状态服务。 |
| `xuanbing-file.service.ts` | `.xuanbing` 文件服务，封装 file-db，在 `before-quit` 时 `dispose()`。 |

### electron/windows/

新 WindowManager（窗口运行时行为）与窗口配置。

```
windows/
├── main/
│   ├── index.ts
│   ├── window-manager.ts      # 新 WindowManager 核心
│   ├── window-registry.ts     # 窗口注册表
│   ├── window-state-store.ts  # 窗口状态持久化
│   ├── window-url-resolver.ts # URL 解析（dev server / file）
│   ├── window-events.ts       # 窗口事件总线
│   ├── window-init-payload.ts # 初始化 payload（一次性 token）
│   ├── window-lifecycle.ts    # 生命周期绑定
│   ├── window-display.ts      # 显示器选择与边界校正
│   ├── window-guards.ts       # 打开请求校验与权限
│   └── window-init-payload.ts
└── shared/
    ├── index.ts
    ├── window-config.ts       # 角色配置
    ├── window-errors.ts       # 窗口错误码
    ├── window-permissions.ts  # 默认角色权限映射
    ├── window-roles.ts        # 窗口角色定义
    ├── window-routes.ts       # 角色路由
    ├── window-schemas.ts      # 校验 schema
    └── window-types.ts        # 类型定义
```

## src/ — 渲染层代码

```
src/
├── renderer.ts                # 渲染层入口
└── renderer/
    ├── cache/                 # 缓存层
    ├── components/            # 组件库（Base/Fluent 双系列）
    ├── composables/           # 组合式函数
    ├── constants/             # 常量
    ├── layouts/               # 布局组件
    ├── pages/                 # 页面组件
    ├── router/                # 哈希路由
    ├── services/              # 渲染层服务客户端
    ├── stores/                # 状态管理
    ├── styles/                # 样式
    └── utils/                 # 工具函数
```

### src/renderer.ts

渲染层入口，执行 `initStores → initTheme → initApp → restoreSession → initLayoutResizeListener → createHashRouter → createApp.mount('#app')`。详见 [启动流程时序](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/docs/architecture/bootstrap-flow.md)。

### src/renderer/cache/

| 文件 | 职责 |
| --- | --- |
| `indexeddb-client.ts` | IndexedDB 客户端封装。 |
| `cache-store.ts` | 缓存存储。 |
| `cache-policy.ts` | 缓存策略（TTL 等）。 |
| `cache-cleaner.ts` | 定期清理过期缓存，由 `renderer.ts` 启动/停止。 |

### src/renderer/components/

双系列组件库：`Base*` 为基础语义组件，`Fluent*` 为 Fluent 风格组件，均基于 daisyUI + Tailwind。

| 子目录 | 职责 |
| --- | --- |
| `base/` | `BaseButton`/`BaseCard`/`BaseModal`/`BaseToast` 等基础组件与 `PageContainer`。 |
| `business/` | 业务组件：`PermissionGate`、`WindowPermissionGate`、`RouteViewWrapper`、`StatusBadge`。 |
| `data/` | 数据展示：`FluentTable`、`FluentPagination`、`FluentStatCard`、`FluentDescriptionList`。 |
| `form/` | 表单：`FormField`/`FormInput`/`FormSelect`/`FormSwitch`/`FormTextarea`/`SearchForm` 等。 |
| `layout/` | 布局构件：`AppHeader`/`AppSidebar`/`AppTabs`/`AppBreadcrumb`/`AppWindowControls`/`FluentPage` 等。 |
| `navigation/` | 导航：`FluentMenu`/`FluentBreadcrumb`/`FluentCommandBar`/`FluentCommandPalette`/`FluentTabs`。 |
| `table/` | 表格：`DataTable`/`DataTablePagination`/`DataTableToolbar`。 |

### src/renderer/composables/

组合式函数集合，覆盖窗口、权限、主题、菜单、缓存、IPC 请求、Toast、确认框等。关键文件：`useCurrentWindow.ts`、`useIpcRequest.ts`、`useOpenWindow.ts`、`usePermission.ts`、`useToast.ts`、`useTheme.ts`、`useXuanbingFile.ts`。

### src/renderer/constants/

`index.ts` 导出 `APP_INFO`、`ROUTE_PATHS` 等常量。

### src/renderer/layouts/

四种布局：`BasicLayout`、`BlankLayout`、`AuthLayout`、`WindowLayout`，由 `renderer.ts` 的 `resolveLayout` 根据 `route.meta.layout` 选择。

### src/renderer/pages/

页面组件：`DashboardPage`、`LoginPage`、`SettingsPage`、`SettingsProfilePage`、`SettingsSecurityPage`、`TaskCenterPage`、`TaskDetailPage`、`AboutPage`、`ComponentDemoPage`、`FluentUIDemoPage`，以及错误页 `ForbiddenPage`/`NotFoundPage`/`ServerErrorPage`。`index.ts` 导出 `PAGES` 映射。

### src/renderer/router/

| 文件 | 职责 |
| --- | --- |
| `index.ts` | `createHashRouter` 实现。 |
| `routes.ts` | 路由表。 |
| `guards.ts` | 路由守卫 `executeGuards`。 |
| `types.ts` | 路由类型 `CurrentRoute` 等。 |

### src/renderer/services/

渲染层服务客户端，封装 `window.desktop` 调用：`database.client.ts`、`setting.client.ts`、`task.client.ts`、`xuanbing-file.client.ts`。

### src/renderer/stores/

响应式状态管理（基于 Vue reactive）：`app`、`auth`、`permission`、`layout`、`window`、`tab`、`theme`、`menu`、`command`、`notification`、`ui`，`base.ts` 提供基类，`index.ts` 导出 `initStores`。

### src/renderer/styles/

CSS 样式：`index.css`（入口，含 daisyUI 编译产物）、`tokens.css`（设计 token）、`themes.css`、`fluent-theme.css`、`animations.css`、`transitions.css`、`scrollbar.css`。

### src/renderer/utils/

工具函数：`route.ts`（标题构建）、`permission.ts`、`menu.ts`/`menu-tree.ts`/`menu-filter.ts`、`icons.ts`、`animation.ts`、`error.ts`、`escapeHtml.ts`、`fluent-class.ts`。

## scripts/ — 构建脚本

| 文件 | 职责 |
| --- | --- |
| [build-renderer-bundle.js](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/scripts/build-renderer-bundle.js) | 自研 bundler：收集相对依赖、预编译 Vue 模板、输出 preload 与 renderer bundle。 |
| [rebuild-native.js](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/scripts/rebuild-native.js) | 针对 Electron/Node ABI 重编译 better-sqlite3 原生模块。 |
| `rebuild-native.test.js` | rebuild-native 的测试。 |

## test/ — 测试套件

使用 `node --test` 运行（需先 `rebuild:native:node`）。

| 子目录 | 职责 |
| --- | --- |
| `database/` | 数据库测试：`db-migrator-line-ending.test.js`、`xuanbing-importer.test.js`。 |
| `ipc/` | IPC 总线测试：`ipc-main-bus.test.js`。 |
| `renderer/` | 渲染层测试：`renderer-routing.test.js`。 |
| `windows/` | 窗口管理测试：`window-manager-behavior.test.js`。 |

## types/ — 全局类型补丁

| 文件 | 职责 |
| --- | --- |
| [node-shims.d.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/types/node-shims.d.ts) | Node 与运行时环境的类型补丁。 |

## docs/ — 文档体系

```
docs/
├── architecture/
│   ├── overview.md
│   ├── tech-stack.md
│   ├── directory-structure.md
│   └── bootstrap-flow.md
├── main-process/
│   └── entry.md
├── superpowers/
│   └── specs/
│       └── 2026-06-20-ipc-api-extension-guide.md
└── README.md
```

本文档体系位于 `docs/architecture/` 与 `docs/main-process/`。`docs/superpowers/specs/` 存放扩展规范（如 IPC API 扩展指南）。

## 相关文档

- [架构总览](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/docs/architecture/overview.md)
- [技术栈与依赖](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/docs/architecture/tech-stack.md)
- [启动流程时序](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/docs/architecture/bootstrap-flow.md)
- [主进程入口与生命周期](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/docs/main-process/entry.md)
