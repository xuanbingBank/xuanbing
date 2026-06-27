/**
 * @file 全部页面组件定义与映射表。
 *
 * HomePage / DetailPage / LogViewerPage / ModalPage 保留在此文件内联实现，
 * 通过 window.desktop API 操作窗口与任务；其余页面拆分为独立文件，
 * 使用 PageContainer + 基础组件 + Tailwind/daisyUI 类名实现。
 */

import type { ComponentOptions } from '../vue-global'
import type { CurrentRoute, RouteMeta, PageComponentName } from '../router/types'
import type {
  AppInfo,
  DesktopUnsubscribe,
  TaskCompletedPayload,
  TaskFailedPayload,
  TaskProgressPayload,
  WindowFocusChangedPayload,
  WindowStatePayload
} from '../../../electron/ipcBus/renderer'
import { useWindowControls } from '../composables/useWindowControls'
import { useOpenWindow } from '../composables/useOpenWindow'
import { useWindowEvents } from '../composables/useWindowEvents'
import { FluentPage } from '../components/layout/FluentPage'
import { FluentCard } from '../components/base/FluentCard'
import { FluentButton } from '../components/base/FluentButton'
import { FluentBadge } from '../components/base/FluentBadge'
import { FluentIcon } from '../components/base/FluentIcon'
// 独立文件页面导入
import { DashboardPage } from './DashboardPage'
import { LoginPage } from './LoginPage'
import { SettingsPage } from './SettingsPage'
import { SettingsProfilePage } from './SettingsProfilePage'
import { SettingsSecurityPage } from './SettingsSecurityPage'
import { TaskCenterPage } from './TaskCenterPage'
import { TaskDetailPage } from './TaskDetailPage'
import { AboutPage } from './AboutPage'
import { ComponentDemoPage } from './ComponentDemoPage'
import { FluentUIDemoPage } from './FluentUIDemoPage'
import { ForbiddenPage } from './ForbiddenPage'
import { NotFoundPage } from './NotFoundPage'
import { ServerErrorPage } from './ServerErrorPage'

/* ───────────────────────── 辅助函数 ───────────────────────── */

/**
 * 格式化应用信息为可读文本。
 *
 * @param info 应用信息对象。
 * @returns 格式化后的文本。
 */
function formatAppInfo(info: AppInfo): string {
  return [
    `应用: ${info.appName}`,
    `版本: ${info.appVersion}`,
    `Electron: ${info.electronVersion}`,
    `Chrome: ${info.chromeVersion}`,
    `平台: ${info.platform}`,
    `已打包: ${String(info.isPackaged)}`
  ].join(' | ')
}

/**
 * 统一格式化错误对象为文本。
 *
 * @param error 未知错误对象。
 * @returns 错误提示文本。
 */
function formatError(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return String(error)
}

/* ───────────────────────── 共享类型 ───────────────────────── */

/**
 * 全部页面共享的路由属性。
 */
export interface PageProps {
  params: Record<string, string>
  query: Record<string, string>
  meta: RouteMeta
  route: CurrentRoute
}

/**
 * 日志条目类型。
 */
interface LogEntry {
  level: string
  message: string
  timestamp: string
}

/* ───────────────────────── 首页 ───────────────────────── */

/**
 * 首页视图状态。
 */
interface HomePageView {
  appInfoText: string
  windowId: number
  role: string
  isMaximized: boolean
  isFocused: boolean
  isVisible: boolean
  permissions: string[]
  stateText: string
  cleanup: DesktopUnsubscribe | null
  /** 组件是否已卸载，防止 async mounted 在卸载后竞态写入 */
  unmounted: boolean
}

/**
 * 首页：展示应用信息、窗口控制按钮与打开子窗口的入口。
 */
export const HomePage: ComponentOptions = {
  name: 'HomePage',
  components: { FluentPage, FluentCard, FluentButton, FluentBadge, FluentIcon },
  props: {
    params: { type: Object, default: () => ({}) },
    query: { type: Object, default: () => ({}) },
    meta: { type: Object, default: () => ({}) },
    route: { type: Object, default: () => ({}) }
  },
  data(): HomePageView {
    return {
      appInfoText: '正在加载应用信息...',
      windowId: 0,
      role: '',
      isMaximized: false,
      isFocused: false,
      isVisible: true,
      permissions: [],
      stateText: '窗口状态未同步',
      cleanup: null,
      unmounted: false
    }
  },
  async mounted(this: HomePageView): Promise<void> {
    // 获取应用信息
    try {
      const info = await window.desktop.app.getInfo()
      if (this.unmounted) return
      this.appInfoText = formatAppInfo(info)
    } catch (error) {
      if (this.unmounted) return
      this.appInfoText = `获取应用信息失败: ${formatError(error)}`
    }

    // 获取当前窗口信息
    try {
      const info = await window.desktop.window.getCurrent()
      if (this.unmounted) return
      this.windowId = info.windowId
      this.role = info.role
      this.permissions = info.permissions
      this.stateText = `窗口 ${this.windowId} (${this.role}) 已就绪`
    } catch (err) {
      console.warn('[index] getCurrent failed', err)
      if (this.unmounted) return
      this.stateText = '获取窗口信息失败'
    }

    // 卸载后不再订阅窗口事件，避免 async mounted 竞态
    if (this.unmounted) return

    // 订阅窗口状态变化
    const { subscribe } = useWindowEvents()
    this.cleanup = subscribe({
      onStateChanged: (payload: WindowStatePayload) => {
        if (this.windowId !== 0 && payload.windowId !== this.windowId) {
          return
        }
        switch (payload.state) {
          case 'maximized':
            this.isMaximized = true
            break
          case 'unmaximized':
            this.isMaximized = false
            break
          case 'focused':
            this.isFocused = true
            break
          case 'blurred':
            this.isFocused = false
            break
          case 'shown':
            this.isVisible = true
            break
          case 'hidden':
            this.isVisible = false
            break
          case 'minimized':
            this.isVisible = false
            break
          case 'restored':
            this.isMaximized = false
            this.isVisible = true
            break
          default:
            break
        }
      },
      onFocusChanged: (payload: WindowFocusChangedPayload) => {
        if (this.windowId !== 0 && payload.windowId !== this.windowId) {
          return
        }
        this.isFocused = payload.focused
      }
    })
  },
  beforeUnmount(this: HomePageView): void {
    this.unmounted = true
    this.cleanup?.()
    this.cleanup = null
  },
  methods: {
    async refreshAppInfo(this: HomePageView): Promise<void> {
      try {
        const info = await window.desktop.app.getInfo()
        this.appInfoText = formatAppInfo(info)
      } catch (error) {
        this.appInfoText = `获取应用信息失败: ${formatError(error)}`
      }
    },
    async openSettings(this: HomePageView): Promise<void> {
      try {
        await useOpenWindow().openSettings()
      } catch (error) {
        this.stateText = `打开设置失败: ${formatError(error)}`
      }
    },
    async openDetailWindow(this: HomePageView): Promise<void> {
      try {
        await useOpenWindow().openDetail('demo')
      } catch (error) {
        this.stateText = `打开详情失败: ${formatError(error)}`
      }
    },
    async openAbout(this: HomePageView): Promise<void> {
      try {
        await useOpenWindow().openAbout()
      } catch (error) {
        this.stateText = `打开关于失败: ${formatError(error)}`
      }
    },
    async openTaskCenter(this: HomePageView): Promise<void> {
      try {
        await useOpenWindow().openTaskCenter()
      } catch (error) {
        this.stateText = `打开任务中心失败: ${formatError(error)}`
      }
    },
    async openLogViewer(this: HomePageView): Promise<void> {
      try {
        await useOpenWindow().openLogViewer()
      } catch (error) {
        this.stateText = `打开日志查看器失败: ${formatError(error)}`
      }
    },
    async minimizeWindow(this: HomePageView): Promise<void> {
      try {
        await useWindowControls().minimize()
      } catch (error) {
        this.stateText = `最小化失败: ${formatError(error)}`
      }
    },
    async toggleMaximize(this: HomePageView): Promise<void> {
      try {
        const controls = useWindowControls()
        if (this.isMaximized) {
          await controls.restore()
        } else {
          await controls.maximize()
        }
      } catch (error) {
        this.stateText = `窗口操作失败: ${formatError(error)}`
      }
    },
    async closeWindow(this: HomePageView): Promise<void> {
      try {
        await useWindowControls().close()
      } catch (error) {
        this.stateText = `关闭失败: ${formatError(error)}`
      }
    }
  },
  template: `
    <FluentPage title="首页" description="应用概览、常用入口与当前窗口状态" max-width="1180px">
      <template #actions>
        <FluentButton variant="secondary" size="small" icon="refresh" @click="refreshAppInfo">刷新信息</FluentButton>
      </template>

      <div class="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6">
        <div class="space-y-6 min-w-0">
          <FluentCard title="常用入口" subtitle="打开常用窗口与工作区功能">
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <button
                class="group text-left rounded-[var(--xb-radius-lg)] border border-[var(--xb-border-subtle)] bg-[var(--xb-bg-surface)] p-4 transition-all hover:border-[var(--xb-border-strong)] hover:bg-[var(--xb-bg-hover)] active:scale-[0.99]"
                @click="openSettings"
              >
                <div class="flex items-start gap-3">
                  <span class="h-9 w-9 rounded-[var(--xb-radius-md)] bg-[var(--xb-brand-subtle)] text-[var(--xb-brand)] flex items-center justify-center">
                    <FluentIcon name="settings" :size="18" />
                  </span>
                  <span class="min-w-0">
                    <span class="block text-sm font-semibold text-[var(--xb-text-primary)]">设置</span>
                    <span class="block text-xs text-[var(--xb-text-tertiary)] mt-1">主题、数据库与偏好</span>
                  </span>
                </div>
              </button>
              <button
                class="group text-left rounded-[var(--xb-radius-lg)] border border-[var(--xb-border-subtle)] bg-[var(--xb-bg-surface)] p-4 transition-all hover:border-[var(--xb-border-strong)] hover:bg-[var(--xb-bg-hover)] active:scale-[0.99]"
                @click="openTaskCenter"
              >
                <div class="flex items-start gap-3">
                  <span class="h-9 w-9 rounded-[var(--xb-radius-md)] bg-[var(--xb-info-subtle)] text-[var(--xb-info)] flex items-center justify-center">
                    <FluentIcon name="task" :size="18" />
                  </span>
                  <span class="min-w-0">
                    <span class="block text-sm font-semibold text-[var(--xb-text-primary)]">任务中心</span>
                    <span class="block text-xs text-[var(--xb-text-tertiary)] mt-1">查看后台任务状态</span>
                  </span>
                </div>
              </button>
              <button
                class="group text-left rounded-[var(--xb-radius-lg)] border border-[var(--xb-border-subtle)] bg-[var(--xb-bg-surface)] p-4 transition-all hover:border-[var(--xb-border-strong)] hover:bg-[var(--xb-bg-hover)] active:scale-[0.99]"
                @click="openLogViewer"
              >
                <div class="flex items-start gap-3">
                  <span class="h-9 w-9 rounded-[var(--xb-radius-md)] bg-[var(--xb-warning-subtle)] text-[var(--xb-warning)] flex items-center justify-center">
                    <FluentIcon name="log" :size="18" />
                  </span>
                  <span class="min-w-0">
                    <span class="block text-sm font-semibold text-[var(--xb-text-primary)]">日志查看器</span>
                    <span class="block text-xs text-[var(--xb-text-tertiary)] mt-1">查看运行日志</span>
                  </span>
                </div>
              </button>
              <button
                class="group text-left rounded-[var(--xb-radius-lg)] border border-[var(--xb-border-subtle)] bg-[var(--xb-bg-surface)] p-4 transition-all hover:border-[var(--xb-border-strong)] hover:bg-[var(--xb-bg-hover)] active:scale-[0.99]"
                @click="openDetailWindow"
              >
                <div class="flex items-start gap-3">
                  <span class="h-9 w-9 rounded-[var(--xb-radius-md)] bg-[var(--xb-bg-hover)] text-[var(--xb-text-secondary)] flex items-center justify-center">
                    <FluentIcon name="window" :size="18" />
                  </span>
                  <span class="min-w-0">
                    <span class="block text-sm font-semibold text-[var(--xb-text-primary)]">详情窗口</span>
                    <span class="block text-xs text-[var(--xb-text-tertiary)] mt-1">打开演示详情页</span>
                  </span>
                </div>
              </button>
              <button
                class="group text-left rounded-[var(--xb-radius-lg)] border border-[var(--xb-border-subtle)] bg-[var(--xb-bg-surface)] p-4 transition-all hover:border-[var(--xb-border-strong)] hover:bg-[var(--xb-bg-hover)] active:scale-[0.99]"
                @click="openAbout"
              >
                <div class="flex items-start gap-3">
                  <span class="h-9 w-9 rounded-[var(--xb-radius-md)] bg-[var(--xb-success-subtle)] text-[var(--xb-success)] flex items-center justify-center">
                    <FluentIcon name="info" :size="18" />
                  </span>
                  <span class="min-w-0">
                    <span class="block text-sm font-semibold text-[var(--xb-text-primary)]">关于</span>
                    <span class="block text-xs text-[var(--xb-text-tertiary)] mt-1">查看应用版本信息</span>
                  </span>
                </div>
              </button>
            </div>
          </FluentCard>

          <FluentCard title="应用信息" subtitle="主进程返回的运行时环境">
            <div class="rounded-[var(--xb-radius-md)] bg-[var(--xb-bg-subtle)] border border-[var(--xb-border-subtle)] px-4 py-3 text-sm text-[var(--xb-text-secondary)] leading-6 break-words">
              {{ appInfoText }}
            </div>
          </FluentCard>
        </div>

        <div class="space-y-6 min-w-0">
          <FluentCard title="窗口状态" subtitle="当前主窗口上下文">
            <div class="space-y-4">
              <div class="flex items-center gap-2 flex-wrap">
                <FluentBadge variant="brand" dot>{{ role || '未知角色' }}</FluentBadge>
                <FluentBadge :variant="isFocused ? 'success' : 'default'" dot>{{ isFocused ? '已聚焦' : '未聚焦' }}</FluentBadge>
                <FluentBadge :variant="isVisible ? 'info' : 'warning'" dot>{{ isVisible ? '可见' : '不可见' }}</FluentBadge>
              </div>
              <div class="grid grid-cols-2 gap-3 text-sm">
                <div class="rounded-[var(--xb-radius-md)] bg-[var(--xb-bg-subtle)] p-3">
                  <div class="text-xs text-[var(--xb-text-tertiary)]">窗口 ID</div>
                  <div class="mt-1 font-semibold text-[var(--xb-text-primary)]">{{ windowId || '-' }}</div>
                </div>
                <div class="rounded-[var(--xb-radius-md)] bg-[var(--xb-bg-subtle)] p-3">
                  <div class="text-xs text-[var(--xb-text-tertiary)]">最大化</div>
                  <div class="mt-1 font-semibold text-[var(--xb-text-primary)]">{{ isMaximized ? '是' : '否' }}</div>
                </div>
              </div>
              <div class="text-sm text-[var(--xb-text-secondary)] leading-6">
                {{ stateText }}
              </div>
              <div>
                <div class="text-xs text-[var(--xb-text-tertiary)] mb-2">权限</div>
                <div class="flex flex-wrap gap-1.5">
                  <FluentBadge v-for="permission in permissions" :key="permission" size="small">{{ permission }}</FluentBadge>
                  <span v-if="permissions.length === 0" class="text-sm text-[var(--xb-text-tertiary)]">无</span>
                </div>
              </div>
            </div>
          </FluentCard>

          <FluentCard title="窗口控制" subtitle="当前窗口快捷操作">
            <div class="grid grid-cols-2 gap-2">
              <FluentButton variant="secondary" icon="minus" @click="minimizeWindow">最小化</FluentButton>
              <FluentButton variant="secondary" icon="window" @click="toggleMaximize">{{ isMaximized ? '还原' : '最大化' }}</FluentButton>
              <FluentButton variant="danger" icon="close" class="col-span-2" @click="closeWindow">关闭窗口</FluentButton>
            </div>
          </FluentCard>
        </div>
      </div>
    </FluentPage>
  `
}

/* ───────────────────────── 详情页 ───────────────────────── */

/**
 * 详情页视图状态。
 */
interface DetailPageView {
  detailText: string
  loading: boolean
}

/**
 * 详情页：根据路由参数 id 展示详情内容，提供返回按钮。
 */
export const DetailPage: ComponentOptions = {
  name: 'DetailPage',
  props: {
    params: { type: Object, default: () => ({}) },
    query: { type: Object, default: () => ({}) },
    meta: { type: Object, default: () => ({}) },
    route: { type: Object, default: () => ({}) }
  },
  data(): DetailPageView {
    return {
      detailText: '',
      loading: true
    }
  },
  async mounted(this: DetailPageView & PageProps): Promise<void> {
    const id = this.params.id || 'unknown'
    try {
      await new Promise((resolve) => setTimeout(resolve, 200))
      this.detailText = `正在展示 ID 为 ${id} 的详情内容。查询参数: ${JSON.stringify(this.query)}`
    } catch (error) {
      console.warn('[index] load detail failed', error)
      this.detailText = `加载详情失败: ${formatError(error)}`
    } finally {
      this.loading = false
    }
  },
  methods: {
    async closeWindow(this: DetailPageView): Promise<void> {
      try {
        await useWindowControls().close()
      } catch {
        // 忽略关闭错误
      }
    },
    async openAnother(this: DetailPageView & PageProps): Promise<void> {
      try {
        await useOpenWindow().openDetail(`${this.params.id}-next`)
      } catch {
        // 忽略打开错误
      }
    }
  },
  template: `
    <div>
      <h1>详情</h1>
      <p v-if="loading" class="muted">加载中...</p>
      <div v-else>
        <p>{{ detailText }}</p>
        <div class="actions">
          <button @click="openAnother">打开下一个详情</button>
          <button @click="closeWindow">关闭</button>
        </div>
      </div>
    </div>
  `
}

/* ───────────────────────── 日志查看器页 ───────────────────────── */

/**
 * 日志查看器页视图状态。
 */
interface LogViewerPageView {
  logs: LogEntry[]
  filter: string
}

/**
 * 日志查看器页：展示日志条目，支持按级别筛选与刷新。
 */
export const LogViewerPage: ComponentOptions = {
  name: 'LogViewerPage',
  props: {
    params: { type: Object, default: () => ({}) },
    query: { type: Object, default: () => ({}) },
    meta: { type: Object, default: () => ({}) },
    route: { type: Object, default: () => ({}) }
  },
  data(): LogViewerPageView {
    return {
      logs: [],
      filter: 'all'
    }
  },
  mounted(this: LogViewerPageView & { refreshLogs: () => void }): void {
    this.refreshLogs()
  },
  methods: {
    refreshLogs(this: LogViewerPageView): void {
      // TODO: mock 数据,待接入真实数据源
      const levels = ['info', 'warn', 'error', 'debug']
      const messages = [
        '应用启动完成',
        'IPC 总线已连接',
        '窗口已就绪',
        '路由变更: / -> /log-viewer',
        '任务队列空闲',
        '配置文件已加载',
        '权限校验通过',
        '窗口状态同步完成'
      ]
      const newLogs: LogEntry[] = []
      for (let i = 0; i < 8; i++) {
        const level = levels[Math.floor(Math.random() * levels.length)]
        const message = messages[Math.floor(Math.random() * messages.length)]
        const time = new Date(Date.now() - i * 60000)
        newLogs.push({
          level,
          message,
          timestamp: time.toLocaleTimeString('zh-CN')
        })
      }
      this.logs = newLogs
    },
    clearLogs(this: LogViewerPageView): void {
      this.logs = []
    },
    async closeWindow(this: LogViewerPageView): Promise<void> {
      try {
        await useWindowControls().close()
      } catch (err) {
        console.warn('[index] closeWindow failed', err)
        // 忽略关闭错误
      }
    }
  },
  template: `
    <div>
      <h1>日志查看器</h1>
      <div class="actions">
        <select v-model="filter">
          <option value="all">全部</option>
          <option value="info">Info</option>
          <option value="warn">Warn</option>
          <option value="error">Error</option>
          <option value="debug">Debug</option>
        </select>
        <button @click="refreshLogs">刷新</button>
        <button @click="clearLogs">清空</button>
        <button @click="closeWindow">关闭</button>
      </div>
      <div class="log-list">
        <div
          class="log-item"
          v-for="(log, index) in logs"
          :key="index + '-' + log.timestamp"
          v-show="filter === 'all' || log.level === filter"
        >
          <span class="log-time">{{ log.timestamp }}</span>
          <span class="log-level" :class="'level-' + log.level">{{ log.level.toUpperCase() }}</span>
          <span class="log-message">{{ log.message }}</span>
        </div>
        <p v-if="logs.length === 0" class="muted">暂无日志</p>
      </div>
    </div>
  `
}

/* ───────────────────────── 弹窗页 ───────────────────────── */

/**
 * 弹窗页视图状态。
 */
interface ModalPageView {
  modalTitle: string
  modalText: string
  inputValue: string
  resultText: string
}

/**
 * 弹窗页：根据路由参数 type 展示不同类型的弹窗内容。
 */
export const ModalPage: ComponentOptions = {
  name: 'ModalPage',
  props: {
    params: { type: Object, default: () => ({}) },
    query: { type: Object, default: () => ({}) },
    meta: { type: Object, default: () => ({}) },
    route: { type: Object, default: () => ({}) }
  },
  data(): ModalPageView {
    return {
      modalTitle: '弹窗',
      modalText: '',
      inputValue: '',
      resultText: ''
    }
  },
  mounted(this: ModalPageView & PageProps): void {
    const type = this.params.type || 'default'
    switch (type) {
      case 'confirm':
        this.modalTitle = '确认操作'
        this.modalText = '确认要执行此操作吗？此操作不可撤销。'
        break
      case 'alert':
        this.modalTitle = '提示'
        this.modalText = '这是一个提示信息，请知悉。'
        break
      case 'prompt':
        this.modalTitle = '请输入'
        this.modalText = '请输入内容：'
        break
      default:
        this.modalTitle = `弹窗 (${type})`
        this.modalText = `未知弹窗类型: ${type}`
        break
    }
  },
  methods: {
    confirm(this: ModalPageView & PageProps): void {
      const type = this.params.type || 'default'
      if (type === 'prompt') {
        this.resultText = `已确认，输入内容: ${this.inputValue}`
      } else {
        this.resultText = '已确认'
      }
      // 确认后关闭窗口
      void useWindowControls().close()
    },
    cancel(this: ModalPageView): void {
      this.resultText = '已取消'
      // 取消后关闭窗口
      void useWindowControls().close()
    },
    async closeWindow(this: ModalPageView): Promise<void> {
      try {
        await useWindowControls().close()
      } catch {
        // 忽略关闭错误
      }
    }
  },
  template: `
    <div>
      <h1>{{ modalTitle }}</h1>
      <p>{{ modalText }}</p>
      <div class="form-group" v-if="params.type === 'prompt'">
        <input type="text" v-model="inputValue" placeholder="请输入内容" />
      </div>
      <div class="actions">
        <button @click="confirm">确认</button>
        <button @click="cancel">取消</button>
      </div>
      <div class="status" v-if="resultText">
        <p>{{ resultText }}</p>
      </div>
    </div>
  `
}

/* ───────────────────────── 页面映射表 ───────────────────────── */

/**
 * 全部页面的映射表，键为 PageComponentName，值为组件选项对象。
 *
 * 根组件通过路由的 component 字段从此表查找并渲染对应页面。
 */
export const PAGES: Record<PageComponentName, ComponentOptions> = {
  home: HomePage,
  dashboard: DashboardPage,
  settings: SettingsPage,
  settingsProfile: SettingsProfilePage,
  settingsSecurity: SettingsSecurityPage,
  about: AboutPage,
  detail: DetailPage,
  taskCenter: TaskCenterPage,
  taskDetail: TaskDetailPage,
  logViewer: LogViewerPage,
  modal: ModalPage,
  componentDemo: ComponentDemoPage,
  fluentUiDemo: FluentUIDemoPage,
  forbidden: ForbiddenPage,
  notFound: NotFoundPage,
  serverError: ServerErrorPage,
  login: LoginPage
}
