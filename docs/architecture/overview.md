# 架构总览

xuanbing（All In One）是一个基于 Electron 42 的桌面应用，采用主进程 + preload + 渲染进程三端模型，并通过契约化 IPC 总线串联三端。本文档描述整体架构、核心子系统与关键设计决策。

## 项目哲学

### 为什么自研轻量工程化栈（无 Vite/Webpack）

项目不使用 Vite 或 Webpack，而是采用纯 `tsc` 输出 CommonJS，再用自研脚本 [build-renderer-bundle.js](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/scripts/build-renderer-bundle.js) 把渲染层与 preload 层的相对依赖打包成单文件 bundle。动机包括：

- **消除 dev server 依赖**：本地构建无热更新服务，构建产物可直接被 Electron 以 `file://` 加载，减少运行时依赖与攻击面。
- **控制 CSP 边界**：构建脚本对 Vue `template` 字符串做预编译，避免渲染层在严格 CSP 下触发 `unsafe-eval`。
- **零额外配置成本**：`tsc` 配置见 [tsconfig.json](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/tsconfig.json)，仅需 `strict` + `ES2020` + `commonjs`，避免大型打包器的配置膨胀。

### 为什么契约化 IPC

Electron 原生 `ipcMain.handle` / `ipcRenderer.invoke` 缺少统一的输入输出校验、权限、超时、审计与速率限制。项目在 [electron/ipcBus/shared/contracts.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/shared/contracts.ts) 中以契约对象声明每个通道的 `inputSchema` / `outputSchema` / `permission` / `timeoutMs` / `audit` 等元数据，由 [IpcMainBus](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/ipc-main-bus.ts) 在分发时统一执行校验、鉴权、超时与审计。三端共享同一份契约定义，避免主进程与渲染进程协议漂移。

### 为什么双 WindowManager

项目同时维护两个窗口管理器：

| 管理器 | 路径 | 职责 |
| --- | --- | --- |
| 旧 WindowManager | [electron/ipcBus/main/window-manager.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/window-manager.ts) | 维护 `windowId → role` 映射，供 `IpcMainBus` 解析 sender、做权限校验、广播事件 |
| 新 WindowManager | [electron/windows/main/window-manager.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/windows/main/window-manager.ts) | 负责窗口创建、配置、状态持久化、生命周期绑定、安全处理器 |

旧 WM 偏重“IPC 视角的窗口身份”，新 WM 偏重“窗口本身的运行时行为”。两者通过 [bridgeWindowManagers](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/main.ts) 桥接：新 WM 发出 `window:created` 事件后，主进程自动把窗口注册到旧 WM，使非主窗口也能被 IPC 总线识别。

## 三端模型

```
┌─────────────────────────────────────────────────────────────┐
│  主进程 (Electron Main, Node.js)                            │
│  - main.ts / ipcBus/main/* / database / services / windows  │
│  - IpcMainBus 装配、better-sqlite3 同步连接、窗口生命周期    │
└───────────────▲───────────────────────────▲─────────────────┘
                │ ipcMain.handle            │ ipcRenderer.send
                │ (统一经 IpcMainBus 分发)   │
┌───────────────┴─────────────┐ ┌───────────┴──────────────┐
│  preload (contextBridge)    │ │  渲染进程 (Vue 3)         │
│  - preload.ts (7 行)        │ │  - renderer.ts 入口       │
│  - exposeDesktopApi()       │ │  - window.desktop 调用    │
│  - 暴露 window.desktop      │ │  - Vue runtime-only       │
└─────────────────────────────┘ └───────────────────────────┘
```

### 主进程

入口 [electron/main.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/main.ts) 负责单例锁、异常兜底、安全策略注入、IPC 运行时装配与窗口创建。数据库以 better-sqlite3 同步连接，drizzle-orm 提供类型安全的 schema 定义。

### preload（contextBridge）

[electron/preload.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/preload.ts) 仅 7 行，调用 [exposeDesktopApi()](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/preload/expose-api.ts) 通过 `contextBridge.exposeInMainWorld('desktop', api)` 暴露受限的 `window.desktop` API。渲染进程无法直接访问 `ipcRenderer` 或 Node API。

### 渲染进程

[src/renderer.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer.ts) 是渲染层入口，使用 Vue 3 runtime-only 全局构建（见 [index.html](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/index.html) 通过 `vue.runtime.global.prod.js` 加载），全部 Composition API 通过 `Vue.xxx` 访问。渲染层只通过 `window.desktop` 与主进程通信。

## 核心子系统概览

| 子系统 | 关键位置 | 说明 |
| --- | --- | --- |
| IPC 总线 | [ipcBus/main/ipc-main-bus.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/ipc-main-bus.ts) | 统一请求分发：契约校验、权限、超时、速率限制、审计、事件广播。9 个业务模块注册在 [ipcBus/main/modules/](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/modules/)。 |
| 多窗口 | [windows/main/window-manager.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/windows/main/window-manager.ts) | 角色化窗口（main/settings/taskCenter 等），单例/多实例策略、状态持久化、安全 webPreferences、外部导航拦截。 |
| 数据库 | [electron/database/](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/) | better-sqlite3 同步连接 + drizzle-orm schema。WAL/foreign_keys/busy_timeout PRAGMA，迁移前自动备份。 |
| .xuanbing 文件 | [electron/file-db/](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/) | 自研文件格式：原子写、校验和、导入导出、读写校验，由 [XuanbingFileService](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/services/xuanbing-file.service.ts) 统一封装。 |
| 渲染层 | [src/renderer.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer.ts) | 哈希路由、stores、布局选择、路由守卫、缓存清理器。Vue 通过 CDN 全局脚本加载。 |
| 组件库 | [src/renderer/components/](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/) | Base/Fluent 双系列组件（按钮、表单、表格、导航、布局），daisyUI v5 + Tailwind v4 提供 CSS 层。 |
| 缓存 | [src/renderer/cache/](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/cache/) | IndexedDB 客户端 + 缓存策略 + 定期清理器，由渲染层 composables 消费。 |
| 构建 | [scripts/build-renderer-bundle.js](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/scripts/build-renderer-bundle.js) | 自研 bundler：收集相对依赖、预编译 Vue 模板、输出 preload 与 renderer bundle。 |
| Toast | [desktop-toast/ToastWindowManager.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/desktop-toast/ToastWindowManager.ts) | 独立透明窗口承载桌面级 Toast 通知，由 system IPC 模块驱动。 |

## 关键设计决策

### CSP 严格策略

[index.html](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/index.html) 在 `<meta http-equiv="Content-Security-Policy">` 中声明策略，[main.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/main.ts) 在 `onHeadersReceived` 中以相同策略注入响应头，形成双层防御：

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data:;
font-src 'self' data:;
connect-src 'self';
base-uri 'self';
form-action 'self';
object-src 'none';
```

- `script-src 'self'` 不允许内联脚本。
- `style-src 'unsafe-inline'` 保留原因：daisyUI 加载前的内联回退样式与 Vue `:style` 动态内联样式需要。
- `object-src 'none'`、`base-uri 'self'`、`form-action 'self'` 收紧默认行为。

### Vue 模板预编译避免 unsafe-eval

渲染层使用 Vue 3 runtime-only 构建（不含编译器）。组件中的 `template` 字符串由 [build-renderer-bundle.js](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/scripts/build-renderer-bundle.js) 在构建期预编译为静态 `render` 函数，运行时无需 `new Function` / `eval`，从而与 `script-src 'self'`（不含 `unsafe-eval`）兼容。

### contextBridge 暴露 desktop API

preload 仅通过 `contextBridge.exposeInMainWorld('desktop', api)` 暴露白名单方法（见 [expose-api.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/preload/expose-api.ts)）。渲染进程无法获得 `ipcRenderer` 引用，所有跨进程调用必须经过契约校验的 `desktop.invoke` / `desktop.subscribe`。

### Zod 自研实现

项目依赖 `zod` 包，但 IPC 共享层使用自研的轻量 zod 实现（见 [electron/ipcBus/shared/zod.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/shared/zod.ts)）。原因：

- 共享层运行在主进程与渲染进程两端，自研实现无环境依赖、无副作用引入。
- 仅实现 `parse` / `safeParse` / `optional` / `nullable` / `array` / `default` / `parseAtPath` 等 IPC 校验所需的最小 API 集合，体积更小。
- 与 `ZodValidationError`（见 [zod.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/shared/zod.ts)）耦合，`IpcMainBus.parseSchema` 据此抛出标准 `IPC_VALIDATION_ERROR`。

### 安全默认拒绝

[main.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/main.ts) 在 `app.whenReady` 中：

- `setPermissionRequestHandler` 与 `setPermissionCheckHandler` 默认拒绝摄像头/麦克风/通知等权限。
- `web-contents-created` 钩子阻止 `<webview>` 标签附着，强制使用 `BrowserWindow + preload` 模型。
- 新 WM 在 [window-manager.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/windows/main/window-manager.ts) 中 `setWindowOpenHandler` 始终返回 `deny`，`will-navigate` / `will-redirect` 拦截外部导航。

### 安全 webPreferences

新 WM 构造的每个窗口强制使用：`contextIsolation: true`、`nodeIntegration: false`、`sandbox: true`、`webSecurity: true`、`allowRunningInsecureContent: false`、`webviewTag: false`、`nativeWindowOpen: false`，DevTools 按角色与环境策略放行。

## 入口文件引用

- 主进程入口：[electron/main.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/main.ts)
- preload 入口：[electron/preload.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/preload.ts)
- 渲染目标解析：[electron/renderer-target.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/renderer-target.ts)
- IPC 运行时装配：[electron/ipcBus/main/index.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/index.ts)
- 渲染层入口：[src/renderer.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer.ts)
- HTML 宿主：[index.html](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/index.html)
- TS 配置：[tsconfig.json](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/tsconfig.json)
- 包清单：[package.json](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/package.json)

## 相关文档

- [技术栈与依赖](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/docs/architecture/tech-stack.md)
- [目录结构详解](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/docs/architecture/directory-structure.md)
- [启动流程时序](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/docs/architecture/bootstrap-flow.md)
- [主进程入口与生命周期](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/docs/main-process/entry.md)
