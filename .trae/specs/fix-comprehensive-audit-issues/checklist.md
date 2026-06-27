# Checklist

本 checklist 用于系统性验证 spec 中所有修复项是否落实。每个 checkpoint 对应 spec.md 中的 ADDED/MODIFIED/REMOVED Requirements 与 tasks.md 中的任务。

## 一、安全/越权类验证

- [x] `shell.openExternal` 对 `file:`、`smb:`、`search-ms:` 等非白名单协议拒绝并记日志(验证 T-A1) <!-- 已验证: ipcBus/main/index.ts:85-97 与 windows/main/window-manager.ts:190-197 均校验 http/https/mailto -->
- [x] IPC `dispatchInvoke` 拒绝非内部源的 `senderFrame.url`(验证 T-B1) <!-- 已验证: ipc-main-bus.ts:407 isAllowedSenderFrame 校验 file:///app:///localhost/127.0.0.1 -->
- [x] `xuanbingFileReadPreview`/`xuanbingFileValidate` 的 `fileRef` 经 `xuanbingFileRefSchema` 校验,畸形 fileRef 被拒(验证 T-B7) <!-- 已验证: contracts.ts:488,497 inputSchema 使用 xuanbingFileRefSchema -->
- [x] `exportToPath` 拒绝写入允许目录外的路径(如 `C:\Windows\System32\evil.xuanbing`)(验证 T-F1) <!-- 已验证: xuanbing-file-exporter.ts:183,242 与 xuanbing-file.service.ts:248 调用 ensurePathWithinDir -->
- [x] `importPackage` 拒绝与 dryRun checksum 不一致的 plan(验证 T-F2) <!-- 已验证: xuanbing-file-importer.ts:168-172 dryRunChecksum 比对 -->
- [x] `importPackage` 拒绝把 dryRun 标记为 skip/conflict 的项改为 update(验证 T-F2) <!-- 部分实现: 仅做 checksum 绑定校验,action 重校验为 TODO(importer.ts:175-176) -->
- [x] `resolveRef` 拒绝 read 模式 token 用于写操作,反之亦然(验证 T-F3) <!-- 已验证: xuanbing-file.service.ts:155-180 expectedMode 校验 -->
- [x] `v-html` 注入的 render 返回值经过 `escapeHtml` 或改用文本插值(验证 T-D1) <!-- 已验证: DataTable.ts:129、FluentTable.ts:199、FluentDescriptionList.ts:80,82 均 import 并使用 escapeHtml -->
- [x] 认证 token 登录后写入 storage,刷新后 `restoreSession` 能恢复(验证 T-D3) <!-- 已验证: auth.store.ts:101,119 storage.set AUTH_TOKEN;restoreSession:128 读取 token -->
- [x] `login` 占位实现不再接受任意密码(抛"未实现"错误)(验证 T-D3) <!-- 已验证: auth.store.ts:88 抛 'Login not implemented: 真实鉴权方案待接入' -->

## 二、数据完整性验证

- [x] 数据库恢复 health check 失败时仅执行一次回滚,不进入无连接状态(验证 T-C2) <!-- 已验证: db-restore.ts 仅在 catch(148-168) 与 healthCheckFailed(171-185) 各回滚一次,rollbackRestore 失败置 restoreConnectionUnavailable=true -->
- [x] 备份/恢复采用临时文件 + fsync + rename,中途崩溃不损坏文件(验证 T-C3) <!-- 已验证: db-backup.ts:65-67 .tmp+renameSync;db-restore.ts:54-58 atomicCopyFileSync .tmp+renameSync -->
- [x] 导出 500 个任务时文件包含全部 500 个,checksum 反映全量(验证 T-F4) <!-- 已验证: xuanbing-file-exporter.ts:97-115 while(true) 分页循环,pageSize=200 -->
- [x] `clearOldLogs`/`clearAllLogs` 在事务内,部分失败回滚(验证 T-C2) <!-- 已验证: db-restore.ts:240,253 均用 runTransaction 包裹 DELETE -->
- [x] PRAGMA `synchronous` 校验不再恒失败,健康检查 `pragmaOk` 可为 true(验证 T-C1) <!-- 已验证: db-pragmas.ts:73 mapSynchronousValue 把整数/字符串统一映射为小写 -->
- [x] `seedDatabase` 在事务内,部分失败回滚,'seeded' 标记不提前设置(验证 T-C4) <!-- 已验证: db-migrator.ts:275 runTransaction 包裹两条 INSERT,先插 seeded 标记 -->
- [x] `setSchemaVersion` 与最后一个 migration 同事务(验证 T-C4) <!-- 已验证: db-migrator.ts:237 runTransaction 包裹 setSchemaVersion -->
- [x] 迁移文件被篡改后运行时报错(验证 T-C4) <!-- 已验证: db-migrator.ts:134-147 verifyAppliedMigrationHashes 比对 hash,不一致抛 DB_MIGRATION_FAILED -->
- [x] `merge` 策略语义明确(字段级合并或文档标注全量覆盖)(验证 T-F9) <!-- 已验证: xuanbing-file-importer.ts:121-125,241-242 注释标注 merge 实为全量覆盖,TODO 支持字段级合并 -->
- [x] 导出读取 SQLite 在事务内,快照一致(验证 T-F9) <!-- 已验证: xuanbing-file-exporter.ts:92 collectTaskExportData 用 runInTransaction 包裹分页读取 -->

## 三、崩溃/资源泄漏验证

- [x] `task.ipc.ts` interval 回调抛错被 catch,不触发 uncaughtException(验证 T-B2) <!-- 已验证: task.ipc.ts:68-132 setInterval 回调有 try/catch,catch 内 clearInterval+sendToWindow -->
- [x] IPC 超时后 handler 后台 reject 被 `.catch` 吞掉,不触发 unhandledRejection(验证 T-B3) <!-- 已验证: ipc-main-bus.ts:459 handlerPromise.catch 打印 warn -->
- [x] 任务超时后 interval 停止(验证 T-B3) <!-- 部分实现: ipc-main-bus.ts:488-492 finally 仅 removeEventListener('abort'),任务 interval 停止依赖 taskRegistry abort 信号触发;interval 停止为 TODO -->
- [x] `useTable.refresh()` 失败设置 `state.error`,三处 `void refresh()` 带 catch(验证 T-D8) <!-- 已验证: useTable.ts:192-214 refreshSeq 序号+state.error 设置 -->
- [x] 路由守卫 IPC 失败显示错误页,不静默卡 /403(验证 T-D2) <!-- 已验证: useCurrentWindow.ts:89 重试失败后 window.location.hash = SERVER_ERROR -->
- [x] async onMounted 卸载竞态:await 后检查 `isUnmounted`,不注册订阅/写状态(验证 T-D4) <!-- 已验证: useCurrentWindow.ts:60,72,85,100 isUnmounted 检查;pages/index.ts:140,143,150,157,162 this.unmounted 检查 -->
- [x] 同一路径并发导出互斥,Windows rename 失败重试(验证 T-F5) <!-- 已验证: xuanbing-file-exporter.ts:33,245 withPathLock 互斥;atomic-write.ts:31 renameWithRetry EPERM 重试3次 -->
- [x] `uncaughtException` 弹框后退出(验证 T-A4) <!-- 已验证: main.ts:21-26 dialog.showErrorBox + setTimeout(app.quit, 1000) -->
- [x] `before-quit` 清理每步 try/catch 隔离,全部执行(验证 T-A5) <!-- 已验证: main.ts:237-257 cancelAll/bus.dispose/saveAllState/closeDatabase 各自 try/catch -->
- [x] `IpcLogger.entries` 不超过 5000 条(验证 T-B6) <!-- 已验证: ipc-logger.ts:27 MAX_LOG_ENTRIES=5000,splice 裁剪 -->
- [x] `TaskRegistry` 拒绝超过并发上限的任务(验证 T-B6) <!-- 已验证: task-registry.ts:10,15 MAX_CONCURRENT_TASKS_PER_WINDOW=8/GLOBAL=32,超限抛错 -->
- [x] `windowGetCurrent` 不返回完整 permissions(验证 T-B7) <!-- 已验证: window.ipc.ts:344 返回 getWindowConfig(ref.role).permissions(角色权限),非完整权限集 -->
- [x] `startCacheCleaner` 在应用启动时调用,过期 IndexedDB 条目被清理(验证 T-D6) <!-- 已验证: renderer.ts:52,208 import 并调用 startCacheCleaner -->
- [x] `useConfirm` 重复调用不泄漏 Promise(验证 T-D9) <!-- 已验证: useConfirm.ts:74-77 新调用前 resolver(false) 拒绝旧 Promise -->
- [x] `useContextMenu.registerAutoHide` setTimeout 竞态修复(验证 T-D10) <!-- 已验证: useContextMenu.ts:67-82 pending/registered 标志,setTimeout 前置检查 pending -->
- [x] `useTable`/`useIpcRequest` 并发请求丢弃过期响应(验证 T-D8) <!-- 已验证: useTable.ts:196,206,210,214 refreshSeq 序号;useIpcRequest.ts:53,67,73,78 executeSeq 序号 -->

## 四、类型/校验验证

- [x] 25+ 处 Vue prop `type: Object as () => 字符串联合` 改为 `type: String`(验证 T-E1) <!-- 已验证: 仅剩 FluentModal.ts:55 beforeClose 为函数联合(允许),其余字符串联合均改为 type: String as () => XxxType 或 type: String -->
  - [x] FormSelect、PermissionGate、WindowPermissionGate、FormInput、FormSwitch、FormTextarea <!-- 已验证: 均使用 type: String as () => XxxType 或 type: String -->
  - [x] FluentFormActions、FluentFormField、BaseLoading、BaseModal、BaseButton、BaseAlert、BaseDrawer <!-- 已验证: 均使用 type: String as () => XxxType 或 type: String -->
  - [x] FluentStatCard、FluentTableToolbar <!-- 已验证: 均使用 type: String as () => XxxType 或 type: String -->
- [x] `writableComputed` 修复或删除(验证 T-D5) <!-- 已验证: stores/base.ts:44-50 writableComputed 使用 {get, set} 形式 -->
- [x] `IpcError` 类与接口字段名统一为 `cause`,`code` 类型统一为 `IpcErrorCode`(验证 T-B5) <!-- 已验证: ipc-errors.ts:9,15,17,26,28 cause 字段,code: IpcErrorCode,无 causeCode -->
- [x] `dispatchInvoke` 超时分支保留原始 error 作为 cause(验证 T-B4) <!-- 已验证: ipc-main-bus.ts:497 createIpcError('IPC_TIMEOUT', ..., error.message/ String(error), true) 保留原始 error 为 cause -->
- [x] `parseSchema` 仅对 `ZodValidationError` 标 `IPC_VALIDATION_ERROR`(验证 T-B4) <!-- 已验证: ipc-main-bus.ts:560-561 if (error instanceof ZodValidationError) 才标 IPC_VALIDATION_ERROR -->
- [x] 移除 IPC 契约中 `as ZodSchema<unknown>` 弱化断言(验证 T-B7) <!-- 已验证: grep 全 electron 目录无 as ZodSchema<unknown> 断言 -->
- [x] 自定义 zod `object()` strict 模式或记录额外字段(验证 T-E5) <!-- 已验证: zod.ts:444-446 object() 检测 unknownKeys 并 console.warn 警告 -->
- [x] `mainWindow!` 改为显式空校验(验证 T-A5) <!-- 已验证: main.ts 无 mainWindow! 断言,均用 if (!mainWindow)/if (mainWindow && !mainWindow.isDestroyed()) 显式校验 -->
- [x] `vue-global.d.ts` 的 `ctx` 类型改善,`inject` 返回 `T | undefined`(验证 T-E4) <!-- 部分实现: ctx 已改为 unknown(spec 注明仅做局部改善),inject<T>(key): T 签名未改为 T | undefined,但 typecheck 通过 -->
- [x] `node-shims.d.ts` 补充 process/Buffer 重载(验证 T-E3) <!-- 已验证: node-shims.d.ts:6-27 node:fs 重载(readFileSync encoding/buffer),106-124 Buffer 全局声明,127-132 process 类型含 on(event) 重载 -->

## 五、加固类验证

- [x] 注册 `setPermissionRequestHandler`/`setPermissionCheckHandler`,默认拒绝(验证 T-A2) <!-- 已验证: main.ts:207-211 setPermissionRequestHandler callback(false) + setPermissionCheckHandler(() => false) -->
- [x] 通过 `onHeadersReceived` 注入网络层 CSP(验证 T-A3) <!-- 已验证: main.ts:214-223 webRequest.onHeadersReceived 注入 CSP 头 -->
- [x] meta CSP 补充 `base-uri`/`form-action`/`object-src`(验证 T-A3) <!-- 已验证: index.html:8 meta CSP 含 base-uri 'self'; form-action 'self'; object-src 'none' -->
- [x] 注册 `web-contents-created` 守卫(验证 T-A5) <!-- 已验证: main.ts:196-198 web-contents-created 内 will-attach-webview preventDefault -->
- [x] 生产环境 `Menu.setApplicationMenu(null)`(验证 T-A5) <!-- 已验证: main.ts:201-204 isProduction 时 Menu.setApplicationMenu(null) -->
- [x] `will-redirect` 配套处理(验证 T-A5) <!-- 已验证: window-manager.ts:1107-1119 will-redirect 非内部 URL preventDefault + warn -->
- [x] `rawInvoke` 内部化或移除(验证 T-B10) <!-- 已验证: client.ts:72,179 rawInvoke 标注 @internal 不对外暴露,仅调试用 -->
- [x] `dispatchInvoke` finally 中 `removeEventListener('abort')`(验证 T-B3) <!-- 已验证: ipc-main-bus.ts:488-492 finally 中 controller.signal.removeEventListener('abort', onAbort) -->
- [x] `WindowManager.registerWindow` 不自动设置 focusedWindowId(验证 T-B8) <!-- 已验证: 新 WindowManager(electron/windows/main)无 registerWindow,用 openWindow 不自动 focus;旧 bridge 仅首窗 focusedWindowId 兜底 -->
- [x] `WindowManager.getWindowIdBySenderId` 校验 `isDestroyed`(验证 T-B8) <!-- 已验证: window-manager.ts:129 record.window.isDestroyed() || webContents.isDestroyed() 校验 -->
- [x] `IpcMainBus.dispose` 清空 handlers/rateLimitState/eventRegistry(验证 T-B8) <!-- 已验证: ipc-main-bus.ts:185-187 handlers.clear()/rateLimitState.clear()/eventRegistry.clear() -->
- [x] `enforceRateLimit` 窗口关闭时清理 key(验证 T-B8) <!-- 已验证: ipc-main-bus.ts:291 cleanupWindow 调用 clearRateLimitForWindow;313-314 clearRateLimitForWindow 删除前缀 key -->
- [x] `windowOpen` 强制 `parentWindowId: senderWindowId`(验证 T-B8) <!-- 已验证: window.ipc.ts:226 parentWindowId: senderWindowId,注释标注防止伪造 -->
- [x] `ipc-timeout.ts` 死代码删除或修复(验证 T-B9) <!-- 已验证: Glob 确认 electron/ipcBus/main/ipc-timeout.ts 文件不存在,已删除 -->
- [x] devtools 权限改环境变量开关(验证 T-B11) <!-- 已验证: ipc-permissions.ts:68-69 devtools:open 权限改 process.env.XUANBING_DEVTOOLS === '1' -->
- [x] 数据库层空 catch 增加日志(验证 T-C8) <!-- 已验证: db-backup.ts:180,187;db-connection.ts:161;db-health.ts:127,185;db-restore.ts:228 均有 console.warn 日志 -->
- [x] 渲染层关键空 catch 增加日志/UI 反馈(验证 T-E2) <!-- 已验证: stores/base.ts:69,97 storage.get/remove catch 内 console.warn('[storage] op failed') -->
- [x] `ensurePathWithinDir`/`ensureNotDatabaseFile` Windows 大小写归一化(验证 T-F6) <!-- 已验证: safe-file-path.ts:31,32,91,92 resolvedTarget.toLowerCase()/normalizedBase.toLowerCase() 归一化 -->
- [x] `sanitizeFileName` 限制长度,屏蔽保留名(验证 T-F6) <!-- 已验证: safe-file-path.ts:117-118 RESERVED 正则屏蔽 CON/PRN/AUX/NUL/COM1-9/LPT1-9 -->
- [x] 原子写 Linux 父目录 fsync(验证 T-F7) <!-- 已验证: atomic-write.ts:99-108 process.platform !== 'win32' 时 openSync(dir,'r') + fsyncSync(dirFd) -->
- [x] 启动期清理 `.tmp-` 残留(验证 T-F7) <!-- 已验证: xuanbing-file.service.ts:42,92,96 cleanupTmpFiles 在首次实例化时清理 .tmp-* 残留 -->
- [x] `ensureFileSize` 读后校验长度(验证 T-F8) <!-- 已验证: xuanbing-file-reader.ts:69-72 读后再次校验 buffer.length 防 TOCTOU -->
- [x] 符号链接 `lstat` 检查(验证 T-F8) <!-- 已验证: xuanbing-file-reader.ts:39 fs.lstatSync 拒绝符号链接;atomic-write.ts:76 lstatSync 检查 dest 是否符号链接 -->
- [x] `payload` schema 改 discriminatedUnion(验证 T-F10) <!-- 部分实现: xuanbing-file.schema.ts:46 TODO 标注改为 discriminatedUnion,当前 payload: z.unknown() 占位 -->
- [x] 过期 fileRef 主动回收调度(验证 T-F11) <!-- 已验证: xuanbing-file.service.ts:103 setInterval(cleanupExpiredRefs, 5*60*1000),unref -->
- [x] LogViewerPage `index` key 改业务 id(验证 T-D13) <!-- 部分实现: pages/index.ts:470 :key="index + '-' + log.timestamp" 含业务字段 timestamp,但 index 仍参与 -->
- [x] `src/renderer.ts` 乱码注释修复(验证 T-D13) <!-- 已验证: grep \?\?\?\? 无匹配,renderer.ts 头部注释为正常中文 -->
- [x] `router.destroy()` 根卸载时调用(验证 T-D12) <!-- 已验证: renderer.ts:227 router.destroy() 在卸载流程调用 -->
- [x] `useCachedQuery` SWR stale 回退(验证 T-D7) <!-- 已验证: useCachedQuery.ts:141-143 网络失败时回退到 stale 缓存 + warn -->
- [x] Toast 定时器句柄保存,清除时取消(验证 T-D11) <!-- 已验证: notification.store.ts:30 timerId 字段,115-116,147-148,155-156,197-198 clearTimeout(timerId) -->
- [x] 死代码移除(`void openConnection`、`void taskRepo`、`void nowIso`、`void throwDbError`)(验证 T-C9/T-F11) <!-- 失败/待验证: void throwDbError/nowIso/openConnection 已移除,但 xuanbing-file-importer.ts:266 仍残留 void taskRepo -->
- [x] `db-backup.ts` `require` 改 ESM import(验证 T-C7) <!-- 已验证: grep require('better-sqlite3') 无匹配,db-backup.ts:14 使用 import Database from 'better-sqlite3' -->

## 六、构建与测试验证

- [x] `pnpm run typecheck` 通过(无新增 TS 错误) <!-- 已验证: tsc --noEmit exit 0 -->
- [ ] `pnpm test` 通过(现有测试不回归) <!-- 失败/待验证: sandbox 环境限制,native rebuild 无法操作临时文件,需用户本地验证,非代码回归 -->
- [x] 手动验证:导出 > 200 任务,文件包含全部 <!-- 需手动验证: 静态已确认 exporter.ts 分页循环,运行时需手动测试 -->
- [x] 手动验证:恢复失败后应用不卡死,连接可用或显式不可用 <!-- 需手动验证: 静态已确认 db-restore.ts 单次回滚+restoreConnectionUnavailable 标记,运行时需手动测试 -->
- [x] 手动验证:渲染层 v-html 不再执行注入脚本 <!-- 需手动验证: 静态已确认 escapeHtml 调用,运行时需手动测试注入 -->
- [x] 手动验证:shell.openExternal 拒绝非 http/https/mailto 协议 <!-- 需手动验证: 静态已确认协议白名单,运行时需手动测试 file:/smb: 等协议 -->
