# 权限·限流·超时·审计

本文档描述 IPC 总线的安全机制：权限模型、`rolePermissions` 派生逻辑、帧来源白名单、令牌桶限流、`Promise.race` 超时控制、审计日志写入，以及 IPC 契约硬约束。

## 一、19 项权限清单

权限常量定义于 [electron/ipcBus/shared/constants.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/shared/constants.ts) 的 `IPC_PERMISSIONS`。`IpcPermission` 类型从此常量派生，确保权限字符串受编译期约束。

| # | 权限 | 含义 | 主要使用通道 |
| --- | --- | --- | --- |
| 1 | `public` | 所有窗口可见，无敏感信息 | `app:info.get` / `window:getCurrent` / `window:getInitPayload` |
| 2 | `window:open` | 打开或聚焦指定角色窗口 | `window:open` |
| 3 | `window:close:self` | 关闭自身窗口 | `window:close` |
| 4 | `window:control:any` | 跨窗口控制（target !== sender） | `window:closeAll`，以及任何带 `windowId` 参数的控制类通道 |
| 5 | `window:close:any` | 按角色关闭任意窗口 | `window:closeByRole` |
| 6 | `window:control:self` | 控制自身窗口（最小化/最大化/恢复/隐藏/显示/重载/设标题） | `window:minimize` / `window:maximize` / `window:restore` / `window:hide` / `window:show` / `window:reload` / `window:setTitle` |
| 7 | `window:focus` | 聚焦窗口或按角色聚焦 | `window:focus` |
| 8 | `window:list` | 列出全部窗口（无 `window:control:any` 时仅返回自身） | `window:list` |
| 9 | `window:control` | 事件订阅权限：接收窗口状态/路由/创建事件 | 事件 `window:focus.changed` / `window:state.changed` / `window:route.changed` / `window:created` |
| 10 | `setting:read` | 读取设置项 | `setting:get` / `setting:listByNamespace` |
| 11 | `setting:write` | 写入/删除设置项 | `setting:set` / `setting:delete` |
| 12 | `database:read` | 读取数据库健康/统计 | `database:getHealth` / `database:getStats` |
| 13 | `database:write` | VACUUM、清理日志等写操作 | `database:vacuum` / `database:clearLogs` |
| 14 | `database:backup` | 触发数据库备份 | `database:backup` |
| 15 | `database:restore` | 从备份恢复数据库 | `database:restore` |
| 16 | `taskData:read` | 读取任务数据 | `taskData:list` / `taskData:getById` |
| 17 | `taskData:write` | 写入/更新/删除任务数据 | `taskData:create` / `taskData:update` / `taskData:delete` |
| 18 | `xuanbingFile:read` | 读取 .xuanbing 文件（对话框、预览、校验、dryRun） | `xuanbingFile:openDialog` / `xuanbingFile:readPreview` / `xuanbingFile:validate` / `xuanbingFile:dryRunImport` |
| 19 | `xuanbingFile:write` | 写入 .xuanbing 文件（保存对话框） | `xuanbingFile:saveDialog` |

补充说明（不在 19 项核心权限内，但常量中存在）：

| 权限 | 含义 |
| --- | --- |
| `app:read` | 应用信息读取（窗口权限表中使用，IPC 通道 `app:info.get` 实际用 `public`） |
| `file:read` | 文件读取（`file:dialog.open` 使用） |
| `file:write` | 文件写入 |
| `system:read` / `system:write` | 系统读取/写入（保留） |
| `system:notify` | 系统通知/消息框/Toast（3 个 `system:*` 通道使用） |
| `task:run` / `task:cancel` | 任务运行/取消 |
| `xuanbingFile:import` / `xuanbingFile:export` | .xuanbing 文件导入/导出 |
| `devtools:open` | DevTools 打开（仅由 `process.env.XUANBING_DEVTOOLS === '1'` 控制，不走 `rolePermissions`） |

## 二、rolePermissions 派生逻辑

`rolePermissions` 在主进程装配时从窗口角色权限表派生，详见 [electron/ipcBus/main/index.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/index.ts) 的 `createMainIpcRuntime`。源码片段：

```ts
const rolePermissions: Record<string, string[]> = {}
for (const [role, perms] of Object.entries(DEFAULT_WINDOW_ROLE_PERMISSIONS)) {
  rolePermissions[role] = [...new Set(['public', ...perms])]
}
// 主窗口需要全部 IPC 权限
rolePermissions.main = [...new Set([
  ...rolePermissions.main,
  'setting:read', 'setting:write',
  'database:read', 'database:write', 'database:backup', 'database:restore',
  'taskData:read', 'taskData:write',
  'xuanbingFile:read', 'xuanbingFile:write', 'xuanbingFile:import', 'xuanbingFile:export',
  'window:control:any', 'window:close:any'
])]
// 设置窗口需要设置项读写权限
rolePermissions.settings = [...new Set([
  ...rolePermissions.settings,
  'setting:read', 'setting:write'
])]
// 任务中心窗口需要任务数据读写权限
rolePermissions.taskCenter = [...new Set([
  ...rolePermissions.taskCenter,
  'taskData:read', 'taskData:write'
])]
```

### 派生步骤

1. **基础表**：[DEFAULT_WINDOW_ROLE_PERMISSIONS](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/windows/shared/window-permissions.ts) 来自窗口权限层，定义 13 个窗口角色（`main` / `login` / `settings` / `about` / `detail` / `editor` / `taskCenter` / `logViewer` / `devtoolsPanel` / `floatingToolbox` / `trayPanel` / `modal` / `child` / `hiddenWorker`）的默认权限数组。
2. **补充 `public`**：对每个角色在权限数组前补 `'public'`，使用 `Set` 去重。`public` 权限对应无需鉴权的通道（如 `app:info.get`）。
3. **`main` 角色扩展**：主窗口需要全部 IPC 权限，补充 `setting:*` / `database:*` / `taskData:*` / `xuanbingFile:*` / `window:control:any` / `window:close:any`。
4. **`settings` 角色扩展**：补充 `setting:read` / `setting:write`。
5. **`taskCenter` 角色扩展**：补充 `taskData:read` / `taskData:write`。
6. **结果注入**：`new IpcMainBus({ rolePermissions, ... })` 时传入，由 `createPermissionChecker` 与 `DEFAULT_ROLE_PERMISSIONS`（[ipc-permissions.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/ipc-permissions.ts) 中的兜底表）合并。

### `createPermissionChecker` 实现

```ts
export function createPermissionChecker(options: PermissionCheckerOptions) {
  const rolePermissions = {
    ...DEFAULT_ROLE_PERMISSIONS,  // ipc-permissions.ts 中的兜底（main/settings/workerPanel）
    ...options.rolePermissions    // index.ts 注入的扩展后映射（覆盖兜底）
  }

  return function canAccess(input: PermissionDecisionInput): PermissionDecision {
    if (!input.contract.permission) {
      return { allowed: false, reason: 'missing-contract-permission' }
    }
    if (!input.windowRole) {
      return { allowed: false, reason: 'unknown-window-role' }
    }
    if (input.contract.permission === 'devtools:open') {
      return { allowed: process.env.XUANBING_DEVTOOLS === '1' }
    }
    const allowedPermissions = rolePermissions[input.windowRole] ?? []
    if (allowedPermissions.includes(input.contract.permission)) {
      return { allowed: true }
    }
    return { allowed: false, reason: 'missing-permission' }
  }
}
```

关键点：

- 默认 deny。只有 `rolePermissions[role]` 数组中显式包含的权限才允许。
- `devtools:open` 是特殊权限，**前置为独立分支**，仅由 `process.env.XUANBING_DEVTOOLS === '1'` 控制；避免角色权限表中误含 `devtools:open` 时绕过环境开关。
- `windowRole` 未解析（窗口未注册）时直接拒绝，错误码 `IPC_FORBIDDEN`，`reason: 'unknown-window-role'`。

### 窗口控制权限的二次校验

`window:control:any`（跨窗口控制）在 `permissionChecker` 之外由 [window.ipc.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/modules/window.ipc.ts) 的 `assertControlPermission` 二次校验，因为该判断需要对比 sender 与 target 窗口 ID：

```ts
function assertControlPermission(windowManager, senderWindowId, targetWindowId, permission, rolePermissions): void {
  if (senderWindowId === targetWindowId) return  // self 控制：默认允许
  if (senderWindowId === undefined) {
    throw createIpcError('IPC_FORBIDDEN', 'Sender window could not be resolved; cross-window control is not allowed.')
  }
  const senderRef = windowManager.getWindow(senderWindowId)
  if (!senderRef) {
    throw createIpcError('IPC_WINDOW_NOT_FOUND', `Sender window ${senderWindowId} is unavailable.`)
  }
  if (!hasControlPermission(senderRef.role, permission, rolePermissions)) {
    throw createIpcError('IPC_FORBIDDEN', `Sender role "${senderRef.role}" lacks permission "${permission}" to control window ${targetWindowId}.`)
  }
}
```

`windowList` 通道也按 `window:control:any` 权限过滤返回结果：无该权限的调用方仅返回自身窗口，拥有该权限者才返回全量列表。

## 三、isAllowedSenderFrame：帧来源白名单

`dispatchInvoke` 在权限校验之前先调用 `isAllowedSenderFrame(event.senderFrame?.url)`：

```ts
private isAllowedSenderFrame(url: string | undefined): boolean {
  if (url === undefined) return false
  if (this.environment === 'production') {
    return url.startsWith('file://') || url.startsWith('app://')
  }
  return (
    url.startsWith('file://') ||
    url.startsWith('app://') ||
    url.startsWith('http://localhost') ||
    url.startsWith('http://127.0.0.1')
  )
}
```

| 环境 | 允许的源 | 拒绝的源 |
| --- | --- | --- |
| `production` | `file://`、`app://` | `http://localhost`、`http://127.0.0.1`、`undefined`、其他 |
| 非 `production` | `file://`、`app://`、`http://localhost`、`http://127.0.0.1` | `undefined`、其他 |

设计意图：防止生产环境 webContents 被导航到本地恶意 HTTP 服务后越权调用受限 IPC。失败错误码：`IPC_FORBIDDEN`，message `'Sender frame not allowed.'`。

## 四、限流实现：滑动窗口令牌桶

限流逻辑在 [ipc-main-bus.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/ipc-main-bus.ts) 的 `enforceRateLimit` 中实现（`ipc-timeout.ts` 是独立工具，超时使用，参见 [dispatch-flow.md](./dispatch-flow.md)）：

```ts
private enforceRateLimit(channel, senderWindowId, contract): void {
  if (!contract.rateLimit || senderWindowId === undefined) return
  const key = `${senderWindowId}:${channel}`
  const now = Date.now()
  const windowStart = now - contract.rateLimit.windowMs
  const history = (this.rateLimitState.get(key) ?? []).filter((t) => t >= windowStart)
  if (history.length >= contract.rateLimit.maxCalls) {
    throw createIpcError('IPC_RATE_LIMITED', `Too many ${channel} calls were made.`, undefined, 'rate-limit', true)
  }
  history.push(now)
  this.rateLimitState.set(key, history)
}
```

### 算法特征

- **维度**：`windowId:channel`，每个窗口对每个通道独立计数。
- **数据结构**：`Map<string, number[]>`，存储每个 key 的调用时间戳数组。
- **滑动窗口**：每次调用先 `filter(t => t >= now - windowMs)` 丢弃过期时间戳，再判断剩余数量是否达到 `maxCalls`。
- **触发后**：抛 `IPC_RATE_LIMITED`，`cause: 'rate-limit'`，`retryable: true`，调用方可在 `windowMs` 后重试。
- **未注册窗口**：`senderWindowId === undefined` 时跳过限流（这种情况已在 `permissionChecker` 的 `unknown-window-role` 处拒绝）。

### 窗口级清理

窗口关闭时由 `cleanupWindow(windowId)` → `clearRateLimitForWindow(windowId)` 清理：

```ts
public clearRateLimitForWindow(windowId: number): void {
  const prefix = `${windowId}:`
  for (const key of [...this.rateLimitState.keys()]) {
    if (key.startsWith(prefix)) {
      this.rateLimitState.delete(key)
    }
  }
}
```

避免窗口关闭后残留计数导致后续窗口（可能复用 ID）误触发限流。`createMainIpcRuntime` 订阅 `newWindowManager.getEventBus().on('window:closed', ...)` 联动调用 `bus.cleanupWindow`。

### 当前配置限流的通道

| 通道 | `maxCalls` | `windowMs` | 含义 |
| --- | --- | --- | --- |
| `file:dialog.open` | 5 | 60_000 | 单窗口每分钟最多 5 次文件对话框 |
| `task:start` | 10 | 60_000 | 单窗口每分钟最多 10 次任务启动 |

## 五、超时实现：Promise.race + setTimeout

超时逻辑在 `dispatchInvoke` 内联实现（`ipc-timeout.ts` 的 `withTimeout` 是独立工具，总线未直接使用，但语义一致）：

```ts
const controller = new AbortController()
const timeoutMs = record.options.timeoutMs ?? record.contract.timeoutMs ?? 15_000

const timer = setTimeout(() => {
  timedOut = true
  controller.abort()
}, timeoutMs)

let onAbort: (() => void) | undefined
try {
  const handlerPromise = record.handler({ ...context, input: parsedInput })
  handlerPromise.catch((err) => {
    console.warn('[ipc] handler rejected after timeout/complete', channel, err)
  })

  const rawOutput = await Promise.race([
    handlerPromise,
    new Promise<never>((_resolve, reject) => {
      onAbort = () => {
        if (timedOut) {
          reject(createIpcError('IPC_TIMEOUT', `${channel} timed out after ${timeoutMs}ms.`, undefined, 'timeout', true))
          return
        }
        aborted = true
        reject(createIpcError('IPC_ABORTED', `${channel} was canceled.`, undefined, 'abort', true))
      }
      controller.signal.addEventListener('abort', onAbort, { once: true })
    })
  ])
  // ...
} finally {
  clearTimeout(timer)
  if (onAbort) controller.signal.removeEventListener('abort', onAbort)
}
```

### 关键点

- **超时优先级**：`registerHandler` 的 `options.timeoutMs` → 契约 `timeoutMs` → 默认 `15_000`。
- **AbortController**：超时触发 `controller.abort()`，handler 通过 `context.signal` 感知；`task.ipc.ts` 的长任务在 `setInterval` 回调中检查 `record.controller.signal.aborted` 主动停止。
- **后台 reject 防护**：`handlerPromise.catch(...)` 单独打印 `console.warn`，防止超时后 handler 后台 reject 形成 unhandledRejection。源码 TODO 标注后续应将后台 reject 并入 `cause` 便于排障。
- **abort 来源区分**：
  - `timedOut === true`：抛 `IPC_TIMEOUT`，`cause: 'timeout'`，`retryable: true`。
  - 其他 abort（`bus.dispose()` / 窗口关闭清理 / `TaskRegistry.cancelTask`）：抛 `IPC_ABORTED`，`cause: 'abort'`，`retryable: true`。
- **资源清理**：`finally` 中始终 `clearTimeout(timer)` 并移除 abort 监听器，避免内存泄漏。
- **超时后的兜底**：catch 分支再用 `timedOut` 标志构造一个 `IPC_TIMEOUT` 错误归一化，确保任何漏掉的 reject 路径都归一为超时错误。

### 显式调大超时的通道

| 通道 | timeoutMs | 原因 |
| --- | --- | --- |
| `task:start` | 30_000 | 长任务启动 |
| `database:backup` | 60_000 | SQLite 备份 I/O |
| `database:restore` | 120_000 | 恢复 + 健康检查 |
| `database:vacuum` | 120_000 | VACUUM 重写整库 |
| `system:messageBox.show` | 60_000 | 用户响应可能较慢 |
| `system:notification.show` | 10_000 | 通知显示较快 |
| `system:toast.show` | 5_000 | Toast 显示即时 |
| `xuanbingFile:exportPackage` | 60_000 | 导出 I/O |
| `xuanbingFile:dryRunImport` | 60_000 | dryRun 解析 |
| `xuanbingFile:importPackage` | 120_000 | 事务性导入 |

此外 `TaskRegistry` 内部还有 30 分钟的"任务最大运行时长"硬上限（`MAX_TASK_DURATION_MS`），与 IPC 超时独立——IPC 超时只控制 `task:start` 这个 invoke 调用本身的返回，任务执行进入后台 `setInterval` 后由 `MAX_TASK_DURATION_MS` 兜底。

## 六、审计日志：audit_logs 表

`audit:true` 的通道在 `dispatchInvoke` 末尾调用 `recordAuditIfNeeded` 写入 `audit_logs` 表。仓库实现见 [electron/repositories/audit.repository.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/repositories/audit.repository.ts)。

### `recordAuditIfNeeded` 实现

```ts
private recordAuditIfNeeded(
  record: HandlerRecord | undefined,
  context: {
    channel: string
    senderWindowId: number | undefined
    requestId: string
    result: 'success' | 'failure'
    errorCode?: string
  }
): void {
  if (!this.auditRepository || !record?.contract.audit) return

  try {
    this.auditRepository.create({
      actorType: 'system',
      actorId: context.senderWindowId !== undefined
        ? `window:${context.senderWindowId}`
        : 'ipc-bus',
      action: 'invoke',
      entityType: 'ipc',
      entityId: context.channel,
      metadata: {
        requestId: context.requestId,
        senderWindowId: context.senderWindowId,
        result: context.result,
        errorCode: context.errorCode
      }
    })
  } catch (auditError) {
    console.warn('[ipc] audit log failed', context.channel, auditError)
  }
}
```

### 关键点

- **触发条件**：`auditRepository` 已注入 && 契约 `audit: true`。任一不满足则跳过。
- **写入字段**：
  - `actorType: 'system'`：IPC 调用 actor 类型固定为 system。
  - `actorId: 'window:<windowId>'` 或 `'ipc-bus'`（窗口未解析时）。
  - `action: 'invoke'`：固定动作。
  - `entityType: 'ipc'`，`entityId: <channel>`：以通道名作为实体 ID。
  - `metadata`：包含 `requestId` / `senderWindowId` / `result`（`success` / `failure`）/ `errorCode`（失败时）。
- **失败容错**：审计写入失败仅 `console.warn`，不影响业务返回值。这是有意为之——审计失败不应阻断业务，但需排障可见。
- **时机**：当前实现仅在 `dispatchInvoke` 的 **catch 分支末尾** 调用 `recordAuditIfNeeded`，记录 `result: 'failure'`。成功路径下源码未显式调用 `recordAuditIfNeeded`——这与源码注释"在 dispatchInvoke 成功/失败分支末尾调用"存在差异。安全审计场景应额外注意：当前实现下 `audit:true` 通道仅会在失败时落库，成功调用不会写 `audit_logs`。修改审计行为时需同步检查 [ipc-main-bus.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/ipc-main-bus.ts) 的 `dispatchInvoke` 与 `recordAuditIfNeeded`。

### `audit_logs` 表结构

`AuditRepository.create` 通过 prepared statement 写入：

```sql
INSERT INTO audit_logs (id, actor_type, actor_id, action, entity_type, entity_id, before, after, metadata, created_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
```

- `id`：由 `generateId()` 生成。
- `before` / `after`：IPC 审计不写入业务前后状态，留 `null`。
- `metadata`：JSON 序列化后存储。
- `created_at`：ISO 8601 时间戳。

### 模块内的额外审计

部分模块在 handler 内部还会显式写 `audit_logs`，留下更细粒度的操作意图痕迹：

- [database.ipc.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/modules/database.ipc.ts) 的 `database:clearLogs`：清空全部日志前先写一条 `action: 'delete'`、`entityType: 'logs'`、`entityId: 'all'` 的审计，避免清空操作抹去自身痕迹。
- [xuanbing-file.ipc.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/modules/xuanbing-file.ipc.ts)：导出/导入由 `XuanbingFileService` 在 service 层写审计（注释明确"所有文件操作记录审计日志（由 service 层完成）"）。

### `audit:true` 通道清单（共 19 个请求 + 1 个事件）

请求通道：

| 模块 | 通道 |
| --- | --- |
| database | `database:backup`、`database:restore`、`database:vacuum`、`database:clearLogs` |
| file | `file:dialog.open` |
| setting | `setting:set`、`setting:delete` |
| system | `system:notification.show`、`system:messageBox.show` |
| task | `task:start`、`task:cancel` |
| task-data | `taskData:create`、`taskData:update`、`taskData:delete` |
| window | `window:open`、`window:close`、`window:closeAll`、`window:closeByRole` |
| xuanbing-file | `xuanbingFile:openDialog`、`xuanbingFile:saveDialog`、`xuanbingFile:exportPackage`、`xuanbingFile:importPackage` |

事件通道：`task:failed`（`audit: true`，但目前 `bus.sendToWindow` / `bus.broadcast` 路径未集成 `recordAuditIfNeeded`，仅请求路径写入）。

## 七、IPC 契约硬约束

新增或修改 IPC 通道时必须满足以下硬约束（源自 [security-best-practices](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/docs) 与项目内部约定）：

1. **必须用 Zod 校验**：契约必须提供 `inputSchema` 与 `outputSchema`；无入参时使用 `createEmptyObjectSchema()`。handler 不应绕过契约直接返回未校验值。安全敏感场景使用 `z.objectStrict()` 拒绝未知字段。
2. **必须声明权限**：契约必须提供非空 `permission`。`public` 仅限真正无敏感信息的通道。`devtools:open` 由环境变量控制，不可放入 `rolePermissions`。
3. **必须配置限流**：面向用户输入或外部资源的通道（对话框、任务启动）必须配置 `rateLimit`，避免渲染层失控时打满主进程。
4. **必须配置超时**：长任务通道必须显式调大 `timeoutMs`（如 `database:restore` 120s），避免默认 15s 误杀。handler 应监听 `context.signal` 主动取消。
5. **必须写审计**：写入/删除/导出/导入等敏感操作必须 `audit: true`。审计写入失败仅 warn 不阻断业务，但需排障可见。
6. **windowId 不信任 renderer**：`windowGetCurrent` / `windowGetInitPayload` 等通道必须从 IPC `sender` 解析 `windowId`，禁止使用 renderer 传入的 `windowId`。`window:open` 的 `parentWindowId` 始终用 `senderWindowId` 覆盖。
7. **跨窗口控制二次校验**：`window:control:any` 在 `permissionChecker` 之外由 `assertControlPermission` 二次校验，对比 sender 与 target 窗口 ID。
8. **帧来源白名单**：所有 `dispatchInvoke` 入口先经 `isAllowedSenderFrame` 过滤；生产环境拒绝 `localhost` / `127.0.0.1`。
9. **错误脱敏**：`normalizeIpcError` → `sanitizeIpcError` 在生产环境擦除 `detail`，递归清洗路径/密钥字段。handler 不应向 `IpcError.detail` 写入敏感数据。
10. **资源清理**：handler 内部的 `setInterval` / 监听器必须在 `TaskRecord.cleanup` 或 `bus.cleanupWindow` 中清理，避免窗口关闭后空转。

## 八、相关文档

- [overview.md](./overview.md)：四层架构与 `IpcMainBus` 总览
- [contracts.md](./contracts.md)：契约结构与新增通道流程
- [dispatch-flow.md](./dispatch-flow.md)：`dispatchInvoke` 完整链路（权限/限流/超时/校验/审计的执行顺序）
- [channels.md](./channels.md)：基于契约的全部通道清单

## 九、关键源码索引

- 权限检查器：[electron/ipcBus/main/ipc-permissions.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/ipc-permissions.ts)
- 窗口角色权限基础表：[electron/windows/shared/window-permissions.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/windows/shared/window-permissions.ts)
- 主进程装配（rolePermissions 派生）：[electron/ipcBus/main/index.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/index.ts)
- 调度核心（限流/超时/审计/帧白名单）：[electron/ipcBus/main/ipc-main-bus.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/ipc-main-bus.ts)
- 超时工具：[electron/ipcBus/main/ipc-timeout.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/ipc-timeout.ts)
- 错误归一化与脱敏：[electron/ipcBus/main/ipc-errors.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/ipc-errors.ts)
- 调用上下文：[electron/ipcBus/main/ipc-context.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/ipc-context.ts)
- 结构化日志：[electron/ipcBus/main/ipc-logger.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/ipc-logger.ts)
- 窗口控制权限二次校验：[electron/ipcBus/main/modules/window.ipc.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/modules/window.ipc.ts)
- 审计仓库：[electron/repositories/audit.repository.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/repositories/audit.repository.ts)
- 权限常量：[electron/ipcBus/shared/constants.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/shared/constants.ts)
- 契约定义：[electron/ipcBus/shared/contracts.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/shared/contracts.ts)
- 错误码定义：[electron/ipcBus/shared/errors.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/shared/errors.ts)
