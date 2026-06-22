/**
 * @file 任务详情页，展示单个任务的详细信息与进度。
 */

import type { ComponentOptions } from '../vue-global'
import type { CurrentRoute, RouteMeta } from '../router/types'
import { PageContainer } from '../components/base/PageContainer'
import { BaseCard } from '../components/base/BaseCard'
import { BaseButton } from '../components/base/BaseButton'
import { useToast } from '../composables/useToast'

/** 页面 Props */
interface PageProps {
  params: Record<string, string>
  query: Record<string, string>
  meta: RouteMeta
  route: CurrentRoute
}

export const TaskDetailPage: ComponentOptions = {
  name: 'TaskDetailPage',
  components: { PageContainer, BaseCard, BaseButton },
  props: {
    params: { type: Object, default: () => ({}) },
    query: { type: Object, default: () => ({}) },
    meta: { type: Object, default: () => ({}) },
    route: { type: Object, default: () => ({}) }
  },
  setup(props) {
    const p = props as unknown as PageProps
    const toast = useToast()

    // 任务 ID
    const taskId = Vue.computed(() => p.params.id || 'unknown')

    // 任务详情 mock 数据
    const task = Vue.ref({
      taskId: p.params.id || 'unknown',
      name: '数据同步任务',
      status: 'running',
      progress: 65,
      createdAt: '2026-06-20 09:30',
      owner: 'admin',
      description: '将本地数据同步到远程服务器，包含全量与增量两个阶段。'
    })

    // 返回
    function handleBack(): void {
      window.history.back()
    }

    // 取消任务
    function handleCancel(): void {
      toast.warning('已取消', '任务 ' + taskId.value + ' 已取消')
    }

    return { taskId, task, handleBack, handleCancel }
  },
  template: `
    <PageContainer title="任务详情">
      <BaseCard :title="'任务 ' + taskId">
        <div class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p class="text-xs text-base-content/50">任务名称</p>
              <p class="text-sm font-medium">{{ task.name }}</p>
            </div>
            <div>
              <p class="text-xs text-base-content/50">状态</p>
              <p class="text-sm font-medium">{{ task.status }}</p>
            </div>
            <div>
              <p class="text-xs text-base-content/50">创建时间</p>
              <p class="text-sm font-medium">{{ task.createdAt }}</p>
            </div>
            <div>
              <p class="text-xs text-base-content/50">负责人</p>
              <p class="text-sm font-medium">{{ task.owner }}</p>
            </div>
          </div>
          <div>
            <p class="text-xs text-base-content/50 mb-1">描述</p>
            <p class="text-sm">{{ task.description }}</p>
          </div>
          <div>
            <p class="text-xs text-base-content/50 mb-1">进度</p>
            <progress class="progress progress-primary w-full" :value="task.progress" max="100"></progress>
            <p class="text-xs text-base-content/50 mt-1">{{ task.progress }}%</p>
          </div>
          <div class="flex gap-2 pt-2">
            <BaseButton variant="ghost" @click="handleBack">返回</BaseButton>
            <BaseButton variant="error" @click="handleCancel">取消任务</BaseButton>
          </div>
        </div>
      </BaseCard>
    </PageContainer>
  `
}
