# Electron IPC API 扩展标准步骤

> 面向后续持续扩展新 IPC API 的开发者。本文档以「契约驱动、主进程实现、preload 桥接、渲染层调用、测试兜底」为主线，覆盖一次完整扩展的所有必做步骤。

阅读前请先了解项目已有能力与文档：

- 架构与设计思路：[electron-ipc-bus-design.md](./2026-06-19-electron-ipc-bus-design.md)
- 共享层源码：`electron/ipcBus/shared/`
- 主进程模块：`electron/ipcBus/main/modules/`
- preload 层：`electron/ipcBus/preload/`
- 渲染层类型与桌面 API：`electron/ipcBus/renderer/`
- 测试目录：`test/ipc/`

执行命令：

```bash
pnpm typecheck   # 类型检查
pnpm build       # 编译到 dist/
pnpm test        # 运行单测（依赖 build 产物）
pnpm start       # 本地启动 Electron 应用
```

---

## 0. 扩展前的设计决策

在动手前，请先回答下面四个问题并在需求中体现：

| 问题 | 决策示例 | 影响位置 |
| --- | --- | --- |
| **这个 API 属于哪个业务域？** | `app` / `file` / `task` / `window`，还是需要新建域？ | preload 命名空间与模块文件命名 |
| **请求/响应长什么样？** | 需要哪些字段、类型、最小/最大长度、是否可选 | `shared/schemas.ts` 的 zod schema |
| **需要什么权限？** | 是否只读、是否需要审计、是否限流 | `shared/constants.ts` 的 `IPC_PERMISSIONS`，`contracts` 中的 `permission` / `audit` / `rateLimit` |
| **是一次性请求还是带事件的流式调用？** | 一次性请求用 `requestContracts`；有进度/推送事件时同时新增 `eventContracts` | `contracts.ts` 与 `modules/*.ipc.ts` 中的事件注册 |

> 原则：**共享契约即 API 文档**。任何新增通道都必须在 `shared` 层完备定义，preload 与 main 只做契约的实现与调用，不能另开后门。

---

## 1. 共享层：新增通道、契约、schema 与类型

文件：

- [electron/ipcBus/shared/constants.ts](file:///c:/Users/13002/Documents/all-in-one/electron/ipcBus/shared/constants.ts)
- [electron/ipcBus/shared/schemas.ts](file:///c:/Users/13002/Documents/all-in-one/electron/ipcBus/shared/schemas.ts)
- [electron/ipcBus/shared/types.ts](file:///c:/Users/13002/Documents/all-in-one/electron/ipcBus/shared/types.ts)（一般不需要改，除非你要新增公共语义类型）
- [electron/ipcBus/shared/contracts.ts](file:///c:/Users/13002/Documents/all-in-one/electron/ipcBus/shared/contracts.ts)
- [electron/ipcBus/shared/index.ts](file:///c:/Users/13002/Documents/all-in-one/electron/ipcBus/shared/index.ts)（按需导出）

### 1.1 定义通道常量

在 `IPC_CHANNELS` 中新增一个键，命名约定：`领域:动作.目标`。例如：

```ts
export const IPC_CHANNELS = {
  appInfoGet: 'app:info.get',
  fileDialogOpen: 'file:dialog.open',
  windowMinimize: 'window:minimize',
  windowMaximize: 'window:maximize',
  windowClose: 'window:close',
  taskStart: 'task:start',
  taskCancel: 'task:cancel',
  // 新增：读取应用偏好设置
  appPreferencesGet: 'app:preferences.get'
} as const
```

如果需要伴随事件（如任务进度、异步通知），在 `IPC_EVENTS` 中新增：

```ts
export const IPC_EVENTS = {
  taskProgress: 'task:progress',
  taskCompleted: 'task:completed',
  taskFailed: 'task:failed',
  windowFocusChanged: 'window:focus.changed'
} as const
```

如果需要新的权限类别，在 `IPC_PERMISSIONS` 中新增（优先复用现有权限，只有在需要独立授权的新域时才新增）：

```ts
export const IPC_PERMISSIONS = {
  public: 'public',
  appRead: 'app:read',
  fileRead: 'file:read',
  fileWrite: 'file:write',
  windowControl: 'window:control',
  systemRead: 'system:read',
  systemWrite: 'system:write',
  taskRun: 'task:run',
  taskCancel: 'task:cancel',
  devtoolsOpen: 'devtools:open'
} as const
```

### 1.2 定义输入/输出 schema

在 `electron/ipcBus/shared/schemas.ts` 中用 `zod` 定义 input / output schema。命名约定：

- 输入：`{领域}{动作}RequestSchema`
- 输出：`{领域}{动作}ResponseSchema`

示例：

```ts
// ========== app:preferences.get ==========
export const appPreferencesRequestSchema = z.object({
  scope: z.enum(['user', 'system'] as const).optional()
})

export const appPreferencesResponseSchema = z.object({
  theme: z.enum(['light', 'dark', 'system'] as const),
  locale: z.string({ minLength: 2, maxLength: 16 }),
  enableAnalytics: z.boolean()
})
```

> 对于「无参数」的请求，请使用 `z.object({})` 作为 input schema，不要直接传 `undefined`，以保持请求结构统一。

> 对于「枚举」类字段，请使用 `z.enum([...])` 明确列出可选值，避免在业务代码里出现裸字符串。

### 1.3 把通道注册到契约表

在 `electron/ipcBus/shared/contracts.ts` 的 `requestContracts` 对象中新增条目：

```ts
export const requestContracts = {
  // ... 已有条目保持不变

  [IPC_CHANNELS.appPreferencesGet]: defineRequestContract({
    channel: IPC_CHANNELS.appPreferencesGet,
    description: '读取应用当前偏好设置（主题、语言、匿名统计开关）。',
    permission: IPC_PERMISSIONS.appRead,
    inputSchema: appPreferencesRequestSchema,
    outputSchema: appPreferencesResponseSchema,
    timeoutMs: DEFAULT_IPC_TIMEOUT_MS,
    maxPayloadBytes: DEFAULT_IPC_MAX_PAYLOAD_BYTES,
    audit: false,
    rateLimit: {
      maxCalls: 30,
      windowMs: 60_000
    }
  })
} as const satisfies RequestContractMap
```

契约字段说明：

| 字段 | 含义 | 建议 |
| --- | --- | --- |
| `channel` | 通道字符串，必须与 `IPC_CHANNELS` 中值一致 | 必填 |
| `description` | 人类可读描述 | 必填，用于审计日志与文档 |
| `permission` | 权限键 | 必填，见 `IPC_PERMISSIONS` |
| `inputSchema` / `outputSchema` | zod schema | 必填 |
| `timeoutMs` | 超时（毫秒） | 默认 `DEFAULT_IPC_TIMEOUT_MS = 15_000` |
| `maxPayloadBytes` | 请求体大小上限 | 默认 `DEFAULT_IPC_MAX_PAYLOAD_BYTES = 64 * 1024` |
| `audit` | 是否写入审计日志 | 涉及用户可追溯操作的通道一律 `true` |
| `rateLimit` | 限流 | 对外部资源、文件系统等做节流 |

如果新增事件通道，则同时在 `eventContracts` 中注册：

```ts
export const eventContracts = {
  // ... 已有条目保持不变

  [IPC_EVENTS.xxxUpdated]: defineEventContract({
    event: IPC_EVENTS.xxxUpdated,
    description: 'xxx 变更事件。',
    direction: 'main-to-renderer',
    permission: IPC_PERMISSIONS.appRead,
    payloadSchema: xxxUpdatedEventSchema,
    audit: false
  })
} as const satisfies EventContractMap
```

### 1.4 导出 schema

在 `electron/ipcBus/shared/index.ts` 的 `schemas` 导出块中加入新增的 schema 名字，以便后续模块能直接 import：

```ts
export {
  // ... 已有
  appPreferencesRequestSchema,
  appPreferencesResponseSchema
} from './schemas'
```

---

## 2. 主进程：注册 handler

文件：`electron/ipcBus/main/modules/*.ipc.ts`（新增或在现有文件中扩展），并在 `electron/main.ts` 中统一调用注册函数。

### 2.1 在模块中实现 handler

新增文件 `electron/ipcBus/main/modules/app.ipc.ts`（如果已存在则在其中扩展）：

```ts
import { IPC_CHANNELS, requestContracts } from '../../shared'
import type { IpcMainBus } from '../ipc-main-bus'

/**
 * 注册应用相关 IPC 能力。
 */
export function registerAppIpc(bus: IpcMainBus): void {
  bus.registerHandler(requestContracts[IPC_CHANNELS.appInfoGet], async () => {
    // ... 已有实现保持不变
  })

  bus.registerHandler(requestContracts[IPC_CHANNELS.appPreferencesGet], async ({ input }) => {
    const preferencesInput = input as { scope?: 'user' | 'system' }

    // 业务实现示例：
    const theme = preferencesInput.scope === 'system' ? 'system' : 'light'
    const locale = 'zh-CN'
    const enableAnalytics = false

    return {
      theme,
      locale,
      enableAnalytics
    }
  })
}
```

handler 上下文对象 `context` 里你可以用到的关键内容：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `input` | 经 `inputSchema` 解析后的输入 | 建议在函数首行显式声明本地类型 |
| `signal` | `AbortSignal` | 超时/取消信号，用来中断子操作 |
| `senderWindowId` | `number \| undefined` | 发起调用的窗口 ID |
| `requestId` | `string` | 请求唯一 ID，用于日志 |
| `logger` | `IpcLogger` | 结构化日志器 |
| `windowManager` | `WindowManager` | 管理窗口实例 |

> handler 中如果遇到需要对外报错的场景，请使用 `createIpcError(code, message, detail?, cause?, retryable?)`，不要直接 `throw new Error(...)`。已提供 error code 在 `IPC_ERROR_CODES` 中。

### 2.2 在 `electron/main.ts` 中调用注册函数

在主进程启动流程中实例化 `IpcMainBus`，然后调用各模块注册函数：

```ts
import { IpcMainBus } from './ipcBus/main/ipc-main-bus'
import { registerAppIpc } from './ipcBus/main/modules/app.ipc'
import { registerFileIpc } from './ipcBus/main/modules/file.ipc'
import { registerWindowIpc } from './ipcBus/main/modules/window.ipc'
import { registerTaskIpc } from './ipcBus/main/modules/task.ipc'

async function bootstrap() {
  // ... 已有启动流程

  const bus = new IpcMainBus({
    ipcMain: require('electron').ipcMain,
    logger: new IpcLogger({ environment: process.env.NODE_ENV ?? 'development', slowRequestThresholdMs: 500 }),
    windowManager,
    environment: process.env.NODE_ENV ?? 'development',
    rolePermissions: { main: ['public', 'app:read', 'file:read', 'window:control', 'task:run', 'task:cancel'] }
  })

  registerAppIpc(bus)
  registerFileIpc(bus, dialog)
  registerWindowIpc(bus, windowManager)
  registerTaskIpc({ bus, taskRegistry })

  await bus.start()
}
```

> 关键约束：**必须先 `registerHandler`，再 `bus.start()`**。`bus.start()` 会一次性把所有 `requestContracts` 中声明的通道挂到 `ipcMain.handle`，即使该通道还没有 handler 也会被挂为「返回 `IPC_HANDLER_NOT_FOUND`」的通用处理函数，方便运行时发现缺失。

### 2.3 事件通道如何注册

如果你在共享层新增了事件契约，请在对应模块文件中使用 `bus.registerEvent(...)` 声明它，以便 `sendToWindow / broadcast` 等方法能正确按契约校验 payload：

```ts
import { IPC_EVENTS, eventContracts } from '../../shared'

bus.registerEvent(eventContracts[IPC_EVENTS.xxxUpdated])
```

再在业务逻辑中通过 `bus.sendToWindow(windowId, IPC_EVENTS.xxxUpdated, payload)` 发送事件。

---

## 3. preload 层：暴露业务方法

文件：

- [electron/ipcBus/preload/desktop-api.ts](file:///c:/Users/13002/Documents/all-in-one/electron/ipcBus/preload/desktop-api.ts)
- [electron/ipcBus/preload/expose-api.ts](file:///c:/Users/13002/Documents/all-in-one/electron/ipcBus/preload/expose-api.ts)（一般不需要改，它负责把 `desktop` 挂到 `window` 上）
- [electron/preload.ts](file:///c:/Users/13002/Documents/all-in-one/electron/preload.ts)（入口，一般不需要改）

### 3.1 扩展 desktop API

在 `createDesktopApi` 返回的对象中找到对应命名空间（例如 `app`），在工厂函数中加入方法：

```ts
import {
  IPC_CHANNELS,
  IPC_EVENTS,
  eventContracts,
  requestContracts
} from '../shared'
import type {
  DesktopApi,
  DesktopAppApi,
  DesktopFileApi,
  DesktopTaskApi,
  DesktopWindowApi,
  AppPreferencesInput,
  AppPreferencesOutput,
  FileDialogInput,
  TaskStartInput,
  WindowFocusChangedPayload
} from '../renderer/desktop-api'
import type { PreloadClient } from './client'

function createAppApi(client: PreloadClient): DesktopAppApi {
  return Object.freeze({
    getInfo: () => client.safeInvoke(IPC_CHANNELS.appInfoGet, requestContracts[IPC_CHANNELS.appInfoGet].outputSchema, {}),
    // 新增：读取偏好
    getPreferences: (input: AppPreferencesInput) =>
      client.safeInvoke(IPC_CHANNELS.appPreferencesGet, requestContracts[IPC_CHANNELS.appPreferencesGet].outputSchema, input)
  })
}
```

> 约束：**不要在 preload 层把 `ipcRenderer.invoke` / `ipcRenderer.on` / `rawInvoke` / `subscribe` 直接暴露给 renderer**。所有对外方法都必须经过 `safeInvoke` + 命名 schema 的调用，由 `client` 层统一做 `ok/data` 解包与 schema 校验。

> 事件监听请只暴露 `subscribe` 的包装函数（比如 `onProgress(taskId, listener)`），不要把原始 `ipcRenderer.on` 透出，避免出现不可控的事件通道后门。

---

## 4. renderer 层：扩展桌面 API 类型

文件：[electron/ipcBus/renderer/desktop-api.ts](file:///c:/Users/13002/Documents/all-in-one/electron/ipcBus/renderer/desktop-api.ts)

### 4.1 新增输入/输出类型

渲染层类型**必须从共享契约 infer 出来**，不允许手写重复字段以避免漂移。

```ts
import { IPC_CHANNELS, IPC_EVENTS, eventContracts, requestContracts } from '../shared'
import type { InferEventPayload, InferRequestInput, InferRequestOutput } from '../shared'

// 请求/响应类型（从契约推导）
export type AppInfo = InferRequestOutput<(typeof requestContracts)[typeof IPC_CHANNELS.appInfoGet]>
export type AppPreferencesInput = InferRequestInput<(typeof requestContracts)[typeof IPC_CHANNELS.appPreferencesGet]>
export type AppPreferencesOutput = InferRequestOutput<(typeof requestContracts)[typeof IPC_CHANNELS.appPreferencesGet]>
export type FileDialogInput = InferRequestInput<(typeof requestContracts)[typeof IPC_CHANNELS.fileDialogOpen]>
export type FileDialogOutput = InferRequestOutput<(typeof requestContracts)[typeof IPC_CHANNELS.fileDialogOpen]>
// ...
```

### 4.2 在命名空间接口中声明方法

```ts
export interface DesktopAppApi {
  getInfo(): Promise<AppInfo>
  getPreferences(input?: AppPreferencesInput): Promise<AppPreferencesOutput>
}
```

> 重要：`DesktopApi` / 其子接口是渲染层唯一的类型来源，`window.desktop` 的类型来自这里。请确保接口与 preload 实际暴露的方法一致，否则 `typecheck` 会报错。

### 4.3 在 renderer 中直接调用

一旦 preload 完成挂载，渲染层代码可以直接使用 `window.desktop.*`：

```ts
const preferences = await window.desktop.app.getPreferences({ scope: 'user' })
console.log(preferences.theme) // 'light' | 'dark' | 'system'
```

如果 renderer 侧有独立的 `.d.ts` 或类型声明文件，请一并更新，以保证 TS 感知。

---

## 5. 测试：契约/权限/总线/暴露面补齐

文件目录：`test/ipc/`

| 文件 | 覆盖点 | 建议你做的事 |
| --- | --- | --- |
| [ipc-contract.test.js](file:///c:/Users/13002/Documents/all-in-one/test/ipc/ipc-contract.test.js) | 契约导出稳定、schema 可 parse、常量一致 | 为新增通道加一次对 `requestContracts[channel]` 的访问与一次 `outputSchema.parse` 的断言 |
| [ipc-permissions.test.js](file:///c:/Users/13002/Documents/all-in-one/test/ipc/ipc-permissions.test.js) | 权限缺失、未声明 permission 等场景 | 新增一条对 `permission: IPC_PERMISSIONS.appRead` 的正向断言 |
| [ipc-main-bus.test.js](file:///c:/Users/13002/Documents/all-in-one/test/ipc/ipc-main-bus.test.js) | handler 正常返回、校验失败、权限拒绝、超时、输出 schema 校验失败 | 至少加一条 happy path 与一条输入非法的断言 |
| [preload-surface.test.js](file:///c:/Users/13002/Documents/all-in-one/test/ipc/preload-surface.test.js) | preload 只暴露业务命名空间；不能有 `invoke/on/rawInvoke/subscribe` 等后门 | 如果你新增了命名空间，需在 `Object.keys(exposedValue).sort()` 断言里把名字加上 |

### 5.1 契约测试示例（节选）

```js
const { IPC_CHANNELS, requestContracts } = require('../../dist/electron/ipcBus/shared/index.js')

test('app:preferences.get 契约解析合法输入', () => {
  const contract = requestContracts[IPC_CHANNELS.appPreferencesGet]
  assert.equal(contract.permission, 'app:read')

  // 合法输入可 parse
  const parsed = contract.inputSchema.parse({ scope: 'user' })
  assert.equal(parsed.scope, 'user')

  // 空输入可 parse（scope 可选）
  assert.deepEqual(contract.inputSchema.parse({}), {})

  // 非法输入失败
  assert.equal(
    contract.inputSchema.safeParse({ scope: 'other' }).success,
    false
  )
})
```

### 5.2 总线测试示例（节选）

```js
test('app:preferences.get 返回合法的偏好数据', async () => {
  const { bus, invoke } = createHarness()

  bus.registerHandler(requestContracts[IPC_CHANNELS.appPreferencesGet], async () => ({
    theme: 'light',
    locale: 'zh-CN',
    enableAnalytics: false
  }))

  await bus.start()

  const response = await invoke(IPC_CHANNELS.appPreferencesGet, { scope: 'user' })
  assert.equal(response.ok, true)
  assert.equal(response.data.theme, 'light')
  assert.equal(typeof response.meta.requestId, 'string')
})

test('app:preferences.get 非法输入返回 IPC_VALIDATION_ERROR', async () => {
  const { bus, invoke } = createHarness()

  bus.registerHandler(requestContracts[IPC_CHANNELS.appPreferencesGet], async () => ({
    theme: 'light',
    locale: 'zh-CN',
    enableAnalytics: false
  }))

  await bus.start()

  const response = await invoke(IPC_CHANNELS.appPreferencesGet, { scope: 'other' })
  assert.equal(response.ok, false)
  assert.equal(response.error.code, 'IPC_VALIDATION_ERROR')
})
```

### 5.3 preload 暴露面测试示例（节选）

```js
test('preload 只暴露 app / file / task / window 四个命名空间', () => {
  // ...
  assert.deepEqual(
    Object.keys(exposedValue).sort(),
    ['app', 'file', 'task', 'window']
  )
  assertNoGenericIpcSurface(exposedValue)
})
```

> 约束：新增方法时，请确保 **只通过命名空间方法暴露**，不新增任何能让 renderer 自由调用任意通道的能力。

---

## 6. 完整扩展检查清单

每扩展一个新 API，按下面清单逐条打勾，确保不留漏洞：

```text
[ ] shared/constants.ts
    [ ] 在 IPC_CHANNELS 新增通道名（命名：领域:动作.目标）
    [ ] 若需要，在 IPC_PERMISSIONS 新增权限键

[ ] shared/schemas.ts
    [ ] 新增 inputSchema（若为无参数则用 z.object({})）
    [ ] 新增 outputSchema
    [ ] 若有事件，新增 event payload schema
    [ ] 对字符串字段标注 minLength / maxLength
    [ ] 对枚举字段使用 z.enum([...])

[ ] shared/contracts.ts
    [ ] 在 requestContracts 新增条目，填入 description / permission / schemas / timeoutMs / maxPayloadBytes / audit / rateLimit
    [ ] 若有事件，在 eventContracts 新增条目

[ ] shared/index.ts
    [ ] 把新增 schema 名字加入 schemas 导出列表

[ ] electron/ipcBus/main/modules/*.ipc.ts
    [ ] 在对应模块里调用 bus.registerHandler(contract, handler)
    [ ] 若有事件，调用 bus.registerEvent(contract)
    [ ] handler 里显式声明本地 input 类型（并遵循 inputSchema）

[ ] electron/main.ts
    [ ] 确保在 bus.start() 之前已调用对应模块的 register*Ipc(bus)

[ ] electron/ipcBus/renderer/desktop-api.ts
    [ ] 从契约 infer 出新的输入/输出类型
    [ ] 在对应命名空间接口（DesktopAppApi 等）中新增方法声明

[ ] electron/ipcBus/preload/desktop-api.ts
    [ ] 在对应 create*Api 工厂函数里加入方法实现（safeInvoke + 命名 schema）
    [ ] 事件通过 subscribe 包装，不暴露原始 ipcRenderer.on

[ ] test/ipc/
    [ ] ipc-contract.test.js：契约可访问、schema 正反例 parse
    [ ] ipc-permissions.test.js：权限正向断言（如适用）
    [ ] ipc-main-bus.test.js：happy path + 非法输入 + 权限拒绝
    [ ] preload-surface.test.js：命名空间列表 + 无后门方法断言

[ ] 运行验证
    [ ] pnpm typecheck 通过
    [ ] pnpm build 通过
    [ ] pnpm test 通过
    [ ] pnpm start 能正常启动并调用新 API（人工点一下）
```

---

## 7. 常见坑与最佳实践

### 7.1 通道名的「命名即契约」

通道名使用 `领域:动作.目标`（如 `file:dialog.open`）。`bus.start()` 会遍历 `requestContracts` 把所有通道挂到 `ipcMain.handle`，如果你在 `IPC_CHANNELS` 里新增了通道名但没有在 `requestContracts` 里补齐，调用时会返回 `IPC_HANDLER_NOT_FOUND`——所以 **先改 shared/constants → shared/schemas → shared/contracts，再改 main**。

### 7.2 handler 里 `throw` 行为

- `throw createIpcError('IPC_xxx', message)` → 总线会原样包装为 `ok: false` 的标准结果，日志记录 `errorCode = 'IPC_xxx'`。**优先使用这种方式**。
- `throw new Error('boom')` → 总线会归一化为 `IPC_INTERNAL_ERROR`，日志记录内部错误。仅用于你确实无法分类的异常。

### 7.3 类型安全：从契约推导

渲染层类型用 `InferRequestInput / InferRequestOutput / InferEventPayload` 从契约推导，**不要手写字段**，否则 schema 一改，类型就会漂移，只能靠运行时 schema 校验拦着。

### 7.4 事件只从主进程到渲染层

当前架构默认 `direction: 'main-to-renderer'`。如果你需要 `renderer-to-main` 的反向事件，请先在设计阶段确认场景必要性；本项目为 Electron，默认设计是「main 持可信能力，renderer 只发起请求」，不要让 renderer 直接向 main 发送裸事件。

### 7.5 审计与限流：别吝啬

- `audit: true`：对涉及文件写入、用户配置变更、敏感信息访问的通道一律打开。`IpcLogger` 会把 `audit=true` 的请求作为审计记录。
- `rateLimit`：对涉及外部资源（文件、网络、子进程）的通道一律设置。默认可参考 `task:start`：`maxCalls: 10, windowMs: 60_000`。

### 7.6 preload 不能暴露后门

- ❌ 不要暴露：`invoke` / `send` / `on` / `rawInvoke` / `subscribe` / `ipcRenderer`
- ✅ 要暴露：`app.getInfo(...)`、`file.openDialog(...)`、`task.start(...)` 这类**业务方法**

`preload-surface.test.js` 会做黑盒断言：只要出现上述后门字段就失败，帮你把住最后一道关口。

### 7.7 为什么所有方法都用 `client.safeInvoke`？

`safeInvoke` 负责三件事，缺一不可：

1. 调用 `ipcRenderer.invoke(channel, payload)`
2. 对主进程返回的标准结果（`{ ok, data, meta }` / `{ ok, error, meta }`）做解包，失败直接 throw 标准错误对象
3. 对成功数据再跑一次命名 outputSchema，确保返回字段与类型在渲染层也一致

这样 render 层拿到的就是真正可信任、类型匹配的数据。

---

## 8. 一次新 API 的最小落地模板

下面模板以「新增 `app:preferences.get`」为例，你可以把它当作 commit 级代码脚手架直接替换占位符：

```ts
// electron/ipcBus/shared/constants.ts
IPC_CHANNELS = {
  // ...
  appPreferencesGet: 'app:preferences.get'
}

// electron/ipcBus/shared/schemas.ts
export const appPreferencesRequestSchema = z.object({
  scope: z.enum(['user', 'system'] as const).optional()
})
export const appPreferencesResponseSchema = z.object({
  theme: z.enum(['light', 'dark', 'system'] as const),
  locale: z.string({ minLength: 2, maxLength: 16 }),
  enableAnalytics: z.boolean()
})

// electron/ipcBus/shared/contracts.ts
requestContracts = {
  // ...
  [IPC_CHANNELS.appPreferencesGet]: defineRequestContract({
    channel: IPC_CHANNELS.appPreferencesGet,
    description: '读取应用当前偏好设置。',
    permission: IPC_PERMISSIONS.appRead,
    inputSchema: appPreferencesRequestSchema,
    outputSchema: appPreferencesResponseSchema,
    timeoutMs: DEFAULT_IPC_TIMEOUT_MS,
    maxPayloadBytes: DEFAULT_IPC_MAX_PAYLOAD_BYTES,
    audit: false,
    rateLimit: { maxCalls: 30, windowMs: 60_000 }
  })
}

// electron/ipcBus/main/modules/app.ipc.ts
bus.registerHandler(requestContracts[IPC_CHANNELS.appPreferencesGet], async ({ input }) => {
  const preferencesInput = input as { scope?: 'user' | 'system' }
  return {
    theme: preferencesInput.scope === 'system' ? 'system' : 'light',
    locale: 'zh-CN',
    enableAnalytics: false
  }
})

// electron/ipcBus/renderer/desktop-api.ts
export type AppPreferencesInput = InferRequestInput<(typeof requestContracts)[typeof IPC_CHANNELS.appPreferencesGet]>
export type AppPreferencesOutput = InferRequestOutput<(typeof requestContracts)[typeof IPC_CHANNELS.appPreferencesGet]>

export interface DesktopAppApi {
  getInfo(): Promise<AppInfo>
  getPreferences(input?: AppPreferencesInput): Promise<AppPreferencesOutput>
}

// electron/ipcBus/preload/desktop-api.ts
function createAppApi(client: PreloadClient): DesktopAppApi {
  return Object.freeze({
    getInfo: () => client.safeInvoke(IPC_CHANNELS.appInfoGet, requestContracts[IPC_CHANNELS.appInfoGet].outputSchema, {}),
    getPreferences: (input?: AppPreferencesInput) =>
      client.safeInvoke(IPC_CHANNELS.appPreferencesGet, requestContracts[IPC_CHANNELS.appPreferencesGet].outputSchema, input)
  })
}

// 渲染层调用
const preferences = await window.desktop.app.getPreferences({ scope: 'user' })
```

---

## 9. 参考文件速查

| 位置 | 说明 |
| --- | --- |
| [electron/ipcBus/shared/constants.ts](file:///c:/Users/13002/Documents/all-in-one/electron/ipcBus/shared/constants.ts) | 通道、事件、权限常量 |
| [electron/ipcBus/shared/schemas.ts](file:///c:/Users/13002/Documents/all-in-one/electron/ipcBus/shared/schemas.ts) | zod schemas |
| [electron/ipcBus/shared/contracts.ts](file:///c:/Users/13002/Documents/all-in-one/electron/ipcBus/shared/contracts.ts) | 契约注册表 |
| [electron/ipcBus/shared/types.ts](file:///c:/Users/13002/Documents/all-in-one/electron/ipcBus/shared/types.ts) | 契约推导工具类型 |
| [electron/ipcBus/shared/errors.ts](file:///c:/Users/13002/Documents/all-in-one/electron/ipcBus/shared/errors.ts) | `IPC_ERROR_CODES` 与 `createIpcError` |
| [electron/ipcBus/main/ipc-main-bus.ts](file:///c:/Users/13002/Documents/all-in-one/electron/ipcBus/main/ipc-main-bus.ts) | 总线核心实现（registerHandler / registerEvent / sendToWindow / broadcast） |
| [electron/ipcBus/main/modules/app.ipc.ts](file:///c:/Users/13002/Documents/all-in-one/electron/ipcBus/main/modules/app.ipc.ts) | app 模块示例 |
| [electron/ipcBus/main/modules/file.ipc.ts](file:///c:/Users/13002/Documents/all-in-one/electron/ipcBus/main/modules/file.ipc.ts) | file 模块示例 |
| [electron/ipcBus/main/modules/window.ipc.ts](file:///c:/Users/13002/Documents/all-in-one/electron/ipcBus/main/modules/window.ipc.ts) | window 模块示例 |
| [electron/ipcBus/main/modules/task.ipc.ts](file:///c:/Users/13002/Documents/all-in-one/electron/ipcBus/main/modules/task.ipc.ts) | task 模块示例（含事件） |
| [electron/ipcBus/preload/client.ts](file:///c:/Users/13002/Documents/all-in-one/electron/ipcBus/preload/client.ts) | PreloadClient（safeInvoke / subscribe） |
| [electron/ipcBus/preload/desktop-api.ts](file:///c:/Users/13002/Documents/all-in-one/electron/ipcBus/preload/desktop-api.ts) | 桌面 API 组装 |
| [electron/ipcBus/renderer/desktop-api.ts](file:///c:/Users/13002/Documents/all-in-one/electron/ipcBus/renderer/desktop-api.ts) | 渲染层类型定义 |
| [test/ipc/ipc-contract.test.js](file:///c:/Users/13002/Documents/all-in-one/test/ipc/ipc-contract.test.js) | 契约/常量/schema 测试 |
| [test/ipc/ipc-main-bus.test.js](file:///c:/Users/13002/Documents/all-in-one/test/ipc/ipc-main-bus.test.js) | 总线集成测试 |
| [test/ipc/ipc-permissions.test.js](file:///c:/Users/13002/Documents/all-in-one/test/ipc/ipc-permissions.test.js) | 权限矩阵测试 |
| [test/ipc/preload-surface.test.js](file:///c:/Users/13002/Documents/all-in-one/test/ipc/preload-surface.test.js) | preload 暴露面黑盒测试 |
