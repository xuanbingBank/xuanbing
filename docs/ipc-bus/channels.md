# 通道清单

本文档列出 IPC 总线的全部请求通道与事件通道。所有通道均定义于 [electron/ipcBus/shared/contracts.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/shared/contracts.ts)，通道常量定义于 [electron/ipcBus/shared/constants.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/shared/constants.ts)，handler 实现分布于 [electron/ipcBus/main/modules/](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/modules) 下的 9 个模块文件。

- **请求通道（Request）**：共 44 个，按 9 个业务模块分组。每条通道都对应一个 `requestContracts` 条目，主进程通过 `ipcMain.handle` 接收并经 `dispatchInvoke` 完整链路处理（见 [dispatch-flow.md](./dispatch-flow.md)）。
- **事件通道（Event）**：共 7 个，方向均为 `main-to-renderer`，主进程通过 `bus.sendToWindow` / `bus.broadcast` 推送，preload 通过 `client.subscribe` 订阅。

> 注：项目背景中提到的"41 个 requestContracts"为早期统计；当前源码已扩展到 44 个（新增 3 个系统级通道 `system:notification.show` / `system:messageBox.show` / `system:toast.show`）。

## 表格列说明

| 列 | 含义 |
| --- | --- |
| channel | 通道名（字符串字面量） |
| 权限 | 契约 `permission` 字段，需调用方窗口角色拥有该权限 |
| 限流 | `rateLimit` 字段，格式 `maxCalls/windowMs`；"-" 表示不限流 |
| 超时 | `timeoutMs`（毫秒），默认 15_000 |
| audit | `audit:true` 时在 `dispatchInvoke` 末尾写 `audit_logs` |
| 说明 | 契约 `description` 简述 |

默认值：`DEFAULT_IPC_TIMEOUT_MS = 15_000`，`DEFAULT_IPC_MAX_PAYLOAD_BYTES = 64 * 1024`。

## 一、app 模块（1 个）

handler：[electron/ipcBus/main/modules/app.ipc.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/modules/app.ipc.ts)

| channel | 权限 | 限流 | 超时 | audit | 说明 |
| --- | --- | --- | --- | --- | --- |
| `app:info.get` | `public` | - | 15_000 | - | 获取应用静态信息（appName / appVersion / electronVersion / chromeVersion / platform / isPackaged） |

## 二、database 模块（6 个）

handler：[electron/ipcBus/main/modules/database.ipc.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/modules/database.ipc.ts)

| channel | 权限 | 限流 | 超时 | audit | 说明 |
| --- | --- | --- | --- | --- | --- |
| `database:getHealth` | `database:read` | - | 15_000 | - | 获取 SQLite 数据库健康报告 |
| `database:getStats` | `database:read` | - | 15_000 | - | 获取 SQLite 各表行数统计 |
| `database:backup` | `database:backup` | - | 60_000 | ✓ | 手动触发 SQLite 备份 |
| `database:restore` | `database:restore` | - | 120_000 | ✓ | 从备份恢复 SQLite 数据库（需 `confirm=true` 二次确认） |
| `database:vacuum` | `database:write` | - | 120_000 | ✓ | 对 SQLite 执行 VACUUM |
| `database:clearLogs` | `database:write` | - | 15_000 | ✓ | 清理 app_logs 与 audit_logs 旧数据（清空全部需 `confirm=true`） |

## 三、file 模块（1 个）

handler：[electron/ipcBus/main/modules/file.ipc.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/modules/file.ipc.ts)

| channel | 权限 | 限流 | 超时 | audit | 说明 |
| --- | --- | --- | --- | --- | --- |
| `file:dialog.open` | `file:read` | 5/60_000 | 15_000 | ✓ | 通过主进程安全打开本地文件选择对话框（`maxPayloadBytes=32KB`） |

## 四、setting 模块（4 个）

handler：[electron/ipcBus/main/modules/setting.ipc.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/modules/setting.ipc.ts)

| channel | 权限 | 限流 | 超时 | audit | 说明 |
| --- | --- | --- | --- | --- | --- |
| `setting:get` | `setting:read` | - | 15_000 | - | 按 namespace+key 获取设置项（输出可空） |
| `setting:set` | `setting:write` | - | 15_000 | ✓ | 写入或更新设置项（`maxPayloadBytes=64KB`） |
| `setting:listByNamespace` | `setting:read` | - | 15_000 | - | 列出指定 namespace 下的全部设置项 |
| `setting:delete` | `setting:write` | - | 15_000 | ✓ | 按 namespace+key 删除设置项 |

## 五、system 模块（3 个）

handler：[electron/ipcBus/main/modules/system.ipc.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/modules/system.ipc.ts)

| channel | 权限 | 限流 | 超时 | audit | 说明 |
| --- | --- | --- | --- | --- | --- |
| `system:notification.show` | `system:notify` | - | 10_000 | ✓ | 调用操作系统级桌面通知（Windows Toast / macOS Notification Center） |
| `system:messageBox.show` | `system:notify` | - | 60_000 | ✓ | 调用操作系统级消息框（Windows MessageBox / macOS sheet） |
| `system:toast.show` | `system:notify` | - | 5_000 | - | 在桌面显示独立置顶 Toast 浮层窗口（不在应用窗口内） |

## 六、task 模块（2 个请求 + 3 个事件）

handler：[electron/ipcBus/main/modules/task.ipc.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/modules/task.ipc.ts)

| channel | 权限 | 限流 | 超时 | audit | 说明 |
| --- | --- | --- | --- | --- | --- |
| `task:start` | `task:run` | 10/60_000 | 30_000 | ✓ | 启动一个可跟踪、可取消的长任务（`maxPayloadBytes=128KB`） |
| `task:cancel` | `task:cancel` | - | 15_000 | ✓ | 取消正在运行的任务 |

## 七、task-data 模块（5 个）

handler：[electron/ipcBus/main/modules/task-data.ipc.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/modules/task-data.ipc.ts)

| channel | 权限 | 限流 | 超时 | audit | 说明 |
| --- | --- | --- | --- | --- | --- |
| `taskData:list` | `taskData:read` | - | 15_000 | - | 分页查询任务数据列表 |
| `taskData:getById` | `taskData:read` | - | 15_000 | - | 按 ID 查询任务数据详情（含事件） |
| `taskData:create` | `taskData:write` | - | 15_000 | ✓ | 创建任务数据记录（`maxPayloadBytes=256KB`） |
| `taskData:update` | `taskData:write` | - | 15_000 | ✓ | 更新任务数据状态、进度、输出（`maxPayloadBytes=256KB`） |
| `taskData:delete` | `taskData:write` | - | 15_000 | ✓ | 按 ID 删除任务数据 |

## 八、window 模块（15 个请求 + 4 个事件）

handler：[electron/ipcBus/main/modules/window.ipc.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/modules/window.ipc.ts)

> 跨窗口控制（`target !== sender`）额外需要 `window:control:any` 权限，由 `assertControlPermission` 在 handler 内二次校验。

| channel | 权限 | 限流 | 超时 | audit | 说明 |
| --- | --- | --- | --- | --- | --- |
| `window:open` | `window:open` | - | 15_000 | ✓ | 打开或聚焦指定角色的窗口（`maxPayloadBytes=256KB`） |
| `window:minimize` | `window:control:self` | - | 15_000 | - | 最小化目标窗口 |
| `window:maximize` | `window:control:self` | - | 15_000 | - | 最大化或还原目标窗口 |
| `window:close` | `window:close:self` | - | 15_000 | ✓ | 关闭目标窗口（遵循角色 closeBehavior） |
| `window:restore` | `window:control:self` | - | 15_000 | - | 从最小化或最大化状态恢复目标窗口 |
| `window:hide` | `window:control:self` | - | 15_000 | - | 隐藏目标窗口 |
| `window:show` | `window:control:self` | - | 15_000 | - | 显示目标窗口 |
| `window:focus` | `window:focus` | - | 15_000 | - | 聚焦目标窗口或按角色聚焦 |
| `window:reload` | `window:control:self` | - | 15_000 | - | 重新加载目标窗口页面 |
| `window:list` | `window:list` | - | 15_000 | - | 列出全部存活窗口引用（无 `window:control:any` 时仅返回自身窗口） |
| `window:getCurrent` | `public` | - | 15_000 | - | 获取当前调用方窗口信息（windowId 由主进程从 IPC sender 解析） |
| `window:setTitle` | `window:control:self` | - | 15_000 | - | 更新目标窗口标题 |
| `window:getInitPayload` | `public` | - | 15_000 | - | 消费当前窗口的初始化数据（一次性，`maxPayloadBytes=256KB`） |
| `window:closeAll` | `window:control:any` | - | 15_000 | ✓ | 关闭全部窗口 |
| `window:closeByRole` | `window:close:any` | - | 15_000 | ✓ | 关闭指定角色的全部窗口 |

## 九、xuanbing-file 模块（7 个）

handler：[electron/ipcBus/main/modules/xuanbing-file.ipc.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/modules/xuanbing-file.ipc.ts)

| channel | 权限 | 限流 | 超时 | audit | 说明 |
| --- | --- | --- | --- | --- | --- |
| `xuanbingFile:openDialog` | `xuanbingFile:read` | - | 15_000 | ✓ | 打开 .xuanbing 文件选择对话框，返回 fileRef |
| `xuanbingFile:saveDialog` | `xuanbingFile:write` | - | 15_000 | ✓ | 打开 .xuanbing 文件保存对话框，返回 fileRef |
| `xuanbingFile:readPreview` | `xuanbingFile:read` | - | 15_000 | - | 读取 .xuanbing 文件预览（不返回 payload） |
| `xuanbingFile:validate` | `xuanbingFile:read` | - | 15_000 | - | 校验 .xuanbing 文件合法性 |
| `xuanbingFile:exportPackage` | `xuanbingFile:export` | - | 60_000 | ✓ | 导出 .xuanbing 文件包（`maxPayloadBytes=16MB`） |
| `xuanbingFile:dryRunImport` | `xuanbingFile:read` | - | 60_000 | - | dryRun 导入 .xuanbing 文件，返回导入计划（`maxPayloadBytes=16MB`） |
| `xuanbingFile:importPackage` | `xuanbingFile:import` | - | 120_000 | ✓ | 正式导入 .xuanbing 文件，事务执行（`maxPayloadBytes=16MB`） |

## 十、事件通道清单（7 个）

事件契约定义于 `eventContracts`。方向均为 `main-to-renderer`。所有事件由主进程 `bus.sendToWindow` / `bus.broadcast` 推送，preload `client.subscribe` 在回调前用 `payloadSchema` 校验。

| event | 权限 | audit | 说明 | 主要推送源 |
| --- | --- | --- | --- | --- |
| `task:progress` | `task:run` | - | 向渲染进程推送任务进度 | [task.ipc.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/modules/task.ipc.ts) 的 `setInterval` |
| `task:completed` | `task:run` | - | 向渲染进程推送任务完成事件 | [task.ipc.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/modules/task.ipc.ts) |
| `task:failed` | `task:run` | ✓ | 向渲染进程推送任务失败事件 | [task.ipc.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/modules/task.ipc.ts)（取消/超时/异常） |
| `window:focus.changed` | `window:control` | - | 向渲染进程推送窗口焦点变化 | [window.ipc.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/modules/window.ipc.ts) 桥接 |
| `window:state.changed` | `window:control` | - | 向渲染进程推送窗口状态变化（最小化、最大化、恢复等） | [window.ipc.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/modules/window.ipc.ts) 桥接 `window:focused` / `window:minimized` 等 9 种事件 |
| `window:route.changed` | `window:control` | - | 向渲染进程推送窗口路由变化 | [window.ipc.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/modules/window.ipc.ts) 桥接 `window:route-changed` |
| `window:created` | `window:control` | - | 向渲染进程推送窗口创建事件 | [window.ipc.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/modules/window.ipc.ts) 桥接 `window:created` |

> 注：`bus.broadcast` 当前向全部窗口无差别广播，未按 `contract.permission` 过滤接收方角色权限（源码 TODO 标注），对 `task:failed` / `windowCreated` 等含敏感信息的事件需要后续按窗口角色过滤。

## 十一、统计速查

| 维度 | 数量 |
| --- | --- |
| 请求通道总数 | 44 |
| 事件通道总数 | 7 |
| 业务模块数 | 9 |
| `audit:true` 请求通道数 | 19 |
| `audit:true` 事件通道数 | 1（`task:failed`） |
| 配置 `rateLimit` 的通道数 | 2（`file:dialog.open`、`task:start`） |
| 使用 `public` 权限的通道数 | 3（`app:info.get`、`window:getCurrent`、`window:getInitPayload`） |
| 显式调大 `timeoutMs` 的通道 | `database:backup`(60s)、`database:restore`(120s)、`database:vacuum`(120s)、`system:messageBox.show`(60s)、`task:start`(30s)、`system:notification.show`(10s)、`system:toast.show`(5s)、`xuanbingFile:exportPackage`(60s)、`xuanbingFile:dryRunImport`(60s)、`xuanbingFile:importPackage`(120s) |

## 十二、相关文档

- [overview.md](./overview.md)：四层架构与 `IpcMainBus` 总览
- [contracts.md](./contracts.md)：契约结构与新增通道流程
- [dispatch-flow.md](./dispatch-flow.md)：通道被调用时的完整链路
- [security.md](./security.md)：权限、限流、超时、审计的执行细节

## 十三、关键源码索引

- 契约汇总：[electron/ipcBus/shared/contracts.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/shared/contracts.ts)
- 通道/事件/权限常量：[electron/ipcBus/shared/constants.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/shared/constants.ts)
- 模块目录：[electron/ipcBus/main/modules/](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/modules)
  - [app.ipc.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/modules/app.ipc.ts)
  - [database.ipc.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/modules/database.ipc.ts)
  - [file.ipc.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/modules/file.ipc.ts)
  - [setting.ipc.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/modules/setting.ipc.ts)
  - [system.ipc.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/modules/system.ipc.ts)
  - [task.ipc.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/modules/task.ipc.ts)
  - [task-data.ipc.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/modules/task-data.ipc.ts)
  - [window.ipc.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/modules/window.ipc.ts)
  - [xuanbing-file.ipc.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/modules/xuanbing-file.ipc.ts)
