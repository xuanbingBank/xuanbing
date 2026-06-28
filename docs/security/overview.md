# xuanbing(All In One)安全设计总览

> 本文档面向 Electron 桌面应用 `xuanbing(All In One)`,系统梳理主进程、preload、渲染层与文件/数据库子系统的安全机制。所有引用均使用 `file:///` 绝对路径链接,代码标识符保留英文。

---

## 1. 安全设计哲学

xuanbing 作为本地优先的桌面应用,安全设计遵循三条核心原则:

1. **默认拒绝(Default Deny)**:权限请求、IPC 调用、外部链接、文件路径,一律先拒绝、再按白名单放行。
2. **最小暴露(Least Exposure)**:渲染层只能通过 `contextBridge` 暴露的最小化 `desktop` API 访问主进程能力,`ipcRenderer` / `require` / `process` 一律不可达。
3. **纵深防御(Defense in Depth)**:CSP 双层、IPC 四件套(Zod + 权限 + 限流 + 超时)、路径校验、文件 checksum、数据库恢复前备份,每一层独立生效,任一层失效不致整体失守。

---

## 2. CSP 双层防御

CSP 同时在静态层与网络层注入,确保即使其中一层被绕过,另一层仍可兜底。

### 2.1 静态层:index.html meta 标签

`index.html` 在 `<head>` 内通过 `http-equiv="Content-Security-Policy"` 注入策略,在 HTML 解析阶段即生效,确保首屏渲染前 CSP 已就位。

- 文件:file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/index.html

```html
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
    img-src 'self' data:; font-src 'self' data:; connect-src 'self';
    base-uri 'self'; form-action 'self'; object-src 'none';"
/>
```

### 2.2 网络层:main.ts onHeadersReceived

`app.whenReady()` 后通过 `session.defaultSession.webRequest.onHeadersReceived` 在响应头注入同一条 CSP,覆盖任何外部资源或动态加载场景。

- 文件:file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/main.ts(第 223–232 行)

### 2.3 策略逐项解释

| 指令 | 取值 | 设计理由 |
| --- | --- | --- |
| `default-src` | `'self'` | 默认所有资源仅允许同源,兜底未显式列出的类型。 |
| `script-src` | `'self'` | 严格限定脚本来源,禁止内联脚本与 `unsafe-eval`,配合 Vue 模板预编译杜绝动态求值。 |
| `style-src` | `'self' 'unsafe-inline'` | **允许 `'unsafe-inline'` 是经过评估的妥协**:`index.html` 内存在 daisyUI 加载前的内联回退样式块,且 Vue 运行时通过 `:style` 绑定动态内联样式;移除会导致基础样式与动态样式失效。 |
| `img-src` | `'self' data:` | 允许 `data:` URI 用于内联图标与 SVG 占位图,避免外部请求。 |
| `font-src` | `'self' data:` | 字体可内联为 base64,无需外部 CDN。 |
| `connect-src` | `'self'` | 禁止任何 `fetch`/`XHR`/`WebSocket` 跨源请求,杜绝数据外泄通道。 |
| `base-uri` | `'self'` | 防止 `<base>` 标签被注入后改写相对 URL 解析基准。 |
| `form-action` | `'self'` | 阻止表单提交到外部地址。 |
| `object-src` | `'none'` | 完全禁用 Flash/Plugin 等遗留对象嵌入。 |

> **注意**:`style-src` 的 `'unsafe-inline'` 是当前唯一放宽项,任何新功能若引入新内联样式需求,必须先评估是否能改为外链或 CSS-in-JS 静态产物,不得进一步放宽策略。

---

## 3. contextBridge 最小化暴露

### 3.1 暴露入口

`electron/preload.ts` 仅调用 `exposeDesktopApi()`,通过 `contextBridge.exposeInMainWorld('desktop', desktopApi)` 暴露最小化 API。

- 文件:file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/preload.ts
- 文件:file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/preload/expose-api.ts

### 3.2 暴露内容

渲染层只能通过 `window.desktop` 访问三类方法:

1. `invoke(channel, input)` —— 请求/响应型 IPC。
2. `request(channel, input)` —— 与 `invoke` 等价的别名,语义保留。
3. `event(channel, payload)` —— 向主进程发送事件型消息。

### 3.3 严格禁止暴露

- **不暴露 `ipcRenderer`**:渲染层无法直接 `ipcRenderer.send` / `ipcRenderer.on`,所有通道必须经契约注册。
- **不暴露 `require`**:避免加载任意 Node 模块。
- **不暴露 `process`**:避免泄露环境变量与运行时信息。
- **不暴露 `webFrame` / `webContents`**:避免渲染层操作底层 webContents。

---

## 4. 权限默认拒绝

### 4.1 setPermissionRequestHandler

`app.whenReady()` 后,默认拒绝所有权限请求(摄像头、麦克风、通知等),本地桌面应用不需要这些能力。

- 文件:file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/main.ts(第 216–218 行)

```typescript
session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
  callback(false)
})
```

### 4.2 setPermissionCheckHandler

同步权限校验同样默认拒绝,覆盖 `navigator.permissions.query` 等同步路径,防止渲染层通过同步 API 探测权限状态。

- 文件:file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/main.ts(第 220 行)

```typescript
session.defaultSession.setPermissionCheckHandler(() => false)
```

> **硬约束**:任何场景下都不得将上述处理器改为 `callback(true)` 或 `() => true`。如未来确需某项权限(例如通知),必须改为按权限类型显式白名单,而非整体放开。

---

## 5. webview 阻止

主进程在 `app.on('web-contents-created')` 中对所有 webContents 监听 `will-attach-webview`,调用 `e.preventDefault()` 阻止任何 `<webview>` 标签附着。

- 文件:file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/main.ts(第 202–204 行)

```typescript
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-attach-webview', (e) => e.preventDefault())
})
```

**强制模型**:所有需要新窗口的场景必须通过 `WindowManager.openWindow()` 创建 `BrowserWindow` 并加载同一 preload,不得使用 `<webview>`。这样保证:

- 新窗口同样受 CSP 与权限处理器约束。
- 新窗口的 IPC 调用同样经过 `bridgeWindowManagers()` 注册到 `IpcMainBus`,通过权限校验。

---

## 6. IPC 安全四件套

每个 IPC 通道在 `IpcMainBus.dispatchInvoke` 中必须依次通过以下五重检查,任一失败即返回标准化错误:

- 文件:file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/ipc-main-bus.ts(第 399–534 行)
- 文件:file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/shared/contracts.ts(契约定义)

### 6.1 步骤 1:发送方帧校验(isAllowedSenderFrame)

- 生产环境仅放行 `file://` 与 `app://`,**禁用 `localhost` / `127.0.0.1`**,防止 webContents 被导航到本地恶意服务后越权调用 IPC。
- 非生产环境额外放行 dev server 源。
- 文件:file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/ipc-main-bus.ts(第 546–563 行)

> **硬约束**:生产环境必须禁用 `localhost` / `127.0.0.1`,详见 [工程约定与硬约束](../conventions/constraints.md)。

### 6.2 步骤 2:权限检查(rolePermissions)

- 通过 `createPermissionChecker` 派生权限检查器,基于窗口角色(`main` / `settings` / `workerPanel`)与契约 `permission` 字段判断。
- 缺失 `permission` 字段或窗口角色未知时一律拒绝。
- `devtools:open` 强制走 `XUANBING_DEVTOOLS` 环境开关,避免角色权限表中含该项时绕过环境开关。
- 文件:file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/ipc-permissions.ts

### 6.3 步骤 3:负载大小校验(maxPayloadBytes)

- 契约可声明 `maxPayloadBytes`,超过即抛 `IPC_PAYLOAD_TOO_LARGE`。
- 默认值 `DEFAULT_IPC_MAX_PAYLOAD_BYTES = 64 * 1024`(64KB),关键通道(如 `xuanbingFile:importPackage`)放宽至 16MB。
- 文件:file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/shared/constants.ts

### 6.4 步骤 4:限流(rateLimit token bucket)

- 契约可声明 `rateLimit: { maxCalls, windowMs }`,按 `windowId:channel` 维度计数。
- 超限抛 `IPC_RATE_LIMITED`,`retryable: true`。
- 窗口关闭时通过 `clearRateLimitForWindow` 清理计数,避免残留导致后续窗口误触发。
- 文件:file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/ipc-main-bus.ts(第 645–661 行)

### 6.5 步骤 5:超时(timeoutMs) + Zod 校验 + 审计(audit)

- **超时**:契约 `timeoutMs` 默认 15 秒,长任务(如 `databaseRestore`)放宽至 120 秒;超时通过 `AbortController.abort()` 触发,抛 `IPC_TIMEOUT`。
- **Zod 校验**:输入与输出均经 `inputSchema` / `outputSchema` 校验,失败抛 `IPC_VALIDATION_ERROR`。
- **审计**:契约 `audit: true` 时,无论成功或失败,均通过 `recordAuditIfNeeded` 写入 `audit_logs` 表;审计写入失败仅 `console.warn`,不影响业务返回值。
- 文件:file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/ipc-main-bus.ts(第 445–505 行、第 574–605 行)

> **硬约束**:`audit: true` 的通道必须写 `audit_logs` 表,详见 [工程约定与硬约束](../conventions/constraints.md)。

---

## 7. isAllowedSenderFrame 生产环境禁用 localhost

`isAllowedSenderFrame` 是 IPC 调用的第一道防线,防止 webContents 被导航到非预期来源后越权调用受限 handler。

- 文件:file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/ipc-main-bus.ts(第 546–563 行)

| 环境 | 允许的源 |
| --- | --- |
| 生产(`environment === 'production'`) | `file://`、`app://` |
| 非生产 | `file://`、`app://`、`http://localhost`、`http://127.0.0.1` |

> **硬约束**:生产环境禁止放行 `localhost` / `127.0.0.1`。若 webContents 被导航到本地恶意服务,攻击者可借此绕过同源限制调用受限 IPC。

---

## 8. 路径安全

### 8.1 防路径穿越(ensurePathWithinDir)

所有文件操作路径必须经 `ensurePathWithinDir` 校验,确保目标路径在允许的基础目录内。

- Windows 文件系统大小写不敏感,归一化为小写后比较。
- 剥离 `\\?\` 长路径前缀,保证 `startsWith` 比较稳定。
- 越界即抛 `XUANBING_FILE_PATH_FORBIDDEN`,`severity: 'high'`。
- 文件:file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/safe-file-path.ts(第 19–42 行)

### 8.2 扩展名校验(ensureXuanbingExtension)

文件导入/导出强制校验扩展名必须为 `.xuanbing`,防止任意类型文件被当作数据包解析。

### 8.3 禁止覆盖主数据库(ensureNotDatabaseFile)

文件写入前校验目标路径不得为主数据库文件及其 `-wal` / `-shm` / `-journal` 侧车文件,`severity: 'critical'`。

### 8.4 安全文件名(sanitizeFileName)

- 剥离路径分隔符与特殊字符。
- 拒绝纯点号文件名。
- 剥离尾部点号与空格(Windows 文件系统会截断,否则 `CON.` 可绕过保留名检查)。
- 屏蔽 Windows 保留设备名(`CON` / `PRN` / `AUX` / `NUL` / `COM1-9` / `LPT1-9`),含带扩展名形式。
- 限制长度 200 字符,留余量给扩展名。

### 8.5 文件引用 token 5 分钟过期

`.xuanbing` 文件操作通过 `XuanbingFileService.registerFileRef` 生成 token,渲染层持有 token 而非真实路径。

- token 有效期 5 分钟(`5 * 60 * 1000`),过期或不存在即抛 `XUANBING_FILE_INVALID`。
- 后台 `setInterval` 每 5 分钟清理过期 token。
- 文件:file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/services/xuanbing-file.service.ts(第 175 行、第 149 行)

> **设计意图**:即使 token 泄露到日志或渲染层异常,5 分钟后自动失效,缩小路径暴露窗口。

---

## 9. 文件安全(.xuanbing 文件包)

### 9.1 大小限制 10MB

`.xuanbing` 文件大小硬限制为 `XUANBING_MAX_FILE_BYTES = 10 * 1024 * 1024`(10MB)。

- 当前读取流程为 `readFileSync` 整读 + `JSON.parse`,会产生 2–5 倍内存膨胀,10MB 上限用于限制峰值内存。
- 文件:file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/shared/database/constants.ts(第 47 行)

> **硬约束**:10MB 上限不可放宽。如需支持更大文件,必须先将读取流程改为流式解析,再同步调整上限。

### 9.2 SHA-256 checksum

`.xuanbing` 文件 checksum 覆盖 `formatVersion + type + schemaVersion + metadata + payload`,使用无密钥 SHA-256。

- 校验失败抛 `XUANBING_FILE_INVALID`,`reason: 'checksum_mismatch'`。
- dryRun 与正式导入之间通过 `dryRunChecksum` 绑定,checksum 不一致说明文件被替换/篡改,抛 `XUANBING_FILE_IMPORT_FAILED`。
- **已知局限**:checksum 为无密钥 SHA-256,仅防意外损坏,不防恶意篡改;如需防篡改应改用 HMAC + 密钥签名。
- 文件:file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/xuanbing-file-checksum.ts

### 9.3 原子写入(atomicWriteFile)

`.xuanbing` 文件写入通过 `atomicWriteFile` 实现:先写 `.tmp-<uuid>-<name>` 临时文件,再 `rename` 到目标路径,确保中途崩溃只留临时文件、不污染目标。

- 文件:file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/atomic-write.ts
- 文件:file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/xuanbing-file-writer.ts

---

## 10. 数据库安全

### 10.1 恢复前备份(pre-restore backup)

`restoreDatabase` 在替换数据库文件前必须先备份当前库。

- **备份失败必须 abort**:若 `backupDatabase({ prefix: 'pre-restore' })` 抛错,立即抛 `DB_RESTORE_FAILED`,`reason: 'pre_restore_backup_failed'`,**不得继续覆盖原库**,否则原库被覆盖后无法回滚,导致数据丢失。
- 文件:file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/db-restore.ts(第 106–124 行)

> **硬约束**:pre-restore backup 失败必须 abort 并抛错,详见 [工程约定与硬约束](../conventions/constraints.md)。

### 10.2 恢复失败回滚

恢复过程中(连接关闭、文件替换、重新打开、health check)任一步骤失败,若已有 pre-restore 备份,则调用 `rollbackRestore` 用备份替换当前库。

- 回滚本身失败时,置 `restoreConnectionUnavailable = true`,调用方据此感知连接已失效,不再静默吞错。
- health check 失败同样回滚并抛 `DB_RESTORE_FAILED`,`reason: 'health_check_failed'`。
- 文件:file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/db-restore.ts(第 156–193 行)

### 10.3 迁移前自动备份(pre-migration backup)

`db-migrator` 在执行 pending migration 前,若 `options.backup !== false`,自动调用 `backupDatabase({ prefix: 'pre-migration' })`。

- 任一 migration 失败抛 `DB_MIGRATION_FAILED`,`severity: 'critical'`,携带 `backupPath` 供排障。
- 文件:file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/db-migrator.ts(第 244–247 行)

### 10.4 原子化文件复制(atomicCopyFileSync)

数据库恢复与回滚均通过 `atomicCopyFileSync`:先 `copyFileSync` 到 `.tmp`,再 `renameSync` 到目标,崩溃只留 `.tmp` 不污染目标库文件。

- 文件:file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/db-restore.ts(第 53–57 行)

---

## 11. Vue 模板预编译

`index.html` 引入的是 `vue.runtime.global.prod.js`(runtime-only 构建),模板在构建脚本中预编译为渲染函数,而非在运行时通过 `eval` 编译。

- 文件:file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/index.html(第 20 行)

> **设计意图**:配合 CSP `script-src 'self'`(禁止 `unsafe-eval`),若使用含编译器的 Vue 全局构建,运行时模板编译会触发 `eval`,被 CSP 拦截导致渲染失败。

---

## 12. shell.openExternal 协议白名单

`WindowManager` 注入 `shellOpenExternal` 回调,在调用 `shell.openExternal` 前校验 URL 协议。

- 仅放行 `http:`、`https:`、`mailto:`,其他协议(`file:`、自定义协议等)一律拦截并 `console.warn`。
- URL 解析失败同样拦截。
- 文件:file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/index.ts(第 88–100 行)
- 文件:file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/windows/main/window-manager.ts(第 186–197 行,`isSafeExternalUrl`)

---

## 13. 已知安全相关 TODO

以下 TODO 直接影响安全姿态,新增功能前应优先评估是否需要先处理:

| TODO | 位置 | 风险描述 |
| --- | --- | --- |
| 缺全局 `will-navigate` 兜底 | file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/main.ts(第 199 行) | 当前未阻止渲染层导航到 `file://` 或外部 `http(s)`,建议对 `contents.on('will-navigate')` 做校验,仅允许同源 hash 路由跳转。 |
| 生产环境判定不一致 | file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/main.ts(第 207 行) | 此处用 `NODE_ENV` / `DEV_SERVER_URL`,而 `createWindow` 用 `app.isPackaged` 判断是否打开 DevTools;环境变量未设置时可能误判,建议统一用 `app.isPackaged`。 |
| broadcast 未按权限过滤 | file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/ipc-main-bus.ts(第 364 行) | 当前向所有窗口无差别广播,未按 `contract.permission` 过滤接收方角色权限;对 `task:failed` / `windowCreated` 等含敏感信息的事件尤需处理。 |
| 超时后 handler 后台 reject 未并入 cause | file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/ipc-main-bus.ts(第 469 行) | 超时后 handler 仍在后台运行,其 reject 仅 `console.warn`,未并入错误 `cause`,排障时难以还原真实失败原因。 |

完整 TODO 汇总见 [工程约定与硬约束 - TODO 汇总](../conventions/constraints.md#5-todo-汇总)。

---

## 14. 相关源码索引

| 模块 | 文件 |
| --- | --- |
| 主进程入口(CSP、权限、webview) | file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/main.ts |
| preload 暴露 | file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/preload.ts |
| contextBridge 实现 | file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/preload/expose-api.ts |
| index.html CSP meta | file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/index.html |
| IPC 权限检查 | file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/ipc-permissions.ts |
| IPC 总线(audit、限流、超时) | file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/ipc-main-bus.ts |
| IPC 契约定义 | file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/shared/contracts.ts |
| IPC 常量(通道、权限、默认值) | file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/shared/constants.ts |
| 路径安全 | file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/safe-file-path.ts |
| 文件 checksum | file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/xuanbing-file-checksum.ts |
| 原子写入 | file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/atomic-write.ts |
| 文件大小常量 | file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/shared/database/constants.ts |
| 文件引用 token | file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/services/xuanbing-file.service.ts |
| 数据库恢复 | file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/db-restore.ts |
| 数据库迁移 | file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/db-migrator.ts |
| 数据库备份 | file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/db-backup.ts |
| shell.openExternal 白名单 | file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/index.ts |
| 窗口管理器 | file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/windows/main/window-manager.ts |
