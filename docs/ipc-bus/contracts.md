# 契约系统

契约（Contract）是 IPC 总线的"单一定义源"。每一条请求通道与事件通道都在 `shared/contracts.ts` 中以契约对象的形式集中声明，主进程、preload 与渲染层均通过引用契约获得通道名、权限、Schema、超时等元数据，从而杜绝散落的字符串字面量与重复类型定义。

本文档覆盖契约结构、自研 Zod 实现、类型推导，以及添加新契约的标准流程。

## 一、契约在四层之间的流转

```
shared/contracts.ts ──► main/modules/*.ipc.ts          (注册 handler)
                   ──► preload/desktop-api.ts           (绑定通道 + outputSchema)
                   ──► renderer/desktop-api.ts          (InferRequestInput/Output 推导业务类型)
```

`requestContracts` 与 `eventContracts` 是两个 `as const satisfies ...Map` 的导出常量，定义于 [electron/ipcBus/shared/contracts.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/shared/contracts.ts)。

## 二、RequestContract 结构

请求契约描述一次"请求-响应"调用的全部约束。类型定义见 [electron/ipcBus/shared/types.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/shared/types.ts)：

```ts
export interface IpcContractMetadata<TPermission extends IpcPermission> {
  description: string
  permission: TPermission
  audit?: boolean
  rateLimit?: IpcRateLimit
  maxPayloadBytes?: number
}

export interface RequestContract<
  TInputSchema extends ZodSchema<unknown>,
  TOutputSchema extends ZodSchema<unknown>,
  TPermission extends IpcPermission = IpcPermission,
  TChannel extends IpcRequestChannel = IpcRequestChannel
> extends IpcContractMetadata<TPermission> {
  channel: TChannel
  inputSchema: TInputSchema
  outputSchema: TOutputSchema
  timeoutMs: number
}
```

| 字段 | 含义 | 示例 |
| --- | --- | --- |
| `channel` | 通道名，类型受 `IpcRequestChannel` 约束（来自 `IPC_CHANNELS` 常量集合）。 | `'task:start'` |
| `description` | 人类可读说明，用于文档与日志。 | `'启动一个可跟踪、可取消的长任务。'` |
| `permission` | 必需权限，类型受 `IpcPermission` 约束。`public` 表示所有窗口可见。 | `'task:run'` |
| `inputSchema` / `outputSchema` | 自研 Zod 模型，对入参与返回值做运行时校验。 | `taskStartRequestSchema` |
| `timeoutMs` | 调用超时（毫秒）。未指定时由 `defineRequestContract` 填充 `DEFAULT_IPC_TIMEOUT_MS = 15_000`。 | `30_000` |
| `maxPayloadBytes` | 入参 JSON 序列化后的字节上限。未指定时填充 `DEFAULT_IPC_MAX_PAYLOAD_BYTES = 64 * 1024`。 | `128 * 1024` |
| `rateLimit` | 单窗口令牌桶限流 `{ maxCalls, windowMs }`。未指定表示不限流。 | `{ maxCalls: 10, windowMs: 60_000 }` |
| `audit` | 为 `true` 时，调用结束（成功或失败）向 `audit_logs` 表写入一条记录。 | `true` |

### `defineRequestContract` 工厂

为避免每个契约重复填写默认值，契约文件提供了工厂函数：

```ts
export function defineRequestContract<...>(definition): RequestContract<...> {
  return {
    ...definition,
    timeoutMs: definition.timeoutMs ?? DEFAULT_IPC_TIMEOUT_MS,
    maxPayloadBytes: definition.maxPayloadBytes ?? DEFAULT_IPC_MAX_PAYLOAD_BYTES
  }
}
```

无入参的契约可使用 `createEmptyObjectSchema()`（即 `z.object({})`）作为 `inputSchema`，例如 `app:info.get`、`window:list`、`window:getCurrent`、`window:closeAll`、`window:getInitPayload` 等。

## 三、EventContract 结构

事件契约描述"主进程 → 渲染层"的单向推送。类型定义：

```ts
export interface EventContract<
  TPayloadSchema extends ZodSchema<unknown>,
  TPermission extends IpcPermission = IpcPermission,
  TEvent extends IpcEventChannel = IpcEventChannel
> extends IpcContractMetadata<TPermission> {
  event: TEvent
  direction: IpcEventDirection  // 'main-to-renderer' | 'renderer-to-main'
  payloadSchema: TPayloadSchema
}
```

| 字段 | 含义 |
| --- | --- |
| `event` | 事件通道名，受 `IpcEventChannel` 约束（来自 `IPC_EVENTS`）。 |
| `direction` | 当前所有事件均为 `main-to-renderer`。 |
| `payloadSchema` | 推送载荷的 Zod 模型，主进程发送前与 preload 接收前都会 `parse`。 |
| `permission` / `audit` | 与请求契约语义一致；`audit:true` 的事件目前仅 `task:failed`。 |

事件契约工厂 `defineEventContract` 直接返回原对象（暂无默认值填充），便于后续扩展。

## 四、Zod 自研实现

为避免引入第三方依赖并保留运行时校验能力，IPC 总线在 [electron/ipcBus/shared/zod.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/shared/zod.ts) 中实现了一套轻量 zod。核心 API 与官方 zod 子集保持一致，便于未来切换。

### ZodSchema 接口

```ts
export interface ZodSchema<TValue> {
  parse(input: unknown): TValue
  safeParse(input: unknown): ZodSafeParseResult<TValue>
  optional(): ZodSchema<TValue | undefined>
  nullable(): ZodSchema<TValue | null>
  array(): ZodSchema<TValue[]>
  default(defaultValue: TValue): ZodSchema<TValue>
  parseAtPath(input: unknown, path: readonly (string | number)[]): TValue
}
```

实现类 `SimpleZodSchema<TValue>` 持有一个 `parser: (input, path) => TValue` 函数；`parse` 即以空路径调用 `parseAtPath`。`safeParse` 在内部 `try/catch` 捕获 `ZodValidationError` 并返回 `{ success, data | error }`。

### 工厂集合 `z`

```ts
export const z = {
  string,        // 支持 { minLength, maxLength, trim }
  number,        // 支持 { min, max, integer }
  boolean,
  unknown,
  literal,       // 接受 string | number | boolean | null
  enum,          // 接受 readonly string[]，返回联合类型
  array,         // 支持 { minLength, maxLength }
  object,        // 默认 strip 模式，未知字段仅 console.warn
  objectStrict,  // 安全敏感契约使用，未知字段抛 ZodValidationError
  union          // 接受候选 schema 数组，按顺序 safeParse
} as const
```

### 错误与路径

- `ZodValidationError` 继承 `Error`，持有 `issues: ZodIssue[]`（`{ path, message }`）。
- `formatPath` 把路径片段拼接为 `'value.foo[0].bar'` 形式，便于排错。
- `object()` 在遇到未声明字段时仅 `console.warn('[zod] object() received unknown fields', unknownKeys)`；安全敏感场景应改用 `objectStrict()`，否则字段注入可能逃逸校验。

### Schema 组合

`optional()` / `nullable()` / `array()` / `default()` 返回新的 `SimpleZodSchema`，链式调用即可表达嵌套结构：

```ts
const settingSetRequestSchema = z.object({
  namespace: z.string({ minLength: 1 }),
  key: z.string({ minLength: 1 }),
  value: z.unknown(),
  valueType: z.enum(['string', 'number', 'boolean', 'json', 'null']).optional(),
  description: z.string().optional()
})
```

## 五、Schema 仓库

具体 schema 集中维护于 [electron/ipcBus/shared/schemas.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/shared/schemas.ts)。除自研 schema 外，还透传来自 `electron/windows/shared/window-schemas.ts` 的窗口管理相关模型（`openWindowRequestSchema` / `windowControlRequestSchema` / `windowListResponseSchema` 等），避免重复定义。`ipcResultSchema` 与 `ipcErrorSchema` 是统一结果包装的校验模型，由 preload `unwrapIpcResult` 使用。

`shared/index.ts` 同时导出 schema 实例与 `InferRequestInput` / `InferRequestOutput` / `InferEventPayload` 推导出的业务类型别名，供渲染层 `renderer/desktop-api.ts` 引用。

## 六、类型推导

契约层借助 TypeScript 条件类型从 Zod schema 自动推导业务类型，避免手写重复接口。

### ZodSchema 推导

```ts
export type InferZodSchema<TSchema extends ZodSchema<unknown>> =
  TSchema extends ZodSchema<infer TValue> ? TValue : never
```

`SimpleZodSchema<TValue>` 通过实现 `ZodSchema<TValue>` 让 `infer TValue` 正确工作。

### 契约推导

```ts
export type InferRequestInput<TContract extends RequestContract<...>> =
  InferSchema<TContract['inputSchema']>

export type InferRequestOutput<TContract extends RequestContract<...>> =
  InferSchema<TContract['outputSchema']>

export type InferEventPayload<TContract extends EventContract<...>> =
  InferSchema<TContract['payloadSchema']>
```

### 渲染层用法

渲染层不直接 import schema 实例，而是从契约映射推导出业务类型别名：

```ts
// electron/ipcBus/renderer/desktop-api.ts
export type AppInfo = InferRequestOutput<(typeof requestContracts)[typeof IPC_CHANNELS.appInfoGet]>
export type FileDialogInput = InferRequestInput<(typeof requestContracts)[typeof IPC_CHANNELS.fileDialogOpen]>
export type TaskProgressPayload = InferEventPayload<(typeof eventContracts)[typeof IPC_EVENTS.taskProgress]>
```

由此保证渲染层与契约层类型一致：契约 schema 改动后，渲染层类型在编译期立即失配。

### `as ZodSchema` 断言的注释

`contracts.ts` 中 `databaseClearLogs`、`taskDataDelete`、`settingDelete` 三处保留了 `as ZodSchema<...>` 断言，并在源码注释中明确说明：移除断言后 `InferZodSchema` 无法解析具体 `ZodObject` 类型，会在 `types.ts` 的 `InferRequestInput` 中触发类型实例化错误。修改这些契约时需保留断言。

## 七、添加一个新契约

以下步骤以"在 setting 模块新增一个 `setting:reset` 通道"为例。

### 步骤 1：在 `IPC_CHANNELS` 中登记通道名

编辑 [electron/ipcBus/shared/constants.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/shared/constants.ts)：

```ts
export const IPC_CHANNELS = {
  // ...
  settingReset: 'setting:reset'
} as const
```

`as const` 保证 `IpcRequestChannel` 联合类型自动扩展。

### 步骤 2：（如需新权限）在 `IPC_PERMISSIONS` 中登记

```ts
export const IPC_PERMISSIONS = {
  // ...
  settingReset: 'setting:reset'
} as const
```

新权限需在 [security.md](./security.md) 描述的 `rolePermissions` 派生逻辑中授予对应角色。

### 步骤 3：在 `schemas.ts` 中定义输入/输出 schema

```ts
export const settingResetRequestSchema = z.object({
  namespace: z.string({ minLength: 1 })
})
export const settingResetResponseSchema = z.object({
  reset: z.boolean()
})
```

### 步骤 4：在 `contracts.ts` 中追加契约

```ts
[IPC_CHANNELS.settingReset]: defineRequestContract({
  channel: IPC_CHANNELS.settingReset,
  description: '按 namespace 重置设置项到默认值。',
  permission: IPC_PERMISSIONS.settingWrite,
  inputSchema: settingResetRequestSchema,
  outputSchema: settingResetResponseSchema,
  timeoutMs: DEFAULT_IPC_TIMEOUT_MS,
  maxPayloadBytes: DEFAULT_IPC_MAX_PAYLOAD_BYTES,
  audit: true
})
```

由于 `requestContracts` 使用 `as const satisfies RequestContractMap`，新增通道会立即被 `RequestContractMap` 校验：漏填字段、权限字符串不匹配、channel 名不在 `IpcRequestChannel` 中均会在编译期报错。

### 步骤 5：在 `modules/setting.ipc.ts` 中注册 handler

参考 [electron/ipcBus/main/modules/setting.ipc.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/modules/setting.ipc.ts)：

```ts
bus.registerHandler(requestContracts[IPC_CHANNELS.settingReset], async ({ input }) => {
  const resetInput = input as { namespace: string }
  return settingService.reset(resetInput.namespace)
})
```

handler 收到的 `context` 包含 `input`（经 `inputSchema.parse` 后的强类型值）、`senderWindowId`、`signal`、`logger` 等字段（详见 [dispatch-flow.md](./dispatch-flow.md)）。

### 步骤 6：在 `preload/desktop-api.ts` 中暴露方法

参考 [electron/ipcBus/preload/desktop-api.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/preload/desktop-api.ts)：

```ts
reset: (namespace: string) => client.safeInvoke(
  IPC_CHANNELS.settingReset,
  requestContracts[IPC_CHANNELS.settingReset].outputSchema,
  { namespace }
)
```

`safeInvoke` 会自动：① 调用 `ipcRenderer.invoke` → ② `unwrapIpcResult` 解统一包 → ③ 用 `outputSchema` 二次校验返回值。

### 步骤 7：在 `renderer/desktop-api.ts` 中声明业务类型与接口

```ts
export type SettingResetInput = InferRequestInput<(typeof requestContracts)[typeof IPC_CHANNELS.settingReset]>
export type SettingResetOutput = InferRequestOutput<(typeof requestContracts)[typeof IPC_CHANNELS.settingReset]>

export interface DesktopSettingApi {
  // ...
  reset: (namespace: string) => Promise<SettingResetOutput>
}
```

### 步骤 8：（事件契约）若新增事件，在模块中调用 `bus.registerEvent` 与 `bus.registerSubscription`

参考 [task.ipc.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/modules/task.ipc.ts) 与 [window.ipc.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/modules/window.ipc.ts) 中的 `bus.registerEvent(eventContracts[IPC_EVENTS.xxx])`。preload 侧使用 `client.subscribe(channel, schema, listener)` 暴露 `onXxx` 方法。

## 八、契约硬约束

根据 [security.md](./security.md) 中的"IPC 契约硬约束"，所有新增请求通道必须满足：

1. **Zod 校验**：必须提供 `inputSchema` 与 `outputSchema`，无入参时使用 `createEmptyObjectSchema()`。
2. **权限**：必须声明非空 `permission`；`public` 仅限真正无敏感信息的通道（如 `app:info.get`、`window:getCurrent`、`window:getInitPayload`）。
3. **限流**：面向用户输入或外部资源的通道（对话框、任务启动）建议配置 `rateLimit`。
4. **超时**：长任务通道显式调大 `timeoutMs`（如 `database:restore` 120s、`xuanbingFile:importPackage` 120s）。
5. **审计**：写入/删除/导出/导入等敏感操作必须 `audit: true`。

## 九、相关文档

- [overview.md](./overview.md)：四层架构与 `IpcMainBus` 总览
- [dispatch-flow.md](./dispatch-flow.md)：契约如何在 `dispatchInvoke` 链路中被使用
- [channels.md](./channels.md)：基于契约的全部通道清单
- [security.md](./security.md)：权限、限流、超时、审计的执行细节

## 十、关键源码索引

- 契约汇总：[electron/ipcBus/shared/contracts.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/shared/contracts.ts)
- 通道/事件/权限常量：[electron/ipcBus/shared/constants.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/shared/constants.ts)
- 契约类型：[electron/ipcBus/shared/types.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/shared/types.ts)
- Zod 自研实现：[electron/ipcBus/shared/zod.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/shared/zod.ts)
- Schema 仓库：[electron/ipcBus/shared/schemas.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/shared/schemas.ts)
- 共享出口：[electron/ipcBus/shared/index.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/shared/index.ts)
- 错误码与结果类型：[electron/ipcBus/shared/errors.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/shared/errors.ts)
