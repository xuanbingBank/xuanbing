# 迁移系统

xuanbing(All In One)桌面应用使用 SQL 文件式 migration 管理 schema 演进。本文档描述迁移运行器 [db-migrator.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/db-migrator.ts) 的核心逻辑、CRLF 归一化与 hash 校验机制、迁移前自动备份安全策略、失败回滚策略,以及对应回归测试。

## 1. 设计目标

- **跨平台 hash 一致性**:同一 migration 文件在 Windows(CRLF)与 Linux/macOS(LF)下生成相同 hash,避免跨平台检出后启动失败。
- **篡改检测**:已应用的 migration 若被修改,启动时必须报错阻止危险启动。
- **迁移前自动备份**:执行 pending migration 前自动备份数据库,失败可回滚。
- **生产环境禁止 destructive reset**:`resetTestDatabase` 仅在 `testMode=true` 时允许调用。
- **schema 版本追踪**:通过 `__schema_version` 表记录当前版本,便于 health check 比对。

## 2. 核心数据结构

### 2.1 MigrationFile

```ts
interface MigrationFile {
  name: string        // 文件名去掉 .sql 后缀,如 '0001_initial'
  filename: string    // 完整文件名,如 '0001_initial.sql'
  content: string     // 原始文件内容
  hash: string        // 归一化后的 SHA-256(用于记录与校验)
  rawHash: string     // 未归一化的 SHA-256(用于历史记录升级)
}
```

### 2.2 MigrationResult

```ts
interface MigrationResult {
  applied: string[]          // 本次新应用的 migration name 列表
  skipped: string[]          // 已应用被跳过的 migration name 列表
  schemaVersion: number      // 当前 schema 版本
  backupPath: string | null  // 迁移前备份路径(无 pending 则为 null)
}
```

### 2.3 系统表

迁移系统使用两张系统表(在 [0001_initial.sql](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/migrations/0001_initial.sql) 末尾定义,运行时由 `ensureMigrationTable` 保证存在):

- `__migrations`:`id` / `name`(UNIQUE) / `hash` / `applied_at`,记录已应用的 migration。
- `__schema_version`:`id`(固定为 1) / `version` / `updated_at`,记录当前 schema 版本号。

表名由常量 `MIGRATION_TABLE = '__migrations'`、`SCHEMA_VERSION_TABLE = '__schema_version'` 定义,见 [constants.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/shared/database/constants.ts)。

## 3. runMigrations 执行流程

[runMigrations(paths, options)](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/db-migrator.ts) 是迁移入口,步骤如下:

1. **加载 migration 文件**:`loadMigrationFiles()` 读取 `migrations` 目录下所有 `.sql` 文件,按文件名升序排序,逐个读取并计算 `hash` 与 `rawHash`。
2. **查询已应用 migration**:`getAppliedMigrations(conn)` 返回 `__migrations` 表中全部 `name` 集合。
3. **校验已应用 migration 的 hash**:`verifyAppliedMigrationHashes(conn, files)` 防止 migration 文件被篡改(详见第 5 节)。
4. **计算 pending 列表**:`files.filter(file => !applied.has(file.name))`。
5. **迁移前自动备份**(关键安全机制):
   - 仅当 `pending.length > 0` 且 `options.backup !== false` 时执行。
   - 调用 `backupDatabase(paths, { prefix: 'pre-migration' })` 生成 `pre-migration-<时间戳>.sqlite` 备份。
   - 备份路径写入 `MigrationResult.backupPath`,失败时也写入错误 `safeDetail`,便于定位备份用于回滚。
6. **逐个执行 pending migration**(每个 migration 独立事务):
   - 用 `conn.raw.transaction()` 包裹 `conn.raw.exec(file.content)` + `INSERT INTO __migrations (name, hash) VALUES (?, ?)`。
   - 事务保证 migration SQL 与记录原子写入:任一失败则该 migration 完全回滚。
   - 失败抛 `DB_MIGRATION_FAILED`(`severity: critical`、`retryable: false`),`safeDetail` 含 `migration` 名与 `backupPath`,**保留备份不删除**,需人工排查后从备份恢复。
7. **更新 schema 版本**:`runTransaction(() => setSchemaVersion(conn, CURRENT_SCHEMA_VERSION))`,单独事务写入 `__schema_version`。
8. **返回 MigrationResult**:`applied` / `skipped` / `schemaVersion` / `backupPath`。

### 3.1 单 migration 事务伪代码

```ts
const execMigration = conn.raw.transaction(() => {
  conn.raw.exec(file.content)                                    // 执行 DDL
  conn.raw.prepare('INSERT INTO __migrations (name, hash) VALUES (?, ?)').run(file.name, file.hash)
})
execMigration()
```

事务内同时执行 DDL 与记录写入,确保 `__migrations` 表中只有成功执行的 migration。

## 4. CRLF → LF 归一化与 hash 计算

### 4.1 为什么需要归一化

- Git 默认在 Windows 检出时把 LF 转为 CRLF(`core.autocrlf=true`),Linux/macOS 保持 LF。
- migration 文件若被 Git 跨平台检出,字节内容会不同,直接 SHA-256 会导致同一 migration 在不同平台生成不同 hash。
- `__migrations` 表中存储的 hash 与文件当前 hash 不一致时,`verifyAppliedMigrationHashes` 会误报篡改并阻止启动。

### 4.2 归一化实现

[normalizeMigrationHashContent(content)](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/db-migrator.ts) 将 `\r\n` 全部替换为 `\n`:

```ts
function normalizeMigrationHashContent(content: string): string {
  return content.replace(/\r\n/g, '\n')
}

function createMigrationHash(content: string): string {
  return createHash('sha256').update(normalizeMigrationHashContent(content)).digest('hex')
}
```

`loadMigrationFiles` 同时计算两个 hash:
- `hash`:归一化后的 SHA-256,作为 `__migrations` 表存储与校验依据。
- `rawHash`:未归一化的 SHA-256,仅用于历史记录升级(见 4.3)。

### 4.3 历史 raw hash 升级

`verifyAppliedMigrationHashes` 中的兼容逻辑:

```ts
if (stored !== undefined && stored === file.rawHash && stored !== file.hash) {
  updateAppliedMigrationHash(conn, file)  // 升级为规范化 hash
  continue
}
```

含义:若 `__migrations` 表中存储的 hash 等于当前文件的 `rawHash`(说明是旧版本未归一化时写入的),且不等于归一化后的 `hash`,则静默升级为规范化 hash,避免历史数据导致误报。仅当 stored 既不等于 rawHash 也不等于 hash 时才判定为篡改。

## 5. 篡改检测

`verifyAppliedMigrationHashes` 在 `runMigrations` 执行 pending 前调用,遍历当前 migration 文件,逐个与 `__migrations` 表中存储的 hash 比对:

- 文件 `hash` 与存储 hash 一致:正常。
- 存储 hash 等于文件 `rawHash` 且不等于 `hash`:升级为规范化 hash(见 4.3)。
- 存储 hash 既不等于 `hash` 也不等于 `rawHash`:抛 `DB_MIGRATION_FAILED`,`safeDetail: { reason: 'hash_mismatch', migration: file.name }`,`severity: critical`。

**已知限制**(源码 TODO 注释):仅遍历当前 files,无法发现"已应用但文件已被删除"的 migration,即 `__migrations` 表中存在但 migrations 目录已移除的记录会被静默忽略。

## 6. 0001_initial.sql 内容概览

[0001_initial.sql](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/migrations/0001_initial.sql) 是初始迁移,创建全部基础表结构与索引。详细字段见 [schema.md](./schema.md)。

涵盖的表:

| 表名 | 用途 |
|---|---|
| `app_settings` | 键值对配置 |
| `window_states` | 窗口状态 |
| `tasks` | 后台任务 |
| `task_events` | 任务事件流水(外键 `tasks.id` ON DELETE CASCADE) |
| `app_logs` | 应用日志 |
| `audit_logs` | 审计日志 |
| `file_assets` | 文件素材元数据 |
| `sync_outbox` | 待推送变更队列 |
| `sync_inbox` | 远程拉取变更队列 |
| `__migrations` | migration 记录 |
| `__schema_version` | schema 版本(`INSERT OR IGNORE` 初始化 version=1) |

索引:`tasks`(status/type/created_at)、`task_events`(task_id/created_at)、`app_logs`(level/scope/created_at)、`audit_logs`(actor/entity/action/created_at)、`file_assets`(sha256/category/deleted_at)、`sync_outbox`(status/entity)、`sync_inbox`(status/entity)。

## 7. 迁移失败回滚策略

### 7.1 单 migration 失败

- 该 migration 的事务自动回滚,`__migrations` 表不写入记录。
- 已成功执行的 prior migration 不受影响(每个 migration 独立事务)。
- 抛 `DB_MIGRATION_FAILED`,启动中止,**保留 pre-migration 备份不删除**。
- 人工排查后可从 `backupPath` 指向的备份恢复(详见 [backup-restore.md](./backup-restore.md))。

### 7.2 schema 版本不一致风险(已知 TODO)

源码注释指出:`setSchemaVersion` 与各 migration 的 INSERT 不在同一事务,若进程在 migration 全部执行后、`setSchemaVersion` 之前崩溃,可能出现 migration 已记录但 schema_version 未更新的不一致。后续考虑将 `setSchemaVersion` 合并进最后一个 migration 的事务内。

### 7.3 pre-migration 备份的作用

- 备份在 pending migration 执行前生成,代表迁移前的稳定状态。
- 备份路径写入 `MigrationResult.backupPath` 与错误 `safeDetail`,即使迁移失败也可从备份恢复。
- 备份不会因迁移失败被自动删除,需人工确认后清理。

## 8. seed 与 reset

### 8.1 seedDatabase(conn)

`seedDatabase` 在迁移后插入默认配置:
- 先 `SELECT COUNT(*) FROM app_settings WHERE namespace='system' AND key='seeded'` 判断是否已 seed。
- 通过 `runTransaction` 在事务内插入两条记录:`seeded=true`(system 标记)与 `theme=light`(ui 默认主题)。
- **已知 TODO**:存在 TOCTOU,多窗口并发首次启动可能重复写入(受主键约束会抛错回滚),后续可改为 `INSERT OR IGNORE`。

### 8.2 resetTestDatabase(paths)

- 仅当 `paths.testMode === true` 时允许调用,否则抛 `DB_VALIDATION_ERROR`(`severity: critical`)。
- 调用 `closeConnection()` 关闭连接。
- 删除 `dbFile` 及 `-wal` / `-shm` 侧车文件。
- **生产环境禁止调用**,作为 destructive 操作的硬约束。

## 9. 测试

### 9.1 CRLF/LF hash 一致性测试

[test/database/db-migrator-line-ending.test.js](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/test/database/db-migrator-line-ending.test.js) 验证归一化逻辑:

- 在 `os.tmpdir()` 下创建两个临时 migrations 目录,分别写入 LF 与 CRLF 换行的同一 migration 内容。
- 调用 `loadMigrationFiles(dir)` 加载,断言 `lfMigration.hash === crlfMigration.hash`。
- 测试加载编译产物 `dist/electron/database/db-migrator.js`,需先 `npm run build`。

### 9.2 测试要点

- 测试用 `node:test` 与 `node:assert/strict`,无需额外测试框架。
- 临时目录用 `fs.mkdtempSync(path.join(os.tmpdir(), 'xuanbing-migrations-'))` 创建,操作系统自动清理。
- 仅验证 hash 一致性,不实际执行 migration(避免依赖完整数据库环境)。

## 10. 关键源码索引

- 迁移运行器:[electron/database/db-migrator.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/db-migrator.ts)
- 初始 migration:[electron/database/migrations/0001_initial.sql](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/migrations/0001_initial.sql)
- 备份实现(迁移前备份调用):[electron/database/db-backup.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/db-backup.ts)
- 事务包装:[electron/database/db-transaction.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/db-transaction.ts)
- 常量(MIGRATION_TABLE / SCHEMA_VERSION_TABLE / CURRENT_SCHEMA_VERSION):[electron/ipcBus/shared/database/constants.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/shared/database/constants.ts)
- CRLF/LF hash 测试:[test/database/db-migrator-line-ending.test.js](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/test/database/db-migrator-line-ending.test.js)
