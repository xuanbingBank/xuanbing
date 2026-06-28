# 备份与恢复

xuanbing(All In One)桌面应用提供完整的数据库备份、恢复、健康检查、事务包装能力。本文档描述 [db-backup.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/db-backup.ts) 的原子复制与轮转策略、[db-restore.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/db-restore.ts) 的 **pre-restore backup 失败必须 abort** 关键安全机制、[db-health.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/db-health.ts) 的健康检查项,以及 [db-transaction.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/db-transaction.ts) 的事务包装。

## 1. 备份 db-backup.ts

### 1.1 备份流程

[backupDatabase(paths, options)](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/db-backup.ts) 同步执行以下步骤:

1. **生成备份文件名**:`createBackupFileName(prefix ?? 'app')` 生成 `app-<ISO时间戳>.sqlite` 形式,时间戳中 `:` 与 `.` 替换为 `-`,如 `app-2026-06-28T12-34-56-789Z.sqlite`。
2. **拼接备份路径**:`path.join(paths.backupsDir, backupName)`。
3. **确保备份目录存在**:`fs.mkdirSync(paths.backupsDir, { recursive: true })`。
4. **强制 WAL checkpoint**:`conn.raw.pragma('wal_checkpoint(TRUNCATE)')` 将 WAL 内容刷入主库,保证备份一致性。
5. **原子化复制**(关键):
   - 先复制到 `backupPath + '.tmp'`(`fs.copyFileSync`)。
   - `fsyncFile(tmpPath)` 打开 .tmp 文件 `fs.fsyncSync` 后关闭,确保数据落盘。
   - `fs.renameSync(tmpPath, backupPath)` 原子重命名。
   - 再次 `fsyncFile(backupPath)` 保证最终备份文件持久化。
   - 崩溃时只留 `.tmp` 文件,不污染目标备份。
6. **计算 SHA-256**:`fs.readFileSync(backupPath)` 全量读 + `createHash('sha256')`,作为备份完整性指纹。
7. **可选校验**:若 `options.verify === true`,以只读打开备份执行 `PRAGMA integrity_check`,失败抛 `DB_BACKUP_FAILED`。
8. **清理旧备份**:`cleanupOldBackups(paths, MAX_BACKUPS_TO_KEEP)` 保留最近 N 个。

### 1.2 MAX_BACKUPS_TO_KEEP 轮转策略

- 常量 `MAX_BACKUPS_TO_KEEP = 10`,定义于 [constants.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/shared/database/constants.ts)。
- `cleanupOldBackups(paths, keep)` 流程:
  1. 先扫描并删除 backupsDir 下所有 `.sqlite.tmp` 残留(原子复制未完成时遗留),不参与保留计数。
  2. 列出所有 `.sqlite` 文件,按 `mtimeMs` 降序排序。
  3. 保留前 `keep` 个,删除 `entries.slice(keep)` 中超出部分。
- 单个删除失败仅 `console.warn`,不中断整体清理。

### 1.3 备份命名规则

格式:`<prefix>-<ISO时间戳>.sqlite`

- `prefix` 默认 `'app'`,迁移前备份使用 `'pre-migration'`,恢复前备份使用 `'pre-restore'`。
- 时间戳取 `new Date().toISOString()`,`:` 与 `.` 全部替换为 `-`,避免 Windows 文件名非法字符。
- 示例:`pre-restore-2026-06-28T12-34-56-789Z.sqlite`。

### 1.4 备份结果 BackupResult

```ts
interface BackupResult {
  backupPath: string    // 备份绝对路径
  backupName: string    // 备份文件名
  size: number          // 文件大小(字节)
  sha256: string        // 备份内容 SHA-256
  createdAt: string     // 创建时间 ISO
}
```

### 1.5 列表与校验 API

- `listBackups(paths)`:列出 backupsDir 下所有 `.sqlite` 文件,返回 `{ name, path, size, createdAt }`,按 `createdAt` 降序。
- `getLatestBackupTime(paths)`:返回最近一次备份时间,无备份返回 `null`。
- `verifyBackup(backupPath)`:以 `readonly + fileMustExist` 打开备份,执行 `PRAGMA integrity_check`,结果为 `'ok'` 返回 true,异常返回 false。

### 1.6 已知限制(源码 TODO)

- 全程同步 IO(`copyFileSync` / `readFileSync` / `statSync`),大库会阻塞 Electron 主线程。后续建议移至 Worker 线程或改用 better-sqlite3 的 backup API 在独立连接上执行。

## 2. 恢复 db-restore.ts

### 2.1 关键安全机制:pre-restore backup 失败必须 abort

**这是数据库层最重要的安全约束,防止数据丢失。**

恢复流程会覆盖当前 `app.sqlite`,若不先备份当前库,恢复失败后原库已不可逆。因此 [restoreDatabase](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/db-restore.ts) 在覆盖前**必须**执行 pre-restore backup,且**备份失败必须中止恢复并抛错**,绝不继续覆盖原库。

源码硬约束:

```ts
if (backupBeforeRestore && fs.existsSync(paths.dbFile)) {
  try {
    const backup = backupDatabase(paths, { prefix: 'pre-restore' })
    preRestoreBackupPath = backup.backupPath
  } catch (backupError) {
    // 备份失败:中止恢复,避免覆盖原库后无法回滚导致数据丢失
    console.error('[db-restore] pre-restore backup failed, aborting restore:', backupError)
    throwDbError('DB_RESTORE_FAILED', 'Pre-restore backup failed, aborting restore to protect original database.', {
      retryable: false,
      severity: 'high',
      safeDetail: { reason: 'pre_restore_backup_failed' },
      devDetail: message,
      cause: message
    })
  }
}
```

**要点**:
- 即使原库已损坏,只要 `fs.existsSync(paths.dbFile)` 为真,就必须先备份(备份损坏库的副本用于取证)。
- 备份失败抛 `DB_RESTORE_FAILED`,`reason: 'pre_restore_backup_failed'`,`retryable: false`,**不会**进入后续覆盖逻辑。
- `backupBeforeRestore` 默认 `true`,仅在极端场景(如明确知道原库已无价值)才可由调用方传 `false` 关闭。

### 2.2 完整恢复流程

[restoreDatabase(paths, backupPath, options)](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/db-restore.ts) 步骤:

1. **校验备份文件存在**:`fs.existsSync(backupPath)` 为 false 抛 `DB_RESTORE_FAILED`,`reason: 'backup_not_found'`。
2. **pre-restore backup**(关键安全机制,见 2.1):备份失败立即 abort 抛错,不进入后续覆盖。
3. **关闭当前连接**:`closeConnection()`。
4. **清理 WAL/SHM**:删除 `dbFile + '-wal'` 与 `dbFile + '-shm'`,避免旧 WAL 影响新库。
5. **原子化覆盖**:`atomicCopyFileSync(backupPath, paths.dbFile)`(先写 `.tmp` 再 `rename`)。
6. **重新打开连接**:`openConnection(paths)`。
7. **health check**(可选,默认开启):`checkHealth(paths)`,失败则进入回滚分支(见 2.3)。
8. **复位连接不可用标记**:`restoreConnectionUnavailable = false`。
9. **返回 RestoreResult**:`{ success, restoredFrom, preRestoreBackupPath, healthReport, restoredAt }`。

### 2.3 恢复失败的处理

恢复过程中可能出现两类失败,处理策略不同:

**a) try 块内的非健康检查异常**(如 openConnection 失败、文件复制失败):
- 若存在 `preRestoreBackupPath`,调用 `rollbackRestore(paths, preRestoreBackupPath)` 回滚到恢复前状态。
- 回滚失败则置 `restoreConnectionUnavailable = true`,显式标记连接不可用,**不静默吞错**,避免应用进入无连接状态。
- 抛 `DB_RESTORE_FAILED`,`reason: 'restore_failed'`,`safeDetail` 含 `preRestoreBackupPath`。

**b) health check 失败**(try 块外统一处理):
- 若存在 `preRestoreBackupPath`,调用 `rollbackRestore` 回滚。
- 回滚失败同样置 `restoreConnectionUnavailable = true`。
- 抛 `DB_RESTORE_FAILED`,`reason: 'health_check_failed'`,`safeDetail.issues` 含健康检查问题列表。

### 2.4 rollbackRestore 私有实现

```ts
function rollbackRestore(paths: DbPaths, backupPath: string): void {
  closeConnection()
  for (const suffix of ['', '-wal', '-shm']) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)  // 清理 dbFile 及侧车
  }
  atomicCopyFileSync(backupPath, paths.dbFile)            // 原子覆盖
  openConnection(paths)
}
```

回滚用 pre-restore backup 替换当前库,流程与恢复一致,确保回滚本身也是原子操作。

### 2.5 连接不可用标记

- `restoreConnectionUnavailable`:模块级标记,初始 `false`。
- `rollbackRestore` 失败时置 `true`,调用方据此感知连接已失效。
- 恢复成功后复位为 `false`。
- `isRestoreConnectionUnavailable()` 公开查询接口,供 IPC 层判断是否需要触发应用退出或重新初始化。

### 2.6 RestoreOptions

```ts
interface RestoreOptions {
  backupBeforeRestore?: boolean  // 默认 true,关闭即跳过 pre-restore backup(危险)
  verifyAfterRestore?: boolean   // 默认 true,恢复后执行 health check
}
```

### 2.7 辅助 API

- `vacuumDatabase()`:`VACUUM` 回收空间,成功返回 true,失败 `console.warn` 返回 false。
- `clearOldLogs(beforeTimestamp)`:事务内删除 `app_logs` 与 `audit_logs` 中 `created_at < beforeTimestamp` 的记录,返回总删除行数。
- `clearAllLogs()`:事务内清空 `app_logs` 与 `audit_logs`,返回总删除行数。

## 3. 健康检查 db-health.ts

[checkHealth(paths, options)](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/db-health.ts) 返回 `DbHealthReport`,涵盖 8 项检查:

| 检查项 | 字段 | 说明 |
|---|---|---|
| 文件存在 | `dbExists` | `fs.existsSync(paths.dbFile)` |
| 可读写 | `writable` | `SELECT 1` 探活 |
| PRAGMA 正确 | `pragmaOk` / `pragmaIssues` | `validatePragmas` 比对期望值 |
| 迁移最新 | `migrationLatest` / `pendingMigrations` | `hasPendingMigrations()` |
| schema 版本 | `schemaVersion` / `expectedSchemaVersion` | 与 `CURRENT_SCHEMA_VERSION` 比对 |
| WAL 启用 | `walEnabled` | `journal_mode === 'wal'` |
| 文件大小 | `dbFileSize` | `getDbFileSize()` |
| 最近备份 | `latestBackupTime` | `getLatestBackupTime(paths)` |
| 完整性 | `integrityCheck` | `PRAGMA integrity_check`(可通过 `options.integrityCheck=false` 跳过) |

`healthy` 为 `true` 当且仅当 `issues.length === 0`。`issues` 数组累积所有问题,便于一次性展示。

### 3.1 getDatabaseStats

`getDatabaseStats()` 遍历硬编码白名单表名(`app_settings` / `window_states` / `tasks` / `task_events` / `app_logs` / `audit_logs` / `file_assets` / `sync_outbox` / `sync_inbox`),执行 `SELECT COUNT(*) as c FROM <table>`,返回 `Record<string, number>`。表名来自硬编码白名单,无注入风险。失败表返回 `-1`。

## 4. 事务包装 db-transaction.ts

[db-transaction.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/db-transaction.ts) 提供 `runTransaction<T>(fn)`:

- 通过 `conn.raw.transaction(fn)` 创建 better-sqlite3 事务函数,传入 `conn.raw` 作为事务上下文 `tx`。
- `fn` 内任何抛错自动回滚整个事务。
- 失败通过 `normalizeDbError` 归一后 `throwDbError` 抛出,错误码兜底 `DB_TRANSACTION_FAILED`。
- 返回 `fn` 的返回值。

### 4.1 重要约束:事务内禁止 await

`runInTransaction` 等价于 `runTransaction`,源码注释明确:**better-sqlite3 事务是同步的,事务体内不支持 `await`**。若 `fn` 返回 Promise,事务会在 Promise resolve 前就提交,无法保证原子性。如需异步操作(如读取文件),应在事务外准备数据,事务内仅做同步写入。

### 4.2 使用示例

```ts
// Service 层典型用法:事务内同时写 tasks + task_events + audit_logs
runTransaction((tx) => {
  tx.prepare('INSERT INTO tasks ...').run(...)
  tx.prepare('INSERT INTO task_events ...').run(...)
  tx.prepare('INSERT INTO audit_logs ...').run(...)
})
```

## 5. Service 层包装

[DatabaseService](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/services/database.service.ts) 在备份/恢复/清理之上增加审计日志:

| 方法 | 调用 | 审计 action |
|---|---|---|
| `getHealth()` | `checkHealth(paths)` | 无(只读) |
| `getStats()` | `getDatabaseStats()` | 无(只读) |
| `backup(prefix?)` | `backupDatabase(paths, { prefix })` | `'backup'` |
| `listBackups()` | `listBackups(paths)` | 无(只读) |
| `verifyBackup(path)` | `verifyBackup(path)` | 无(只读) |
| `restore(path, options?)` | `restoreDatabase(paths, path, options)` | `'restore-db'` |
| `vacuum()` | `vacuumDatabase()` | 无(运维) |
| `clearLogs()` | `clearAllLogs()` | 无(运维) |
| `clearOldLogs(before)` | `clearOldLogs(before)` | 无(运维) |

审计日志通过 `AuditRepository.create` 写入,`entityType: 'database'`,`entityId: paths.dbFile`,含 `backupPath` / `size` / `sha256` 等元数据。

## 6. IPC 通道

数据库运维相关的 IPC 通道(均标记 `audit: true`,由 IPC 框架记录调用方):

| 通道 | 对应 Service 方法 | 审计 |
|---|---|---|
| `database:backup` | `DatabaseService.backup` | 是 |
| `database:restore` | `DatabaseService.restore` | 是 |
| `database:health` | `DatabaseService.getHealth` | 是(只读也记录,便于追踪健康检查调用) |
| `database:stats` | `DatabaseService.getStats` | 是 |
| `database:vacuum` | `DatabaseService.vacuum` | 是 |
| `database:clearLogs` | `DatabaseService.clearLogs` | 是 |

## 7. 关键源码索引

- 备份:[electron/database/db-backup.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/db-backup.ts)
- 恢复:[electron/database/db-restore.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/db-restore.ts)
- 健康检查:[electron/database/db-health.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/db-health.ts)
- 事务包装:[electron/database/db-transaction.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/db-transaction.ts)
- PRAGMA 校验:[electron/database/db-pragmas.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/db-pragmas.ts)
- 数据库服务:[electron/services/database.service.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/services/database.service.ts)
- 常量(MAX_BACKUPS_TO_KEEP):[electron/ipcBus/shared/database/constants.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/shared/database/constants.ts)
