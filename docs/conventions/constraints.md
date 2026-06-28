# xuanbing(All In One)工程约定与硬约束

> 本文档面向 Electron 桌面应用 `xuanbing(All In One)`,汇总不可破坏的硬约束、IPC 契约规范、代码风格约定、TODO 汇总与常见反模式。所有引用均使用 `file:///` 绝对路径链接,代码标识符保留英文。

---

## 1. 硬约束(不可破坏)

> ⚠️ **以下 6 条硬约束来自项目记忆,任何修改都必须显式评估是否破坏约束。破坏约束等同于引入数据丢失或安全漏洞,PR 评审必须阻断。**

### 1.1 数据库恢复:pre-restore backup 失败必须 abort 并抛错

> 🚨 **破坏后果:原库被覆盖后无法回滚,导致数据永久丢失。**

`restoreDatabase` 在替换数据库文件前必须先备份当前库;若 `backupDatabase({ prefix: 'pre-restore' })` 抛错,**必须立即抛 `DB_RESTORE_FAILED` 并中止恢复流程,不得继续覆盖原库**。

- 实现位置:file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/db-restore.ts(第 106–124 行)
- 关键代码:`reason: 'pre_restore_backup_failed'`,`retryable: false`,`severity: 'high'`

```typescript
} catch (backupError) {
  // 备份失败：中止恢复，避免覆盖原库后无法回滚导致数据丢失
  throwDbError('DB_RESTORE_FAILED', 'Pre-restore backup failed, aborting restore to protect original database.', {
    retryable: false,
    severity: 'high',
    safeDetail: { reason: 'pre_restore_backup_failed' },
    ...
  })
}
```

### 1.2 IPC 通道 audit:true 必须写 audit_logs 表

> 🚨 **破坏后果:敏感操作(备份、恢复、导入、设置写入等)无审计记录,事故无法追溯。**

契约声明 `audit: true` 的通道,无论成功或失败,均必须通过 `recordAuditIfNeeded` 写入 `audit_logs` 表。

- 实现位置:file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/ipc-main-bus.ts(第 574–605 行)
- 已开启 audit 的通道:`file:dialog.open`、`window:open`、`window:close`、`window:closeAll`、`window:closeByRole`、`task:start`、`task:cancel`、`database:backup`、`database:restore`、`database:vacuum`、`database:clearLogs`、`taskData:create`、`taskData:update`、`taskData:delete`、`setting:set`、`setting:delete`、`xuanbingFile:openDialog`、`xuanbingFile:saveDialog`、`xuanbingFile:exportPackage`、`xuanbingFile:importPackage`、`system:notification.show`、`system:messageBox.show`、事件 `task:failed`(完整清单见 file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/shared/contracts.ts)
- **例外**:审计写入失败仅 `console.warn`,不影响业务返回值;但审计逻辑本身不得被跳过。

### 1.3 生产环境必须禁用 localhost/127.0.0.1 in isAllowedSenderFrame

> 🚨 **破坏后果:webContents 被导航到本地恶意服务后,攻击者可越权调用受限 IPC。**

`isAllowedSenderFrame` 在 `environment === 'production'` 时仅放行 `file://` 与 `app://`,**禁止放行 `http://localhost` 与 `http://127.0.0.1`**。

- 实现位置:file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/ipc-main-bus.ts(第 546–563 行)

```typescript
if (this.environment === 'production') {
  return url.startsWith('file://') || url.startsWith('app://')
}
// 非生产环境才放行 localhost / 127.0.0.1
```

### 1.4 文件导入大小限制 10MB(不可放宽)

> 🚨 **破坏后果:读取流程为 readFileSync 整读 + JSON.parse,会产生 2–5 倍内存膨胀;放宽上限会导致主进程 OOM。**

`.xuanbing` 文件大小硬限制为 `XUANBING_MAX_FILE_BYTES = 10 * 1024 * 1024`(10MB),由 `ensureFileSize` 强制校验。

- 常量定义:file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/shared/database/constants.ts(第 47 行)
- 校验实现:file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/safe-file-path.ts(第 66–81 行,`ensureFileSize`)
- **放宽条件**:必须先将读取流程改为流式解析(参见 TODO [§5](#5-todo-汇总)),再同步调整上限;在此之前任何放宽都视为破坏约束。

### 1.5 IPC 契约(三端)必须用 Zod schema 校验 + 权限 + 限流 + 超时

> 🚨 **破坏后果:缺任意一项都会形成安全或稳定性短板——缺校验致注入、缺权限致越权、缺限流致 DoS、缺超时致主进程挂死。**

新增 IPC 通道时,主进程、preload、渲染三端必须共用同一契约定义,且契约必须包含:

1. **Zod schema 校验**:`inputSchema` 与 `outputSchema` 均必填,主进程入口与出口均校验。
2. **权限检查**:`permission` 字段必填,通过 `rolePermissions` 派生校验。
3. **限流**:`rateLimit: { maxCalls, windowMs }` 可选但强烈推荐;高频或敏感通道必填。
4. **超时**:`timeoutMs` 必填(默认 15 秒),长任务可放宽。
5. **审计**:敏感通道必须 `audit: true`(参见 [§1.2](#12-ipc-通道-audittrue-必须写-audit_logs-表))。

- 契约定义:file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/shared/contracts.ts
- 契约结构:file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/ipc-main-bus.ts(第 26–51 行,`RequestContractLike` / `EventContractLike`)
- 默认值:file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/shared/constants.ts(`DEFAULT_IPC_TIMEOUT_MS = 15_000`、`DEFAULT_IPC_MAX_PAYLOAD_BYTES = 64 * 1024`)

### 1.6 WindowManager 实例必须用 bridgeWindowManagers() 桥接

> 🚨 **破坏后果:通过 IPC `window:open` 创建的非主窗口不会被注册到 `IpcMainBus`,其 IPC 调用无法解析 sender、无法通过权限校验,功能静默失效。**

`bootstrapApplication` 中必须调用 `bridgeWindowManagers()`,将新 `WindowManager` 的 `window:created` 事件桥接到旧 `WindowManager`,使所有窗口(含主窗口、设置窗口、worker 面板)均被注册到 `IpcMainBus`。

- 实现位置:file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/main.ts(第 78–98 行,`bridgeWindowManagers`;第 175 行,`bootstrapApplication` 调用)
- 桥接逻辑:监听 `newWindowManager.getEventBus()` 的 `window:created` 事件,通过 `registerWindowWithRuntime` 将 `BrowserWindow` 注册到 `ipcRuntime.windowManager`,绑定 focus/blur/closed 生命周期。

> **任何新增 WindowManager 实例的场景都必须确保走桥接流程,不得绕过。**

---

## 2. IPC 契约规范

### 2.1 新增 IPC 通道的 8 步标准流程

新增一个请求型 IPC 通道(以 `module:action` 为例)必须依次完成:

1. **定义通道常量**:在 file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/shared/constants.ts 的 `IPC_CHANNELS` 中新增 `moduleAction: 'module:action'`。
2. **定义权限常量**:在同一文件 `IPC_PERMISSIONS` 中新增对应权限(若复用已有权限可跳过)。
3. **定义 Zod schema**:在 file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/shared/schemas.ts 中新增 `moduleActionRequestSchema` 与 `moduleActionResponseSchema`。
4. **定义契约**:在 file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/shared/contracts.ts 的 `requestContracts` 中通过 `defineRequestContract` 注册,声明 `channel` / `permission` / `inputSchema` / `outputSchema` / `timeoutMs` / `maxPayloadBytes`,按需声明 `rateLimit` / `audit`。
5. **实现 handler**:在 `electron/ipcBus/main/modules/<module>.ipc.ts` 中通过 `ipcRuntime.bus.registerHandler(contract, handler)` 注册处理器。
6. **暴露给渲染层**:在 file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/renderer/desktop-api.ts 中新增类型安全的方法,内部调用 `client.invoke(channel, input)`。
7. **更新权限表**:在 file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/ipc-permissions.ts 的 `DEFAULT_ROLE_PERMISSIONS` 中,为需要调用该通道的窗口角色追加权限。
8. **派生 rolePermissions**:在 file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/index.ts 中,从窗口角色权限派生 IPC 权限映射时,确保新权限被正确包含。

> 事件型通道(`eventContracts`)流程类似,但无需 handler,改用 `bus.registerSubscription` 或在主进程内 `bus.broadcast` / `bus.sendToWindow`。

### 2.2 contract 必填字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `channel` | `string` | 通道名,格式 `module:action`(详见 [§2.4](#24-命名规范))。 |
| `description` | `string` | 中文描述,用于文档与审计。 |
| `permission` | `IpcPermission` | 权限标识,必须在 `IPC_PERMISSIONS` 中已定义。 |
| `inputSchema` | `ZodSchema<TInput>` | 输入校验模型,无参数时用 `createEmptyObjectSchema()`。 |
| `outputSchema` | `ZodSchema<TOutput>` | 输出校验模型。 |

### 2.3 contract 可选字段

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `timeoutMs` | `number` | `DEFAULT_IPC_TIMEOUT_MS`(15s) | 超时阈值,超时通过 `AbortController.abort()` 触发。长任务(如 `databaseRestore`)可放宽至 120s。 |
| `maxPayloadBytes` | `number` | `DEFAULT_IPC_MAX_PAYLOAD_BYTES`(64KB) | 负载大小上限,超过抛 `IPC_PAYLOAD_TOO_LARGE`。 |
| `rateLimit` | `{ maxCalls, windowMs }` | 无 | 按 `windowId:channel` 维度计数,超限抛 `IPC_RATE_LIMITED`。 |
| `audit` | `boolean` | `false` | 为 `true` 时写 `audit_logs` 表(参见 [§1.2](#12-ipc-通道-audittrue-必须写-audit_logs-表))。 |

### 2.4 命名规范

- **请求通道**:`module:action`,全小写,action 用驼峰或单点。示例:`window:open`、`window:closeByRole`、`database:getHealth`、`xuanbingFile:importPackage`、`system:notification.show`。
- **事件通道**:`module:event`,示例:`task:progress`、`task:completed`、`window:focus.changed`、`window:state.changed`。
- **权限标识**:`module:scope`,示例:`database:read`、`database:write`、`window:control:self`、`window:close:any`、`xuanbingFile:import`。
- **窗口角色**:`main` / `settings` / `workerPanel`,新增角色需同步更新 `DEFAULT_ROLE_PERMISSIONS`。

> 通道名一旦发布到生产,不得重命名(会破坏存量审计记录与日志解析);如必须调整,保留旧通道为别名并标注废弃。

---

## 3. 代码风格约定

### 3.1 TypeScript strict 模式

- 全项目启用 `strict: true`,禁止 `any` 隐式出现。
- 错误处理统一使用 `throwDbError` / `createIpcError`,错误码与 `safeDetail` / `devDetail` 必填,避免裸 `throw new Error`(参见 file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/repositories/file-asset.repository.ts 第 92 行 TODO,该处是已知反例)。

### 3.2 中文注释 @file 头

每个 `.ts` 文件顶部必须包含 `@file` JSDoc 注释,中文描述文件职责。示例:

```typescript
/**
 * @file 应用主进程入口，负责窗口创建、安全策略与 IPC Runtime 装配。
 */
```

- 参考实现:file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/main.ts(第 1–3 行)、file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/ipc-main-bus.ts(第 1–3 行)

### 3.3 file:/// 链接引用代码

- 文档中引用代码时使用 `file:///` 绝对路径,Windows 路径分隔符为 `/`。
- 引用具体行号时附 `(第 X–Y 行)` 或 `(第 X 行)`,便于跳转。
- 跨文档引用使用相对路径,如 `[工程约定与硬约束](../conventions/constraints.md)`。

### 3.4 最小化修改原则

- 只修改直接相关的代码,不顺手重构周边逻辑。
- 不为未发生场景添加防御性代码(信任框架与内部调用保证)。
- 不主动添加注释、docstring、类型注解到未改动的代码。
- 不创建一次性用途的抽象层。

### 3.5 错误处理链路

- 数据库错误:统一走 `throwDbError`,携带 `severity` / `safeDetail` / `devDetail` / `cause` / `retryable`。
- IPC 错误:统一走 `createIpcError`,经 `normalizeIpcError` 在生产环境脱敏后返回渲染层。
- 审计写入失败:仅 `console.warn`,不抛错(避免审计故障阻断业务)。

---

## 4. 常见反模式

> ⚠️ 以下反模式均会破坏安全姿态或稳定性,PR 评审必须阻断。

### 4.1 不要直接暴露 ipcRenderer

**反例**:

```typescript
// ❌ preload 直接暴露 ipcRenderer
contextBridge.exposeInMainWorld('ipc', { send: ipcRenderer.send, on: ipcRenderer.on })
```

**正确做法**:通过 `exposeDesktopApi()` 暴露 `window.desktop`,所有调用经契约注册与权限校验。

- 参见:file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/preload/expose-api.ts

### 4.2 不要在渲染层使用 require/process

**反例**:

```typescript
// ❌ 渲染层直接 require Node 模块
const fs = require('fs')
const env = process.env.SECRET
```

**正确做法**:渲染层需要的能力通过 IPC 契约请求主进程代为执行;环境信息由主进程通过 `appInfoGet` 通道按需返回脱敏后的子集。

### 4.3 不要放松 CSP

**反例**:

```typescript
// ❌ 为图便利放开 script-src 或加入 unsafe-eval
"script-src 'self' 'unsafe-eval'"
```

**正确做法**:CSP 策略任何调整必须经安全评审;`script-src` 严格保持 `'self'`,`style-src` 的 `'unsafe-inline'` 是当前唯一放宽项且不可进一步放宽。

- 参见:[安全设计总览 - CSP 双层防御](../security/overview.md#2-csp-双层防御)

### 4.4 不要跳过 bridgeWindowManagers

**反例**:

```typescript
// ❌ 直接 new BrowserWindow 而不注册到 IpcMainBus
const win = new BrowserWindow({ ... })
win.loadURL('...')
```

**正确做法**:所有窗口通过 `WindowManager.openWindow()` 创建,主窗口之外的所有窗口由 `bridgeWindowManagers()` 自动注册到 `IpcMainBus`。

- 参见:file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/main.ts(第 78–98 行、第 175 行)

### 4.5 不要在 IPC 通道省略 Zod 校验

**反例**:

```typescript
// ❌ 契约省略 inputSchema,handler 内手动 as 强转
defineRequestContract({
  channel: 'foo:bar',
  permission: 'foo:bar',
  // inputSchema 缺失
  outputSchema: fooResponseSchema
})
// handler 内
const input = rawInput as FooInput // ❌ 无校验
```

**正确做法**:`inputSchema` 与 `outputSchema` 均必填,主进程入口与出口均自动校验,handler 内拿到的 `input` 已是类型安全的强类型值。

- 已知反例(待修复):file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/xuanbing-file-importer.ts 第 53、138、176、285 行的 `as` 强转 TODO。

### 4.6 不要在 pre-restore backup 失败后继续覆盖原库

**反例**:

```typescript
// ❌ 备份失败仅 warn 后继续恢复
try {
  backupDatabase(paths, { prefix: 'pre-restore' })
} catch (e) {
  console.warn('backup failed, continue anyway', e) // ❌
}
closeConnection()
atomicCopyFileSync(backupPath, paths.dbFile) // ❌ 原库被覆盖,无法回滚
```

**正确做法**:备份失败立即抛 `DB_RESTORE_FAILED`,`reason: 'pre_restore_backup_failed'`,中止恢复流程。

- 参见:file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/db-restore.ts(第 106–124 行)

### 4.7 不要绕过 audit_logs 写入

**反例**:

```typescript
// ❌ 在 dispatchInvoke 之外直接调用 handler,跳过 recordAuditIfNeeded
const result = await record.handler({ ...context, input }) // ❌ 无审计
```

**正确做法**:所有 `audit: true` 通道的调用必须经 `dispatchInvoke`,确保成功/失败均写审计。

### 4.8 不要在生产环境放行 localhost/127.0.0.1

**反例**:

```typescript
// ❌ 为图调试便利,在生产环境也放行 localhost
private isAllowedSenderFrame(url: string | undefined): boolean {
  return url?.startsWith('http://localhost') ?? false // ❌
}
```

**正确做法**:生产环境仅放行 `file://` 与 `app://`,dev server 源仅在非生产环境放行。

- 参见:file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/ipc-main-bus.ts(第 546–563 行)

---

## 5. TODO 汇总

> 以下 TODO 通过 Grep 搜索全部 `.ts` 文件提取,按文件归类。重点关注 `electron/main.ts` 的单例锁、生产环境判定、`will-navigate` 三项,以及 `electron/ipcBus/main/ipc-main-bus.ts` 的 broadcast 权限过滤。

### 5.1 主进程与 IPC 总线

| 文件 | 行号 | TODO 内容 | 风险/影响 |
| --- | --- | --- | --- |
| file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/main.ts | 18 | 单例锁 `app.quit()` 后未提前退出,模块顶层逻辑仍会继续执行;ES 模块顶层不支持 `return`,建议改为 `app.quit() + process.exit(0)` 或将启动流程包裹进函数。 | 第二实例启动时可能执行不必要的初始化逻辑,资源浪费或竞争。 |
| file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/main.ts | 199 | 缺全局 `will-navigate` 兜底,当前未阻止渲染层导航到 `file://` 或外部 `http(s)`;建议对 `contents.on('will-navigate')` 做校验,仅允许同源 hash 路由跳转。 | **安全风险**:webContents 可被导航到非预期来源。 |
| file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/main.ts | 207 | 生产环境检测逻辑不一致:此处用 `NODE_ENV` / `DEV_SERVER_URL`,而 `createWindow` 用 `app.isPackaged` 判断是否打开 DevTools;建议统一用 `app.isPackaged`。 | 环境变量未设置时可能误判为生产/开发,导致 DevTools 误开或菜单误删。 |
| file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/ipc-main-bus.ts | 364 | `broadcast` 当前向所有窗口无差别广播,未按 `contract.permission` 过滤接收方角色权限;后续应改为遍历窗口时按 `windowManager.getWindowRole(windowId)` 与 `permissionChecker` 过滤。 | **安全风险**:`task:failed` / `windowCreated` 等含敏感信息的事件会投递到无权限窗口。 |
| file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/ipc-main-bus.ts | 469 | 超时后 handler 后台 reject 仅 `console.warn`,未并入 `cause`;后续应将后台 reject 并入 cause,便于排障时还原真实失败原因。 | 排障困难,真实失败原因被吞。 |
| file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/shared/zod.ts | 432 | 评估用真实 `zod` 替代自定义实现。 | 自定义实现可能存在边界 case 与真实 zod 不一致。 |
| file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/types/node-shims.d.ts | 5 | 评估用 `@types/node` 替代 shim。 | 维护成本,类型可能滞后于 Node 版本。 |

### 5.2 数据库子系统

| 文件 | 行号 | TODO 内容 | 风险/影响 |
| --- | --- | --- | --- |
| file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/db-backup.ts | 61 | 全程使用同步 IO(`copyFileSync` / `readFileSync` / `statSync`),大库会阻塞 Electron 主线程;建议移至 Worker 线程或改用 `better-sqlite3` 的 backup API。 | 大库备份期间 UI 卡顿。 |
| file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/db-migrator.ts | 166 | 仅遍历当前 migration 文件,无法发现"已应用但文件已删除"的 migration(孤儿记录会被静默忽略);后续可考虑对孤儿记录做告警或校验。 | migration 文件被误删后无法及时发现,schema 与记录不符。 |
| file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/db-migrator.ts | 281 | `setSchemaVersion` 与各 migration 的 `INSERT` 不在同一事务,若进程在此处之前崩溃,可能出现 migration 已记录但 `schema_version` 未更新的不一致。 | 崩溃恢复后 schema 版本错乱,可能重复执行 migration。 |

### 5.3 文件子系统(.xuanbing)

| 文件 | 行号 | TODO 内容 | 风险/影响 |
| --- | --- | --- | --- |
| file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/atomic-write.ts | 17 | `busy-wait` 会阻塞主线程,单次等待已降至 20ms、重试次数降至 2 次以减小影响;建议重构为异步流程(`async/await + setTimeout`)后彻底消除主线程阻塞。 | 高并发写入时主线程短暂卡顿。 |
| file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/xuanbing-file-reader.ts | 56 | 大文件建议改流式解析(如流式 JSON parser);当前为 `readFileSync` 整读 + `JSON.parse`,会产生 2–5 倍内存膨胀;`XUANBING_MAX_FILE_BYTES` 已降至 10MB 以限制峰值内存,流式落地后可放宽。 | **关联硬约束 [§1.4](#14-文件导入大小限制-10mb不可放宽)**:放宽上限前必须先完成此 TODO。 |
| file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/shared/database/constants.ts | 45 | 大文件应改用流式解析(如流式 JSON parser),届时可放宽上限。 | 同上。 |
| file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/xuanbing-file-writer.ts | 58 | 可选写后回读校验 checksum。 | 写入后磁盘故障导致文件损坏无法及时发现。 |
| file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/xuanbing-file.schema.ts | 87 | `payload` 当前为 `unknown`(向后兼容),建议改为 `discriminatedUnion`(按 `type` 选择上方各 payload schema)。 | payload 类型安全不足,依赖 importer 兜底校验。 |
| file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/xuanbing-file.schema.ts | 99 | 同上,改为 `discriminatedUnion`,每种文件类型定义 payload schema(`settings-package` / `task-export` / `workspace-package` / ...)。 | 同上。 |
| file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/xuanbing-file-exporter.ts | 66 | `filter` 仅识别 `status`,其余字段被忽略。 | 导出过滤能力不足,无法按多条件筛选。 |
| file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/xuanbing-file-exporter.ts | 95 | `filter` 仅识别 `status`,其余字段被忽略。 | 同上。 |
| file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/xuanbing-file-exporter.ts | 168 | 同步版未走 `withPathLock`,无法串行化同一路径的并发写入,调用方需自行避免并发;后续考虑统一改为带锁实现。 | 并发写入同一路径可能数据错乱。 |
| file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/xuanbing-file-exporter.ts | 250 | 当前未传 `filter`,导出全量任务;后续如需支持按条件导出,应由调用方传入 `filter` 并透传给 `collectTaskExportData`。 | 无法按条件导出,始终全量。 |
| file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/xuanbing-file-importer.ts | 53 | 用 payload schema 替代 `as` 强转与手动校验。 | **关联反模式 [§4.5](#45-不要在-ipc-通道省略-zod-校验)**:类型安全不足。 |
| file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/xuanbing-file-importer.ts | 108 | 当前 `merge` 实为全量覆盖,非字段级合并;仅打标 `reason='merge'`,后续 `importPackage` 的 update 分支会用 payload 整体覆盖本地行;字段级合并策略待实现。 | 用户预期"合并"与实际"覆盖"不符,可能丢失本地字段。 |
| file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/xuanbing-file-importer.ts | 138 | 用 payload schema 替代 `as` 强转。 | 同 [§5.3 importer L53]。 |
| file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/xuanbing-file-importer.ts | 176 | 用 payload schema 替代 `as` 强转。 | 同上。 |
| file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/xuanbing-file-importer.ts | 285 | 支持按字段 `conflictStrategy` 合并;当前 `merge` / `overwrite` 策略均走全量覆盖分支,用 payload 整体替换本地行字段。 | 同 [§5.3 importer L108]。 |

### 5.4 Repository 与 Service

| 文件 | 行号 | TODO 内容 | 风险/影响 |
| --- | --- | --- | --- |
| file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/repositories/file-asset.repository.ts | 92 | 此处抛 `new Error` 而非 `throwDbError`,错误码与上下文信息缺失;后续应统一改为 `throwDbError` 以纳入数据库错误处理链路。 | 错误信息不规范,排障困难。 |
| file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/repositories/file-asset.repository.ts | 106 | `findById` 未过滤 `deleted_at`,会返回已软删除的记录;调用方若需排除已删除记录,应另行判断 `deletedAt` 或新增带过滤的查询方法。 | 可能误用已删除数据。 |
| file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/services/task.service.ts | 35 | Repository 方法目前不接受事务上下文参数,无法在事务内调用 `TaskRepository` / `AuditRepository`;此处暂以原始 SQL 在事务内直接操作,待 Repository 接口支持事务注入后重构。 | 事务边界不一致风险,代码重复。 |
| file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/services/task.service.ts | 82 | 与 `create` 同理,Repository 方法目前不接受事务上下文,此处以原始 SQL 在事务内直接操作;待 Repository 接口支持事务注入后重构。 | 同上。 |

### 5.5 渲染层

| 文件 | 行号 | TODO 内容 | 风险/影响 |
| --- | --- | --- | --- |
| file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/business/RouteViewWrapper.ts | 4 | 建议新增 `ErrorBoundary` 组件包裹路由页面,捕获页面渲染/生命周期异常,避免单个页面抛错导致整个应用白屏;当前仅有 `Suspense` 处理异步加载态,缺少对同步渲染错误的统一兜底。 | 单页抛错致全局白屏。 |
| file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/stores/auth.store.ts | 79 | 接入真实鉴权(IPC 或 HTTP),校验密码并换取 token;当前为占位实现,已移除"任意密码通过"的鉴权绕过,登录暂不可用。 | **安全相关**:登录功能不可用。 |
| file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/stores/auth.store.ts | 87 | 接入真实鉴权,校验 `_password` 并换取 token。 | 同上。 |
| file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/stores/permission.store.ts | 78 | 合并用户权限与窗口权限(去重)频繁访问可能触发重算,建议缓存计算结果。 | 性能,非安全。 |
| file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/pages/DashboardPage.ts | 53 | mock 数据,待接入真实数据源。 | 功能未完成。 |
| file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/pages/index.ts | 536 | mock 数据,待接入真实数据源。 | 功能未完成。 |
| file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/pages/SettingsSecurityPage.ts | 52 | mock 数据,待接入真实数据源。 | 功能未完成。 |
| file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/pages/TaskDetailPage.ts | 40 | mock 数据,待接入真实数据源。 | 功能未完成。 |

---

## 6. 相关源码索引

| 模块 | 文件 |
| --- | --- |
| 主进程入口(硬约束 1.6 桥接、单例锁 TODO) | file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/main.ts |
| IPC 总线(硬约束 1.2、1.3、1.5) | file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/ipc-main-bus.ts |
| IPC 权限检查(硬约束 1.5) | file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/ipc-permissions.ts |
| IPC 契约定义(契约规范) | file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/shared/contracts.ts |
| IPC 常量(命名规范) | file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/shared/constants.ts |
| 文件大小常量(硬约束 1.4) | file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/shared/database/constants.ts |
| 路径安全(硬约束 1.4 校验) | file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/safe-file-path.ts |
| 数据库恢复(硬约束 1.1) | file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/db-restore.ts |
| 数据库迁移(备份、TODO) | file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/db-migrator.ts |
| 数据库备份(TODO 同步 IO) | file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/db-backup.ts |
| 窗口管理器(硬约束 1.6 桥接) | file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/windows/main/window-manager.ts |
| contextBridge 暴露(反模式 4.1) | file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/preload/expose-api.ts |
| 文件导入(反模式 4.5 TODO) | file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/xuanbing-file-importer.ts |
| 安全设计总览 | [../security/overview.md](../security/overview.md) |
