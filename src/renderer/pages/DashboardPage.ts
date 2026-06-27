/**
 * @file 仪表盘页（Fluent 风格），展示应用概览统计与快捷操作入口。
 */

import type { ComponentOptions } from '../vue-global'
import type { CurrentRoute, RouteMeta } from '../router/types'
import { FluentPage } from '../components/layout/FluentPage'
import { FluentCard } from '../components/base/FluentCard'
import { FluentButton } from '../components/base/FluentButton'
import { FluentStatCard } from '../components/data/FluentStatCard'
import type { FluentStatColor, FluentStatTrend } from '../components/data/FluentStatCard'
import { FluentIcon } from '../components/base/FluentIcon'
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
  unit: string
  icon: string
  color: FluentStatColor
  trend: FluentStatTrend
  trendValue: string
  trendLabel: string
}

/** 最近活动数据 */
interface ActivityItem {
  id: number
  content: string
  time: string
  icon: string
}

export const DashboardPage: ComponentOptions = {
  name: 'DashboardPage',
  components: { FluentPage, FluentCard, FluentButton, FluentStatCard, FluentIcon },
  props: {
    params: { type: Object, default: () => ({}) },
    query: { type: Object, default: () => ({}) },
    meta: { type: Object, default: () => ({}) },
    route: { type: Object, default: () => ({}) }
  },
  setup() {
    // TODO: mock 数据,待接入真实数据源
    // 统计卡片 mock 数据
    const stats: StatItem[] = [
      {
        label: '用户数',
        value: 128,
        unit: '人',
        icon: 'user',
        color: 'brand',
        trend: 'up',
        trendValue: '12%',
        trendLabel: '较上月'
      },
      {
        label: '任务数',
        value: 36,
        unit: '个',
        icon: 'task',
        color: 'success',
        trend: 'up',
        trendValue: '8%',
        trendLabel: '较上周'
      },
      {
        label: '日志数',
        value: 1024,
        unit: '条',
        icon: 'log',
        color: 'info',
        trend: 'flat',
        trendValue: '0%',
        trendLabel: '较昨日'
      },
      {
        label: '窗口数',
        value: 5,
        unit: '个',
        icon: 'window',
        color: 'warning',
        trend: 'down',
        trendValue: '2%',
        trendLabel: '较昨日'
      }
    ]

    // 最近活动 mock 数据
    const activities: ActivityItem[] = [
      { id: 1, content: '用户 admin 登录系统', time: '2 分钟前', icon: 'user' },
      { id: 2, content: '任务 task-1024 执行完成', time: '10 分钟前', icon: 'check' },
      { id: 3, content: '新增窗口 settings 已打开', time: '30 分钟前', icon: 'window' },
      { id: 4, content: '系统配置已更新', time: '1 小时前', icon: 'settings' },
      { id: 5, content: '日志文件已归档', time: '2 小时前', icon: 'folder' }
    ]

    const openWindow = useOpenWindow()

    function handleOpenSettings(): void {
      void openWindow.openSettings()
    }

    function handleOpenTaskCenter(): void {
      void openWindow.openTaskCenter()
    }

    function handleOpenAbout(): void {
      void openWindow.openAbout()
    }

    return { stats, activities, handleOpenSettings, handleOpenTaskCenter, handleOpenAbout }
  },
  template: `
    <FluentPage title="仪表盘" description="应用概览与快捷操作">
      <!-- 统计卡片 -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <FluentStatCard
          v-for="stat in stats"
          :key="stat.label"
          :label="stat.label"
          :value="stat.value"
          :unit="stat.unit"
          :icon="stat.icon"
          :color="stat.color"
          :trend="stat.trend"
          :trend-value="stat.trendValue"
          :trend-label="stat.trendLabel"
        />
      </div>

      <!-- 快捷操作 -->
      <FluentCard title="快捷操作" class="mb-6">
        <div class="flex flex-wrap gap-2">
          <FluentButton variant="primary" icon="settings" @click="handleOpenSettings">打开设置</FluentButton>
          <FluentButton variant="secondary" icon="task" @click="handleOpenTaskCenter">打开任务中心</FluentButton>
          <FluentButton variant="secondary" icon="info" @click="handleOpenAbout">打开关于</FluentButton>
        </div>
      </FluentCard>

      <!-- 最近活动 -->
      <FluentCard title="最近活动">
        <ul class="space-y-3">
          <li v-for="activity in activities" :key="activity.id" class="flex items-start gap-3">
            <div class="w-7 h-7 rounded-full bg-[var(--xb-bg-hover)] flex items-center justify-center shrink-0">
              <FluentIcon :name="activity.icon" :size="14" class="text-[var(--xb-text-secondary)]" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm text-[var(--xb-text-primary)]">{{ activity.content }}</p>
              <p class="text-xs text-[var(--xb-text-tertiary)] mt-0.5">{{ activity.time }}</p>
            </div>
          </li>
        </ul>
      </FluentCard>
    </FluentPage>
  `
}
