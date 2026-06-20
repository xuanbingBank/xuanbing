/**
 * @file 仪表盘页，展示应用概览统计与快捷操作入口。
 */

import type { ComponentOptions } from '../vue-global'
import type { CurrentRoute, RouteMeta } from '../router/types'
import { PageContainer } from '../components/base/PageContainer'
import { BaseCard } from '../components/base/BaseCard'
import { BaseButton } from '../components/base/BaseButton'
import { useOpenWindow } from '../composables/useOpenWindow'

/** 页面 Props */
interface PageProps {
  params: Record<string, string>
  query: Record<string, string>
  meta: RouteMeta
  route: CurrentRoute
}

/** 统计卡片数据 */
interface StatItem {
  label: string
  value: number
  icon: string
  color: string
}

/** 最近活动数据 */
interface ActivityItem {
  id: number
  content: string
  time: string
}

export const DashboardPage: ComponentOptions = {
  name: 'DashboardPage',
  components: { PageContainer, BaseCard, BaseButton },
  props: {
    params: { type: Object, default: () => ({}) },
    query: { type: Object, default: () => ({}) },
    meta: { type: Object, default: () => ({}) },
    route: { type: Object, default: () => ({}) }
  },
  setup() {
    // 统计卡片 mock 数据
    const stats: StatItem[] = [
      { label: '用户数', value: 128, icon: '👤', color: 'text-primary' },
      { label: '任务数', value: 36, icon: '📋', color: 'text-secondary' },
      { label: '日志数', value: 1024, icon: '📜', color: 'text-accent' },
      { label: '窗口数', value: 5, icon: '🪟', color: 'text-info' }
    ]

    // 最近活动 mock 数据
    const activities: ActivityItem[] = [
      { id: 1, content: '用户 admin 登录系统', time: '2 分钟前' },
      { id: 2, content: '任务 task-1024 执行完成', time: '10 分钟前' },
      { id: 3, content: '新增窗口 settings 已打开', time: '30 分钟前' },
      { id: 4, content: '系统配置已更新', time: '1 小时前' },
      { id: 5, content: '日志文件已归档', time: '2 小时前' }
    ]

    const openWindow = useOpenWindow()

    // 快捷操作：打开设置
    function handleOpenSettings(): void {
      void openWindow.openSettings()
    }

    // 快捷操作：打开任务中心
    function handleOpenTaskCenter(): void {
      void openWindow.openTaskCenter()
    }

    // 快捷操作：打开关于
    function handleOpenAbout(): void {
      void openWindow.openAbout()
    }

    return { stats, activities, handleOpenSettings, handleOpenTaskCenter, handleOpenAbout }
  },
  template: `
    <PageContainer title="仪表盘" description="应用概览与快捷操作">
      <!-- 统计卡片 -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <BaseCard v-for="stat in stats" :key="stat.label" compact>
          <div class="flex items-center gap-4">
            <div class="text-4xl">{{ stat.icon }}</div>
            <div>
              <div class="text-2xl font-bold" :class="stat.color">{{ stat.value }}</div>
              <div class="text-sm text-base-content/60">{{ stat.label }}</div>
            </div>
          </div>
        </BaseCard>
      </div>

      <!-- 快捷操作 -->
      <BaseCard title="快捷操作" class="mb-6">
        <div class="flex flex-wrap gap-2">
          <BaseButton variant="primary" left-icon="⚙️" @click="handleOpenSettings">打开设置</BaseButton>
          <BaseButton variant="secondary" left-icon="📋" @click="handleOpenTaskCenter">打开任务中心</BaseButton>
          <BaseButton variant="accent" left-icon="ℹ️" @click="handleOpenAbout">打开关于</BaseButton>
        </div>
      </BaseCard>

      <!-- 最近活动 -->
      <BaseCard title="最近活动">
        <ul class="space-y-3">
          <li v-for="activity in activities" :key="activity.id" class="flex items-start gap-3">
            <span class="w-2 h-2 rounded-full bg-primary mt-2 shrink-0"></span>
            <div class="flex-1">
              <p class="text-sm">{{ activity.content }}</p>
              <p class="text-xs text-base-content/40">{{ activity.time }}</p>
            </div>
          </li>
        </ul>
      </BaseCard>
    </PageContainer>
  `
}
