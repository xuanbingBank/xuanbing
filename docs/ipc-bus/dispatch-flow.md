# 调用流程时序

本文档描述 `IpcMainBus.dispatchInvoke` 的完整链路。所有请求通道的 `ipcMain.handle` 入口都收敛到这一个方法，依次完成权限校验、限流、超时、Zod 校验、handler 执行、审计日志与序列化。源码位于 [electron/ipcBus/main/ipc-main-bus.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/ipc-main-bus.ts)（约 399-534 行）。

## 一、入口与初始化

`start()` 时为每个 `requestContracts` 通道注册：

```ts
this.ipcMain.handle(contract.channel, (event, payload) =>
  this.dispatchInvoke(contract.channel, event, payload))
```

`dispatchInvoke(channel, event, rawInput)` 在调用开头生成 `requestId`（优先 `randomUUID`，失败时回退 `ipc-${Date.now()}-${Math.random()...}`）并记录 `startedAt`。初始化阶段还设置 `payloadSize=0`、`timedOut=false`、`aborted=false` 三个状态标志，用于后续错误归因。

## 二、完整链路（编号步骤）

```
dispatchInvoke(channel, event, rawInput)
  │
  │ ① measurePayloadBytes(rawInput)        // JSON 序列化近似字节数
  │ ② this.handlers.get(channel)           // 解析 HandlerRecord
  │ ③ getWindowIdBySenderId(event.sender)  // 解析 sender 窗口
  │    getWindowRole(senderWindowId)
  │ ④ isAllowedSenderFrame(senderFrame.url)  // 帧来源白名单
  │ ⑤ permissionChecker({ contract, senderWindowId, windowRole })
  │ ⑥ maxPayloadBytes 校验
  │ ⑦ enforceRateLimit(channel, senderWindowId, contract)
  │ ⑧ inputSchema.parse(rawInput)
  │ ⑨ createIpcContext(...)  + setTimeout + AbortController
  │ ⑩ handler({ ...context, input })  ⇄  Promise.race(timeoutPromise)
  │ ⑪ outputSchema.parse(rawOutput)
  │ ⑫ recordAuditIfNeeded (success)
  │ ⑬ buildSuccessResult  +  logger.log
  │
  └─ catch → normalizeIpcError → recordAuditIfNeeded (failure)
             → buildErrorResult → logger.log → return
```

### 步骤 ①：测量载荷字节数

```ts
payloadSize = this.measurePayloadBytes(rawInput)
```

`measurePayloadBytes` 使用 `new TextEncoder().encode(JSON.stringify(payload)).length`。如果载荷不可序列化（含循环引用、BigInt 等），直接抛 `IPC_PAYLOAD_UNSERIALIZABLE`，进入 catch 分支。

### 步骤 ②：解析 HandlerRecord

```ts
const record = this.handlers.get(channel)
if (!record) throw createIpcError('IPC_HANDLER_NOT_FOUND', `No IPC handler is registered for ${channel}.`)
```

handler 在 `bus.start()` 之前由各 `modules/*.ipc.ts` 通过 `registerHandler` 注入。若通道未注册 handler（或模块加载顺序错误），抛 `IPC_HANDLER_NOT_FOUND`。

### 步骤 ③：解析 sender 窗口与角色

```ts
const senderWindowId = this.windowManager.getWindowIdBySenderId(event.sender?.id)
const windowRole = this.windowManager.getWindowRole(senderWindowId)
```

- `event.sender.id` 是 Electron `webContents` 的稳定 ID。
- `getWindowIdBySenderId` 把 `webContents.id` 映射到应用层 `windowId`；未注册窗口返回 `undefined`。
- `getWindowRole` 从 `WindowManager` 的窗口记录中读取角色字符串（如 `'main'`、`'settings'`、`'taskCenter'`）；未注册窗口返回 `undefined`。

注意：`windowGetCurrent` 与 `windowGetInitPayload` 等通道的 handler 始终使用 `senderWindowId` 解析窗口，从不信任 renderer 传入的 `windowId`，防止伪造。

### 步骤 ④：帧来源白名单 `isAllowedSenderFrame`

```ts
if (!this.isAllowedSenderFrame(event.senderFrame?.url)) {
  throw createIpcError('IPC_FORBIDDEN', 'Sender frame not allowed.')
}
```

实现：

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

- `undefined` 一律拒绝（防止非 Electron 上下文注入）。
- 生产环境仅放行 `file://` 与 `app://` 自有源；`http://localhost` / `http://127.0.0.1` 仅在非生产环境放行，避免生产环境 webContents 被导航到本地恶意服务后越权调用受限 IPC。
- 失败错误码：`IPC_FORBIDDEN`。

### 步骤 ⑤：权限校验 `permissionChecker`

```ts
const permissionDecision = this.permissionChecker({
  contract: record.contract,
  senderWindowId,
  windowRole
})
if (!permissionDecision.allowed) {
  throw createIpcError('IPC_FORBIDDEN', `The renderer is not allowed to call ${channel}.`, {
    reason: permissionDecision.reason
  })
}
```

`permissionChecker` 由 [ipc-permissions.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/ipc-permissions.ts) 中的 `createPermissionChecker` 创建，逻辑详见 [security.md](./security.md)。可能的 `reason`：

| reason | 含义 |
| --- | --- |
| `missing-contract-permission` | 契约未声明 `permission` 字段 |
| `unknown-window-role` | 无法解析窗口角色（未注册窗口） |
| `missing-permission` | 角色权限表中不包含该权限 |
| `devtools:open`（特殊） | 仅当 `process.env.XUANBING_DEVTOOLS === '1'` 时允许 |

失败错误码：`IPC_FORBIDDEN`。

注意：窗口模块的跨窗口控制权限（`window:control:any`）在 `permissionChecker` 之外，由 [window.ipc.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/modules/window.ipc.ts) 中的 `assertControlPermission` 二次校验，因为该判断需要对比 sender 与 target 窗口 ID。

### 步骤 ⑥：载荷大小校验

```ts
const payloadLimit = record.options.maxPayloadBytes ?? record.contract.maxPayloadBytes
if (payloadLimit !== undefined && payloadSize > payloadLimit) {
  throw createIpcError('IPC_PAYLOAD_TOO_LARGE', `The request payload for ${channel} is too large.`, {
    payloadSize,
    payloadLimit
  })
}
```

`maxPayloadBytes` 优先取 `registerHandler` 时传入的 `options`，其次取契约字段；二者都未设置时由 `defineRequestContract` 填充默认值 `64 * 1024`。失败错误码：`IPC_PAYLOAD_TOO_LARGE`。

### 步骤 ⑦：限流 `enforceRateLimit`

```ts
this.enforceRateLimit(channel, senderWindowId, record.contract)
```

实现：

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

- 按 `windowId:channel` 维度维护调用时间戳数组，构成滑动窗口令牌桶。
- 窗口过期的时间戳在每次调用前被过滤掉。
- 触发限流抛 `IPC_RATE_LIMITED`，`retryable: true`，`cause: 'rate-limit'`。
- `senderWindowId === undefined` 时跳过限流（未注册窗口在 ⑤ 已被拒绝）。
- 窗口关闭时由 `clearRateLimitForWindow(windowId)` 清理状态。

### 步骤 ⑧：输入 Zod 校验 `parseSchema(inputSchema, rawInput, channel, 'input')`

```ts
private parseSchema<TValue>(schema, value, channel, phase): TValue {
  try {
    if (typeof schema.safeParse === 'function') {
      const result = schema.safeParse(value)
      if (!result.success) throw result.error
      return result.data
    }
    return schema.parse(value)
  } catch (error) {
    if (error instanceof ZodValidationError) {
      throw createIpcError('IPC_VALIDATION_ERROR', `The ${phase} for ${channel} is invalid.`, error)
    }
    throw error
  }
}
```

- 优先使用 `safeParse`，避免抛出非 Zod 错误时污染调用栈。
- Zod 校验失败抛 `IPC_VALIDATION_ERROR`，`detail` 为 `ZodValidationError`（含 `issues: { path, message }[]`）。

### 步骤 ⑨：构造 context + 超时控制

```ts
const parsedInput = this.parseSchema(record.contract.inputSchema, rawInput, channel, 'input')
const controller = new AbortController()
const timeoutMs = record.options.timeoutMs ?? record.contract.timeoutMs ?? 15_000
const context = createIpcContext({
  channel, event, logger: this.logger, requestId,
  signal: controller.signal, startedAt, windowManager: this.windowManager
})

const timer = setTimeout(() => {
  timedOut = true
  controller.abort()
}, timeoutMs)
```

`createIpcContext`（[ipc-context.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/ipc-context.ts)）返回 `IpcRequestContext`，包含 `requestId` / `channel` / `senderWindowId` / `senderFrameUrl` / `startedAt` / `logger` / `signal` / `permissions.role`。handler 通过 `context.signal` 感知超时/取消；`task.ipc.ts` 的长任务在 `interval` 中检查 `record.controller.signal.aborted`。

`timeoutMs` 优先级：`registerHandler` 的 `options.timeoutMs` → 契约 `timeoutMs` → 默认 15_000。

### 步骤 ⑩：handler 执行 + Promise.race 超时

```ts
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

关键点：

- `handlerPromise` 单独 `.catch` 仅打印 `console.warn`，防止后台 reject 形成 unhandledRejection（源码 TODO 提到后续应将后台 reject 并入 `cause` 便于排障）。
- 超时触发 `controller.abort()`，监听器据此抛 `IPC_TIMEOUT`（`retryable: true`，`cause: 'timeout'`）。
- 其他途径触发 abort（如 `bus.dispose()` 或窗口关闭清理）抛 `IPC_ABORTED`（`cause: 'abort'`）。
- `finally` 中始终清理 timer 与 abort 监听器，避免内存泄漏。

### 步骤 ⑪：输出 Zod 校验

```ts
const parsedOutput = this.parseSchema(record.contract.outputSchema, rawOutput, channel, 'output')
```

handler 返回值再次经过 `outputSchema.parse`，防止 handler 实现偏离契约（例如多返回字段、错误枚举值）。失败抛 `IPC_VALIDATION_ERROR`。

### 步骤 ⑫：审计日志（成功路径）

成功路径下 `buildSuccessResult` 不直接写审计；审计在 `recordAuditIfNeeded` 中根据契约 `audit` 字段决定。注意：源码当前仅在 **catch 分支末尾** 调用 `recordAuditIfNeeded`，成功路径并未显式调用——这与源码注释"仅在 dispatchInvoke 成功/失败分支末尾调用"存在差异。安全审计场景应额外注意：当前实现下 `audit:true` 通道仅会在失败时落库，成功调用不会写 `audit_logs`。修改审计行为时需同步检查此处。

`recordAuditIfNeeded` 实现详见 [security.md](./security.md)。

### 步骤 ⑬：构造成功响应

```ts
return this.buildSuccessResult(parsedOutput, {
  requestId, startedAt, payloadSize, channel, senderWindowId
})
```

`buildSuccessResult` 计算 `durationMs = Date.now() - startedAt`，调用 `logger.log` 写入结构化日志条目，返回：

```ts
{ ok: true, data: parsedOutput, meta: { requestId, durationMs } }
```

## 三、失败处理与错误归一化

任意步骤抛出异常即进入 catch：

```ts
catch (error) {
  const normalized = normalizeIpcError(
    timedOut
      ? createIpcError('IPC_TIMEOUT', `${channel} timed out.`, undefined,
          error instanceof Error ? error.message : String(error), true)
      : error,
    this.environment
  )

  const errorResult = this.buildErrorResult(normalized, {
    requestId, startedAt, payloadSize, channel,
    senderWindowId: this.windowManager.getWindowIdBySenderId(event.sender?.id),
    timedOut, aborted
  })

  this.recordAuditIfNeeded(this.handlers.get(channel), {
    channel,
    senderWindowId: this.windowManager.getWindowIdBySenderId(event.sender?.id),
    requestId,
    result: 'failure',
    errorCode: normalized.code
  })

  return errorResult
}
```

### `normalizeIpcError`（[ipc-errors.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/ipc-errors.ts)）

按错误类型归一化：

| 输入类型 | 输出错误码 | 说明 |
| --- | --- | --- |
| `IpcError`（含 `ZodValidationError` 转换而来的） | 保留原 `code` | 经 `sanitizeIpcError` 脱敏后下发 |
| `DbErrorException` | `dbError.code`（如 `DB_VALIDATION`、`DB_CONFLICT` 等） | 生产环境仅下发 `safeDetail`，非生产环境附带 `devDetail` |
| 其他 `Error` | `IPC_INTERNAL_ERROR` | 生产环境 `detail=undefined`，非生产环境保留 `message` |
| 非错误值 | `IPC_INTERNAL_ERROR` | 生产环境 `detail=undefined`，非生产环境原样下发 |

### `sanitizeIpcError` 脱敏

- 生产环境 `detail` 强制置 `undefined`。
- 非生产环境调用 `sanitizeDetail` 递归清洗：
  - 字符串中的 Windows 长路径前缀 (`\\?\`)、盘符路径 (`C:\...`)、Unix 家目录路径 (`/home/...`、`/Users/...`)、`file://` URL、UNC 路径全部替换为 `[redacted-path]`。
  - 对象的 key 匹配 `/(token|secret|password|env|path|stack)/i` 时整体替换为 `[redacted]`。
  - 数组截断到前 10 项，对象截断到前 20 个 key，防止日志爆炸。

### `buildErrorResult`

调用 `logger.log` 写入 `result: 'failure'`、`errorCode`、`timedOut`、`aborted` 等字段，返回：

```ts
{ ok: false, error: normalized, meta: { requestId, durationMs } }
```

## 四、错误码速查

| 错误码 | 触发步骤 | retryable |
| --- | --- | --- |
| `IPC_PAYLOAD_UNSERIALIZABLE` | ① 载荷不可序列化 | false |
| `IPC_HANDLER_NOT_FOUND` | ② 通道未注册 handler | false |
| `IPC_FORBIDDEN` | ④ 帧来源拒绝 / ⑤ 权限不足 | false |
| `IPC_PAYLOAD_TOO_LARGE` | ⑥ 载荷超限 | false |
| `IPC_RATE_LIMITED` | ⑦ 限流触发 | true |
| `IPC_VALIDATION_ERROR` | ⑧ 输入校验 / ⑪ 输出校验失败 | false |
| `IPC_TIMEOUT` | ⑩ handler 超时 | true |
| `IPC_ABORTED` | ⑩ handler 被取消（非超时原因） | true |
| `IPC_INTERNAL_ERROR` | catch 兜底（非 IpcError / 非 DbError） | false |
| `IPC_UNKNOWN_CHANNEL` | 事件通道未注册（`requireEventContract`） | false |
| `IPC_CONFLICT` | `registerHandler` 重复注册 | false |
| `IPC_WINDOW_NOT_FOUND` | handler 内部窗口解析失败 | false |
| `IPC_NOT_READY` | 窗口未初始化（如 `windowGetInitPayload` 无 payload） | false |
| `IPC_UNSUPPORTED` | handler 显式拒绝（如混合文件/目录选择） | false |
| `IPC_TASK_LIMIT_EXCEEDED` | `TaskRegistry` 超出单窗口/全局任务上限 | true |

错误码常量定义见 [electron/ipcBus/shared/errors.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/shared/errors.ts) 的 `IPC_ERROR_CODES`。

## 五、preload 侧的解包流程

主进程返回的 `{ ok, data | error, meta }` 由 preload [client.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/preload/client.ts) 的 `safeInvoke` 处理：

```ts
async safeInvoke<TResult, TPayload>(channel, schema, payload): Promise<TResult> {
  const rawResult = await dependencies.ipcRenderer.invoke(channel, payload)
  const unwrapped = unwrapIpcResult<TResult>(rawResult)  // 用 ipcResultSchema 校验 + 解包
  return parseWithSchema(schema, unwrapped)               // 再用 outputSchema 二次校验
}

export function unwrapIpcResult<TValue>(value: unknown): TValue {
  const parsedResult = parseWithSchema(ipcResultSchema, value)
  if (!parsedResult.ok) {
    throw parsedResult.error as IpcFailureResult['error']  // 失败时抛 IpcError
  }
  return parsedResult.data as TValue
}
```

- 主进程已用 `outputSchema.parse` 校验过返回值，preload 再次校验构成双重防御，防止主进程代码偏离契约。
- 失败时抛出 `IpcError` 结构（含 `code` / `message` / `detail` / `cause` / `retryable`），渲染层可直接 catch。

## 六、文字流程图（成功路径）

```
[renderer]  window.desktop.task.start(input)
                │
[preload]   safeInvoke('task:start', taskStartResponseSchema, input)
                │ ipcRenderer.invoke
[main]      ipcMain.handle('task:start') → dispatchInvoke
                │
                ├─ measurePayloadBytes(input)
                ├─ handlers.get('task:start')  → record
                ├─ getWindowIdBySenderId / getWindowRole
                ├─ isAllowedSenderFrame(senderFrame.url)         [IPC_FORBIDDEN if fail]
                ├─ permissionChecker({ contract, senderWindowId, windowRole })
                │                                              [IPC_FORBIDDEN if fail]
                ├─ maxPayloadBytes 校验                         [IPC_PAYLOAD_TOO_LARGE if fail]
                ├─ enforceRateLimit                             [IPC_RATE_LIMITED if fail]
                ├─ inputSchema.parse(input)                     [IPC_VALIDATION_ERROR if fail]
                ├─ createIpcContext + setTimeout(30s) + AbortController
                ├─ await Promise.race([handler(ctx), abortPromise])
                │       │
                │       └─ task.ipc.ts: 创建 TaskRegistry 任务 + setInterval 推送进度
                │
                ├─ outputSchema.parse(rawOutput)                [IPC_VALIDATION_ERROR if fail]
                ├─ (recordAuditIfNeeded — 当前仅在失败分支调用)
                └─ buildSuccessResult → logger.log
                        │
[preload]   unwrapIpcResult(result) → parseWithSchema(outputSchema)
                │
[renderer]  Promise<TaskStartOutput>
```

## 七、相关文档

- [overview.md](./overview.md)：四层架构与 `IpcMainBus` 总览
- [contracts.md](./contracts.md)：契约结构与 Zod 实现
- [channels.md](./channels.md)：基于契约的全部通道清单
- [security.md](./security.md)：权限、限流、超时、审计的细节

## 八、关键源码索引

- 调度核心：[electron/ipcBus/main/ipc-main-bus.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/ipc-main-bus.ts)（`dispatchInvoke` / `enforceRateLimit` / `parseSchema` / `recordAuditIfNeeded` / `isAllowedSenderFrame` / `buildSuccessResult` / `buildErrorResult`）
- 权限检查器：[electron/ipcBus/main/ipc-permissions.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/ipc-permissions.ts)
- 错误归一化：[electron/ipcBus/main/ipc-errors.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/ipc-errors.ts)
- 上下文构造：[electron/ipcBus/main/ipc-context.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/ipc-context.ts)
- 超时工具（备用）：[electron/ipcBus/main/ipc-timeout.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/ipc-timeout.ts)
- 日志记录器：[electron/ipcBus/main/ipc-logger.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/ipc-logger.ts)
- 错误码定义：[electron/ipcBus/shared/errors.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/shared/errors.ts)
- preload 解包：[electron/ipcBus/preload/client.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/preload/client.ts)
