/**
 * @file 日志查看器页（Fluent 风格），展示 app_logs 表中的日志，支持级别筛选、
 * 关键词搜索、时间范围筛选、分页与行详情展开。
 *
 * 数据流（规划中）：
 * renderer client → preload API → IPC Bus → LogRepository → SQLite (app_logs)
 *
 * 注意：当前 log:list / log:detail IPC 通道尚未在 contracts.ts 中定义，
 * 因此本页使用 mock 数据占位，待 IPC 通道与 log.client.ts 就绪后替换为真实调用。
 */

import type { ComponentOptions } from '../vue-global'
import type { CurrentRoute, RouteMeta } from '../router/types'
import { FluentPage } from '../components/layout/FluentPage'
import { FluentCard } from '../components/base/FluentCard'
import { FluentButton } from '../components/base/FluentButton'
import { FluentInput } from '../components/base/FluentInput'
import { FluentSelect } from '../components/base/FluentSelect'
import type { FluentSelectOption } from '../components/base/FluentSelect'
import { FluentBadge } from '../components/base/FluentBadge'
import { FluentTable } from '../components/data/FluentTable'
import type { FluentTableColumn } from '../components/data/FluentTable'
import { FluentPagination } from '../components/data/FluentPagination'
import { useToast } from '../composables/useToast'
import { useIpcRequest } from '../composables/useIpcRequest'
import { escapeHtml } from '../utils/escapeHtml'

/** 页面 Props */
interface PageProps {
  params: Record<string, string>
  query: Record<string, string>
  meta: RouteMeta
  route: CurrentRoute
}

/** 日志级别类型（对应 app_logs.level） */
type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/** 日志行（对应 LogRepository.AppLogRow） */
interface LogRow {
  id: string
  level: LogLevel
  scope: string
  message: string
  payload: string | null
  createdAt: string
}

/** 日志列表查询输入 */
interface LogListInput {
  page: number
  pageSize: number
  level: LogLevel | ''
  keyword: string
  timeRange: string
}

/** 日志列表查询输出 */
interface LogListOutput {
  items: LogRow[]
  total: number
  page: number
  pageSize: number
}

/** 级别到中文文案映射 */
const levelTextMap: Record<LogLevel, string> = {
  debug: 'DEBUG',
  info: 'INFO',
  warn: 'WARN',
  error: 'ERROR'
}

/** 级别到颜色 token 映射（INFO 蓝 / WARN 黄 / ERROR 红 / DEBUG 灰） */
const levelColorMap: Record<LogLevel, { bg: string; text: string }> = {
  debug: { bg: 'var(--xb-bg-hover)', text: 'var(--xb-text-tertiary)' },
  info: { bg: 'var(--xb-info-subtle)', text: 'var(--xb-info)' },
  warn: { bg: 'var(--xb-warning-subtle)', text: 'var(--xb-warning)' },
  error: { bg: 'var(--xb-error-subtle)', text: 'var(--xb-error)' }
}

/** 级别到 FluentBadge 变体映射 */
const levelBadgeVariantMap: Record<LogLevel, 'default' | 'info' | 'warning' | 'error'> = {
  debug: 'default',
  info: 'info',
  warn: 'warning',
  error: 'error'
}

/** 级别筛选选项 */
const levelOptions: FluentSelectOption[] = [
  { label: '全部级别', value: '' },
  { label: 'DEBUG', value: 'debug' },
  { label: 'INFO', value: 'info' },
  { label: 'WARN', value: 'warn' },
  { label: 'ERROR', value: 'error' }
]

/** 时间范围选项 */
const timeRangeOptions: FluentSelectOption[] = [
  { label: '全部时间', value: '' },
  { label: '最近 1 小时', value: '1h' },
  { label: '最近 24 小时', value: '24h' },
  { label: '最近 7 天', value: '7d' }
]

/** 自动刷新间隔（毫秒） */
const AUTO_REFRESH_INTERVAL_MS = 10_000

/**
 * 模拟日志数据池。
 *
 * TODO: 需要补充 log:list 和 log:detail IPC 通道到 contracts.ts，
 * 并新增 log.client.ts 封装调用。当前使用 mock 数据作为占位，
 * 待 IPC 通道就绪后替换 fetchLogs 为真实调用。
 */
const MOCK_LOG_SCOPES = ['main', 'renderer', 'ipc', 'database', 'window', 'task']
const MOCK_LOG_MESSAGES: Record<LogLevel, string[]> = {
  debug: ['调试信息：缓存命中', '调试信息：路由解析完成', '调试信息：组件挂载完成'],
  info: ['应用启动完成', 'IPC 总线已连接', '窗口已就绪', '配置文件已加载', '任务队列空闲'],
  warn: ['配置项缺失，使用默认值', '缓存即将过期', '窗口状态同步延迟'],
  error: ['数据库连接失败', '任务执行异常', 'IPC 调用超时', '文件读取失败']
}

/** 生成 mock 日志池 */
function generateMockLogs(count: number): LogRow[] {
  const levels: LogLevel[] = ['debug', 'info', 'warn', 'error']
  const weights = [0.2, 0.55, 0.15, 0.1]
  const now = Date.now()
  const logs: LogRow[] = []
  for (let i = 0; i < count; i++) {
    // 按权重选择级别
    const rand = Math.random()
    let acc = 0
    let level: LogLevel = 'info'
    for (let j = 0; j < levels.length; j++) {
      acc += weights[j]
      if (rand < acc) {
        level = levels[j]
        break
      }
    }
    const scope = MOCK_LOG_SCOPES[Math.floor(Math.random() * MOCK_LOG_SCOPES.length)]
    const messages = MOCK_LOG_MESSAGES[level]
    const message = messages[Math.floor(Math.random() * messages.length)]
    const createdAt = new Date(now - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)).toISOString()
    const payload =
      level === 'error'
        ? JSON.stringify({ stack: 'Error\n  at foo (bar.js:1:1)\n  at baz (qux.js:2:2)', code: 500 })
        : level === 'debug'
          ? JSON.stringify({ key: 'value', count: i })
          : null
    logs.push({
      id: 'log-' + (count - i) + '-' + i,
      level,
      scope,
      message,
      payload,
      createdAt
    })
  }
  // 按时间降序
  logs.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return logs
}

/** mock 日志总池（模块级缓存，模拟 SQLite 中的 app_logs 表） */
const MOCK_LOG_POOL = generateMockLogs(237)

/** 按时间范围过滤 */
function filterByTimeRange(logs: LogRow[], range: string): LogRow[] {
  if (!range) return logs
  const now = Date.now()
  let since = 0
  if (range === '1h') since = now - 60 * 60 * 1000
  else if (range === '24h') since = now - 24 * 60 * 60 * 1000
  else if (range === '7d') since = now - 7 * 24 * 60 * 60 * 1000
  return logs.filter((log) => new Date(log.createdAt).getTime() >= since)
}

/** 将 ISO 时间格式化为本地可读格式 */
function formatTime(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso || '-'
  const pad = (n: number): string => (n < 10 ? '0' + n : String(n))
  return (
    d.getFullYear() +
    '-' +
    pad(d.getMonth() + 1) +
    '-' +
    pad(d.getDate()) +
    ' ' +
    pad(d.getHours()) +
    ':' +
    pad(d.getMinutes()) +
    ':' +
    pad(d.getSeconds())
  )
}

/**
 * 模拟日志列表查询。
 * TODO: 替换为 logClient.list(input) 调用，走 IPC → LogRepository.list。
 */
async function fetchLogs(input: LogListInput): Promise<LogListOutput> {
  // 模拟网络延迟
  await new Promise((resolve) => setTimeout(resolve, 120))
  let items = MOCK_LOG_POOL.slice()
  // 级别过滤
  if (input.level) {
    items = items.filter((log) => log.level === input.level)
  }
  // 关键词过滤（匹配 message 或 scope）
  if (input.keyword) {
    const kw = input.keyword.toLowerCase()
    items = items.filter(
      (log) => log.message.toLowerCase().includes(kw) || log.scope.toLowerCase().includes(kw)
    )
  }
  // 时间范围过滤
  items = filterByTimeRange(items, input.timeRange)
  const total = items.length
  const start = (input.page - 1) * input.pageSize
  const end = start + input.pageSize
  items = items.slice(start, end)
  return { items, total, page: input.page, pageSize: input.pageSize }
}

export const LogViewerPage: ComponentOptions = {
  name: 'LogViewerPage',
  components: {
    FluentPage,
    FluentCard,
    FluentButton,
    FluentInput,
    FluentSelect,
    FluentBadge,
    FluentTable,
    FluentPagination
  },
  props: {
    params: { type: Object, default: () => ({}) },
    query: { type: Object, default: () => ({}) },
    meta: { type: Object, default: () => ({}) },
    route: { type: Object, default: () => ({}) }
  },
  setup() {
    const toast = useToast()

    // 筛选状态
    const filterLevel = Vue.ref<LogLevel | ''>('')
    const keyword = Vue.ref('')
    const timeRange = Vue.ref('')

    // 分页状态
    const currentPage = Vue.ref(1)
    const pageSize = Vue.ref(20)
    const total = Vue.ref(0)

    // 选中行（用于详情展开）
    const selectedRow = Vue.ref<LogRow | null>(null)

    // 自动刷新
    const autoRefresh = Vue.ref(false)
    let autoRefreshTimer: ReturnType<typeof setInterval> | null = null

    // 使用 useIpcRequest 包装查询（当前为 mock，待 IPC 就绪后替换 fetchLogs）
    const ipcRequest = useIpcRequest<LogListOutput, LogListInput>(fetchLogs)

    /** 表格数据 */
    const logs = Vue.computed<LogRow[]>(() => {
      const data = ipcRequest.data.value
      return data ? data.items : []
    })

    const loading = Vue.computed(() => ipcRequest.loading.value)
    const errorMsg = Vue.computed(() => {
      const err = ipcRequest.error.value
      if (!err) return ''
      return err.message || String(err)
    })

    /** 构建查询输入 */
    function buildInput(): LogListInput {
      return {
        page: currentPage.value,
        pageSize: pageSize.value,
        level: filterLevel.value,
        keyword: keyword.value.trim(),
        timeRange: timeRange.value
      }
    }

    /** 加载数据 */
    async function load(): Promise<void> {
      try {
        const result = await ipcRequest.execute(buildInput())
        total.value = result.total
      } catch (err) {
        toast.error('加载失败', err instanceof Error ? err.message : '未知错误')
      }
    }

    /** 刷新 */
    async function handleRefresh(): Promise<void> {
      await load()
      toast.info('已刷新', '日志列表已更新')
    }

    /** 级别筛选变化 */
    async function handleLevelChange(value: string | number): Promise<void> {
      filterLevel.value = value as LogLevel | ''
      currentPage.value = 1
      selectedRow.value = null
      await load()
    }

    /** 时间范围变化 */
    async function handleTimeRangeChange(value: string | number): Promise<void> {
      timeRange.value = String(value)
      currentPage.value = 1
      selectedRow.value = null
      await load()
    }

    /** 关键词搜索（回车 / 搜索按钮触发） */
    async function handleSearch(): Promise<void> {
      currentPage.value = 1
      selectedRow.value = null
      await load()
    }

    /** 分页变化（page, pageSize） */
    async function handlePageChange(page: number, size: number): Promise<void> {
      currentPage.value = page
      pageSize.value = size
      selectedRow.value = null
      await load()
    }

    /** 每页条数变化 */
    async function handleSizeChange(size: number): Promise<void> {
      pageSize.value = size
      currentPage.value = 1
      selectedRow.value = null
      await load()
    }

    /** 行点击：展开 / 收起详情 */
    function handleRowClick(row: Record<string, unknown>): void {
      const log = row as unknown as LogRow
      // 同一行再次点击则收起
      if (selectedRow.value && selectedRow.value.id === log.id) {
        selectedRow.value = null
      } else {
        selectedRow.value = log
      }
    }

    /** 切换自动刷新 */
    function handleToggleAutoRefresh(): void {
      autoRefresh.value = !autoRefresh.value
      if (autoRefresh.value) {
        autoRefreshTimer = setInterval(() => {
          void load()
        }, AUTO_REFRESH_INTERVAL_MS)
        toast.info('自动刷新已开启', '每 10 秒刷新一次')
      } else {
        if (autoRefreshTimer) {
          clearInterval(autoRefreshTimer)
          autoRefreshTimer = null
        }
        toast.info('自动刷新已关闭', '')
      }
    }

    /** 关闭详情面板 */
    function handleCloseDetail(): void {
      selectedRow.value = null
    }

    /** 解析 payload 为可显示文本 */
    function formatPayload(payload: string | null): string {
      if (!payload) return '无'
      try {
        const obj = JSON.parse(payload)
        return JSON.stringify(obj, null, 2)
      } catch {
        return payload
      }
    }

    /** 提取 stack 信息（error 级别日志的 payload 可能包含 stack） */
    function extractStack(payload: string | null): string {
      if (!payload) return ''
      try {
        const obj = JSON.parse(payload)
        if (obj && typeof obj === 'object' && 'stack' in obj) {
          return String((obj as { stack: unknown }).stack)
        }
      } catch {
        // 忽略解析错误
      }
      return ''
    }

    // 关键词清空时自动触发搜索（FluentInput clearable 会将 modelValue 置空）
    Vue.watch(keyword, (newVal, oldVal) => {
      if (oldVal && !newVal) {
        void handleSearch()
      }
    })

    // 表格列定义
    const columns: FluentTableColumn[] = [
      {
        key: 'createdAt',
        title: '时间',
        width: '180px',
        render: (row: Record<string, unknown>): string => {
          const time = String(row.createdAt ?? '')
          const formatted = time ? formatTime(time) : '-'
          return (
            '<span class="text-xs text-[var(--xb-text-secondary)] tabular-nums">' +
            escapeHtml(formatted) +
            '</span>'
          )
        }
      },
      {
        key: 'level',
        title: '级别',
        width: '100px',
        render: (row: Record<string, unknown>): string => {
          const level = row.level as LogLevel
          const text = levelTextMap[level] || escapeHtml(String(row.level))
          const color = levelColorMap[level] || levelColorMap.debug
          return (
            '<span class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium" style="background:' +
            color.bg +
            ';color:' +
            color.text +
            '">' +
            text +
            '</span>'
          )
        }
      },
      {
        key: 'scope',
        title: '来源',
        width: '120px',
        render: (row: Record<string, unknown>): string => {
          const scope = String(row.scope ?? '')
          return (
            '<span class="text-xs text-[var(--xb-text-secondary)] font-mono">' +
            escapeHtml(scope || '-') +
            '</span>'
          )
        }
      },
      {
        key: 'message',
        title: '消息',
        render: (row: Record<string, unknown>): string => {
          const message = String(row.message ?? '')
          return (
            '<span class="text-sm text-[var(--xb-text-primary)]">' + escapeHtml(message) + '</span>'
          )
        }
      }
    ]

    // 初始加载
    Vue.onMounted(() => {
      void load()
    })

    // 卸载时清理自动刷新定时器
    Vue.onBeforeUnmount(() => {
      if (autoRefreshTimer) {
        clearInterval(autoRefreshTimer)
        autoRefreshTimer = null
      }
    })

    return {
      logs,
      loading,
      errorMsg,
      columns,
      filterLevel,
      keyword,
      timeRange,
      levelOptions,
      timeRangeOptions,
      currentPage,
      pageSize,
      total,
      selectedRow,
      autoRefresh,
      levelBadgeVariantMap,
      handleRefresh,
      handleLevelChange,
      handleTimeRangeChange,
      handleSearch,
      handlePageChange,
      handleSizeChange,
      handleRowClick,
      handleToggleAutoRefresh,
      handleCloseDetail,
      formatPayload,
      extractStack,
      formatTime
    }
  },
  template: `
    <FluentPage title="日志查看器" description="查看应用运行日志，支持级别筛选、关键词搜索与时间范围">
      <template #actions>
        <FluentButton
          :variant="autoRefresh ? 'primary' : 'subtle'"
          icon="clock"
          size="small"
          @click="handleToggleAutoRefresh"
        >{{ autoRefresh ? '停止自动刷新' : '自动刷新' }}</FluentButton>
        <FluentButton variant="subtle" icon="refresh" size="small" @click="handleRefresh">刷新</FluentButton>
      </template>

      <!-- 筛选栏 -->
      <div class="flex items-center gap-3 mb-4 flex-wrap">
        <div class="flex items-center gap-2">
          <span class="text-sm text-[var(--xb-text-secondary)]">级别：</span>
          <div class="w-32">
            <FluentSelect
              :model-value="filterLevel"
              :options="levelOptions"
              size="small"
              @update:model-value="handleLevelChange"
            />
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-sm text-[var(--xb-text-secondary)]">时间：</span>
          <div class="w-36">
            <FluentSelect
              :model-value="timeRange"
              :options="timeRangeOptions"
              size="small"
              @update:model-value="handleTimeRangeChange"
            />
          </div>
        </div>
        <div class="flex items-center gap-2 flex-1 min-w-[240px]">
          <span class="text-sm text-[var(--xb-text-secondary)]">关键词：</span>
          <div class="flex-1">
            <FluentInput
              v-model="keyword"
              type="search"
              placeholder="搜索消息或来源"
              size="small"
              clearable
              @enter="handleSearch"
            />
          </div>
          <FluentButton variant="secondary" size="small" icon="search" @click="handleSearch">搜索</FluentButton>
        </div>
      </div>

      <!-- 表格 -->
      <FluentTable
        :columns="columns"
        :data="logs"
        row-key="id"
        :loading="loading"
        :error="errorMsg"
        @refresh="handleRefresh"
        @row-click="handleRowClick"
      />

      <!-- 分页 -->
      <div class="mt-4 flex justify-end">
        <FluentPagination
          :current="currentPage"
          :page-size="pageSize"
          :total="total"
          @change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>

      <!-- 详情面板（点击行展开） -->
      <div v-if="selectedRow" class="mt-4">
        <FluentCard title="日志详情" :subtitle="selectedRow.id">
          <template #actions>
            <FluentButton variant="subtle" size="small" icon="close" @click="handleCloseDetail">关闭</FluentButton>
          </template>
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div class="text-xs text-[var(--xb-text-tertiary)] mb-1">时间</div>
                <div class="text-[var(--xb-text-primary)] tabular-nums">{{ formatTime(selectedRow.createdAt) }}</div>
              </div>
              <div>
                <div class="text-xs text-[var(--xb-text-tertiary)] mb-1">级别</div>
                <div>
                  <FluentBadge :variant="levelBadgeVariantMap[selectedRow.level]" dot>{{ selectedRow.level.toUpperCase() }}</FluentBadge>
                </div>
              </div>
              <div>
                <div class="text-xs text-[var(--xb-text-tertiary)] mb-1">来源</div>
                <div class="text-[var(--xb-text-primary)] font-mono">{{ selectedRow.scope || '-' }}</div>
              </div>
              <div>
                <div class="text-xs text-[var(--xb-text-tertiary)] mb-1">ID</div>
                <div class="text-[var(--xb-text-primary)] font-mono text-xs">{{ selectedRow.id }}</div>
              </div>
            </div>
            <div>
              <div class="text-xs text-[var(--xb-text-tertiary)] mb-1">消息</div>
              <div class="text-sm text-[var(--xb-text-primary)]">{{ selectedRow.message }}</div>
            </div>
            <div>
              <div class="text-xs text-[var(--xb-text-tertiary)] mb-1">Payload</div>
              <pre class="rounded-[var(--xb-radius-md)] bg-[var(--xb-bg-subtle)] border border-[var(--xb-border-subtle)] p-3 text-xs font-mono text-[var(--xb-text-secondary)] overflow-x-auto whitespace-pre-wrap">{{ formatPayload(selectedRow.payload) }}</pre>
            </div>
            <div v-if="extractStack(selectedRow.payload)">
              <div class="text-xs text-[var(--xb-text-tertiary)] mb-1">Stack</div>
              <pre class="rounded-[var(--xb-radius-md)] bg-[var(--xb-error-subtle)] border border-[var(--xb-border-subtle)] p-3 text-xs font-mono text-[var(--xb-error)] overflow-x-auto whitespace-pre-wrap">{{ extractStack(selectedRow.payload) }}</pre>
            </div>
          </div>
        </FluentCard>
      </div>
    </FluentPage>
  `
}
