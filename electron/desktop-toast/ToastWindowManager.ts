/**
 * @file 桌面 Toast 窗口管理器。
 *
 * 创建一个独立于应用窗口的透明置顶 BrowserWindow，支持 8 个方向出现位置。
 * 通过 executeJavaScript 注入 toast DOM，主进程管理生命周期和自动消失。
 *
 * 与系统通知（Notification API）的区别：
 * - 系统通知进入 Windows 通知中心，样式由系统控制
 * - 桌面 Toast 是独立窗口，样式完全自定义，不进入通知中心
 */

import { BrowserWindow, screen } from 'electron'

/** Toast 类型 */
export type ToastType = 'info' | 'success' | 'warning' | 'error'

/** Toast 出现位置（8 个方向） */
export type ToastPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'

/** Toast 选项 */
export interface ToastOptions {
  type: ToastType
  title: string
  message?: string
  /** 自动消失时长（ms），0 表示不自动消失 */
  duration: number
  /** 出现位置，默认 bottom-right */
  position?: ToastPosition
}

/** 类型到图标的映射 */
const typeIconMap: Record<ToastType, string> = {
  info: 'ℹ️',
  success: '✅',
  warning: '⚠️',
  error: '❌'
}

/** 位置到容器 flex 排列方向的映射 */
const positionFlexMap: Record<ToastPosition, { direction: string; align: string; justify: string }> = {
  'top-left': { direction: 'column', align: 'flex-start', justify: 'flex-start' },
  'top-center': { direction: 'column', align: 'center', justify: 'flex-start' },
  'top-right': { direction: 'column', align: 'flex-end', justify: 'flex-start' },
  'center-left': { direction: 'column', align: 'flex-start', justify: 'center' },
  'center-right': { direction: 'column', align: 'flex-end', justify: 'center' },
  'bottom-left': { direction: 'column-reverse', align: 'flex-start', justify: 'flex-end' },
  'bottom-center': { direction: 'column-reverse', align: 'center', justify: 'flex-end' },
  'bottom-right': { direction: 'column-reverse', align: 'flex-end', justify: 'flex-end' }
}

/**
 * Toast 窗口的 HTML（纯 CSS，无内联脚本以兼容 CSP）。
 */
const TOAST_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    background: transparent;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif;
    overflow: hidden;
    height: 100vh;
  }
  #container {
    display: flex;
    gap: 8px;
    padding: 12px;
    height: 100vh;
  }
  .toast {
    background: rgba(32, 32, 36, 0.95);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    color: #fff;
    border-radius: 8px;
    padding: 12px 14px;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
    display: flex;
    align-items: flex-start;
    gap: 10px;
    min-width: 260px;
    max-width: 320px;
    animation: toast-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    border-left: 3px solid #6b7280;
  }
  .toast.removing { animation: toast-out 0.25s ease forwards; }
  .toast.info { border-left-color: #3b82f6; }
  .toast.success { border-left-color: #22c55e; }
  .toast.warning { border-left-color: #f59e0b; }
  .toast.error { border-left-color: #ef4444; }
  .toast-icon { font-size: 16px; flex-shrink: 0; line-height: 1.4; }
  .toast-body { flex: 1; min-width: 0; }
  .toast-title { font-size: 13px; font-weight: 600; line-height: 1.4; }
  .toast-message { font-size: 12px; opacity: 0.75; line-height: 1.5; margin-top: 2px; }
  @keyframes toast-in {
    from { opacity: 0; transform: scale(0.92); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes toast-out {
    from { opacity: 1; transform: scale(1); }
    to { opacity: 0; transform: scale(0.9); }
  }
</style>
</head>
<body>
  <div id="container"></div>
</body>
</html>`

/** 自增 id */
let toastIdCounter = 0

/**
 * HTML 转义，防止 XSS。
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * 桌面 Toast 窗口管理器。
 *
 * 维护一个透明的置顶窗口，通过 executeJavaScript 动态注入/移除 toast DOM。
 * 主进程管理 toast 计数和自动消失计时器，所有 toast 消失后隐藏窗口。
 * 支持 8 个出现方向，窗口位置和 DOM 排列方向自动适配。
 */
export class ToastWindowManager {
  private window: BrowserWindow | null = null
  private activeCount = 0
  private readonly timers = new Map<string, NodeJS.Timeout>()
  private readonly windowWidth = 380
  private readonly windowHeight = 420
  private currentPosition: ToastPosition = 'bottom-right'

  /**
   * 初始化 toast 窗口（隐藏状态）。
   */
  init(): void {
    if (this.window) return

    this.window = new BrowserWindow({
      width: this.windowWidth,
      height: this.windowHeight,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      minimizable: false,
      maximizable: false,
      focusable: false,
      show: false,
      hasShadow: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true
      }
    })

    // 加载内嵌 HTML
    this.window.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(TOAST_HTML))
  }

  /**
   * 显示一条 toast。
   */
  show(options: ToastOptions): boolean {
    if (!this.window) {
      this.init()
    }

    const win = this.window!
    const position = options.position || 'bottom-right'
    toastIdCounter += 1
    const id = `toast-${Date.now()}-${toastIdCounter}`
    const icon = typeIconMap[options.type] || typeIconMap.info
    const safeTitle = escapeHtml(options.title)
    const safeMessage = options.message ? escapeHtml(options.message) : ''
    const messageHtml = safeMessage ? `<div class="toast-message">${safeMessage}</div>` : ''

    // 如果位置变了，重新定位窗口并更新容器排列方向
    if (position !== this.currentPosition) {
      this.currentPosition = position
      this.positionWindow()
      this.applyContainerLayout(position)
    } else {
      this.positionWindow()
    }

    // 显示窗口
    if (!win.isVisible()) {
      win.showInactive()
    }

    // 注入 toast DOM
    const js = `
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
    `
    win.webContents.executeJavaScript(js)

    this.activeCount++

    // 自动消失
    if (options.duration > 0) {
      const timer = setTimeout(() => {
        this.remove(id)
      }, options.duration)
      this.timers.set(id, timer)
    }

    return true
  }

  /**
   * 移除一条 toast。
   */
  remove(id: string): void {
    const win = this.window
    if (!win) return

    // 清理计时器
    const timer = this.timers.get(id)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(id)
    }

    // 注入移除动画
    const js = `
      (function() {
        var el = document.getElementById('${id}');
        if (el) {
          el.classList.add('removing');
          setTimeout(function() { el.remove(); }, 260);
        }
      })();
    `
    win.webContents.executeJavaScript(js)

    this.activeCount--
    if (this.activeCount < 0) this.activeCount = 0

    // 所有 toast 消失后延迟隐藏窗口
    if (this.activeCount === 0) {
      setTimeout(() => {
        if (this.activeCount === 0 && this.window?.isVisible()) {
          this.window.hide()
        }
      }, 300)
    }
  }

  /**
   * 根据当前位置将窗口定位到屏幕对应区域。
   */
  private positionWindow(): void {
    if (!this.window) return
    const display = screen.getPrimaryDisplay()
    const { width, height } = display.workAreaSize
    const w = this.windowWidth
    const h = this.windowHeight
    const margin = 12

    let x: number
    let y: number

    switch (this.currentPosition) {
      case 'top-left':
        x = margin
        y = margin
        break
      case 'top-center':
        x = Math.round((width - w) / 2)
        y = margin
        break
      case 'top-right':
        x = width - w - margin
        y = margin
        break
      case 'center-left':
        x = margin
        y = Math.round((height - h) / 2)
        break
      case 'center-right':
        x = width - w - margin
        y = Math.round((height - h) / 2)
        break
      case 'bottom-left':
        x = margin
        y = height - h - margin
        break
      case 'bottom-center':
        x = Math.round((width - w) / 2)
        y = height - h - margin
        break
      case 'bottom-right':
      default:
        x = width - w - margin
        y = height - h - margin
        break
    }

    this.window.setPosition(x, y)
  }

  /**
   * 根据位置更新容器的 flex 排列方向和对齐方式。
   */
  private applyContainerLayout(position: ToastPosition): void {
    const win = this.window
    if (!win) return
    const layout = positionFlexMap[position]
    const js = `
      (function() {
        var container = document.getElementById('container');
        if (container) {
          container.style.flexDirection = '${layout.direction}';
          container.style.alignItems = '${layout.align}';
          container.style.justifyContent = '${layout.justify}';
        }
      })();
    `
    win.webContents.executeJavaScript(js)
  }

  /**
   * 销毁窗口，释放资源。
   */
  dispose(): void {
    this.timers.forEach((t) => clearTimeout(t))
    this.timers.clear()
    this.window?.destroy()
    this.window = null
    this.activeCount = 0
  }
}
