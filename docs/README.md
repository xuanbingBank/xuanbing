# All In One 开发文档

> 本目录是 **xuanbing(All In One)** 桌面应用的完整开发文档体系。文档基于源码深度阅读后整理,目标是让新成员能在 30 分钟内建立对整个系统的心智模型,并能在日常开发中快速定位"某个能力在哪个文件实现"。

---

## 一、项目定位

**xuanbing(All In One)** 是一款基于 **Electron 42 + Vue 3.5 + TypeScript 6** 构建的桌面应用,采用自研的轻量工程化栈(无 Vite/Webpack,纯 `tsc` + 自研 `build-renderer-bundle.js`),内置三端契约化 IPC 总线、双 WindowManager 多窗口体系、自研 `.xuanbing` 文件格式与三层缓存系统。

- **进程模型**:主进程(Electron)+ 渲染进程(浏览器环境,Vue 3 runtime-only)
- **持久化**:better-sqlite3 + drizzle-orm(SQLite,单文件 `app.sqlite`,WAL 模式)
- **校验**:Zod 4(自研轻量实现,见 `electron/ipcBus/shared/zod.ts`)
- **样式**:Tailwind CSS v4 + daisyUI v5,组件库以 CSS 变量 `--xb-*` 驱动
- **测试**:node:test(Node 内置测试框架)

---

## 二、文档导航

### 架构层

| 文档 | 内容 | 适用读者 |
| --- | --- | --- |
| [架构总览](./architecture/overview.md) | 项目哲学、技术栈选型、目录结构、启动流程 | 所有新成员必读 |
| [技术栈与依赖](./architecture/tech-stack.md) | 依赖清单、版本约束、选型理由 | 维护者 |
| [目录结构详解](./architecture/directory-structure.md) | 每个目录的职责与文件归属 | 所有人 |
| [启动流程时序](./architecture/bootstrap-flow.md) | 从 `app.whenReady` 到渲染层挂载的全链路 | 调试启动问题 |

### 主进程层

| 文档 | 内容 |
| --- | --- |
| [主进程入口与生命周期](./main-process/entry.md) | `main.ts`、`preload.ts`、单例锁、`before-quit` 清理顺序 |

### IPC 总线层

| 文档 | 内容 |
| --- | --- |
| [IPC 总线概览](./ipc-bus/overview.md) | 四层架构(shared/main/preload/renderer)、IpcMainBus 调度模型 |
| [契约系统](./ipc-bus/contracts.md) | requestContracts / eventContracts、Zod schema、类型推导 |
| [调用流程时序](./ipc-bus/dispatch-flow.md) | `dispatchInvoke` 完整链路:权限→限流→超时→校验→执行→审计→序列化 |
| [通道清单](./ipc-bus/channels.md) | 全部 41 个 request 通道 + 7 个 event 通道速查表 |
| [权限·限流·超时·审计](./ipc-bus/security.md) | 19 项权限、rolePermissions 派生、audit:true 审计日志 |

### 多窗口系统

| 文档 | 内容 |
| --- | --- |
| [多窗口概览](./windows/overview.md) | 双 WindowManager 架构、bridgeWindowManagers、5 套索引 |
| [窗口角色与配置](./windows/roles.md) | 14 种角色、DEFAULT_WINDOW_ROLE_PERMISSIONS、36 字段配置 |
| [生命周期与事件流](./windows/lifecycle.md) | 17 项事件绑定、去抖策略、状态持久化 |
| [ToastWindowManager](./windows/toast.md) | 系统级桌面 Toast、8 种位置、独立透明窗口 |

### 数据库层

| 文档 | 内容 |
| --- | --- |
| [数据库概览](./database/overview.md) | 连接、PRAGMA、Repository / Service 分层 |
| [迁移系统](./database/migrations.md) | CRLF→LF 归一化、hash 校验、迁移前自动备份 |
| [备份与恢复](./database/backup-restore.md) | 原子复制、MAX_BACKUPS=10、**pre-restore backup 失败必须 abort** |
| [表结构](./database/schema.md) | 8 张业务表 + 2 张系统表完整字段说明 |

### .xuanbing 文件格式

| 文档 | 内容 |
| --- | --- |
| [文件格式规范](./xuanbing-file/format.md) | magic + formatVersion + payload + checksum、10MB 限制 |
| [读写·校验·安全](./xuanbing-file/io-security.md) | atomic-write、safe-file-path 路径穿越防护、token 5 分钟过期 |

### 渲染层

| 文档 | 内容 |
| --- | --- |
| [渲染层概览](./renderer/overview.md) | bootstrap 全链路、initStores → mount |
| [路由与守卫](./renderer/router.md) | 自实现 HashRouter、18 路由、多层守卫执行顺序 |
| [Stores 状态管理](./renderer/stores.md) | 11 个 Store、Vue.reactive + computed 模拟 Pinia |
| [Composables](./renderer/composables.md) | 25 个组合式函数、useIpcRequest 防竞态、useCachedQuery SWR |
| [三层缓存系统](./renderer/cache.md) | IndexedDB + cache-policy + useCachedQuery |

### 组件库

| 文档 | 内容 |
| --- | --- |
| [组件库概览](./components/overview.md) | 7 分类 60+ 组件、Base* vs Fluent* 命名规范 |
| [权限门禁组件](./components/permission-gates.md) | PermissionGate vs WindowPermissionGate 差异 |

### 构建与测试

| 文档 | 内容 |
| --- | --- |
| [构建系统](./build/overview.md) | build-renderer-bundle.js、Vue 模板预编译、Tailwind 按需编译 |
| [原生模块重编译](./build/native-rebuild.md) | rebuild-native.js、better-sqlite3 与 Electron ABI 对齐 |
| [测试体系](./testing/overview.md) | node:test、5 个测试文件、断言与覆盖范围 |

### 横切关注点

| 文档 | 内容 |
| --- | --- |
| [安全设计](./security/overview.md) | CSP、contextBridge、权限分层、路径安全、生产环境约束 |
| [工程约定与硬约束](./conventions/constraints.md) | 不可破坏的硬约束、IPC 契约规范、TODO 汇总 |

---

## 三、阅读建议

### 我是新成员

1. 读 [架构总览](./architecture/overview.md) 建立全局观
2. 读 [启动流程时序](./architecture/bootstrap-flow.md) 理解应用如何跑起来
3. 读 [IPC 总线概览](./ipc-bus/overview.md) + [调用流程时序](./ipc-bus/dispatch-flow.md) 理解三端通信
4. 读 [渲染层概览](./renderer/overview.md) 理解前端组织
5. 读 [工程约定](./conventions/constraints.md) 知道哪些红线不能踩

### 我要加一个 IPC 通道

1. [契约系统](./ipc-bus/contracts.md) 看 contract 结构
2. [通道清单](./ipc-bc/channels.md) 确认通道名不冲突
3. [权限·限流·超时·审计](./ipc-bus/security.md) 配齐四件套
4. 参考 `electron/ipcBus/main/modules/*.ipc.ts` 任一实现

### 我要加一个窗口角色

1. [窗口角色与配置](./windows/roles.md) 注册角色
2. [权限·限流·超时·审计](./ipc-bus/security.md) 配置 rolePermissions
3. [生命周期与事件流](./windows/lifecycle.md) 理解事件绑定

### 我要操作数据库

1. [数据库概览](./database/overview.md) 理解分层
2. [表结构](./database/schema.md) 找到目标表
3. 参考 `electron/repositories/*.repository.ts` 写法
4. [备份与恢复](./database/backup-restore.md) 理解数据安全边界

### 我要改 .xuanbing 文件

1. [文件格式规范](./xuanbing-file/format.md) 理解二进制结构
2. [读写·校验·安全](./xuanbing-file/io-security.md) 理解安全机制
3. **绝对不要**破坏 checksum 绑定与 10MB 限制

---

## 四、文档维护原则

1. **源码即真理**:文档与源码不一致时,以源码为准,并立即修订文档。
2. **链接到代码**:所有结论必须用 `file:///` 链接指向具体代码行,便于跳转验证。
3. **不写废话**:避免"这是一个优秀的实现"之类的主观描述,只陈述事实与机制。
4. **保留 TODO**:源码中标注的 TODO 在 [工程约定](./conventions/constraints.md) 中汇总,不掩盖技术债。
5. **中文优先**:正文使用中文,代码标识符与专有名词保留英文原文。

---

## 五、文档版本

- 创建日期:2026-06-28
- 基于源码版本:HEAD(未提交修改后的状态)
- 维护者:开发团队
