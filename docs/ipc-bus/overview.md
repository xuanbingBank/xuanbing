# IPC 总线概览

xuanbing(All In One)Electron 桌面应用通过一套自研的 IPC 总线统一管理主进程与渲染进程之间的所有通信。本文档描述 IPC 总线的四层架构、各层职责、三端调用模型，以及核心类 `IpcMainBus` 的关键字段与生命周期方法。

## 一、四层架构

IPC 总线按职责自底向上分为四层：共享契约层、主进程实现层、预加载层与渲染层。每一层只能依赖下层暴露的接口，禁止反向依赖。

```
┌──────────────────────────────────────────────────────────────┐
│  renderer/  渲染层                                            │
│  ┌──────────────────┐  ┌──────────┐  ┌─────────┐             │
│  │ desktop-api.ts   │  │ helpers  │  │ index   │             │
│  │ (类型与导出)      │  │ (状态构造)│  │ (统一出口)│             │
│  └──────────────────┘  └──────────┘  └─────────┘             │
└──────────────────────────────────────────────────────────────┘
                          ▲ window.desktop(由 preload 注入)
┌──────────────────────────────────────────────────────────────┐
│  preload/  预加载层                                          │
│  ┌──────────┐  ┌───────────────┐  ┌────────────┐             │
│  │ client   │  │ desktop-api   │  │ expose-api │             │
│  │ (IPC 封装)│  │ (业务 API)     │  │ (桥接注入) │             │
│  └──────────┘  └───────────────┘  └────────────┘             │
└──────────────────────────────────────────────────────────────┘
                          ▲ ipcRenderer.invoke / .on
┌──────────────────────────────────────────────────────────────┐
│  main/  主进程实现层                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐  │
│  │ IpcMainBus   │  │ ipc-permits  │  │ ipc-logger          │  │
│  │ (核心调度)    │  │ (权限检查)    │  │ ipc-timeout         │  │
│  └──────────────┘  └──────────────┘  │ ipc-context/errors  │  │
│  ┌──────────────┐  ┌──────────────┐  └─────────────────────┘  │
│  │ window-mgr   │  │ task-registry │  ┌─────────────────────┐  │
│  └──────────────┘  └──────────────┘  │ modules/*.ipc.ts    │  │
│                                       │ (9 个业务模块)        │  │
│                                       └─────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                          ▲ 引用契约
┌──────────────────────────────────────────────────────────────┐
│  shared/  共享契约层                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │ constants│ │ contracts│ │ schemas  │ │ types    │         │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘         │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────────────┐       │
│  │ errors   │ │ zod      │ │ database/(DB 共享类型)    │       │
│  └──────────┘ └──────────┘ └──────────────────────────┘       │
└──────────────────────────────────────────────────────────────┘
```

### 各层职责

| 层级 | 目录 | 职责 |
| --- | --- | --- |
| shared | [electron/ipcBus/shared](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/shared) | 定义通道常量、权限常量、契约结构、Zod 自研实现、错误码与统一结果类型；同时通过 `database/` 子目录提供数据库相关的共享枚举与分页类型。该层在主进程与 preload/renderer 之间作为唯一可信契约源。 |
| main | [electron/ipcBus/main](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main) | 实现 `IpcMainBus` 调度核心，负责权限校验、限流、超时、Zod 校验、handler 执行、审计日志与序列化；管理窗口与任务注册表；按 9 个业务模块装配具体 handler。 |
| preload | [electron/ipcBus/preload](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/preload) | 通过 `contextBridge.exposeInMainWorld` 暴露 `window.desktop`；封装 `ipcRenderer.invoke`/`on`；对返回结果进行统一解包与二次 Zod 校验。 |
| renderer | [electron/ipcBus/renderer](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/renderer) | 仅声明业务类型与状态构造工具；渲染层代码只通过 `window.desktop.*` 调用，不感知任何底层 IPC 通道字符串。 |

## 二、三端调用模型

一次完整的请求-响应调用从渲染层发起，经 preload 进入 Electron IPC 通道，最终由主进程 `IpcMainBus.dispatchInvoke` 统一处理后原路返回。事件订阅方向相反（主进程 → 渲染层）。

```
渲染进程                      preload                       主进程
─────────────────────────────────────────────────────────────────────
window.desktop                createPreloadClient           ipcMain.handle(channel, dispatchInvoke)
  .app.getInfo()    ───►     safeInvoke(channel,            ───►  ① 解析 sender 窗口/role
                              outputSchema, {})                    ② isAllowedSenderFrame
                                                                   ③ permissionChecker
                 ◄───        ipcRenderer.invoke                   ④ maxPayloadBytes / rateLimit
                              (channel, payload)                   ⑤ inputSchema.parse
                                                                   ⑥ timeout + handler(ctx)
                 ◄───        unwrapIpcResult                      ⑦ outputSchema.parse
                              parseWithSchema                      ⑧ audit (if audit:true)
                                                                   ⑨ buildSuccessResult / ErrorResult
```

请求方向：

1. 渲染层调用 `window.desktop.<ns>.<method>(input)`，类型由 `DesktopCommand<TInput, TOutput>` 推导。
2. preload 层 `desktop-api.ts` 把方法转译为 `client.safeInvoke(channel, outputSchema, payload)`。
3. `client.ts` 调用 `ipcRenderer.invoke(channel, payload)`，将结果用 `ipcResultSchema` 解包，再用 `outputSchema` 二次校验后返回。
4. 主进程 `ipcMain.handle(channel, (event, payload) => dispatchInvoke(channel, event, payload))` 接收请求，执行完整链路。
5. 主进程将 `{ ok, data | error, meta }` 结构化结果返回；preload 解包后把 `data` 返回渲染层，遇 `ok:false` 抛出 `IpcError`。

事件方向（仅 `main-to-renderer`）：

1. 主进程 `bus.sendToWindow(windowId, eventChannel, payload)` 或 `bus.broadcast(eventChannel, payload)`。
2. `bus` 先用 `eventRegistry` 中的 `payloadSchema` 校验载荷，再交给 `WindowManager` 投递。
3. preload 通过 `client.subscribe(channel, schema, listener)` 监听，回调前再次用 schema 校验。
4. 渲染层通过 `window.desktop.<ns>.onXxx(listener)` 收到强类型载荷。

## 三、IpcMainBus 核心字段

`IpcMainBus` 是主进程侧唯一的 IPC 调度入口，定义于 [electron/ipcBus/main/ipc-main-bus.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/ipc-main-bus.ts)。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `ipcMain` | `IpcMainLike` | Electron `ipcMain` 的最小接口封装，仅暴露 `handle` / `removeHandler`，便于测试注入 mock。 |
| `logger` | `IpcLogger` | 结构化日志记录器，保留最近 5000 条调用流水到内存缓冲，并在非生产环境打印控制台日志；慢请求超过 `slowRequestThresholdMs` 时 `console.warn`。 |
| `windowManager` | `WindowManager` | 旧窗口管理器，提供 `getWindowIdBySenderId` / `getWindowRole` / `sendToWindow` / `broadcast`，用于解析 IPC `sender` 与投递事件。 |
| `environment` | `string` | `'production'` 或 `'development'`，决定 `isAllowedSenderFrame` 白名单与错误脱敏策略。 |
| `auditRepository` | `AuditRepository?` | 审计日志仓库；为空时跳过审计写入。`audit:true` 通道在每次调用末尾向 `audit_logs` 表写入一条记录。 |
| `permissionChecker` | `ReturnType<createPermissionChecker>` | 权限检查器，封装 `rolePermissions` 映射与 `devtools:open` 环境开关；输入契约 + 窗口角色，输出 `PermissionDecision`。 |
| `handlers` | `Map<string, HandlerRecord>` | 已注册的请求处理器；启动后由 `requestContracts` 全部登记，模块通过 `registerHandler` 补充实现。 |
| `eventRegistry` | `Map<string, EventContractLike>` | 事件契约注册表，构造函数中遍历 `eventContracts` 全部登记。 |
| `subscriptions` / `activeSubscriptions` | `Map` | 主进程到渲染层的事件订阅源（按窗口分组），用于按窗口清理。 |
| `rateLimitState` | `Map<string, number[]>` | 单窗口单通道的调用时间戳数组，构成令牌桶限流状态。 |

`IpcMainBusOptions` 完整定义：

```ts
export interface IpcMainBusOptions {
  ipcMain: IpcMainLike
  logger: IpcLogger
  windowManager: WindowManager
  environment: string
  rolePermissions?: Record<string, string[]>
  auditRepository?: AuditRepository
}
```

装配过程见 [electron/ipcBus/main/index.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/index.ts) 中的 `createMainIpcRuntime`：先创建 `WindowManager`、`IpcLogger`，从 `DEFAULT_WINDOW_ROLE_PERMISSIONS` 派生 `rolePermissions`（详见 [security.md](./security.md)），实例化 `AuditRepository`，再 `new IpcMainBus({...})`，然后按 9 个模块依次调用 `registerXxxIpc(bus, deps)`，最后 `await bus.start()`。

## 四、生命周期方法

### `bus.start()`

启动总线，幂等。源码片段：

```ts
public async start(): Promise<void> {
  if (this.started) return
  for (const contract of Object.values(requestContracts) as ...) {
    this.ipcMain.handle(contract.channel, (event, payload) =>
      this.dispatchInvoke(contract.channel, event, payload))
  }
  this.started = true
}
```

- 遍历 `shared/contracts.ts` 中的全部 `requestContracts`，对每个通道在 `ipcMain` 上注册 `handle` 监听。
- 实际的 handler 实现由各 `modules/*.ipc.ts` 在 `start()` 之前通过 `bus.registerHandler` 注入；`dispatchInvoke` 通过 `this.handlers.get(channel)` 解析对应记录。
- 必须在数据库 migrations 完成、所有 `registerXxxIpc` 调用之后调用，否则 `dispatchInvoke` 会因找不到 handler 抛 `IPC_HANDLER_NOT_FOUND`。

### `bus.dispose()`

释放总线：

- 调用 `ipcMain.removeHandler(channel)` 移除全部请求通道监听。
- 遍历 `activeSubscriptions` 调用 `cleanupWindow(windowId)`，取消所有窗口级订阅。
- 清空 `handlers` / `rateLimitState` / `eventRegistry` / `subscriptions`，置 `started=false`。

### `bus.cleanupWindow(windowId)`

窗口关闭时的统一清理钩子，由 `createMainIpcRuntime` 订阅 `newWindowManager.getEventBus().on('window:closed', ...)` 联动调用：

- 调用 `clearRateLimitForWindow(windowId)`，删除该窗口前缀 (`${windowId}:`) 下的全部限流状态，避免窗口关闭后残留计数影响后续窗口。
- 取消该窗口下的全部事件订阅（`activeSubscriptions.get(windowId)`）。
- 配合 `taskRegistry.cleanupWindow(windowId)` 一并终止该窗口的全部长任务。

### 其他常用方法

| 方法 | 说明 |
| --- | --- |
| `registerHandler(contract, handler, options?)` | 注册请求处理器；同名通道重复注册抛 `IPC_CONFLICT`。 |
| `registerEvent(contract)` | 注册事件契约；构造函数已预登记 `eventContracts`，模块通常直接复用。 |
| `registerSubscription(contract, subscribe)` | 注册主进程到渲染层的事件订阅源。 |
| `activateSubscription(windowId, eventChannel, input)` | 为指定窗口激活订阅，返回 unsubscribe 回调。 |
| `sendToWindow(windowId, channel, payload)` | 向指定窗口发送事件（经 `payloadSchema` 校验）。 |
| `broadcast(channel, payload)` | 向全部窗口广播（当前未按 `contract.permission` 过滤接收方，源码 TODO 标注）。 |
| `sendToFocusedWindow(channel, payload)` | 向当前聚焦窗口发送。 |
| `clearRateLimitForWindow(windowId)` | 单独清理指定窗口的限流状态。 |
| `hasHandler(channel)` / `listHandlers()` | 调试与运行时自省。 |

## 五、相关文档

- [contracts.md](./contracts.md)：契约系统、Zod 自研实现与类型推导
- [dispatch-flow.md](./dispatch-flow.md)：`dispatchInvoke` 完整链路时序
- [channels.md](./channels.md)：全部请求/事件通道清单
- [security.md](./security.md)：权限、限流、超时、审计

## 六、关键源码索引

- 总线核心：[electron/ipcBus/main/ipc-main-bus.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/ipc-main-bus.ts)
- 主进程装配：[electron/ipcBus/main/index.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/index.ts)
- 共享契约出口：[electron/ipcBus/shared/index.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/shared/index.ts)
- preload 客户端：[electron/ipcBus/preload/client.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/preload/client.ts)
- preload 业务 API：[electron/ipcBus/preload/desktop-api.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/preload/desktop-api.ts)
- preload 桥接注入：[electron/ipcBus/preload/expose-api.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/preload/expose-api.ts)
- 渲染层类型：[electron/ipcBus/renderer/desktop-api.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/renderer/desktop-api.ts)
- 渲染层全局类型：[electron/ipcBus/renderer/global.d.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/renderer/global.d.ts)
