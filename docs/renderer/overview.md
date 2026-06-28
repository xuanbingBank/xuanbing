# 渲染层概览

xuanbing（All In One）的渲染层是 Electron 桌面应用的 Vue 3 视图层，运行在 BrowserWindow 中，通过 preload 暴露的 `window.desktop` 与主进程通信。本文档描述渲染层的启动链路、目录结构、关键设计决策与运行时约束。

入口文件：[src/renderer.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer.ts)

## 设计动机

### 不使用 vue-router / pinia

渲染层 **不依赖 vue-router**，自实现了一个轻量 `HashRouter`；**不依赖 pinia**，用 `Vue.reactive + computed` 模拟 Store。原因如下：

- **CDN 全局加载 Vue**：Vue 通过 `index.html` 中的 `<script>` 标签以全局变量 `Vue` 加载（runtime-only 版本），并非通过 npm 模块。引入 vue-router / pinia 需要额外打包进 bundle，与“纯 tsc + 自研打包脚本”的极简工程化路线冲突。
- **CSP 友好**：Electron 严格 CSP 默认禁用 `unsafe-eval`。自研路由与 Store 全部用普通函数 + `Vue.reactive` 实现，不依赖模板字符串编译或动态 new Function。
- **体积与可控性**：HashRouter 仅约 290 行，覆盖路径参数、查询字符串、catch-all、matchedChain；Store 基类仅约 125 行，覆盖 reactive state、computed、actions、单例注册。完全可控、可调试。
- **API 兼容**：Store 接口刻意与 Pinia 对齐（`$id` / `state` / `$reset` / `useXxxStore`），便于未来迁移。

### Vue 3 runtime-only + 模板预编译

渲染层使用 Vue 3 的 `vue.runtime.global.prod.js`（runtime-only 构建），**不含模板编译器**。组件中的 `template` 字符串在构建时被预编译为 `render` 函数：

- 构建脚本：[scripts/build-renderer-bundle.js](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/scripts/build-renderer-bundle.js)
- 关键函数：`precompileVueTemplates(code, moduleId)`（约第 227 行）扫描模块源码中的 `template: \`...\`` 字面量，调用 Vue 的 `compileTemplate` 替换为等价的 `render: function(...) { ... }`。
- 配置项：`precompileVueTemplates: true` 仅对渲染层 bundle 开启（preload bundle 为 `false`）。
- 效果：运行时不需要 `unsafe-eval`，严格 CSP 下也能正常渲染。

## Bootstrap 全链路

`bootstrap()` 函数位于 [src/renderer.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer.ts) 第 100–325 行，是渲染层的唯一启动入口。完整步骤如下：

1. **`initStores()`** — 初始化 11 个 Store
   - 调用 [src/renderer/stores/index.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/stores/index.ts) 中的 `initStores()`，按依赖顺序创建：app → auth → permission → theme → layout → window → tab → notification → menu → ui → command。
   - 每个 Store 都通过 `createXxxStore()` 工厂创建单例并 `registerStore` 注册到全局表，后续通过 `useXxxStore()` 获取。

2. **`themeStore.initTheme()`** — 初始化主题
   - 从 `localStorage` 读取用户主题偏好（`app:theme` / `app:follow-system`）。
   - 监听 `window.matchMedia('(prefers-color-scheme: dark)')` 的 `change` 事件，跟随系统主题变化。
   - 调用 `applyTheme()`，将当前主题写入 `document.documentElement.setAttribute('data-theme', ...)`。

3. **`appStore.initApp()`** — 应用级初始化
   - 从 `navigator.platform` 读取平台信息写入 state。
   - 标记 `isElectron`（检测 `window.desktop` 是否存在）。

4. **`authStore.restoreSession()`** — 恢复登录态
   - 从 `localStorage` 读取 `app:auth-token` 与 `app:auth-user`，回填到 state。
   - 标记 `restored = true`，供路由守卫判断会话已恢复完成。
   - 注意：当前 `login()` 为占位实现，真实鉴权待接入。

5. **`initLayoutResizeListener()`** — 监听布局 resize
   - 调用 [src/renderer/stores/layout.store.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/stores/layout.store.ts) 中的 `initLayoutResizeListener()`。
   - 绑定 `window.resize` 事件，按 768px 断点更新 `layoutStore.state.isMobile`，并自动关闭移动端 drawer。
   - 返回 cleanup 函数，在根组件卸载时调用。

6. **`createHashRouter()`** — 创建 HashRouter
   - 实例化 [src/renderer/router/index.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/router/index.ts) 中的 `HashRouter`。
   - 构造时读取 `window.location.hash`，若为空则默认跳转 `#/`。
   - 绑定 `hashchange` 事件，但**此时尚未订阅**——订阅在根组件 `onMounted` 中通过 `router.onChange(runGuards)` 完成。

7. **`Vue.createApp(rootComponent).mount('#app')`** — 挂载 Vue 应用
   - 注册全局组件 `BaseToast`。
   - 通过 `app.provide('router', router)` 向全应用提供路由实例。
   - 根组件 `setup()` 中：
     - 调用 `useCurrentWindow()` 获取当前窗口响应式状态（windowId / role / permissions / 最大化 / 聚焦 / 可见性）。
     - 调用 `useWindowTitle(router)` 订阅路由变更，同步窗口标题。
     - 订阅 `router.onChange(runGuards)`，每次 hashchange 执行守卫。
     - `onMounted` 中：`appStore.setReady(true)` + `startCacheCleaner()` 启动缓存周期清理。
     - `watch(currentWindow.role)` 在窗口角色到达后重跑守卫（守卫内的导航不改变 role，不会死循环）。
     - `onBeforeUnmount` 中：取消路由订阅、cleanup resize、`router.destroy()`、`stopCacheCleaner()`、`destroyThemeStore()`。

## 目录结构

渲染层代码全部位于 [src/renderer/](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/)，按职责拆分为 11 个子目录：

| 目录 | 职责 | 关键文件 |
| --- | --- | --- |
| `cache/` | 三层缓存系统（IndexedDB + 策略 + 查询） | `indexeddb-client.ts` / `cache-store.ts` / `cache-policy.ts` / `cache-cleaner.ts` |
| `components/` | UI 组件库（base / business / data / form / layout / navigation / table） | `base/FluentButton.ts` / `layout/AppSidebar.ts` 等 |
| `composables/` | 25 个组合式函数 | `useIpcRequest.ts` / `useCurrentWindow.ts` / `useCachedQuery.ts` 等 |
| `constants/` | 全局常量（路由名 / 路径 / 权限 / 主题 / 存储键） | `index.ts` |
| `layouts/` | 4 个布局组件 | `BasicLayout.ts` / `BlankLayout.ts` / `AuthLayout.ts` / `WindowLayout.ts` |
| `pages/` | 17 个页面组件 + PAGES 映射表 | `index.ts` |
| `router/` | 自实现 HashRouter + 18 路由 + 多层守卫 | `index.ts` / `routes.ts` / `guards.ts` / `types.ts` |
| `services/` | 4 个 IPC client，封装 `window.desktop` | `database.client.ts` / `setting.client.ts` / `task.client.ts` / `xuanbing-file.client.ts` |
| `stores/` | 模拟 Pinia 的 11 个 Store + base 基类 | `base.ts` / `app.store.ts` / `auth.store.ts` 等 |
| `styles/` | CSS 资源（Tailwind / daisyUI / Fluent 主题 / 动画） | `index.css` / `fluent-theme.css` / `tokens.css` |
| `utils/` | 工具函数（动画 / 错误 / 转义 / 菜单 / 权限 / 路由） | `menu-tree.ts` / `permission.ts` / `route.ts` 等 |

## 运行时约束

渲染层运行时遵守以下约束，违反约束的代码不能合入：

1. **只通过 `window.desktop` 与主进程通信**：禁止直接访问 `ipcRenderer`、Node API、`require`。preload 通过 `contextBridge` 仅暴露白名单 API。
2. **不裸写 IndexedDB**：所有 IndexedDB 访问必须经过 [src/renderer/cache/indexeddb-client.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/cache/indexeddb-client.ts)。
3. **不裸写 IPC channel**：所有 IPC 调用必须经过 [src/renderer/services/](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/services/) 下的 client。
4. **IndexedDB 不存敏感数据**：IndexedDB 仅用于缓存，数据可随时删除；不存 token、密钥、密码。Token 暂存于 `localStorage`（生产应替换为 safeStorage / keytar）。
5. **SQLite 是事实来源**：缓存与 SQLite 冲突时，永远以 SQLite 为准。
6. **权限仅用于 UI 体验**：[src/renderer/stores/permission.store.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/stores/permission.store.ts) 中的 `hasPermission` 等仅用于隐藏/禁用按钮，真实安全边界在 main 进程 IPC 守卫与路由守卫中强制校验。
7. **菜单/面包屑/标签页从路由表派生**：禁止手写第二套菜单，全部从 [src/renderer/router/routes.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/router/routes.ts) 自动生成。

## 渲染层与三端的关系

```
┌──────────────────────────────────────┐
│  渲染进程 (Vue 3 runtime-only)        │
│  - src/renderer.ts bootstrap          │
│  - window.desktop.invoke('xxx')       │
│  - HashRouter + Stores + Composables  │
└───────────────▲──────────────────────┘
                │ contextBridge.exposeInMainWorld('desktop', api)
┌───────────────┴──────────────────────┐
│  preload (7 行)                       │
│  - 仅暴露受限 API，无 ipcRenderer 直通 │
└───────────────▲──────────────────────┘
                │ ipcRenderer.invoke / send
┌───────────────┴──────────────────────┐
│  主进程 (Electron Main + Node.js)     │
│  - IpcMainBus 契约分发                │
│  - SQLite / 文件系统 / 窗口管理       │
└──────────────────────────────────────┘
```

## 相关文档

- [路由与守卫](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/docs/renderer/router.md)
- [Stores 状态管理](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/docs/renderer/stores.md)
- [Composables](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/docs/renderer/composables.md)
- [三层缓存系统](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/docs/renderer/cache.md)
- [架构总览](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/docs/architecture/overview.md)
