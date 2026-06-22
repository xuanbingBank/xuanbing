/**
 * @file 设置页（Fluent 风格），提供通用设置、通知设置与关于信息。
 */

import type { ComponentOptions } from '../vue-global'
import type { CurrentRoute, RouteMeta } from '../router/types'
import { FluentPage } from '../components/layout/FluentPage'
import { FluentCard } from '../components/base/FluentCard'
import { FluentButton } from '../components/base/FluentButton'
import { FluentSelect } from '../components/base/FluentSelect'
import { FluentSwitch } from '../components/base/FluentSwitch'
import { FluentFormField } from '../components/form/FluentFormField'
import { FluentFormActions } from '../components/form/FluentFormActions'
import { FluentBadge } from '../components/base/FluentBadge'
import { useThemeStore } from '../stores/theme.store'
import { useLayoutStore } from '../stores/layout.store'
import { useToast } from '../composables/useToast'
import { useDatabaseHealth } from '../composables/useDatabaseHealth'
import { databaseClient } from '../services/database.client'
import type { ThemeName } from '../constants'

/** 页面 Props */
interface PageProps {
  params: Record<string, string>
  query: Record<string, string>
  meta: RouteMeta
  route: CurrentRoute
}

export const SettingsPage: ComponentOptions = {
  name: 'SettingsPage',
  components: {
    FluentPage,
    FluentCard,
    FluentButton,
    FluentSelect,
    FluentSwitch,
    FluentFormField,
    FluentFormActions,
    FluentBadge
  },
  props: {
    params: { type: Object, default: () => ({}) },
    query: { type: Object, default: () => ({}) },
    meta: { type: Object, default: () => ({}) },
    route: { type: Object, default: () => ({}) }
  },
  setup() {
    const themeStore = useThemeStore()
    const layoutStore = useLayoutStore()
    const toast = useToast()
    const dbHealth = useDatabaseHealth()

    const currentTheme = Vue.computed(() => themeStore.currentTheme.value as string)
    const themeOptions = themeStore.availableThemes.map((t) => ({
      label: t.label,
      value: t.value
    }))
    const sidebarCollapsed = Vue.computed(() => layoutStore.state.sidebarCollapsed)

    const desktopNotify = Vue.ref(true)
    const soundNotify = Vue.ref(false)
    const autoUpdate = Vue.ref(true)

    function handleThemeChange(value: string): void {
      themeStore.setTheme(value as ThemeName)
    }

    function handleSidebarChange(value: boolean): void {
      layoutStore.setSidebarCollapsed(value)
    }

    function handleSave(): void {
      toast.success('保存成功', '设置已更新')
    }

    async function handleCheckHealth(): Promise<void> {
      await dbHealth.refresh()
      if (dbHealth.isHealthy.value) {
        toast.success('数据库正常', 'SQLite 健康检查通过')
      } else {
        toast.error('数据库异常', dbHealth.error.value?.message ?? '健康检查失败')
      }
    }

    async function handleBackup(): Promise<void> {
      try {
        toast.info('备份中', '正在创建数据库备份...')
        const result = await databaseClient.backup()
        toast.success('备份成功', '已创建备份：' + result.backupName)
      } catch (err) {
        toast.error('备份失败', err instanceof Error ? err.message : '未知错误')
      }
    }

    async function handleVacuum(): Promise<void> {
      try {
        toast.info('优化中', '正在执行 VACUUM...')
        await databaseClient.vacuum()
        toast.success('优化成功', '数据库已优化')
      } catch (err) {
        toast.error('优化失败', err instanceof Error ? err.message : '未知错误')
      }
    }

    Vue.onMounted(() => {
      void dbHealth.refresh()
    })

    return {
      currentTheme,
      themeOptions,
      sidebarCollapsed,
      desktopNotify,
      soundNotify,
      autoUpdate,
      dbHealth,
      handleThemeChange,
      handleSidebarChange,
      handleSave,
      handleCheckHealth,
      handleBackup,
      handleVacuum
    }
  },
  template: `
    <FluentPage title="设置" description="应用偏好与系统维护">
      <div class="space-y-6">
        <!-- 通用设置 -->
        <FluentCard title="通用设置" subtitle="主题与界面偏好">
          <div class="space-y-4">
            <FluentFormField label="主题" hint="选择应用界面主题">
              <FluentSelect
                :model-value="currentTheme"
                :options="themeOptions"
                @update:model-value="handleThemeChange"
              />
            </FluentFormField>
            <FluentFormField label="侧栏折叠" hint="折叠侧栏以获得更大的内容区域">
              <FluentSwitch
                :model-value="sidebarCollapsed"
                label="折叠侧栏"
                @update:model-value="handleSidebarChange"
              />
            </FluentFormField>
          </div>
        </FluentCard>

        <!-- 数据库健康 -->
        <FluentCard title="数据库" subtitle="SQLite 主库健康检查与维护">
          <div class="space-y-4">
            <div v-if="dbHealth.loading.value" class="text-sm text-[var(--xb-text-tertiary)]">检查中...</div>
            <div v-else-if="dbHealth.health.value" class="space-y-3">
              <div class="flex items-center gap-2">
                <FluentBadge :variant="dbHealth.isHealthy.value ? 'success' : 'error'" dot>
                  {{ dbHealth.isHealthy.value ? '正常' : '异常' }}
                </FluentBadge>
                <span class="text-sm text-[var(--xb-text-tertiary)]">Schema v{{ dbHealth.health.value.schemaVersion }}</span>
              </div>
              <div class="grid grid-cols-2 gap-2 text-sm">
                <div class="text-[var(--xb-text-secondary)]">WAL: <span :class="dbHealth.health.value.walEnabled ? 'text-[var(--xb-success)]' : 'text-[var(--xb-error)]'">{{ dbHealth.health.value.walEnabled ? '启用' : '未启用' }}</span></div>
                <div class="text-[var(--xb-text-secondary)]">Migration: <span :class="dbHealth.health.value.migrationLatest ? 'text-[var(--xb-success)]' : 'text-[var(--xb-warning)]'">{{ dbHealth.health.value.migrationLatest ? '最新' : '待迁移' }}</span></div>
                <div class="text-[var(--xb-text-secondary)]">可写: <span :class="dbHealth.health.value.writable ? 'text-[var(--xb-success)]' : 'text-[var(--xb-error)]'">{{ dbHealth.health.value.writable ? '是' : '否' }}</span></div>
                <div class="text-[var(--xb-text-secondary)]">大小: {{ (dbHealth.health.value.dbFileSize / 1024).toFixed(1) }} KB</div>
              </div>
              <div v-if="dbHealth.health.value.issues.length > 0" class="p-3 rounded-[var(--xb-radius-md)] bg-[var(--xb-warning-subtle)] text-sm text-[var(--xb-warning)]">
                <ul class="list-disc list-inside"><li v-for="issue in dbHealth.health.value.issues" :key="issue">{{ issue }}</li></ul>
              </div>
            </div>
            <div v-else-if="dbHealth.error.value" class="p-3 rounded-[var(--xb-radius-md)] bg-[var(--xb-error-subtle)] text-sm text-[var(--xb-error)]">
              {{ dbHealth.error.value.message }}
            </div>
            <div class="flex gap-2">
              <FluentButton variant="secondary" size="small" icon="refresh" @click="handleCheckHealth">检查健康</FluentButton>
              <FluentButton variant="secondary" size="small" icon="download" @click="handleBackup">备份</FluentButton>
              <FluentButton variant="subtle" size="small" @click="handleVacuum">VACUUM</FluentButton>
            </div>
          </div>
        </FluentCard>

        <!-- 通知设置 -->
        <FluentCard title="通知设置" subtitle="消息提醒方式">
          <div class="space-y-4">
            <FluentFormField label="桌面通知">
              <FluentSwitch v-model="desktopNotify" label="启用桌面通知" />
            </FluentFormField>
            <FluentFormField label="声音提醒">
              <FluentSwitch v-model="soundNotify" label="启用声音提醒" />
            </FluentFormField>
            <FluentFormField label="自动更新">
              <FluentSwitch v-model="autoUpdate" label="自动检查更新" />
            </FluentFormField>
          </div>
        </FluentCard>

        <!-- 关于 -->
        <FluentCard title="关于" subtitle="应用信息">
          <p class="text-sm text-[var(--xb-text-tertiary)]">All In One v1.0.0，基于 Electron + Vue 3 + TypeScript 构建。</p>
        </FluentCard>

        <!-- 保存按钮 -->
        <FluentFormActions align="right">
          <FluentButton variant="primary" icon="check" @click="handleSave">保存设置</FluentButton>
        </FluentFormActions>
      </div>
    </FluentPage>
  `
}
