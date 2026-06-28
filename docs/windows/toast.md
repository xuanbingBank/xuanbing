# ToastWindowManager 系统级桌面 Toast

`ToastWindowManager`(定义于 [electron/desktop-toast/ToastWindowManager.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/desktop-toast/ToastWindowManager.ts))是一个独立于应用窗口的透明置顶 `BrowserWindow`,在桌面上显示自定义 Toast 浮层。

**与系统通知(Notification API)的区别**:
- 系统通知进入 Windows 通知中心 / macOS Notification Center,样式由系统控制
- 桌面 Toast 是独立窗口,样式完全自定义,不进入通知中心

---

## 一、窗口配置

`init()` 创建一个隐藏的透明窗口,作为所有 Toast 的容器:

```ts
new BrowserWindow({
  width: 380,            // windowWidth
  height: 420,           // windowHeight
  frame: false,          // 无边框
  transparent: true,     // 透明背景
  alwaysOnTop: true,     // 始终置顶
  skipTaskbar: true,     // 不显示在任务栏
  resizable: false,
  minimizable: false,
  maximizable: false,
  focusable: false,      // 不抢焦点
  show: false,           // 初始隐藏
  hasShadow: false,
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true
  }
})
```

窗口加载内嵌 HTML(纯 CSS,无内联脚本以兼容 CSP):
```ts
window.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(TOAST_HTML))
```

HTML 中的关键 CSS:
- `html, body` 背景 `transparent`,`overflow: hidden`,`height: 100vh`
- `#container` 是 `display: flex` 容器,`gap: 8px`,`padding: 12px`
- `.toast` 卡片:`min-width: 260px`,`max-width: 320px`,圆角 8px,左侧 3px 彩色边框(按类型)
- 入场动画 `toast-in` 0.3s,出场动画 `toast-out` 0.25s

参考:[electron/desktop-toast/ToastWindowManager.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/desktop-toast/ToastWindowManager.ts) 第 62–119 行、第 154–179 行

---

## 二、8 种位置

`ToastPosition` 类型定义 8 个方向:

```
'top-left' | 'top-center' | 'top-right'
'center-left' | 'center-right'
'bottom-left' | 'bottom-center' | 'bottom-right'
```

### 2.1 窗口坐标计算

`positionWindow()` 根据 `currentPosition` 计算窗口左上角坐标,基于主显示器的 `workAreaSize`(排除任务栏):

```
margin = 12
w = windowWidth = 380
h = windowHeight = 420
```

| position | x | y |
|---|---|---|
| `top-left` | `margin` | `margin` |
| `top-center` | `(width - w) / 2` | `margin` |
| `top-right` | `width - w - margin` | `margin` |
| `center-left` | `margin` | `(height - h) / 2` |
| `center-right` | `width - w - margin` | `(height - h) / 2` |
| `bottom-left` | `margin` | `height - h - margin` |
| `bottom-center` | `(width - w) / 2` | `height - h - margin` |
| `bottom-right`(默认) | `width - w - margin` | `height - h - margin` |

调用 `this.window.setPosition(x, y)` 移动窗口。

### 2.2 DOM flex 布局

`positionFlexMap` 定义每个位置对应的容器 flex 排列方向:

| position | flex-direction | align-items | justify-content |
|---|---|---|---|
| `top-left` | `column` | `flex-start` | `flex-start` |
| `top-center` | `column` | `center` | `flex-start` |
| `top-right` | `column` | `flex-end` | `flex-start` |
| `center-left` | `column` | `flex-start` | `center` |
| `center-right` | `column` | `flex-end` | `center` |
| `bottom-left` | `column-reverse` | `flex-start` | `flex-end` |
| `bottom-center` | `column-reverse` | `center` | `flex-end` |
| `bottom-right` | `column-reverse` | `flex-end` | `flex-end` |

> `top-*` 用 `column`(新 Toast 追加到末尾,在下方);`bottom-*` 用 `column-reverse`(新 Toast 追加到末尾,但因反向布局显示在上方),实现"从底部向上堆叠"的视觉效果。

`applyContainerLayout(position)` 通过 `executeJavaScript` 把这三个样式写入 `#container`:

```js
container.style.flexDirection = '...'
container.style.alignItems = '...'
container.style.justifyContent = '...'
```

参考:[electron/desktop-toast/ToastWindowManager.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/desktop-toast/ToastWindowManager.ts) 第 48–57 行、第 285–353 行

---

## 三、动态 DOM 注入(executeJavaScript)

主进程通过 `webContents.executeJavaScript()` 注入 HTML/CSS,所有用户输入经 `escapeHtml()` 转义防止 XSS。

### 3.1 类型到图标映射

```ts
const typeIconMap: Record<ToastType, string> = {
  info: 'ℹ️',
  success: '✅',
  warning: '⚠️',
  error: '❌'
}
```

`.toast` 卡片左侧 3px 边框颜色:
- `info` → `#3b82f6`(蓝)
- `success` → `#22c55e`(绿)
- `warning` → `#f59e0b`(橙)
- `error` → `#ef4444`(红)

### 3.2 注入 Toast DOM

`show()` 生成的 id 格式:`toast-${Date.now()}-${toastIdCounter}`(全局自增计数器)。

注入脚本:
```js
(function() {
  var container = document.getElementById('container');
  var el = document.createElement('div');
  el.className = 'toast ${options.type}';
  el.id = '${id}';
  el.innerHTML =
    '<span class="toast-icon">${icon}</span>' +
    '<div class="toast-body">' +
    '<div class="toast-title">${safeTitle}</div>' +
    '${messageHtml}' +
    '</div>';
  container.appendChild(el);
})();
```

### 3.3 移除 Toast DOM

`remove(id)` 注入移除动画,260ms 后从 DOM 删除:
```js
(function() {
  var el = document.getElementById('${id}');
  if (el) {
    el.classList.add('removing');        // 触发 toast-out 动画
    setTimeout(function() { el.remove(); }, 260);
  }
})();
```

参考:[electron/desktop-toast/ToastWindowManager.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/desktop-toast/ToastWindowManager.ts) 第 127–134 行、第 213–280 行

---

## 四、堆叠逻辑

同一位置多条 Toast 通过 `#container` 的 flex 布局垂直堆叠:

- `top-*` 位置:`flex-direction: column`,新 Toast `appendChild` 到末尾,显示在已有 Toast 下方
- `bottom-*` 位置:`flex-direction: column-reverse`,新 Toast `appendChild` 到末尾,但因反向布局显示在已有 Toast 上方
- `center-*` 位置:同 `top-*`/`bottom-*` 规则,垂直居中

**位置切换**:若 `show()` 收到的 `position` 与 `currentPosition` 不同:
1. 更新 `currentPosition`
2. `positionWindow()` 重新定位窗口
3. `applyContainerLayout()` 更新容器 flex 方向(已有 Toast 会重新排列)

**位置相同**:仅调用 `positionWindow()` 确保窗口可见(防止被其他窗口挤开)。

### 4.1 计数与自动隐藏

- `activeCount` 记录当前活跃 Toast 数,`show()` 时 `++`,`remove()` 时 `--`(下限 0)
- `activeCount === 0` 时,延迟 300ms 后若仍为 0 则 `window.hide()`(不销毁,下次 `show()` 复用)
- `duration > 0` 时,`setTimeout(() => this.remove(id), duration)` 自动消失,计时器存入 `timers: Map<string, NodeJS.Timeout>`

### 4.2 窗口显示策略

```ts
if (!win.isVisible()) {
  win.showInactive()    // 显示但不抢焦点
}
```

参考:[electron/desktop-toast/ToastWindowManager.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/desktop-toast/ToastWindowManager.ts) 第 184–241 行、第 246–280 行

---

## 五、ToastWindowManager API

| 方法 | 说明 |
|---|---|
| `init()` | 创建隐藏的透明置顶窗口(若已存在则跳过),加载内嵌 HTML |
| `show(options: ToastOptions): boolean` | 显示一条 Toast。若窗口未初始化则先 `init()`。生成唯一 id,注入 DOM,启动自动消失计时器 |
| `remove(id: string)` | 移除一条 Toast。清计时器、注入移除动画、260ms 后 DOM 删除;`activeCount === 0` 时延迟 300ms 隐藏窗口 |
| `dispose()` | 销毁窗口,清空全部计时器,重置 `activeCount` |

### 5.1 ToastOptions

```ts
interface ToastOptions {
  type: ToastType         // 'info' | 'success' | 'warning' | 'error'
  title: string
  message?: string
  duration: number        // 自动消失时长(ms),0 表示不自动消失
  position?: ToastPosition // 默认 'bottom-right'
}
```

### 5.2 内部状态

| 字段 | 类型 | 说明 |
|---|---|---|
| `window` | `BrowserWindow \| null` | 容器窗口 |
| `activeCount` | `number` | 活跃 Toast 数 |
| `timers` | `Map<string, NodeJS.Timeout>` | id → 自动消失计时器 |
| `windowWidth` | `380` | 窗口宽度(常量) |
| `windowHeight` | `420` | 窗口高度(常量) |
| `currentPosition` | `ToastPosition` | 当前位置(默认 `bottom-right`) |

参考:[electron/desktop-toast/ToastWindowManager.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/desktop-toast/ToastWindowManager.ts) 第 143–149 行、第 184–241 行

---

## 六、IPC 集成

### 6.1 主进程注册

`ToastWindowManager` 在 `createMainIpcRuntime()`(electron/ipcBus/main/index.ts)中实例化,通过 `registerSystemIpc(bus, messageBox, toastManager)` 注册 IPC handler:

```ts
bus.registerHandler(requestContracts[IPC_CHANNELS.systemToastShow], async ({ input }) => {
  const req = input as ToastInput
  const shown = toastManager.show({
    type: req.type || 'info',
    title: req.title,
    message: req.message,
    duration: req.duration !== undefined ? req.duration : 4000,  // 默认 4s
    position: req.position
  })
  return { shown }
})
```

### 6.2 IPC 契约

`ToastInput`(system.ipc.ts):
```ts
{
  type?: 'info' | 'success' | 'warning' | 'error'
  title: string
  message?: string
  duration?: number
  position?: ToastPosition
}
```

响应:`{ shown: boolean }`

参考:[electron/ipcBus/main/modules/system.ipc.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/modules/system.ipc.ts) 第 106–119 行、[electron/ipcBus/main/index.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/main/index.ts) 第 197 行

---

## 七、useSystemToast composable

渲染层通过 [src/renderer/composables/useSystem.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/composables/useSystem.ts) 暴露的 `useSystemToast()` 调用。

### 7.1 调用方式

```ts
const desktopToast = useSystemToast()

await desktopToast.show(
  '桌面 Toast',                    // title
  '出现在右下角',                  // message(可选)
  {
    type: 'info',                  // 'info' | 'success' | 'warning' | 'error'
    duration: 4000,                // ms,0 表示不自动消失
    position: 'bottom-right'       // 8 种位置之一
  }
)
// 返回 Promise<boolean>,resolve 为 toastManager.show() 的返回值
```

### 7.2 实现细节

```ts
export function useSystemToast(): UseSystemToastReturn {
  function show(title, message?, options?): Promise<boolean> {
    const input: SystemToastInput = {
      title, message,
      type: options?.type,
      duration: options?.duration,
      position: options?.position
    }
    return window.desktop.system.showToast(input)
      .then((res: SystemToastOutput) => res.shown)
  }
  return { show }
}
```

底层调用 `window.desktop.system.showToast(input)`,经 preload 暴露的 `desktop-api` 桥接到主进程 IPC handler。

参考:[src/renderer/composables/useSystem.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/composables/useSystem.ts) 第 106–149 行

---

## 八、ComponentDemoPage 3x4 grid 演示

[src/renderer/pages/ComponentDemoPage.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/pages/ComponentDemoPage.ts) 的第 17 张卡片"桌面 Toast 浮层"用 `grid-cols-4` 布局展示 8 个方向按钮:

```
┌─────────┬─────────┬─────────┬───────┐
│ 左上    │  上中   │  右上   │       │
│ top-left│top-center│top-right│       │
├─────────┼─────────┼─────────┼───────┤
│ 左中    │  8 方向 │  右中   │       │
│center-l │ (占位)  │center-r │       │
├─────────┼─────────┼─────────┼───────┤
│ 左下    │  下中   │  右下   │       │
│bottom-l │bottom-c │bottom-r │       │
└─────────┴─────────┴─────────┴───────┘
```

点击按钮调用 `showDesktopToast(position)`:

```ts
async function showDesktopToast(position: ToastPosition): Promise<void> {
  const positionLabels: Record<string, string> = {
    'top-left': '左上角',
    'top-center': '上方居中',
    'top-right': '右上角',
    'center-left': '左侧居中',
    'center-right': '右侧居中',
    'bottom-left': '左下角',
    'bottom-center': '下方居中',
    'bottom-right': '右下角'
  }
  try {
    await desktopToast.show('桌面 Toast', `出现在${positionLabels[position]}`, {
      type: 'info',
      duration: 4000,
      position
    })
  } catch (e) {
    toast.error('Toast 显示失败', e instanceof Error ? e.message : String(e))
  }
}
```

模板片段:
```vue
<BaseCard title="桌面 Toast 浮层" subtitle="独立置顶透明窗口,显示在应用外的桌面上,支持 8 个方向">
  <div class="grid grid-cols-4 gap-2 max-w-sm">
    <BaseButton variant="ghost" size="sm" @click="showDesktopToast('top-left')">左上</BaseButton>
    <BaseButton variant="ghost" size="sm" @click="showDesktopToast('top-center')">上中</BaseButton>
    <BaseButton variant="ghost" size="sm" @click="showDesktopToast('top-right')">右上</BaseButton>
    <div></div>
    <BaseButton variant="ghost" size="sm" @click="showDesktopToast('center-left')">左中</BaseButton>
    <div class="flex items-center justify-center text-xs text-base-content/30">8 方向</div>
    <BaseButton variant="ghost" size="sm" @click="showDesktopToast('center-right')">右中</BaseButton>
    <div></div>
    <BaseButton variant="ghost" size="sm" @click="showDesktopToast('bottom-left')">左下</BaseButton>
    <BaseButton variant="ghost" size="sm" @click="showDesktopToast('bottom-center')">下中</BaseButton>
    <BaseButton variant="ghost" size="sm" @click="showDesktopToast('bottom-right')">右下</BaseButton>
  </div>
</BaseCard>
```

参考:[src/renderer/pages/ComponentDemoPage.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/pages/ComponentDemoPage.ts) 第 137–154 行、第 399–413 行

---

## 九、相关文档

- [overview.md](./overview.md) — 双 WindowManager 架构总览
- [roles.md](./roles.md) — 14 种窗口角色与配置字段
- [lifecycle.md](./lifecycle.md) — 生命周期事件与状态持久化
