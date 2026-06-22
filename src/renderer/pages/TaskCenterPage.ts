/**
 * @file 任务中心页（Fluent 风格），从 SQLite 持久化加载任务列表，支持创建、取消、导入导出。
 *
 * 数据流：
 * renderer client → preload API → IPC Bus → service → repository → SQLite
 */

import type { ComponentOptions } from '../vue-global'
import type { CurrentRoute, RouteMeta } from '../router/types'
import { FluentPage } from '../components/layout/FluentPage'
import { FluentButton } from '../components/base/FluentButton'
import { FluentTable } from '../components/data/FluentTable'
import type { FluentTableColumn } from '../components/data/FluentTable'
import { FluentSelect } from '../components/base/FluentSelect'
import { useToast } from '../composables/useToast'
import { taskClient } from '../services/task.client'
import { xuanbingFileClient } from '../services/xuanbing-file.client'
import { useCachedQuery } from '../composables/useCachedQuery'
import { clearByNamespace } from '../cache/cache-store'
import type { TaskDataItem, TaskDataListOutput } from '../../../electron/ipcBus/renderer/desktop-api'

/** 页面 Props */
interface PageProps {
  params: Record<string, string>
  query: Record<string, string>
  meta: RouteMeta
  route: CurrentRoute
}

/** 任务状态（UI 层） */
type TaskStatus = 'pending' | 'running' | 'success' | 'failed' | 'canceled'

/** 状态到中文文案映射 */
const statusTextMap: Record<TaskStatus, string> = {
  pending: '待执行',
  running: '运行中',
  success: '已完成',
  failed: '已失败',
  canceled: '已取消'
}

/** 状态到颜色 token 映射 */
const statusColorMap: Record<TaskStatus, { bg: string; text: string }> = {
  pending: { bg: 'var(--xb-warning-subtle)', text: 'var(--xb-warning)' },
  running: { bg: 'var(--xb-info-subtle)', text: 'var(--xb-info)' },
  success: { bg: 'var(--xb-success-subtle)', text: 'var(--xb-success)' },
  failed: { bg: 'var(--xb-error-subtle)', text: 'var(--xb-error)' },
  canceled: { bg: 'var(--xb-bg-hover)', text: 'var(--xb-text-tertiary)' }
}

/** 缓存命名空间 */
const CACHE_NAMESPACE = 'task-center'
const CACHE_KEY = 'task-list'

/** 将 TaskDataItem 映射为表格行 */
function toTableRow(task: TaskDataItem): Record<string, unknown> {
  return {
    taskId: task.id,
    name: task.title,
    type: task.type,
    status: task.status,
    progress: task.progress,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt
  }
}

export const TaskCenterPage: ComponentOptions = {
  name: 'TaskCenterPage',
  components: { FluentPage, FluentButton, FluentTable, FluentSelect },
  props: {
    params: { type: Object, default: () => ({}) },
    query: { type: Object, default: () => ({}) },
    meta: { type: Object, default: () => ({}) },
    route: { type: Object, default: () => ({}) }
  },
  setup() {
    const toast = useToast()

    // 筛选状态
    const filterStatus = Vue.ref<string>('')

    // 状态筛选选项
    const statusOptions = [
      { label: '全部', value: '' },
      { label: '待执行', value: 'pending' },
      { label: '运行中', value: 'running' },
      { label: '已完成', value: 'success' },
      { label: '已失败', value: 'failed' },
      { label: '已取消', value: 'canceled' }
    ]

    // 通过 useCachedQuery 实现缓存查询
    const cachedQuery = useCachedQuery<TaskDataListOutput>(
      CACHE_NAMESPACE,
      CACHE_KEY,
      () =>
        taskClient.list({
          page: undefined,
          pageSize: undefined,
          status: filterStatus.value || undefined,
          type: undefined
        }),
      {
        strategy: 'staleWhileRevalidate',
        policy: { ttlMs: 60 * 1000, staleMs: 5 * 60 * 1000, version: 1, tags: ['tasks'] }
      }
    )

    // 表格数据
    const tasks = Vue.computed(() => {
      const data = cachedQuery.data.value
      if (!data) return []
      return data.items.map(toTableRow)
    })

    const loading = Vue.computed(() => cachedQuery.loading.value || cachedQuery.refreshing.value)
    const errorMsg = Vue.computed(() => {
      const err = cachedQuery.error.value
      return err ? (err instanceof Error ? err.message : String(err)) : ''
    })

    // 表格列定义
    const columns: FluentTableColumn[] = [
      { key: 'taskId', title: '任务ID', width: '140px' },
      { key: 'name', title: '名称' },
      { key: 'type', title: '类型', width: '100px' },
      {
        key: 'status',
        title: '状态',
        width: '110px',
        render: (row: Record<string, unknown>): string => {
          const status = row.status as TaskStatus
          const text = statusTextMap[status] || status
          const color = statusColorMap[status] || statusColorMap.pending
          return (
            '<span class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style="background:' +
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
        key: 'progress',
        title: '进度',
        width: '180px',
        render: (row: Record<string, unknown>): string => {
          const progress = row.progress as number
          return (
            '<div class="flex items-center gap-2"><div class="flex-1 h-1.5 rounded-full bg-[var(--xb-bg-hover)] overflow-hidden"><div class="h-full rounded-full bg-[var(--xb-brand)] transition-all" style="width:' +
            progress +
            '%"></div></div><span class="text-xs text-[var(--xb-text-tertiary)] tabular-nums w-9">' +
            progress +
            '%</span></div>'
          )
        }
      },
      { key: 'createdAt', title: '创建时间', width: '180px' }
    ]

    // 初始加载
    Vue.onMounted(() => {
      void cachedQuery.execute().catch((err) => {
        toast.error('加载失败', err instanceof Error ? err.message : '未知错误')
      })
    })

    // 新建任务
    async function handleCreate(): Promise<void> {
      try {
        const taskName = '任务-' + Date.now()
        await taskClient.create({
          id: undefined,
          type: 'manual',
          title: taskName,
          status: 'pending',
          progress: 0,
          input: undefined
        })
        toast.success('创建成功', '任务 ' + taskName + ' 已创建')
        await cachedQuery.refresh()
      } catch (err) {
        toast.error('创建失败', err instanceof Error ? err.message : '未知错误')
      }
    }

    // 取消任务
    async function handleCancel(row: Record<string, unknown>): Promise<void> {
      const taskId = String(row.taskId)
      try {
        await taskClient.update({
          id: taskId,
          status: 'canceled',
          progress: row.progress as number,
          output: undefined,
          error: undefined
        })
        toast.warning('已取消', '任务 ' + taskId + ' 已取消')
        await cachedQuery.refresh()
      } catch (err) {
        toast.error('取消失败', err instanceof Error ? err.message : '未知错误')
      }
    }

    // 删除任务
    async function handleDelete(row: Record<string, unknown>): Promise<void> {
      const taskId = String(row.taskId)
      try {
        await taskClient.delete(taskId)
        toast.success('删除成功', '任务 ' + taskId + ' 已删除')
        await cachedQuery.refresh()
      } catch (err) {
        toast.error('删除失败', err instanceof Error ? err.message : '未知错误')
      }
    }

    // 筛选变化
    async function handleFilterChange(value: string): Promise<void> {
      filterStatus.value = value
      await cachedQuery.refresh()
    }

    // 导出
    async function handleExport(): Promise<void> {
      try {
        const dialogResult = await xuanbingFileClient.saveDialog()
        if (dialogResult.canceled || !dialogResult.fileRef) return
        toast.info('导出中', '正在导出任务数据...')
        const result = await xuanbingFileClient.exportPackage({
          fileRef: dialogResult.fileRef,
          type: 'task-export',
          metadata: {
            name: 'task-export',
            description: 'Task Center export',
            author: 'local',
            tags: ['tasks']
          },
          redact: false
        })
        toast.success('导出成功', '已导出 ' + result.size + ' 字节')
      } catch (err) {
        toast.error('导出失败', err instanceof Error ? err.message : '未知错误')
      }
    }

    // 导入
    async function handleImport(): Promise<void> {
      try {
        const dialogResult = await xuanbingFileClient.openDialog()
        if (dialogResult.canceled || !dialogResult.fileRef) return
        const fileRef = dialogResult.fileRef
        toast.info('分析中', '正在分析导入文件...')
        const plan = await xuanbingFileClient.dryRunImport({
          fileRef,
          conflictStrategy: 'skip'
        })
        if (plan.summary.error > 0) {
          toast.error('导入错误', '文件包含 ' + plan.summary.error + ' 个错误项')
          return
        }
        if (plan.summary.total === 0) {
          toast.warning('无数据', '文件中没有可导入的任务')
          return
        }
        toast.info('导入中', '正在导入 ' + plan.summary.create + ' 个任务...')
        const result = await xuanbingFileClient.importPackage({ fileRef, plan })
        if (result.success) {
          toast.success('导入成功', '已导入 ' + result.imported + ' 个任务')
          await cachedQuery.refresh()
        } else {
          toast.error('导入失败', '导入已回滚：' + result.errors.map((e) => e.message).join(', '))
        }
      } catch (err) {
        toast.error('导入失败', err instanceof Error ? err.message : '未知错误')
      }
    }

    // 刷新
    async function handleRefresh(): Promise<void> {
      await cachedQuery.refresh()
      toast.info('已刷新', '任务列表已更新')
    }

    // 清除缓存
    async function handleClearCache(): Promise<void> {
      await clearByNamespace(CACHE_NAMESPACE)
      toast.info('缓存已清除', '下次查询将从 SQLite 重新加载')
    }

    return {
      tasks,
      loading,
      errorMsg,
      columns,
      filterStatus,
      statusOptions,
      handleCreate,
      handleCancel,
      handleDelete,
      handleFilterChange,
      handleExport,
      handleImport,
      handleRefresh,
      handleClearCache
    }
  },
  template: `
    <FluentPage title="任务中心" description="任务管理与导入导出">
      <template #actions>
        <FluentButton variant="primary" icon="plus" @click="handleCreate">新建任务</FluentButton>
        <FluentButton variant="secondary" icon="upload" @click="handleExport">导出</FluentButton>
        <FluentButton variant="secondary" icon="download" @click="handleImport">导入</FluentButton>
        <FluentButton variant="subtle" icon="refresh" @click="handleRefresh">刷新</FluentButton>
      </template>

      <!-- 筛选栏 -->
      <div class="flex items-center gap-3 mb-4 flex-wrap">
        <div class="flex items-center gap-2">
          <span class="text-sm text-[var(--xb-text-secondary)]">状态筛选：</span>
          <div class="w-40">
            <FluentSelect
              :model-value="filterStatus"
              :options="statusOptions"
              size="small"
              @update:model-value="handleFilterChange"
            />
          </div>
        </div>
        <FluentButton variant="subtle" size="small" icon="delete" @click="handleClearCache">清除缓存</FluentButton>
      </div>

      <!-- 表格 -->
      <FluentTable
        :columns="columns"
        :data="tasks"
        row-key="taskId"
        :loading="loading"
        :error="errorMsg"
        @refresh="handleRefresh"
      />
    </FluentPage>
  `
}
