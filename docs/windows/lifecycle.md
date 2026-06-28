# 生命周期与事件流

本文档描述 xuanbing(All In One)多窗口子系统的窗口生命周期事件绑定、高频事件去抖、状态持久化、初始化 token、显示器选择策略、URL 解析与多层守卫。

---

## 一、window-lifecycle.ts 17 项事件绑定

`WindowLifecycle.bind()`(定义于 [electron/windows/main/window-lifecycle.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/windows/main/window-lifecycle.ts))在 `createWindow()` 内部被调用,把 `BrowserWindow` 与 `webContents` 的事件桥接到 `WindowEventBus`。返回一个清理函数,调用后移除全部监听器。

| # | 事件源 | 事件 | emit 类型 | 附加行为 |
|---|---|---|---|---|
| 1 | window | `ready-to-show` | `window:ready` | — |
| 2 | window | `show` | `window:shown` | `registry.markFocused(windowId)` |
| 3 | window | `hide` | `window:hidden` | — |
| 4 | window | `focus` | `window:focused` | `registry.markFocused(windowId)` |
| 5 | window | `blur` | `window:blurred` | — |
| 6 | window | `move` | `window:moved` | 携带 `{ bounds }`(高频去抖) |
| 7 | window | `resize` | `window:resized` | 携带 `{ bounds }`(高频去抖) |
| 8 | window | `maximize` | `window:maximized` | — |
| 9 | window | `unmaximize` | `window:unmaximized` | — |
| 10 | window | `minimize` | `window:minimized` | — |
| 11 | window | `restore` | `window:restored` | — |
| 12 | window | `close` | `window:closed` | 若 `rememberBounds`,调用 `stateStore.saveNow()` 持久化当前边界/最大化/全屏 |
| 13 | window | `closed` | `window:destroyed` | `eventBus.markDestroyed()` + `initPayloadStore.cleanupForWindow()` + `registry.unregister()` |
| 14 | window | `unresponsive` | `window:unresponsive` | — |
| 15 | window | `responsive` | `window:responsive` | — |
| 16 | webContents | `render-process-gone` | `window:crashed` | — |
| 17 | webContents | `did-fail-load` | `window:load-failed` | — |

> `window:created` 与 `window:title-changed`、`window:route-changed` 不在 `bind()` 中绑定:`window:created` 由 `WindowManager.emitCreated()` 在注册完成后立即发出;`window:title-changed` 由 `updateWindowTitle()` 发出;`window:route-changed` 由 `registry.updateRoute()` 路径上发出。

### 状态存储键

`stateKey(role, windowId, config)`:
- 单例窗口(`config.singleton === true`):按 `role` 存储
- 多实例窗口:按 `instanceKey` 存储(回退 `${role}:${windowId}`)

参考:[electron/windows/main/window-lifecycle.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/windows/main/window-lifecycle.ts) 第 73–206 行

---

## 二、window-events.ts 高频事件去抖 150ms

`WindowEventBus`(定义于 [electron/windows/main/window-events.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/windows/main/window-events.ts))提供去耦的事件订阅/发布。

### 2.1 去抖策略

| 常量 | 值 | 说明 |
|---|---|---|
| `HIGH_FREQ_DEBOUNCE_MS` | 150ms | 高频事件去抖时长 |
| `DEBOUNCED_EVENTS` | `{ 'window:moved', 'window:resized' }` | 需要去抖的事件类型集合 |
| `RECENT_EVENTS_LIMIT` | 100 | 最近事件保留数量(调试用) |

去抖逻辑:`scheduleDebounced()` 用 `${type}:${windowId}` 作为 key,在 150ms 内重复触发会替换 payload 而不重新计时(尾触发模式)。窗口被标记为 destroyed 时,`cancelDebouncedForWindow()` 立即取消该窗口的全部待发去抖事件。

### 2.2 已销毁窗口阻断

`destroyedWindowIds: Set<number>` 记录已销毁窗口。`emit()` 中:
- 收到 `window:destroyed` 时加入集合
- 已在集合中的窗口的其他事件直接 return(不派发)

### 2.3 事件类型(20 种)

`eventPayloadSchema` 校验的 `type` 枚举:
```
window:created | window:ready | window:shown | window:hidden | window:focused | window:blurred
window:moved | window:resized | window:maximized | window:unmaximized | window:minimized | window:restored
window:closed | window:destroyed | window:route-changed | window:title-changed
window:crashed | window:unresponsive | window:responsive | window:load-failed
```

### 2.4 公开 API

| 方法 | 说明 |
|---|---|
| `on(type, handler)` | 订阅,返回取消函数 |
| `off(type, handler)` | 取消订阅 |
| `emit(payload)` | 发布(经 zod 校验 + destroyed 阻断 + 去抖) |
| `markDestroyed(windowId)` | 标记销毁并取消去抖 |
| `unmarkDestroyed(windowId)` | 清除标记(极端复用场景) |
| `getRecentEvents()` | 取最近 100 条事件副本 |
| `dispose()` | 清空全部订阅与缓存 |

参考:[electron/windows/main/window-events.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/windows/main/window-events.ts)

---

## 三、window-state-store.ts 去抖 300ms 持久化

`WindowStateStore`(定义于 [electron/windows/main/window-state-store.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/windows/main/window-state-store.ts))将窗口边界、最大化、全屏、显示器、最近路由等保存到 JSON 文件(默认 `window-state.json`)。

### 3.1 关键常量

| 常量 | 值 | 说明 |
|---|---|---|
| `SAVE_DEBOUNCE_MS` | 300ms | 保存去抖时长 |
| `DEFAULT_BOUNDS` | `{ x:0, y:0, width:1024, height:768 }` | 默认边界 |
| `CLEANUP_INTERVAL_MS`(init payload) | 30000ms | token 清理周期 |

### 3.2 状态记录 schema

```ts
WindowStateRecord = {
  bounds: { x: number, y: number, width: number (≥1), height: number (≥1) }
  isMaximized: boolean
  isFullScreen: boolean
  displayId: number (整数)
  lastRoute: string
  lastFocusedAt: number (≥0)
  customState?: Record<string, unknown>
}
```

### 3.3 存储键规则

- 单例窗口:按 `role` 存储(如 `main`、`settings`)
- 多实例窗口:按 `instanceKey` 存储(如 `detail:id=42`、`modal:type=confirm`)

### 3.4 公开 API

| 方法 | 说明 |
|---|---|
| `load()` | 启动时从磁盘加载,损坏文件回退到空映射 |
| `save(key, record)` | 去抖 300ms 保存 |
| `saveNow(key, record)` | 立即保存(关闭前调用) |
| `saveAllNow()` | 保存全部待写入与内存中的状态(退出前调用) |
| `restore(key, minWidth, minHeight, maxWidth?, maxHeight?)` | 读取并校正:显示器不存在则居中到主显示器,再 `autoCorrectBounds` 校正离屏与过小尺寸 |
| `getDefaultState(width, height, route)` | 无历史记录时的默认状态(居中主显示器) |
| `clearWindowState(key)` / `clearAll()` | 清除 |
| `dispose()` | 取消全部去抖定时器 |

`saveAllState()`(WindowManager)在 `app.before-quit` 时被 main.ts 调用,遍历 `internalRecords` 调用 `saveNow()` 强制落盘。

参考:[electron/windows/main/window-state-store.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/windows/main/window-state-store.ts)、[electron/main.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/main.ts) 第 246–261 行

---

## 四、window-init-payload.ts token 60s 过期机制

`WindowInitPayloadStore`(定义于 [electron/windows/main/window-init-payload.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/windows/main/window-init-payload.ts))使用一次性令牌在主进程与渲染进程间安全传递 payload(防重放)。

### 4.1 关键常量

| 常量 | 值 | 说明 |
|---|---|---|
| `DEFAULT_MAX_PAYLOAD_BYTES` | 256 KB | 单条 payload 最大字节数 |
| `DEFAULT_TTL_MS` | 60_000ms(60 秒) | token 过期时间 |
| `CLEANUP_INTERVAL_MS` | 30_000ms | 后台清理周期 |

### 4.2 工作流程

1. `createWindow()` 中,若 `options.payload !== undefined`,调用 `initPayloadStore.create(windowId, role, payload)`:
   - 校验 `windowId`/`role`(zod)
   - 校验 payload 字节大小 ≤ 256KB
   - 生成 `randomUUID()` 作为 token
   - 存储 `{ token, windowId, role, payload, createdAt, expiresAt: now+60s, consumed: false }`
2. 根据 `config.showOnReady`:
   - `true`:在 `ready-to-show` 事件中通过 `window:init-token` 通道发送 `{ token }`
   - `false`:在 `did-finish-load` 事件中发送
3. 渲染进程拿到 token 后,通过 IPC 调用主进程的 `consumeInitPayload(windowId)`:
   - 校验 token 非空字符串
   - 校验 `windowId` 与存储时一致(防越权)
   - 校验未过期(`now < expiresAt`,否则删除并抛 `initPayloadExpired`)
   - 校验未消费(`consumed === false`,否则删除并抛 `initPayloadNotFound`)
   - 标记 `consumed = true`,**立即从 Map 删除**,返回 `{ token, payload, role }`
4. `startCleanup()` 启动 30s 周期定时器,清理过期与已消费条目(`unref()` 不阻塞退出)
5. 窗口关闭时 `cleanupForWindow(windowId)` 清理该窗口的全部 payload

### 4.3 安全要点

- **一次性消费**:`consume()` 成功后立即删除条目,token 无法重放
- **windowId 绑定**:即使 token 泄露,其他窗口无法读取
- **60s 过期**:渲染进程必须在 60s 内消费,否则 token 失效
- **256KB 大小限制**:防止 payload 滥用内存

参考:[electron/windows/main/window-init-payload.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/windows/main/window-init-payload.ts)、[electron/windows/main/window-manager.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/windows/main/window-manager.ts) 第 998–1044 行

---

## 五、window-display.ts 5 种显示器选择策略

`selectTargetDisplay()`(定义于 [electron/windows/main/window-display.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/windows/main/window-display.ts))根据策略选择目标显示器。

`DisplayTarget` 枚举(定义于 window-types.ts):
```
'primary' | 'cursor' | 'parent' | 'last' | 'explicit'
```

| 策略 | 行为 | 回退 |
|---|---|---|
| `primary` | 取主显示器(`screen.getPrimaryDisplay()` 或 `isPrimary === true`) | 第一个显示器 |
| `cursor` | 取鼠标所在显示器(`getCursorScreenPoint` 命中测试) | 主显示器 |
| `parent` | 取父窗口所在显示器(`getDisplayMatching(parentBounds)`) | 主显示器 |
| `last` | 取上次使用的显示器(`lastDisplayId`),否则 `getDisplayMatching(currentBounds)` | 主显示器 |
| `explicit` | 取显式指定的 `explicitDisplayId` | 主显示器 |

### 5.1 辅助函数

| 函数 | 说明 |
|---|---|
| `getPrimaryDisplay(screen)` | 取主显示器,带回退 |
| `getAllDisplays(screen)` | 取全部显示器 |
| `isBoundsVisible(displays, bounds)` | 边界是否在任何显示器的可见区域 |
| `findDisplayContaining(displays, bounds)` | 查找包含边界中心点的显示器 |
| `centerToDisplay(display, w, h)` | 居中到指定显示器 |
| `centerToParentWindow(parent, w, h)` | 居中到父窗口 |
| `pullBackToVisible(displays, bounds)` | 离屏时拉回主显示器 |
| `correctSize(bounds, minW, minH, maxW?, maxH?)` | 校正尺寸到 [min, max] |
| `autoCorrectBounds(screen, bounds, ...)` | 综合校正:先校正尺寸,再 `pullBackToVisible` |

### 5.2 WindowManager 中的边界解析顺序

`resolveInitialBounds()`(window-manager.ts 第 1131–1187 行):
1. `stateStore.restore(stateKey, ...)` 取持久化边界;若 `rememberBounds` 且有记录,直接返回(已校正)
2. 若 `centerToParent && parentWindow`,调用 `centerToParentWindow()`
3. 否则 `selectTargetDisplay(screen, strategy, { parent, lastDisplayId })`,strategy = `options.displayTarget ?? config.displayTarget ?? 'primary'`
4. 若 `config.center`,调用 `centerToDisplay()`;否则取显示器原点
5. `autoCorrectBounds()` 校正离屏与过小尺寸

参考:[electron/windows/main/window-display.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/windows/main/window-display.ts)

---

## 六、window-url-resolver.ts dev server vs file 协议

`WindowUrlResolver`(定义于 [electron/windows/main/window-url-resolver.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/windows/main/window-url-resolver.ts))根据 `isPackaged` 决定加载方式。

### 6.1 URL 拼装规则

| 环境 | URL 格式 |
|---|---|
| 开发(`!isPackaged && devServerUrl`) | `${devServerUrl}/#${resolvedRoute}${queryString}` |
| 生产 | `file:///${indexHtmlPath}#${resolvedRoute}${queryString}`(Windows 路径反斜杠转正斜杠) |

路由解析:
1. 校验 `route` 非空字符串
2. `isRouteAllowedForRole(role, route)` 校验白名单
3. 校验 `params`/`query` 为 `Record<string, string>`
4. 若路由含 `:`,调用 `fillRouteParams()` 填充参数(缺失参数抛 `validationError`)
5. `encodeQuery()` 编码查询串

### 6.2 安全相关 API

| 方法 | 说明 |
|---|---|
| `resolveUrl(role, route, params?, query?)` | 解析最终 URL |
| `isInternalUrl(url)` | 判断是否为内部 URL(dev server 或 `file://` + index.html),用于 `will-navigate`/`will-redirect` 拦截 |
| `isRouteAllowed(role, route)` | 路由白名单判断 |
| `getAllowedRoutes(role)` | 取角色允许的路由列表 |
| `matchRoute(pattern, actualPath)` | 路由模式匹配 |
| `getDefaultRouteForRole(role)` | 取默认路由 |

`setupSecurityHandlers()`(window-manager.ts 第 1082–1120 行)使用 `isInternalUrl()`:
- `setWindowOpenHandler` 始终返回 `{ action: 'deny' }`(禁止 `window.open`)
- `will-navigate`:外部 URL `preventDefault()` + 若协议为 http/https/mailto 调用 `shell.openExternal`,否则仅告警
- `will-redirect`:外部 URL `preventDefault()` + 告警

参考:[electron/windows/main/window-url-resolver.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/windows/main/window-url-resolver.ts)

---

## 七、window-guards.ts 多层守卫执行顺序

`window-guards.ts`(定义于 [electron/windows/main/window-guards.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/windows/main/window-guards.ts))提供统一的校验函数,所有函数返回 `{ allowed: boolean, reason?: string }`。

### 7.1 `validateOpenRequest` 校验顺序

`openWindow()` 在创建前依次执行(任一失败抛 `forbidden`):

1. **角色存在**(`isWindowRole`):未知角色拒绝
2. **配置存在**(`getWindowConfig`):角色未配置拒绝
3. **环境允许**(`environment`):`devOnly` 仅开发环境,`prodOnly` 仅生产,`all` 全部
4. **路由白名单**(`isRouteAllowedForRole`):`routeName ?? config.route` 必须在白名单
5. **payload 大小**:`approximateByteSize(payload) ≤ 256KB`
6. **单例规则**:`singleton && existingCount > 0 && !allowExistingInstance` 拒绝
7. **最大实例数**:`existingCount >= maxInstances && !allowExistingInstance` 拒绝

### 7.2 完整守卫链路

`openWindow()` 中实际执行顺序:

```
1. validateOpenRequest()         → 角色/环境/路由/payload/单例/最大实例
2. checkPermission(:any|:self)   → 发起方父窗口权限校验(parentWindowId 路径)
3. onSecondOpen 策略              → focus / recreate / ignore / newInstance
4. createWindow()                → 实际创建
   ├─ urlResolver.resolveUrl()    → 路由白名单二次校验
   ├─ buildSafeWebPreferences()   → shouldAllowDevTools() 校验
   └─ setupSecurityHandlers()     → 运行时导航拦截
```

### 7.3 `checkPermission` 规则

| 权限后缀 | 校验逻辑 |
|---|---|
| `:any` | 必须提供 `senderRole`,且 sender 必须拥有该 `:any` 权限 |
| `:self` | sender 与目标同角色时校验 `:self`;不同角色时回退到 `:any` 变体校验 |
| 其他 | sender 必须显式拥有该权限 |

### 7.4 `shouldAllowDevTools` 规则

1. `getWindowConfig(role).devTools === false` → 拒绝
2. `environment === 'production'` → 拒绝
3. 否则允许

### 7.5 辅助 API

| 函数 | 说明 |
|---|---|
| `validateRouteForRole(role, route)` | 单独校验路由白名单 |
| `ensureAllowedOrThrow(result, code?)` | 校验失败时抛 `WindowError` |

参考:[electron/windows/main/window-guards.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/windows/main/window-guards.ts)、[electron/windows/main/window-manager.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/windows/main/window-manager.ts) 第 289–365 行

---

## 八、窗口状态图

```
                ┌──────────┐
                │ (未创建) │
                └─────┬────┘
                      │ openWindow() / createWindow()
                      ▼
                ┌───────────┐  webContents.loadURL()
                │  created  │ ─────────────────▶ ┌────────┐
                │ (registered│                     │ loaded │
                │  + bound)  │ ◀────────────────── └────────┘
                └─────┬─────┘   did-finish-load / ready-to-show
                      │ show() / showOnReady
                      ▼
                ┌───────────┐
       focus()  │   shown   │  blur()
       ┌───────▶│           │◀────────┐
       │        └─────┬─────┘         │
       │              │ focus         │ blur
       │              ▼               │
       │        ┌───────────┐         │
       │        │  active   │─────────┘
       │        │ (focused) │
       │        └─────┬─────┘
       │              │ hide() / minimize()
       │              ▼
       │        ┌───────────┐
       │        │  hidden   │  show() → shown
       │        │(minimized)│
       │        └─────┬─────┘
       │              │ close() / destroy()
       │              ▼
       │        ┌───────────┐
       └────────│  closed   │  (cleanup: eventBus.markDestroyed +
                │ destroyed │   initPayloadStore.cleanupForWindow +
                └───────────┘   registry.unregister)
```

关键转换:
- `created → loaded`:由 `webContents.loadURL()` 触发,完成后发 `did-finish-load` 或 `ready-to-show`
- `shown → active`:由 `focus` 事件触发,`WindowManager.focusedWindowId` 更新
- `active ↔ shown`:由 `focus`/`blur` 切换
- `shown/active → hidden`:由 `hide()`/`minimize()` 触发
- `hidden → shown`:由 `show()`/`restore()` 触发
- `任意 → closed`:由 `close()`/`destroy()` 触发,执行清理三连

> 单例窗口的 `closeBehavior: 'hide'`(如 `taskCenter`/`floatingToolbox`/`trayPanel`)实际上从 `shown/active` 转到 `hidden` 而非 `closed`,下次 `openOrFocus` 直接从 `hidden` 恢复到 `shown`。

---

## 九、相关文档

- [overview.md](./overview.md) — 双 WindowManager 架构总览
- [roles.md](./roles.md) — 14 种窗口角色与配置字段
- [toast.md](./toast.md) — `ToastWindowManager` 系统级桌面 Toast
