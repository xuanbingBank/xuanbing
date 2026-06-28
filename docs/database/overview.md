# 数据库层概览

xuanbing(All In One)桌面应用使用 SQLite 作为本地运行时存储,通过 better-sqlite3 + drizzle-orm 提供类型安全的数据访问。本文档概述数据库层的选型、分层架构、初始化流程与目录结构,作为后续迁移、备份恢复、Schema 文档的入口。

## 1. 技术选型

### 1.1 better-sqlite3 同步 API

- **同步执行,无回调地狱**:better-sqlite3 是 Node.js 下唯一同步 API 的 SQLite 绑定,Electron 主进程内的数据访问不需要 `async/await`,代码可读性高,事务边界清晰。
- **性能优势**:同步 API 在 V8 层面比异步绑定少一次事件循环调度,单条 SQL 执行开销低,适合桌面应用单机高频小查询场景。
- **单连接模型**:同步 API 天然串行化,配合单例连接避免 SQLite 多连接锁竞争(`SQLITE_BUSY`)。
- **WAL 模式兼容**:better-sqlite3 完整支持 `PRAGMA journal_mode = WAL`,读写并发性能优于 DELETE 模式。

### 1.2 drizzle-orm 类型安全 Schema

- **TypeScript 优先**:drizzle-orm 通过 `sqliteTable` 定义 schema,字段类型直接映射到 TS 类型,查询结果自动推导,无需手写 interface。
- **轻量无侵入**:drizzle-orm 不引入查询构造器运行时开销,最终生成的 SQL 与手写一致,便于排查。
- **migration 友好**:配合 drizzle-kit 生成 SQL migration 文件,版本可控。
- **schema 单点维护**:所有表 schema 集中在 `electron/database/schema/` 目录,详见 [schema.md](./schema.md)。

### 1.3 单文件 app.sqlite + WAL 模式

- **单文件存储**:数据库文件名固定为 `app.sqlite`(常量 `SQLITE_DB_FILENAME`),位于 `userData/app-data/db/` 目录,便于备份、迁移、清理。
- **WAL 模式**:启动时执行 `PRAGMA journal_mode = WAL`,写操作先写入 `-wal` 文件,读操作不阻塞写,显著提升并发性能。运行期间会产生 `app.sqlite-wal` 与 `app.sqlite-shm` 两个辅助文件。
- **PRAGMA 配置**(详见 [db-pragmas.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/db-pragmas.ts)):

| PRAGMA | 值 | 说明 |
|---|---|---|
| `journal_mode` | `WAL` | 写前日志模式,提升并发 |
| `synchronous` | `NORMAL` | WAL 模式下安全且快速的折中 |
| `foreign_keys` | `ON` | 启用外键约束 |
| `busy_timeout` | `5000` | 锁等待 5 秒,减少 `SQLITE_BUSY` |
| `temp_store` | `MEMORY` | 临时表存内存 |
| `cache_size` | `-20000` | 20MB 页缓存 |

## 2. 分层架构

数据库层严格按"连接 → 数据访问 → 业务逻辑 → IPC 暴露"分层,每层职责单一,下层不依赖上层。

```
┌─────────────────────────────────────────────┐
│  IPC 模块(electron/ipcBus/)                 │  对外暴露 channel,audit 标记
├─────────────────────────────────────────────┤
│  Services(electron/services/)               │  业务事务、审计、组合多 Repository
│   DatabaseService / TaskService / ...       │
├─────────────────────────────────────────────┤
│  Repositories(electron/repositories/)       │  单表 CRUD、分页、JSON 序列化
│   BaseRepository + 6 个具体 Repository      │
├─────────────────────────────────────────────┤
│  Database(electron/database/)               │  连接、PRAGMA、迁移、备份、健康
│   db-connection / db-path / db-migrator ... │
├─────────────────────────────────────────────┤
│  better-sqlite3 + drizzle-orm               │  底层驱动
└─────────────────────────────────────────────┘
```

### 2.1 连接层 db-connection

[db-connection.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/db-connection.ts) 维护单例 `activeConnection`:

- `openConnection(paths)`:首次调用创建 better-sqlite3 + drizzle 实例,重复调用返回同一实例,禁止多连接。
- `getConnection()`:获取活动连接,未初始化抛 `DB_NOT_INITIALIZED`。
- `getConnectionOrNull()`:同上但不抛错,用于 health check 等容忍场景。
- `closeConnection()` / `reconnectConnection(paths)`:关闭或重连。
- `isConnectionWritable()`:执行 `SELECT 1` 探活。
- `getDbFileSize()`:返回主库文件大小。
- `getPragmaSnapshot()`:读取当前 PRAGMA 值快照。
- `normalizeDbError(error, fallbackCode)`:将底层 `SQLITE_BUSY` 等错误归一为标准 `DbError`。

`DbConnection` 接口暴露 `raw`(better-sqlite3 原始实例,用于 PRAGMA / 原生 SQL)与 `drizzle`(drizzle-orm 实例,用于类型安全查询)两个句柄。

### 2.2 数据访问层 repositories

[base.repository.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/repositories/base.repository.ts) 提供通用能力:

- `db`:受保护 getter,返回 `getConnection().raw`。
- `paginate<TItem>(countSql, listSql, params, query)`:统一分页查询,内部计算 offset/limit、total、totalPages、hasMore。
- `buildSortSql(sort, allowedFields)`:白名单排序字段,防止 SQL 注入。
- 辅助函数:`serializeJson` / `deserializeJson` / `generateId` / `nowIso`。

6 个具体 Repository(详见 [index.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/repositories/index.ts)):

| Repository | 表 | 职责 |
|---|---|---|
| `TaskRepository` | `tasks` / `task_events` | 任务与事件流水 |
| `SettingRepository` | `app_settings` | 配置键值对 |
| `WindowStateRepository` | `window_states` | 窗口位置/大小/状态 |
| `LogRepository` | `app_logs` | 应用日志 |
| `AuditRepository` | `audit_logs` | 审计日志 |
| `FileAssetRepository` | `file_assets` | 文件素材元数据 |

Repository 只做单表数据访问,不包含业务逻辑,不写审计日志(审计由 Service 层负责)。

### 2.3 业务逻辑层 services

[services/](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/services/) 目录下 5 个 Service:

| Service | 职责 |
|---|---|
| `DatabaseService` | 健康检查、备份、恢复、统计、日志清理,所有操作写审计 |
| `SettingService` | 配置读写,update/delete 写审计 |
| `TaskService` | 任务创建/更新/查询/事件记录,事务内同时写 `tasks` + `task_events` + `audit_logs` |
| `WindowStateService` | 窗口状态持久化,无审计 |
| `XuanbingFileService` | `.xuanbing` 文件引用(token)管理、预览、校验、导出、导入,详见 [.xuanbing 文件文档](./../xuanbing-file/format.md) |

Service 层负责:
- 业务事务编排(通过 `runTransaction` 包裹多表写入)。
- 审计日志写入(写操作前查询 before,写操作后写 after)。
- 跨 Repository 组合。

### 2.4 IPC 暴露层

IPC 模块通过 `ipcBus` 把 Service 方法暴露给渲染层,所有写操作标记 `audit: true`,由 IPC 框架统一记录调用方信息。

## 3. 数据库初始化顺序

应用启动时按以下顺序初始化(任一步骤失败即中止启动):

1. **`resolveDbPaths(options)`**:解析所有路径并创建目录结构,返回 `DbPaths`。
2. **`openConnection(paths)`**:打开 better-sqlite3 连接,应用 PRAGMA,创建 drizzle 实例,存入单例。
3. **`runMigrations(paths)`**:加载 migration 文件,执行 pending 迁移,详见 [migrations.md](./migrations.md)。
4. **`seedDatabase(conn)`**(可选):插入默认配置(主题、seeded 标记)。

关键约束:
- renderer 不能传任意数据库路径,路径由 main 进程根据 `app.getPath('userData')` 解析。
- `workspaceId` 仅允许 `[a-zA-Z0-9_-]+`,防止路径穿越。
- 测试模式(`testMode: true`)使用 `os.tmpdir()` 下的随机临时目录,生产模式禁用 destructive reset。

## 4. dbPaths 目录结构

[resolveDbPaths](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/db-path.ts) 返回的 `DbPaths` 结构:

| 字段 | 路径示例(workspaceId=default) | 说明 |
|---|---|---|
| `rootDir` | `userData/app-data/default` | 工作区根目录 |
| `dbDir` | `…/default/db` | 数据库文件目录 |
| `dbFile` | `…/default/db/app.sqlite` | 主数据库文件 |
| `backupsDir` | `…/default/backups` | 备份目录 |
| `exportsDir` | `…/default/exports` | `.xuanbing` 导出目录 |
| `importsDir` | `…/default/imports` | `.xuanbing` 导入目录 |
| `fileDbDir` | `…/default/file-db` | 文件数据库工作目录 |
| `logsDir` | `…/default/logs` | 日志目录 |
| `workspaceId` | `default` | 工作区标识 |
| `testMode` | `false` | 是否测试模式 |

WAL 模式下 `dbFile` 同目录会产生 `app.sqlite-wal`、`app.sqlite-shm`,备份/恢复时需一并处理。所有目录在 `resolveDbPaths` 中通过 `ensureDir`(即 `fs.mkdirSync(recursive: true)`)创建。

辅助函数:
- `createBackupFileName(prefix='app')`:生成 `app-<ISO时间戳>.sqlite` 形式的备份文件名。
- `createExportFileName(name, ext)`:生成 `<safeName>-<ISO时间戳><ext>` 形式的导出文件名,名称中的非法字符替换为 `_`。

## 5. 错误处理

所有数据库错误统一通过 `throwDbError(code, message, options)` 抛出 `DbError`,包含:
- `code`:错误码(如 `DB_CONNECTION_FAILED` / `DB_LOCKED` / `DB_MIGRATION_FAILED`)。
- `retryable`:是否可重试。
- `severity`:`low` / `medium` / `high` / `critical`。
- `safeDetail`:可安全返回 renderer 的脱敏信息。
- `devDetail`:仅 main 进程日志的开发细节。
- `cause`:原始错误消息。

`normalizeDbError` 会识别 `SQLITE_BUSY` / `database is locked` 并映射为 `DB_LOCKED`(retryable=true),其余映射为兜底 `DB_QUERY_FAILED`。

## 6. 相关文档

- [migrations.md](./migrations.md):迁移系统、CRLF 归一化、hash 校验、迁移前备份。
- [backup-restore.md](./backup-restore.md):备份原子复制、恢复 pre-restore 安全机制、健康检查。
- [schema.md](./schema.md):全部表结构、字段、约束、索引、外键关系。

## 7. 关键源码索引

- 连接管理:[electron/database/db-connection.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/db-connection.ts)
- 路径解析:[electron/database/db-path.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/db-path.ts)
- PRAGMA 设置:[electron/database/db-pragmas.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/db-pragmas.ts)
- 基础层入口:[electron/database/index.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/index.ts)
- Repository 基类:[electron/repositories/base.repository.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/repositories/base.repository.ts)
- Service 入口:[electron/services/index.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/services/index.ts)
- 常量定义:[electron/ipcBus/shared/database/constants.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/shared/database/constants.ts)
