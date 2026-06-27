# Tasks

本 spec 涉及 129 项问题的修复,按 6 个维度组织。任务编号格式 `T<维度>-<序号>`,维度编号:
- A = Electron 主进程安全
- B = IPC 通信
- C = 数据库
- D = Vue 渲染层
- E = 类型安全/错误处理
- F = 文件操作

**并行策略**:不同维度的任务互不依赖,可多开 sub-agent 并行执行。同一维度内,标注 `[parallel]` 的子任务可并行,其余按序执行。

---

## 维度 A:Electron 主进程安全(11 项)

- [x] T-A1:`shell.openExternal` 增加协议白名单 [parallel]
  - [x] T-A1.1:在 `electron/ipcBus/main/index.ts:85-87` 包装 `shellOpenExternal`,解析 `new URL(url).protocol`,仅放行 `http:`/`https:`/`mailto:`,其余拒绝并记日志
  - [x] T-A1.2:`electron/windows/main/window-manager.ts:1086-1090` 的 will-navigate 转投 openExternal 复用同一包装
  - [x] T-A1.3:为 `shell.openExternal` 返回的 Promise 加 `.catch`
- [x] T-A2:注册权限请求处理器 [parallel]
  - [x] T-A2.1:在 `app.whenReady()` 后注册 `session.defaultSession.setPermissionRequestHandler`,默认 `callback(false)`
  - [x] T-A2.2:注册 `setPermissionCheckHandler` 同步校验
- [x] T-A3:网络层 CSP + 收紧 style-src [parallel]
  - [x] T-A3.1:在主进程对 `defaultSession` 注册 `onHeadersReceived` 追加 `Content-Security-Policy` 头
  - [x] T-A3.2:`index.html:6-9` 的 meta CSP 补充 `base-uri 'self'`、`form-action 'self'`、`object-src 'none'`,收紧 `style-src`(评估能否移除 `unsafe-inline`)
- [x] T-A4:`uncaughtException` 弹框后退出 [parallel]
  - [x] T-A4.1:`electron/main.ts:21-24` 弹框后延迟 `app.quit()`(如 1s 允许日志落盘)
  - [x] T-A4.2:`unhandledRejection` 接入持久化日志(复用 IpcLogger 或写文件)
- [x] T-A5:加固项(低危,合并一个任务) [parallel]
  - [x] T-A5.1:注册 `app.on('web-contents-created')` 守卫,拒绝预期外 webContents
  - [x] T-A5.2:生产环境 `Menu.setApplicationMenu(null)`
  - [x] T-A5.3:`will-navigate` 配套处理 `will-redirect`(`window-manager.ts:1075`)
  - [x] T-A5.4:`before-quit` 清理链路(`main.ts:198-203`)每步包 try/catch
  - [x] T-A5.5:`mainWindow!`(`main.ts:130`)改为显式空校验

## 维度 B:IPC 通信(23 项)

- [x] T-B1:跨帧 IPC 越权防护 [parallel]
  - [x] T-B1.1:`electron/ipcBus/main/ipc-main-bus.ts:384-420` 的 `dispatchInvoke` 增加 `event.senderFrame.url` 白名单校验(仅允许 `app://`/`file://`/dev server 源)
  - [x] T-B1.2:抽取内部源白名单为常量,复用 `window-url-resolver.ts` 的 `isInternalUrl`
- [x] T-B2:task.ipc.ts interval 异常防护 [parallel]
  - [x] T-B2.1:`electron/ipcBus/main/modules/task.ipc.ts:67-117` 的 `setInterval` 回调最外层包 try/catch
  - [x] T-B2.2:catch 内终结任务(taskRegistry.finishTask)并记日志
- [x] T-B3:IPC 超时 unhandledRejection 防护 [parallel]
  - [x] T-B3.1:`electron/ipcBus/main/ipc-main-bus.ts:422-461` 对 `record.handler(...)` 增加 `.catch(() => {})` 兜底
  - [x] T-B3.2:任务超时的 AbortController 与 taskRegistry 控制器打通,超时停止 interval
  - [x] T-B3.3:`dispatchInvoke` finally 中 `removeEventListener('abort', handler)`
- [x] T-B4:IPC 错误处理改进 [parallel]
  - [x] T-B4.1:`ipc-main-bus.ts:462-468` 超时分支保留原始 error 作为 cause
  - [x] T-B4.2:`ipc-main-bus.ts:504-510` `parseSchema` 仅对 `ZodValidationError` 标 `IPC_VALIDATION_ERROR`,其他 Error 原样抛出
  - [x] T-B4.3:`ipc-errors.ts:162` `sanitizeDetail` 增强正则覆盖 Unix/UNC/file URI,处理含空格路径
- [x] T-B5:统一 IpcError 类型 [parallel]
  - [x] T-B5.1:`electron/ipcBus/main/ipc-errors.ts:24` 的 `IpcError` 类字段名 `causeCode` → `cause`,`code` 类型改为 `IpcErrorCode`
  - [x] T-B5.2:同步 `IpcErrorShape`(ipc-errors.ts:13-19)与 shared/errors.ts:34 的 `IpcError` 接口
  - [x] T-B5.3:全项目搜索 `causeCode` 引用并替换为 `cause`
- [x] T-B6:资源限制 [parallel]
  - [x] T-B6.1:`electron/ipcBus/main/ipc-logger.ts:28,50` `entries` 增加上限 5000,环形覆盖
  - [x] T-B6.2:`electron/ipcBus/main/task-registry.ts:29-44` 增加 `maxConcurrentTasksPerWindow`/`maxConcurrentTasksGlobal` 限制
- [x] T-B7:信息泄漏与契约收紧 [parallel]
  - [x] T-B7.1:`electron/ipcBus/main/modules/window.ipc.ts:344-350` `windowGetCurrent` 不返回完整 permissions,改为布尔摘要或不返回
  - [x] T-B7.2:`electron/ipcBus/shared/contracts.ts:487,496` `xuanbingFileReadPreview`/`xuanbingFileValidate` 的 `fileRef` 改为 `xuanbingFileRefSchema`
  - [x] T-B7.3:移除契约中 `as ZodSchema<unknown>` 弱化断言(contracts.ts:427 等)
- [x] T-B8:WindowManager 与 dispose 清理 [parallel]
  - [x] T-B8.1:`window-manager.ts:51` `registerWindow` 不自动设置 focusedWindowId
  - [x] T-B8.2:`window-manager.ts:121-133` `getWindowIdBySenderId` 增加 `isDestroyed` 校验
  - [x] T-B8.3:`ipc-main-bus.ts:176-186` `dispose` 清空 `handlers`/`rateLimitState`/`eventRegistry`
  - [x] T-B8.4:`ipc-main-bus.ts:520-536` `enforceRateLimit` 窗口关闭时清理对应 key
  - [x] T-B8.5:`window.ipc.ts:226` 强制 `parentWindowId: senderWindowId`,拒绝回退
- [x] T-B9:ipc-timeout.ts 死代码处理 [parallel]
  - [x] T-B9.1:删除 `electron/ipcBus/main/ipc-timeout.ts`(无调用点)或修复 unhandledRejection 风险
- [x] T-B10:rawInvoke 内部化 [parallel]
  - [x] T-B10.1:`electron/ipcBus/preload/client.ts:177-179` `rawInvoke` 设为内部 Symbol 或移除
- [x] T-B11:devtools 权限开关 [parallel]
  - [x] T-B11.1:`ipc-permissions.ts:68-70` 改为基于 `process.env.XUANBING_DEVTOOLS` 显式开关

## 维度 C:数据库(18 项)

- [x] T-C1:修复 PRAGMA synchronous 校验 bug(最高优先级) [parallel]
  - [x] T-C1.1:`electron/database/db-pragmas.ts:33,55,77-79` 修复 `synchronous` 校验:读取整数返回值并映射(0=OFF,1=NORMAL,2=FULL,3=EXTRA),或设置后读取归一化字符串比较
  - [x] T-C1.2:验证其余 PRAGMA(journal_mode/foreign_keys/busy_timeout)校验正确
- [x] T-C2:重写数据库恢复流程 [parallel]
  - [x] T-C2.1:`electron/database/db-restore.ts:108-149` 消除双重回滚,统一回滚入口
  - [x] T-C2.2:回滚失败时显式标记连接不可用,不静默吞错
  - [x] T-C2.3:`db-restore.ts:193-210` `clearOldLogs`/`clearAllLogs` 用 `runTransaction` 包裹
- [x] T-C3:备份/恢复原子化 [parallel]
  - [x] T-C3.1:`db-backup.ts:64` 改为临时文件 + fsync + rename
  - [x] T-C3.2:`db-restore.ts:102,168` 同样原子化
- [x] T-C4:迁移与种子数据 [parallel]
  - [x] T-C4.1:`db-migrator.ts:152-205` 运行时对比存储 hash 与文件当前 hash,不一致报错
  - [x] T-C4.2:`db-migrator.ts:224-257` `seedDatabase` 包裹事务
  - [x] T-C4.3:`db-migrator.ts:197` `setSchemaVersion` 包裹事务(与最后一个 migration 同事务)
- [x] T-C5:Service 层重构 [parallel]
  - [x] T-C5.1:`electron/services/task.service.ts:40-158` 改为调用 TaskRepository/AuditRepository 方法,不直接用 `tx.prepare()`
  - [x] T-C5.2:Repository 增加接受事务上下文的方法签名(可选 tx 参数)
- [x] T-C6:Repository 非空断言 [parallel]
  - [x] T-C6.1:`file-asset.repository.ts:90`、`setting.repository.ts:71`、`task.repository.ts:96`、`window-state.repository.ts:78` 的 `!` 改为返回 null 或抛明确错误
- [x] T-C7:db-backup.ts 清理 [parallel]
  - [x] T-C7.1:`db-backup.ts:173` `require('better-sqlite3')` 改为 ESM import
  - [x] T-C7.2:`db-backup.ts:14,193-194` 移除 `void openConnection`/`void closeConnection` 死代码
- [x] T-C8:数据库层空 catch 加日志 [parallel]
  - [x] T-C8.1:`db-connection.ts:110,142,160`、`db-health.ts:79,97,107,126,182`、`db-migrator.ts:123,289`、`db-restore.ts:83,136,182`、`db-backup.ts:116,177,183` 空 catch 增加 `console.warn` 或日志
- [x] T-C9:其他低危 [parallel]
  - [x] T-C9.1:`db-health.ts:191` 移除 `void path`,`db-migrator.ts:256` 移除 `void now`
  - [x] T-C9.2:`db-migrator.ts:272,286` 调整函数定义顺序
  - [x] T-C9.3:`db-health.ts:180` 字符串插值表名加注释说明安全前提
  - [x] T-C9.4:`file-asset.repository.ts:123` `includeDeleted` 重复检查逻辑澄清
  - [x] T-C9.5:`xuanbing-file-importer.ts:135,215` 移除 `void taskRepo` 死代码

## 维度 D:Vue 渲染层(26 项)

- [x] T-D1:v-html XSS 防护 [parallel]
  - [x] T-D1.1:`components/table/DataTable.ts:217`、`components/data/FluentTable.ts:293`、`components/data/FluentDescriptionList.ts:118,138` 的 render 返回值过 `escapeHtml` 或改文本插值
  - [x] T-D1.2:在 `src/renderer/utils/` 新增 `escapeHtml.ts` 工具(若不存在)
- [x] T-D2:路由守卫竞态修复 [parallel]
  - [x] T-D2.1:`src/renderer/composables/useCurrentWindow.ts:55-64` IPC 失败增加重试一次或错误状态
  - [x] T-D2.2:`src/renderer.ts:195-214` 权限到达后重跑守卫(不止首次)
  - [x] T-D2.3:IPC 持续失败时显示错误页而非静默卡 /403
- [x] T-D3:认证 token 持久化 [parallel]
  - [x] T-D3.1:`src/renderer/stores/auth.store.ts:81-107` `login` 写 `AUTH_TOKEN` 到 storage
  - [x] T-D3.2:`restoreSession`(line 123-126)读取 token 恢复 `state.token`
  - [x] T-D3.3:`login` 占位实现改为抛"未实现"错误并标注 TODO(任意密码不再通过)
- [x] T-D4:async onMounted 卸载竞态 [parallel]
  - [x] T-D4.1:`useCurrentWindow.ts:55-116` 增加 `isUnmounted` 标志,await 后检查再注册订阅/写状态
  - [x] T-D4.2:`pages/index.ts:133-201` HomePage 同样处理
- [x] T-D5:writableComputed 修复 [parallel]
  - [x] T-D5.1:`src/renderer/stores/base.ts:44-47` 传入 `{get,set}` 形式给 `Vue.computed`,或删除该死代码
- [x] T-D6:缓存清理器启动 [parallel]
  - [x] T-D6.1:`src/renderer.ts` 启动时调用 `startCacheCleaner`(从 `cache/cache-cleaner.ts:13`)
  - [x] T-D6.2:`cache/cache-store.ts:99-101` `getCache` 读到过期条目时删除
- [x] T-D7:useCachedQuery SWR stale 回退 [parallel]
  - [x] T-D7.1:`src/renderer/composables/useCachedQuery.ts:125-138` 网络失败时回退 stale 缓存
- [x] T-D8:表格/请求并发防护 [parallel]
  - [x] T-D8.1:`src/renderer/composables/useTable.ts:190-208` `refresh` 增加请求序号,丢弃过期响应,加 catch 设置 `state.error`
  - [x] T-D8.2:三处 `void refresh()`(165,214,253)改为带 catch
  - [x] T-D8.3:`src/renderer/composables/useIpcRequest.ts:59-72` 增加请求序号,卸载时 Abort
- [x] T-D9:useConfirm Promise 泄漏 [parallel]
  - [x] T-D9.1:`src/renderer/composables/useConfirm.ts:44-83` 增加排队或拒绝旧请求机制
- [x] T-D10:useContextMenu setTimeout 竞态 [parallel]
  - [x] T-D10.1:`src/renderer/composables/useContextMenu.ts:59-75` 修复 setTimeout 与 cleanup 竞态
- [x] T-D11:Toast 定时器 [parallel]
  - [x] T-D11.1:`src/renderer/stores/notification.store.ts:113-117` setTimeout 句柄保存,清除时取消
  - [x] T-D11.2:loading Toast(`duration:0`)增加最大常驻时间兜底
- [x] T-D12:hashchange 监听泄漏 [parallel]
  - [x] T-D12.1:`src/renderer.ts:216-220` 根 `onBeforeUnmount` 调用 `router.destroy()`
- [x] T-D13:其他低危 [parallel]
  - [x] T-D13.1:`pages/index.ts:455` LogViewerPage `index` key 改业务 id
  - [x] T-D13.2:`src/renderer.ts:249,309` 修复乱码注释
  - [x] T-D13.3:`components/base/BaseModal.ts:91-97` keydown 监听仅在打开时注册
  - [x] T-D13.4:`stores/theme.store.ts:114-118` mediaQuery 监听增加移除(如适用)
  - [x] T-D13.5:`stores/permission.store.ts:77-80` `allPermissions` 缓存数组避免重算
  - [x] T-D13.6:`pages/TaskDetailPage.ts:49` `window.history.back()` 改 `router.navigate`
  - [x] T-D13.7:`components/business/RouteViewWrapper.ts:15` 移除未使用的 inject 死代码
  - [x] T-D13.8:`pages/index.ts:400-424`、`TaskDetailPage.ts:37-45` mock 数据标注 TODO

## 维度 E:类型安全/错误处理(21 项)

- [x] T-E1:Vue prop type 修复(25+ 处) [parallel]
  - [x] T-E1.1:批量将 `type: Object as () => 字符串联合` 改为 `type: String as () => 字符串联合`
  - [x] T-E1.2:涉及文件:FormSelect、PermissionGate、WindowPermissionGate、FormInput、FormSwitch、FormTextarea、FluentFormActions、FluentFormField、BaseLoading、BaseModal、BaseButton、BaseAlert、BaseDrawer、FluentStatCard、FluentTableToolbar 等
- [x] T-E2:渲染层空 catch 加日志 [parallel]
  - [x] T-E2.1:`useCurrentWindow.ts:62`、`stores/base.ts:65,79,92`、`pages/index.ts:149,342,349,431,539`、`useCachedQuery.ts:106`、`BaseError.ts:40`、`FluentError.ts:40` 关键位置加日志或 UI 反馈
- [x] T-E3:node-shims.d.ts 改进 [parallel]
  - [x] T-E3.1:`types/node-shims.d.ts` 补充 `process.on` 的具体重载签名(uncaughtException/unhandledRejection)
  - [x] T-E3.2:补充 `Buffer` 常用方法(indexOf/equals/write)
  - [x] T-E3.3:评估能否直接用 `@types/node` 替代 shim(若构建链允许)
- [x] T-E4:vue-global.d.ts 局部改善 [parallel]
  - [x] T-E4.1:`src/renderer/vue-global.d.ts:39` `setup` 的 `ctx` 类型改为带 `emit/slots/attrs` 的具体接口
  - [x] T-E4.2:`inject<T>` 返回类型改为 `T | undefined`
  - [x] T-E4.3:补充 `watchEffect`/`toRefs`/可写 computed 的 `{get,set}` 重载
- [x] T-E5:自定义 zod 改进 [parallel]
  - [x] T-E5.1:`electron/ipcBus/shared/zod.ts:432-451` `object()` 增加 `strict` 模式或记录额外字段为 warning
  - [x] T-E5.2:评估能否用真实 zod 替代自定义实现(若 bundle 体积可接受)

## 维度 F:文件操作(30 项)

- [x] T-F1:导出路径限制(高危) [parallel]
  - [x] T-F1.1:`electron/file-db/xuanbing-file-exporter.ts:173-214` `exportToPath` 调用 `ensurePathWithinDir`(允许 userData/downloads)
  - [x] T-F1.2:`electron/services/xuanbing-file.service.ts:166-195` service 层 `exportPackage` 同样校验目录
- [x] T-F2:importPackage plan 服务端校验(高危) [parallel]
  - [x] T-F2.1:`electron/file-db/xuanbing-file-importer.ts:124-236` plan 携带 dryRun checksum,import 时校验文件 checksum 一致
  - [x] T-F2.2:主进程对每项 action 重新校验与 dryRun 结果一致(skip/conflict 不可改为 update)
- [x] T-F3:resolveRef mode 校验(高危) [parallel]
  - [x] T-F3.1:`electron/services/xuanbing-file.service.ts:101-118` `resolveRef` 增加 mode 参数,调用方传入期望 mode 并校验
  - [x] T-F3.2:导出处理器(ipc:142-162)传 `mode:'write'`,读取预览传 `mode:'read'`
- [x] T-F4:导出分页循环(高危) [parallel]
  - [x] T-F4.1:`electron/file-db/xuanbing-file-exporter.ts:61-65` 改为分页循环直到取尽
  - [x] T-F4.2:超量时记日志(不静默截断)
- [x] T-F5:文件锁与并发(高危) [parallel]
  - [x] T-F5.1:新增进程内路径锁(基于 Map<path, Promise>),导出/写入同路径互斥
  - [x] T-F5.2:`atomic-write.ts:48` Windows rename 失败增加重试(3 次,退避)
- [x] T-F6:路径校验加固 [parallel]
  - [x] T-F6.1:`safe-file-path.ts:23` `ensurePathWithinDir` Windows 大小写归一化比较
  - [x] T-F6.2:`safe-file-path.ts:78-88` `ensureNotDatabaseFile` 大小写归一化,覆盖 WAL/SHM
  - [x] T-F6.3:`safe-file-path.ts:96-98` `sanitizeFileName` 限制长度,屏蔽 Windows 保留名
  - [x] T-F6.4:处理 UNC 路径与长路径前缀 `\\?\`
- [x] T-F7:原子写加固 [parallel]
  - [x] T-F7.1:`atomic-write.ts:39-48` Linux 下增加父目录 fsync
  - [x] T-F7.2:启动期清理 `.tmp-` 残留临时文件(在 `main.ts` 或 service 初始化)
- [x] T-F8:文件读取加固 [parallel]
  - [x] T-F8.1:`xuanbing-file-reader.ts:35,40` 读后再次校验长度,防 TOCTOU
  - [x] T-F8.2:`xuanbing-file-reader.ts:40`、`atomic-write.ts` 增加 `lstat` 检查符号链接
  - [x] T-F8.3:评估大文件流式读取(50MB 整读 + JSON.parse 内存膨胀)
- [x] T-F9:导入逻辑修复 [parallel]
  - [x] T-F9.1:`xuanbing-file-importer.ts:88-90,191-211` `merge` 策略改为字段级合并或显式标注"全量覆盖"语义,文档说明
  - [x] T-F9.2:`xuanbing-file-exporter.ts:57-103` 导出读取 SQLite 包裹事务,保证快照一致
- [x] T-F10:schema 与校验 [parallel]
  - [x] T-F10.1:`xuanbing-file.schema.ts:38` `payload` 改为 `z.discriminatedUnion('type', ...)`,每种文件类型定义 payload schema
  - [x] T-F10.2:`xuanbing-file-importer.ts:68,126` 移除 `as TaskExportPayload` 强转,用 schema 校验
  - [x] T-F10.3:`xuanbing-file.schema.ts` 增加 `minSupportedVersion` 与迁移框架占位
  - [x] T-F10.4:`xuanbing-file-checksum.ts` 文档说明"仅防意外损坏,不防恶意篡改"
- [x] T-F11:fileRef 回收与死代码 [parallel]
  - [x] T-F11.1:`xuanbing-file.service.ts:247-254` `cleanupExpiredRefs` 增加 `setInterval` 调度(如每 5 分钟)
  - [x] T-F11.2:移除死代码:`xuanbing-file-exporter.ts:217` `void throwDbError`、`xuanbing-file.service.ts:267` `void nowIso`、`xuanbing-file-exporter.ts:60` filter 仅 status 文档说明
- [x] T-F12:其他低危 [parallel]
  - [x] T-F12.1:`xuanbing-file-writer.ts:55-58` 写后回读校验 checksum(可选)
  - [x] T-F12.2:`xuanbing-file-exporter.ts:151,204` `statSync` 包 try/catch
  - [x] T-F12.3:`xuanbing-file-reader.ts:61-68` magic 校验对非对象输入显式拒绝
  - [x] T-F12.4:`xuanbing-file-checksum.ts:13-15` 文档说明排除字段的影响

---

# Task Dependencies

## 跨维度依赖
- T-B5(统一 IpcError 类型)应在 T-B4(IPC 错误处理改进)之前完成,因为 B4 引用 cause 字段
- T-C1(修复 PRAGMA synchronous)必须先于 T-C2(重写恢复流程)完成,因为恢复流程的 health check 依赖 PRAGMA 校验正确
- T-F2(importPackage plan 校验)依赖 T-F4(导出分页)的 checksum 改动一致
- T-D2(路由守卫)依赖 T-D3(认证 token)的持久化逻辑

## 可完全并行的维度
A、B、C、D、E、F 六个维度之间无硬依赖,可多开 6 个 sub-agent 并行执行(每个维度内部再并行子任务)。

## 建议并行批次
- **批次 1**(6 个 sub-agent):每个维度各开一个,先做该维度的高危任务
  - A: T-A1(shell.openExternal)
  - B: T-B1(跨帧 IPC)+ T-B2(interval 异常)+ T-B3(超时 unhandledRejection)
  - C: T-C1(PRAGMA bug)+ T-C2(恢复流程)+ T-C3(原子化)
  - D: T-D1(v-html XSS)+ T-D2(路由守卫)+ T-D3(认证)
  - E: T-E1(prop type 修复)
  - F: T-F1(导出路径)+ T-F2(plan 校验)+ T-F3(mode 校验)+ T-F4(分页)+ T-F5(文件锁)
- **批次 2**(6 个 sub-agent):每个维度的中危任务
- **批次 3**(6 个 sub-agent):每个维度的低危任务与清理
