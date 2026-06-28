# 读写 · 校验 · 安全

本文档描述 `.xuanbing` 文件的写入流程、读取流程、校验机制、原子写入、路径穿越防护,以及导入导出的完整安全策略。文件格式定义详见 [format.md](./format.md)。

## 1. 写入流程 xuanbing-file-writer.ts

[xuanbing-file-writer.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/xuanbing-file-writer.ts) 提供 3 个函数:

### 1.1 buildXuanbingFile(params)

构建 `XuanbingFile` 对象(不写盘),自动计算 checksum:

1. 取当前 ISO 时间作为 `createdAt` 与 `updatedAt`。
2. 调用 [computeChecksum](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/xuanbing-file-checksum.ts) 计算 `formatVersion + type + schemaVersion + metadata + payload` 的 SHA-256。
3. 填充 `magic = XUANBING_MAGIC`、`formatVersion = XUANBING_FORMAT_VERSION`(均为常量)。
4. 返回完整 `XuanbingFile` 对象。

### 1.2 writeXuanbingFile(filePath, file)

将 `XuanbingFile` 对象写入磁盘:

1. `JSON.stringify(file, null, 2)` 格式化为 2 空格缩进的 UTF-8 文本。
2. 调用 [atomicWriteFile](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/atomic-write.ts) 原子写入(详见第 4 节)。

### 1.3 createAndWriteXuanbingFile(filePath, params)

组合 `buildXuanbingFile` + `writeXuanbingFile`,一步完成构造与写入,返回写入的文件对象。

### 1.4 写入流程图

```
buildXuanbingFile
   │
   ├─ 取当前时间 → createdAt / updatedAt
   ├─ computeChecksum(formatVersion, type, schemaVersion, metadata, payload)
   │     ├─ stableStringify(顶层键排序)
   │     └─ sha256 → "sha256:<hex>"
   └─ 组装 { magic, formatVersion, type, appVersion, schemaVersion, createdAt, updatedAt, metadata, payload, checksum }
         │
         ▼
writeXuanbingFile
   │
   ├─ JSON.stringify(file, null, 2)
   └─ atomicWriteFile(filePath, content)
         ├─ 写 .tmp → fsync → rename(详见第 4 节)
         └─ 失败清理 .tmp
```

## 2. 读取流程 xuanbing-file-reader.ts

[readXuanbingFile(filePath)](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/xuanbing-file-reader.ts) 严格按 7 步校验:

1. **校验扩展名**:[ensureXuanbingExtension](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/safe-file-path.ts) 确保扩展名为 `.xuanbing`,否则抛 `XUANBING_FILE_INVALID`,`reason: 'invalid_extension'`。
2. **校验文件大小**:`ensureFileSize(filePath, XUANBING_MAX_FILE_BYTES)`,超 10MB 抛 `XUANBING_FILE_TOO_LARGE`。
3. **拒绝符号链接**:`fs.lstatSync` 不跟随符号链接,若为 symlink 抛 `XUANBING_FILE_PATH_FORBIDDEN`,`reason: 'symlink_not_allowed'`(避免通过 symlink 绕过路径校验)。
4. **读取并解析 JSON**:
   - `fs.readFileSync(filePath, 'utf8')` 整读。
   - **读后再次校验长度**:防止 `ensureFileSize` 与 `readFileSync` 之间发生 TOCTOU(文件被追加写入超过限制),超限抛 `XUANBING_FILE_TOO_LARGE`,`reason: 'too_large_toctou'`。
   - `JSON.parse(rawContent)`,失败抛 `XUANBING_FILE_INVALID`,`reason: 'invalid_json'`。
5. **校验 magic**:解析结果非对象抛 `not_object`;`magic !== XUANBING_MAGIC` 抛 `invalid_magic`(在完整 schema 校验前快速失败)。
6. **Zod schema 校验**:[validateXuanbingFile](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/xuanbing-file.schema.ts) `safeParse`,失败抛 `XUANBING_FILE_SCHEMA_FAILED`,含 issues 列表。
7. **校验 formatVersion**:
   - `> XUANBING_FORMAT_VERSION` 抛 `XUANBING_FILE_VERSION_UNSUPPORTED`,`reason: 'unsupported_format_version'`。
   - `< XUANBING_MIN_SUPPORTED_VERSION`(=1)抛同上,`reason` 含 min。
8. **校验 checksum**:[verifyChecksum](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/xuanbing-file-checksum.ts) 重算并比对,失败抛 `XUANBING_FILE_CHECKSUM_FAILED`(`severity: high`)。

### 2.1 readXuanbingFilePreview

[readXuanbingFilePreview(filePath)](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/xuanbing-file-reader.ts) 返回不含敏感 payload 的预览:

- 调用 `readXuanbingFile` 完整校验。
- 计算 `payloadSize`:`new TextEncoder().encode(JSON.stringify(file.payload)).length`。
- 返回 `{ fileType, formatVersion, schemaVersion, appVersion, metadata, createdAt, updatedAt, checksum, payloadSize, valid }`,**不返回 payload 本身**,防止渲染层预览时意外暴露数据。

### 2.2 已知限制(源码 TODO)

- 大文件读取为 `readFileSync` 整读 + `JSON.parse`,会产生 2-5 倍内存膨胀。`XUANBING_MAX_FILE_BYTES` 已降至 10MB 限制峰值内存,流式落地后可放宽。

## 3. 校验机制 xuanbing-file-validator.ts

[xuanbing-file-validator.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/xuanbing-file-validator.ts) 提供独立校验入口,**不读取文件**,仅校验内存中的文件对象:

### 3.1 validateFile(data)

返回 `{ valid: boolean, errors: string[] }`,不抛异常:

1. **快速 magic 校验**:非对象直接返回 invalid;`magic !== XUANBING_MAGIC` 记录错误。
2. **Zod schema 校验**:`validateXuanbingFile(data)`,失败记录所有 issues。
3. **formatVersion 校验**:`> XUANBING_FORMAT_VERSION` 记录错误。
4. **checksum 校验**:`verifyChecksum(file)` 失败记录错误。
5. 返回 `valid = errors.length === 0`。

### 3.2 validateFileOrThrow(data)

调用 `validateFile`,失败抛 `XUANBING_FILE_SCHEMA_FAILED`,`safeDetail.errors` 含全部错误列表。

### 3.3 三重校验总结

`.xuanbing` 文件经过三重独立校验:

| 校验层 | 校验项 | 时机 |
|---|---|---|
| magic | 字符串字面量 `XUANBING_FILE_DB` | 读取快速失败 + Zod literal |
| checksum | SHA-256 覆盖核心字段 | 读取 + validateFile |
| 10MB 限制 | stat + 读后 byteLength 双重校验 | 读取前 + 读取后(TOCTOU 防护) |

### 3.4 安全说明

- **checksum 为无密钥 SHA-256,仅防意外损坏,不防恶意篡改**。攻击者可重新计算 checksum 覆盖原值。
- **appVersion 未纳入 checksum**,文件可伪造 appVersion 声称来自任意应用版本而不被发现。
- 如需防篡改应改用 HMAC + 密钥签名(源码 TODO)。

## 4. atomic-write.ts 原子写入

[atomicWriteFile(targetPath, content, options)](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/atomic-write.ts) 防**写入中断导致文件损坏**:

### 4.1 流程

1. **生成临时文件名**:`.tmp-<randomUUID>-<basename>`,与目标同目录(确保同文件系统,rename 原子)。
2. **拒绝符号链接目标**:`fs.lstatSync(targetPath)`,若为 symlink 抛错(避免写入跟随 symlink 覆盖链接目标,绕过路径校验)。dest 不存在属正常,仅对真实错误抛出。
3. **写入临时文件**:`fs.writeFileSync(tempPath, content, 'utf8')`。
4. **fsync 临时文件**(可选,默认开启):`fs.openSync` + `fs.fsyncSync` + `fs.closeSync`,确保数据落盘。
5. **fsync 父目录**(Linux/macOS):`fs.openSync(dir, 'r')` + `fs.fsyncSync`,确保临时文件目录项与 rename 操作持久化。**Windows 不支持以 'r' 打开目录**,跳过。
6. **rename 到目标**:`renameWithRetry(tempPath, targetPath)`(详见 4.2)。
7. **失败清理**:任何步骤抛错则 `fs.unlinkSync(tempPath)` 删除临时文件,再抛 `XUANBING_FILE_WRITE_FAILED`(`retryable: true`,`severity: high`)。

### 4.2 renameWithRetry(Windows EPERM 重试)

Windows 下 `fs.renameSync` 偶发 `EPERM`(目标被其他进程占用),`renameWithRetry` 自动重试:

- 最多 2 次尝试。
- 第 1 次失败若 `code === 'EPERM'`,`sleepSync(20)` 退避后重试。
- 第 2 次失败直接抛错。
- `sleepSync` 为 busy-wait(阻塞主线程),单次 20ms,影响可控。TODO:重构为异步流程。

### 4.3 崩溃语义

- 写入 `.tmp` 后崩溃:`.tmp` 残留,目标文件保持旧内容(或不存在),**不污染目标**。
- rename 后崩溃:目标已是新内容,`.tmp` 已不存在,数据一致。
- 启动期由 [XuanbingFileService](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/services/xuanbing-file.service.ts) 的 `cleanupTmpFiles` 扫描删除 `.tmp-*` 残留(详见第 7 节)。

## 5. safe-file-path.ts 路径穿越防护

[safe-file-path.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/safe-file-path.ts) 提供 5 个安全校验函数:

### 5.1 ensurePathWithinDir(targetPath, baseDir)

防止路径穿越(如 `../../etc/passwd`):

1. `path.resolve` 解析为绝对路径。
2. Windows 处理:剥离 `\\?\` 长路径前缀(`path.resolve` 不会剥离,影响 `startsWith` 比较)。
3. 大小写归一化:Windows 文件系统大小写不敏感,转小写后比较。
4. 校验 `normalizedTarget` 等于 `normalizedBase` 或以 `normalizedBase + path.sep` 开头。
5. 不满足抛 `XUANBING_FILE_PATH_FORBIDDEN`,`reason: 'path_traversal'`,`severity: high`。

### 5.2 ensureXuanbingExtension(filePath)

`path.extname(filePath).toLowerCase() !== '.xuanbing'` 抛 `XUANBING_FILE_INVALID`,`reason: 'invalid_extension'`。

### 5.3 ensureFileSize(filePath, maxBytes)

- `fs.statSync(filePath).size > maxBytes` 抛 `XUANBING_FILE_TOO_LARGE`,`reason: 'too_large'`,含 size 与 maxBytes。
- 文件不存在抛 `XUANBING_FILE_INVALID`,`reason: 'file_not_found'`。

### 5.4 ensureNotDatabaseFile(filePath, dbFile)

**禁止覆盖主数据库文件及其侧车文件**:

- 归一化为小写绝对路径。
- 检查 target 是否等于 `dbFile + ['', '-wal', '-shm', '-journal']` 中任一。
- 命中抛 `XUANBING_FILE_PATH_FORBIDDEN`,`reason: 'overwrite_database'`,`severity: critical`。

### 5.5 sanitizeFileName(name)

生成安全文件名:

1. 替换 `[^a-zA-Z0-9._-]` 为 `_`。
2. 空字符串或纯点号(`...` / `.`)替换为 `untitled`(避免 Windows 保留名混淆)。
3. 剥离尾部点号与空格(Windows 文件系统会截断,导致 `CON.` 绕过保留名检查)。
4. 屏蔽 Windows 保留设备名(`CON`/`PRN`/`AUX`/`NUL`/`COM1-9`/`LPT1-9`,含带扩展名形式),前置下划线。
5. 长度限制 200(NTFS 255,留余量给扩展名)。

## 6. 导入流程 xuanbing-file-importer.ts

[xuanbing-file-importer.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/xuanbing-file-importer.ts) 实现 dryRun + 正式导入两阶段模型。

### 6.1 dryRunImport(filePath, fileRef, conflictStrategy)

生成导入计划,不写库:

1. `readXuanbingFile(filePath)` 完整校验文件。
2. 校验 `file.type === 'task-export'`,其余类型抛 `unsupported_type`。
3. `assertTaskExportPayload(file.payload)` 运行时校验 payload 结构(tasks 必须为数组,events 可选)。
4. 逐个任务调用 `computeAction(task, conflictStrategy, taskRepo)` 计算动作。
5. 汇总 `summary`:create/update/skip/conflict/error/total。
6. 返回 `ImportPlan`,含 `dryRunChecksum = file.checksum`(绑定 plan 与文件状态)。

### 6.2 4 种冲突策略 + fail

`computeAction` 根据 `conflictStrategy` 与已存在任务计算动作:

| 策略 | 已存在任务动作 | 不存在任务动作 | 说明 |
|---|---|---|---|
| `skip` | `skip`(reason: already exists) | `create` | 跳过冲突,保留本地 |
| `overwrite` | `update`(reason: overwrite) | `create` | 全量覆盖本地 |
| `rename` | `create`(reason: renamed from <id>) | `create` | 生成新 ID 创建副本 |
| `merge` | `update`(reason: merge) | `create` | **当前实为全量覆盖,非字段级合并**(TODO) |
| `fail` | `conflict`(reason: conflict, strategy=fail) | `create` | 冲突即报错 |

### 6.3 importPackage(filePath, plan)

正式导入,事务执行,失败回滚:

1. `readXuanbingFile(filePath)` 重新校验文件。
2. `assertTaskExportPayload(file.payload)` 校验 payload。
3. **plan checksum 绑定**:`plan.dryRunChecksum !== file.checksum` 抛 `plan_checksum_mismatch`(`severity: high`),说明 dryRun 后文件被替换/篡改。
4. **服务端重算 action 防篡改**(关键安全机制):
   - 逐个 `plan.items` 调用 `computeAction(task, plan.conflictStrategy, taskRepo)` 重新计算 expected action。
   - `expected.action !== item.action` 抛 `plan_item_action_mismatch`(`severity: high`),含 key/expected/actual。
   - plan 中存在 payload 里没有的 key 抛 `plan_item_key_not_in_payload`(疑似篡改)。
   - 执行阶段使用**重算后的** `recomputedItems`,而非 renderer 传入的 `plan.items`,避免伪造的 reason 等字段影响导入行为。
5. **事务执行**:`runTransaction((tx) => { ... })`:
   - `skip` / `conflict`:跳过,`skipped++`。
   - `create`:
     - rename 策略生成新 ID:`${task.id}-imported-${Date.now()}`,若新 ID 冲突追加随机后缀。
     - `INSERT INTO tasks ...` 插入任务。
     - 关联事件:`INSERT INTO task_events ...`,**rename 时同步重写事件 ID**(详见第 9 节测试)。
     - `imported++`。
   - `update`:`UPDATE tasks SET ...`(全量覆盖,非字段级合并),`imported++`。
6. **失败回滚**:事务抛错则整体回滚,返回 `{ success: false, imported: 0, skipped, errors: [{key:'__transaction__', message}], rolledBack: true }`(注意:此处 return 而非 throw,向调用方返回结构化失败结果)。
7. 成功返回 `{ success: true, imported, skipped, errors, rolledBack: false, importedAt }`。

### 6.4 token 机制(防路径暴露)

[XuanbingFileService](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/services/xuanbing-file.service.ts) 实现 token 机制:

- **renderer 不直接持有文件路径**,通过 dialog 选择文件后由 main 进程生成 `XuanbingFileRef`。
- `registerFileRef(filePath, mode)`:
  - 校验扩展名 + 非数据库文件。
  - 生成 `token = randomUUID()`。
  - 记录 `FileRefRecord = { token, filePath, displayName, size, expiresAt, mode }`。
  - `expiresAt = Date.now() + 5 * 60 * 1000`(**5 分钟过期**)。
  - 返回 `XuanbingFileRef = { token, displayName, size, expiresAt }`(不含 filePath)。
- `resolveRef(token, expectedMode)`:内部解析 token 为 filePath:
  - token 不存在抛 `ref_not_found`。
  - 过期抛 `ref_expired` 并删除记录。
  - mode 不匹配抛 `mode_mismatch`。
- **公开方法**(供 IPC 层调用):
  - `readPreview(fileRef)`:解析 token → `readXuanbingFilePreview`。
  - `validate(fileRef)`:解析 token → `readXuanbingFile` → `validateFile`。
  - `dryRunImport(fileRef, conflictStrategy)`:解析 token → `dryRunImport`。
  - `importPackage(fileRef, plan)`:解析 token → `importPackage` + 审计。
  - `resolveFilePath(token, expectedMode)`:直接返回 filePath(供需要路径的 IPC 使用)。
- **过期回收**:`setInterval` 每 5 分钟清理过期 ref,`unref` 不阻止进程退出。
- **撤销**:`revokeRef(token)` 主动删除。
- **dispose**:`before-quit` 时调用,清理定时器。

### 6.5 启动期 .tmp 残留清理

`XuanbingFileService` 构造时(进程内首次实例化)调用 `cleanupTmpFiles(userDataDir)`:

- 扫描 userData 顶层(非递归)与已知子目录(db/backups/exports/imports/file-db/logs,递归清理含 app-data 层,深度限制 3)。
- 删除以 `.tmp-` 开头的文件(atomicWriteFile 异常退出残留)。
- 单文件清理失败忽略,不阻断启动。
- 仅执行一次(`tmpCleanupDone` 标记)。

## 7. 导出流程 xuanbing-file-exporter.ts

[xuanbing-file-exporter.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/xuanbing-file-exporter.ts) 提供同步与异步两个入口。

### 7.1 exportPackage(type, options)(同步)

1. **收集数据**:
   - `task-export`:`collectTaskExportData(filter, redact)`,分页读取 tasks(每页 200)与关联 events,事务包裹保证快照一致。
   - 其余类型:`payload = {}`。
2. **构建文件名**:`sanitizeFileName(options.fileName ?? 'export-<type>') + '.xuanbing'`。
3. **安全校验**:`ensurePathWithinDir` + `ensureXuanbingExtension`。
4. **构建元数据**:默认值 `name=baseName`、`description=''`、`author='local'`、`tags=[]`。
5. **写入**:`createAndWriteXuanbingFile(outputPath, { type, appVersion, schemaVersion: CURRENT_SCHEMA_VERSION, metadata, payload })`。
6. **统计大小**:`fs.statSync(outputPath).size`。
7. 返回 `ExportFileResult = { filePath, fileName, size, checksum, fileType, exportedAt }`。

**注意**:同步版未走 `withPathLock`,无法串行化同一路径并发写入,调用方需自行避免并发。

### 7.2 exportToPath(filePath, type, appVersion, metadata, redact, allowedDir)(异步)

供 saveDialog 后写入:

1. `ensureXuanbingExtension(filePath)`。
2. `ensurePathWithinDir(filePath, allowedDir)`(由调用方传入允许目录,避免 file-db 层直接依赖 electron)。
3. `withPathLock(filePath, fn)` 路径级并发锁,串行化同一路径并发写入:
   - `pathLocks: Map<string, Promise<void>>` 维护每路径的 Promise 链。
   - `await prev` 等待前一个写入完成,`fn()` 执行当前写入,`release()` 释放。
4. `collectTaskExportData(undefined, redact)` 收集数据(当前未传 filter,导出全量)。
5. `createAndWriteXuanbingFile` 写入。
6. 返回 `ExportFileResult`。

### 7.3 collectTaskExportData

- `runInTransaction` 包裹,保证 tasks 与 events 为同一时刻快照,避免分页过程中其他写入导致不一致。
- 分页读取 tasks(pageSize=200),逐任务读取关联 events。
- `redact=true` 时 `input` / `output` / event `payload` 置为 `null`(脱敏)。
- 超过 `pageSize * 10`(2000)条任务 `console.warn` 提示。

### 7.4 XuanbingFileService.exportPackage

Service 层包装:

1. `ensureXuanbingExtension` + `ensureNotDatabaseFile`。
2. **限制导出路径必须在允许的目录内**:`allowedDirs = [app.getPath('userData'), app.getPath('downloads')]`,逐个 `ensurePathWithinDir` 尝试,均不匹配抛 `outside_allowed_dirs`。
3. 调用 `exportToPath(filePath, type, this.appVersion, metadata, redact, matchedDir)`。
4. 写审计:`action: 'export'`,`entityType: 'xuanbing-file'`,含 fileType/size/checksum。
5. `registerFileRef(filePath, 'read')` 返回 fileRef 供后续读取/校验。

## 8. 安全机制总结

| 威胁 | 防护措施 |
|---|---|
| 路径穿越(`../../etc/passwd`) | `ensurePathWithinDir` resolve + 大小写归一化 + 前缀校验 |
| 覆盖主数据库文件 | `ensureNotDatabaseFile` 检查 dbFile + -wal/-shm/-journal |
| 符号链接绕过 | 读取 `lstatSync` 拒绝 symlink,写入 `lstatSync` 拒绝 symlink 目标 |
| 文件大小 DoS | `ensureFileSize` stat + 读后 byteLength 双重校验(TOCTOU 防护) |
| magic 伪造 | Zod `z.literal(XUANBING_MAGIC)` + 读取快速失败 |
| checksum 篡改 | SHA-256 校验(注:不防恶意篡改,仅防意外损坏) |
| formatVersion 不兼容 | 上下界校验,超范围拒绝读取 |
| payload 结构异常 | Zod schema + importer 运行时 `assertTaskExportPayload` |
| 渲染层路径暴露 | token 机制(5 分钟过期,不返回 filePath) |
| plan 篡改(action/reason) | 服务端 `computeAction` 重算,不一致拒绝整个导入 |
| plan 与文件状态脱节 | `dryRunChecksum` 比对,文件被替换/篡改即拒绝 |
| 写入中断损坏 | `atomicWriteFile` temp → fsync → rename |
| Windows rename EPERM | `renameWithRetry` 2 次重试,20ms 退避 |
| 导入冲突数据丢失 | dryRun 预览 + 4 种冲突策略 + 事务回滚 |
| .tmp 残留累积 | 启动期 `cleanupTmpFiles` 扫描删除 |
| 导出路径越界 | `allowedDirs` 白名单(userData / downloads) |
| Windows 保留设备名 | `sanitizeFileName` 屏蔽 CON/PRN/AUX/NUL/COM*/LPT* |

## 9. 测试

### 9.1 rename 事件 ID 一致性测试

[test/database/xuanbing-importer.test.js](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/test/database/xuanbing-importer.test.js) 验证 rename 策略下事件 ID 同步重写:

- 读取 [xuanbing-file-importer.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/xuanbing-file-importer.ts) 源码文本。
- 断言源码包含 `const eventId =` 与 `const eventId = importSuffix ? \`${event.id}-${importSuffix}\` : event.id`(即 rename 时事件 ID 同步加 importSuffix)。
- 断言源码**不**包含 `run(\n event.id,\n id,` 即不能直接用原 event.id 插入(会与已存在事件主键冲突)。

### 9.2 测试要点

- 测试为源码回归测试(断言源码文本模式),不实际执行导入,避免依赖完整数据库环境。
- 用 `node:test` 与 `node:assert/strict`。
- 覆盖场景:rename 策略重复导入同一文件时,事件 ID 必须同步重写,否则 `task_events` 主键冲突。

## 10. 关键源码索引

- 写入器:[electron/file-db/xuanbing-file-writer.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/xuanbing-file-writer.ts)
- 读取器:[electron/file-db/xuanbing-file-reader.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/xuanbing-file-reader.ts)
- 校验器:[electron/file-db/xuanbing-file-validator.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/xuanbing-file-validator.ts)
- checksum:[electron/file-db/xuanbing-file-checksum.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/xuanbing-file-checksum.ts)
- 原子写入:[electron/file-db/atomic-write.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/atomic-write.ts)
- 路径安全:[electron/file-db/safe-file-path.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/safe-file-path.ts)
- 导入器:[electron/file-db/xuanbing-file-importer.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/xuanbing-file-importer.ts)
- 导出器:[electron/file-db/xuanbing-file-exporter.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/xuanbing-file-exporter.ts)
- 文件服务(token 机制):[electron/services/xuanbing-file.service.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/services/xuanbing-file.service.ts)
- 入口:[electron/file-db/index.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/index.ts)
- rename 测试:[test/database/xuanbing-importer.test.js](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/test/database/xuanbing-importer.test.js)
