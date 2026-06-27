# 综合审计问题修复 Spec

## Why

上一轮对项目进行了 6 维度并行深度审计,共发现 129 项问题(23 高危、52 中危、54 低危),覆盖 Electron 主进程安全、IPC 通信、数据库操作、Vue 渲染层、类型安全/错误处理、文件操作 6 个方面。其中存在可被利用的安全越权(如 `shell.openExternal` 无协议白名单、跨帧 IPC 越权、导入 plan 信任绕过)、可导致主进程崩溃的未捕获异常路径、可导致数据丢失/损坏的非原子操作,以及系统性运行时类型校验失效。本 spec 旨在系统性修复全部已识别问题,使项目达到生产级安全与稳定性基线。

## What Changes

### 安全/越权类
- 为 `shell.openExternal` 增加协议白名单(http/https/mailto),拒绝其他协议并记日志
- 在 IPC `dispatchInvoke` 内校验 `event.senderFrame.url`,仅允许内部源
- 收紧 `xuanbingFileReadPreview`/`xuanbingFileValidate` 的 `fileRef` schema 至 `xuanbingFileRefSchema`
- 导出路径 `exportToPath` 强制限制到允许目录(userData/downloads),拒绝其他路径
- `importPackage` 在主进程侧对 plan 重新校验:绑定 dryRun checksum、验证每项 action 与 dryRun 结果一致
- `resolveRef` 强制校验 fileRef 的 mode 与调用方期望一致(读操作只接受 read 模式,写操作只接受 write 模式)
- 移除/收紧 `v-html` 使用,render 函数返回值统一过 `escapeHtml` 后再注入,或改用文本插值
- 修复认证 token 持久化逻辑(登录写 `AUTH_TOKEN` 到 storage,`restoreSession` 读取),移除任意密码通过的占位实现并标注 TODO

### 数据完整性类
- 重写数据库恢复流程:消除双重回滚,统一回滚入口,失败时确保连接恢复或显式进入不可用状态
- 备份/恢复改为临时文件 + fsync + 原子 rename 模式
- 导出改为分页循环(每页 200),直到取尽,checksum 反映全量数据
- `clearOldLogs`/`clearAllLogs` 用 `runTransaction` 包裹
- 修复 PRAGMA `synchronous` 校验:比较整数返回值(2=FULL/1=NORMAL/0=OFF)或用字符串 'normal' 设置后读取归一化
- `seedDatabase`/`setSchemaVersion` 包裹事务
- 迁移文件 hash 校验:运行时对比存储 hash 与文件当前 hash,不一致则报错
- `merge` 策略改为字段级合并或显式标注"全量覆盖"语义
- 导出读取 SQLite 包裹事务,保证快照一致

### 崩溃/资源泄漏类
- `task.ipc.ts` 的 `setInterval` 回调最外层包 try/catch,失败时终结任务并记日志
- IPC 超时分支对 `record.handler(...)` 增加 `.catch(() => {})` 兜底,避免 unhandledRejection
- 任务超时的 AbortController 与 taskRegistry 控制器打通,超时停止 interval
- `useTable.refresh()` 增加 catch 并设置 `state.error`,三处 `void refresh()` 改为带 catch
- 路由守卫增加 IPC 失败降级:重试一次或显示错误页,避免静默卡 /403
- async onMounted 增加"已卸载"标志,await 后检查标志再注册订阅/写状态
- 文件锁:对同一路径的导出/写入加进程内互斥(基于 Map 的简单锁),Windows rename 失败时重试
- 数据库耗时操作(VACUUM/integrity_check/备份/恢复)移至 worker thread 或标注"会阻塞"并加可取消
- `uncaughtException` 弹框后延迟 `app.quit()` 退出,避免带病运行
- `before-quit` 清理链路每步包 try/catch,保证全部清理执行
- `IpcLogger.entries` 增加上限(5000 条环形覆盖)
- `TaskRegistry` 增加 `maxConcurrentTasksPerWindow`/`maxConcurrentTasksGlobal` 限制
- `windowGetCurrent` 不再返回完整 permissions 数组,改为布尔摘要或不返回
- 缓存清理器 `startCacheCleaner` 在应用启动时调用
- `useConfirm` 增加排队或拒绝旧请求机制,避免 Promise 泄漏
- `useContextMenu.registerAutoHide` 修复 setTimeout 竞态
- `useTable`/`useIpcRequest` 增加请求序号,丢弃过期响应

### 类型/校验类
- 修复 25+ 处 Vue prop `type: Object as () => 字符串联合` → `type: String as () => 字符串联合`
- 修复或删除 `writableComputed` 死代码(传入 `{get,set}` 形式)
- 统一 `IpcError` 类型:类与接口字段名对齐(统一用 `cause`),`code` 类型统一为 `IpcErrorCode`
- `dispatchInvoke` 超时分支保留原始 error 作为 cause
- `parseSchema` 区分校验错误与内部错误,只对 `ZodValidationError` 标 `IPC_VALIDATION_ERROR`
- 移除 IPC 契约中 `as ZodSchema<unknown>` 弱化断言
- 自定义 zod `object()` 增加 `strict` 模式或至少记录额外字段
- `mainWindow!` 非空断言改为显式空校验
- 长期:优化 `vue-global.d.ts` 的 `ctx` 类型,减少 `as unknown as` 断言(本 spec 仅做局部改善,不重写)

### 加固类(中低危)
- 注册 `setPermissionRequestHandler`/`setPermissionCheckHandler`,默认拒绝
- 通过 `onHeadersReceived` 注入网络层 CSP,收紧 `style-src`
- 注册 `web-contents-created` 守卫
- 生产环境 `Menu.setApplicationMenu(null)` 或精简菜单
- `will-navigate` 配套处理 `will-redirect`
- `rawInvoke` 设为内部符号或移除
- `dispatchInvoke` finally 中 `removeEventListener('abort', handler)`
- `WindowManager.registerWindow` 不自动设置 focusedWindowId
- `WindowManager.getWindowIdBySenderId` 增加 `isDestroyed` 校验
- `IpcMainBus.dispose` 清空 `handlers`/`rateLimitState`/`eventRegistry`
- `IpcMainBus.enforceRateLimit` 窗口关闭时清理对应 key
- `windowOpen` 强制 `parentWindowId: senderWindowId`,拒绝回退
- 数据库层空 catch 增加日志
- 渲染层空 catch 关键位置增加日志或 UI 反馈
- `ensurePathWithinDir`/`ensureNotDatabaseFile` Windows 大小写归一化比较,覆盖 WAL/SHM
- 原子写增加父目录 fsync(Linux)
- Windows rename 失败增加重试
- 临时文件启动期清理 `.tmp-` 残留
- `formatVersion` 增加 minSupportedVersion 与迁移框架占位
- `ensureFileSize` 与 read 之间 TOCTOU:读后再次校验长度
- 符号链接逃逸:`lstat` 检查
- 过期 fileRef 主动回收调度
- `BaseModal.size` 等已含于类型/校验类
- `index` 作 key 改为业务 id(LogViewerPage)
- 大列表虚拟化(FluentTable/DataTable 标注 TODO 或引入虚拟滚动)
- 移除死代码(`void openConnection`、`void taskRepo`、`void nowIso`、`void throwDbError` 等)
- `src/renderer.ts` 修复乱码注释
- `theme.store`/`BaseModal` 监听器移除(如适用)
- `router.destroy()` 在根卸载时调用
- `useCachedQuery` SWR 增加 stale 回退
- Toast 定时器句柄保存,清除时取消

## Impact

- **Affected specs**: 无既有 spec(本项目首次建立 spec)
- **Affected code**:
  - `electron/main.ts`、`electron/ipcBus/main/index.ts`、`electron/ipcBus/main/ipc-main-bus.ts`、`electron/ipcBus/main/ipc-errors.ts`、`electron/ipcBus/main/ipc-logger.ts`、`electron/ipcBus/main/task-registry.ts`、`electron/ipcBus/main/window-manager.ts`、`electron/ipcBus/main/modules/*.ipc.ts`
  - `electron/ipcBus/shared/contracts.ts`、`errors.ts`、`zod.ts`
  - `electron/database/db-*.ts`、`electron/repositories/*.ts`、`electron/services/*.ts`
  - `electron/file-db/*.ts`
  - `electron/windows/main/*.ts`、`electron/windows/shared/*.ts`
  - `src/renderer/composables/*.ts`、`src/renderer/stores/*.ts`、`src/renderer/components/**/*.ts`、`src/renderer/cache/*.ts`、`src/renderer/router/*.ts`、`src/renderer.ts`
  - `index.html`、`types/node-shims.d.ts`、`src/renderer/vue-global.d.ts`

## ADDED Requirements

### Requirement: 安全越权防护
系统 SHALL 对所有跨信任边界调用(外部 URL 打开、跨帧 IPC、文件路径访问、导入 plan)执行服务端校验,不信任渲染层传入的任何身份/路径/plan 字段。

#### Scenario: shell.openExternal 拒绝非白名单协议
- **WHEN** 渲染层调用 `shellOpenExternal('file:///etc/passwd')`
- **THEN** 主进程拒绝并记日志,不调用 `shell.openExternal`

#### Scenario: 跨帧 IPC 被拒绝
- **WHEN** 非 top frame 的 senderFrame.url 不在内部源白名单内
- **THEN** IPC 调用返回 `IPC_FORBIDDEN` 错误

#### Scenario: 导出路径受限
- **WHEN** 渲染层调用 `exportToPath` 传入 `C:\Windows\System32\evil.xuanbing`
- **THEN** 主进程返回 `XUANBING_FILE_EXPORT_FAILED`,拒绝写入

### Requirement: 数据完整性
系统 SHALL 保证备份/恢复/导出/导入操作原子化,中途失败不损坏数据库或导出文件,导出数据不静默截断。

#### Scenario: 恢复失败后连接保持可用
- **WHEN** 恢复过程中 health check 失败
- **THEN** 执行单次回滚,回滚后连接恢复或显式标记不可用,不进入无连接状态

#### Scenario: 导出包含全部任务
- **WHEN** 数据库有 500 个任务,调用 `exportPackage`
- **THEN** 导出文件包含全部 500 个任务,checksum 反映全量

### Requirement: 崩溃防护
系统 SHALL 捕获所有异步路径的异常,不出现因未捕获 Promise rejection 或 interval 回调异常导致的主进程崩溃。

#### Scenario: IPC 超时不产生 unhandledRejection
- **WHEN** handler 超时后在后台 reject
- **THEN** rejection 被 `.catch` 吞掉并记日志,不触发 `unhandledRejection`

### Requirement: 类型与运行时一致
系统 SHALL 保证 Vue prop 运行时校验与 TypeScript 类型一致,IPC 契约 schema 与推断类型一致。

#### Scenario: prop 校验生效
- **WHEN** 父组件传 `size="invalid"` 给 `BaseModal`
- **THEN** Vue 运行时发出 prop 校验警告

## MODIFIED Requirements

### Requirement: IPC 错误处理
IPC 错误处理 SHALL 保留原始 error 作为 cause,不因超时覆盖业务错误码;`parseSchema` SHALL 仅对 ZodValidationError 标 `IPC_VALIDATION_ERROR`;`IpcError` 类型 SHALL 统一字段名(`cause`)与 `code` 类型(`IpcErrorCode`)。

### Requirement: 文件操作原子性
文件写入 SHALL 采用 temp + fsync + rename 模式,Linux 下增加父目录 fsync;Windows rename 失败 SHALL 重试;启动期 SHALL 清理 `.tmp-` 残留临时文件。

### Requirement: 数据库健康检查
PRAGMA 校验 SHALL 正确处理 `synchronous` 的整数返回值,不产生恒失败的误报。

## REMOVED Requirements

### Requirement: 占位登录实现
**Reason**: 当前 `auth.store.login` 接受任意密码,是鉴权绕过风险
**Migration**: 改为明确抛出"未实现"错误并标注 TODO,由真实鉴权方案替换;token 持久化逻辑先修复(写 storage),保证刷新后登录态不丢失(配合真实登录启用)
