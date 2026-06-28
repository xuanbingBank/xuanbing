/**
 * @file 设置页（Fluent 风格），统一的应用偏好、账户、安全与系统维护枢纽。
 *
 * 左侧分类导航 + 右侧分区内容，覆盖：
 * 通用 / 外观 / 通知 / 账户 / 安全 / 数据与存储 / 快捷键 / 关于。
 *
 * 偏好通过 useAppSettings 持久化到 SQLite；主题与侧栏由各自 Store 管理；
 * 数据库维护通过 databaseClient；密码修改通过 authClient。
 */

import type { ComponentOptions } from '../vue-global'
import type { CurrentRoute, RouteMeta } from '../router/types'
import { FluentPage } from '../components/layout/FluentPage'
import { FluentCard } from '../components/base/FluentCard'
import { FluentButton } from '../components/base/FluentButton'
import { FluentSelect } from '../components/base/FluentSelect'
import { FluentSwitch } from '../components/base/FluentSwitch'
import { FluentInput } from '../components/base/FluentInput'
import { FluentFormField } from '../components/form/FluentFormField'
import { FluentBadge } from '../components/base/FluentBadge'
import { FluentIcon } from '../components/base/FluentIcon'
import { FluentDivider } from '../components/base/FluentDivider'
import { useThemeStore } from '../stores/theme.store'
import { useLayoutStore } from '../stores/layout.store'
import { useAuthStore } from '../stores/auth.store'
import { useToast } from '../composables/useToast'
import { useConfirm } from '../composables/useConfirm'
import { useDatabaseHealth } from '../composables/useDatabaseHealth'
import { useAppSettings } from '../composables/useAppSettings'
import { useSystemNotification } from '../composables/useSystem'
import { databaseClient } from '../services/database.client'
import { authClient } from '../services/auth.client'
import { APP_INFO } from '../constants'
import type { ThemeName } from '../constants'

/** 页面 Props */
interface PageProps {
  params: Record<string, string>
  query: Record<string, string>
  meta: RouteMeta
  route: CurrentRoute
}

/** 导航分区 */
interface SettingsSection {
  id: string
  label: string
  icon: string
  description: string
}

/** 数据库统计行 */
interface StatRow {
  label: string
  value: number
}

/** 应用运行时信息 */
interface AppRuntimeInfo {
  appName: string
  appVersion: string
  electronVersion: string
  chromeVersion: string
  platform: string
  isPackaged: boolean
}

/** 快捷键项 */
interface ShortcutItem {
  action: string
  keys: string
}

/** 导航分区定义 */
const SECTIONS: SettingsSection[] = [
  { id: 'general', label: '通用', icon: 'settings', description: '语言、启动行为与基础偏好' },
  { id: 'appearance', label: '外观', icon: 'palette', description: '主题、密度与动效' },
  { id: 'notification', label: '通知', icon: 'bell', description: '桌面通知、声音与 Toast' },
  { id: 'account', label: '账户', icon: 'user', description: '个人资料与头像' },
  { id: 'security', label: '安全', icon: 'security', description: '密码、两步验证与会话' },
  { id: 'data', label: '数据与存储', icon: 'folder', description: '数据库健康、备份与维护' },
  { id: 'shortcuts', label: '快捷键', icon: 'list', description: '键盘快捷操作' },
  { id: 'about', label: '关于', icon: 'info', description: '应用版本与技术信息' }
]

/** 默认快捷键列表 */
const SHORTCUTS: ShortcutItem[] = [
  { action: '打开命令面板', keys: 'Ctrl + K' },
  { action: '跳转到仪表盘', keys: 'Ctrl + D' },
  { action: '切换侧栏折叠', keys: 'Ctrl + B' },
  { action: '关闭当前标签页', keys: 'Ctrl + W' },
  { action: '刷新当前页', keys: 'F5' },
  { action: '切换主题（深 / 浅）', keys: 'Ctrl + Shift + T' },
  { action: '打开设置', keys: 'Ctrl + ,' },
  { action: '最小化窗口', keys: 'Ctrl + M' }
]

export const SettingsPage: ComponentOptions = {
  name: 'SettingsPage',
  components: {
    FluentPage,
    FluentCard,
    FluentButton,
    FluentSelect,
    FluentSwitch,
    FluentInput,
    FluentFormField,
    FluentBadge,
    FluentIcon,
    FluentDivider
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
    const authStore = useAuthStore()
    const toast = useToast()
    const confirm = useConfirm()
    const dbHealth = useDatabaseHealth()
    const appSettings = useAppSettings()
    const systemNotify = useSystemNotification()

    /* ───────── 导航 ───────── */
    const activeSection = Vue.ref('general')

    function setActive(id: string): void {
      activeSection.value = id
    }

    function navItemClass(id: string): string {
      const isActive = activeSection.value === id
      return [
        'w-full flex items-center gap-2.5 px-3 py-2 rounded-[var(--xb-radius-md)] text-sm transition-all duration-[var(--xb-motion-fast)] ease-[var(--xb-ease)] text-left',
        isActive
          ? 'bg-[var(--xb-brand-subtle)] text-[var(--xb-brand)] font-semibold'
          : 'text-[var(--xb-text-secondary)] hover:bg-[var(--xb-bg-hover)] hover:text-[var(--xb-text-primary)]'
      ].join(' ')
    }

    /* ───────── 主题与布局（Store 驱动） ───────── */
    const currentTheme = Vue.computed(() => themeStore.currentTheme.value as string)
    const followSystem = Vue.computed(() => themeStore.state.followSystem)
    const sidebarCollapsed = Vue.computed(() => layoutStore.state.sidebarCollapsed)

    const themeOptions = themeStore.availableThemes.map((t) => ({ label: t.label, value: t.value }))
    const languageOptions = [
      { label: '简体中文', value: 'zh-CN' },
      { label: 'English', value: 'en-US' },
      { label: '繁體中文', value: 'zh-TW' }
    ]
    const startupOptions = [
      { label: '仪表盘', value: 'dashboard' },
      { label: '首页', value: 'home' },
      { label: '上次打开的页面', value: 'last' }
    ]
    const densityOptions = [
      { label: '舒适', value: 'comfortable' },
      { label: '紧凑', value: 'compact' }
    ]
    const fontSizeOptions = [
      { label: '小', value: 'small' },
      { label: '中', value: 'medium' },
      { label: '大', value: 'large' }
    ]
    const toastPositionOptions = [
      { label: '左上', value: 'top-left' },
      { label: '中上', value: 'top-center' },
      { label: '右上', value: 'top-right' },
      { label: '右下', value: 'bottom-right' },
      { label: '中下', value: 'bottom-center' },
      { label: '左下', value: 'bottom-left' }
    ]

    function handleThemeChange(value: string): void {
      themeStore.setTheme(value as ThemeName)
      toast.success('主题已切换', '界面主题已更新')
    }

    function handleFollowSystemChange(value: boolean): void {
      themeStore.setFollowSystem(value)
    }

    function handleSidebarChange(value: boolean): void {
      layoutStore.setSidebarCollapsed(value)
    }

    /* ───────── 应用偏好（持久化到 SQLite） ───────── */
    async function handleSettingUpdate(field: string, value: string | boolean, label: string): Promise<void> {
      const ok = await appSettings.update(field as never, value as never)
      if (ok) {
        toast.success('已保存', label + '已更新')
      } else {
        toast.warning('保存失败', '已本地更新，但未能写入数据库')
      }
    }

    /* ───────── 账户 ───────── */
    const profileNickname = Vue.ref('')
    const profileAvatar = Vue.ref('')
    const savingProfile = Vue.ref(false)

    Vue.onMounted(() => {
      const user = authStore.state.user
      if (user) {
        profileNickname.value = user.displayName || user.username || ''
        profileAvatar.value = user.avatar || ''
      }
      void appSettings.load()
      void dbHealth.refresh()
      void loadAppInfo()
      void loadStats()
    })

    async function handleSaveProfile(): Promise<void> {
      savingProfile.value = true
      try {
        const user = authStore.state.user
        if (user) {
          authStore.setUser({
            ...user,
            displayName: profileNickname.value || user.username,
            avatar: profileAvatar.value
          })
        }
        toast.success('已保存', '个人资料已更新')
      } catch (err) {
        toast.error('保存失败', err instanceof Error ? err.message : '未知错误')
      } finally {
        savingProfile.value = false
      }
    }

    /* ───────── 安全：修改密码 ───────── */
    const oldPassword = Vue.ref('')
    const newPassword = Vue.ref('')
    const confirmPassword = Vue.ref('')
    const changingPassword = Vue.ref(false)

    async function handleChangePassword(): Promise<void> {
      if (!oldPassword.value || !newPassword.value) {
        toast.warning('请填写完整', '请输入旧密码与新密码')
        return
      }
      if (newPassword.value.length < 6) {
        toast.warning('密码过短', '新密码至少 6 位')
        return
      }
      if (newPassword.value !== confirmPassword.value) {
        toast.error('密码不一致', '两次输入的密码不匹配')
        return
      }
      const token = authStore.state.token
      if (!token) {
        toast.error('未登录', '无法修改密码')
        return
      }
      changingPassword.value = true
      try {
        const result = await authClient.changePassword({
          token,
          oldPassword: oldPassword.value,
          newPassword: newPassword.value
        })
        if (result.success) {
          toast.success('修改成功', '密码已更新，下次登录请使用新密码')
          oldPassword.value = ''
          newPassword.value = ''
          confirmPassword.value = ''
        } else {
          toast.error('修改失败', '密码未更新，请检查旧密码')
        }
      } catch (err) {
        toast.error('修改失败', err instanceof Error ? err.message : '未知错误')
      } finally {
        changingPassword.value = false
      }
    }

    async function handleTwoFactorChange(value: boolean): Promise<void> {
      await handleSettingUpdate('twoFactor', value, '两步验证')
    }

    /* ───────── 通知测试 ───────── */
    async function handleTestNotification(): Promise<void> {
      const ok = await systemNotify.show('玄冰 All In One', '这是一条测试桌面通知', { subtitle: '通知设置' })
      if (ok) {
        toast.success('已发送', '测试通知已显示')
      } else {
        toast.warning('发送失败', '通知未能显示，请检查系统权限')
      }
    }

    /* ───────── 数据库维护 ───────── */
    const stats = Vue.ref<StatRow[]>([])
    const loadingStats = Vue.ref(false)
    const lastBackupPath = Vue.ref('')
    const dbBusy = Vue.ref(false)

    async function loadStats(): Promise<void> {
      loadingStats.value = true
      try {
        const data = await databaseClient.getStats()
        stats.value = [
          { label: '应用设置', value: data.app_settings },
          { label: '窗口状态', value: data.window_states },
          { label: '任务', value: data.tasks },
          { label: '任务事件', value: data.task_events },
          { label: '应用日志', value: data.app_logs },
          { label: '审计日志', value: data.audit_logs },
          { label: '文件资产', value: data.file_assets },
          { label: '同步发件箱', value: data.sync_outbox },
          { label: '同步收件箱', value: data.sync_inbox }
        ]
      } catch {
        stats.value = []
      } finally {
        loadingStats.value = false
      }
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
      dbBusy.value = true
      try {
        toast.info('备份中', '正在创建数据库备份...')
        const result = await databaseClient.backup()
        lastBackupPath.value = result.backupPath
        toast.success('备份成功', '已创建：' + result.backupName)
        await dbHealth.refresh()
      } catch (err) {
        toast.error('备份失败', err instanceof Error ? err.message : '未知错误')
      } finally {
        dbBusy.value = false
      }
    }

    async function handleRestore(): Promise<void> {
      if (!lastBackupPath.value) {
        toast.warning('无可用备份', '请先创建一次备份，再执行恢复')
        return
      }
      const ok = await confirm.confirm({
        title: '恢复数据库',
        content: '此操作将用最近一次备份覆盖当前数据库，恢复前会自动再创建一份备份。确定继续吗？',
        confirmText: '恢复',
        cancelText: '取消',
        danger: true
      })
      if (!ok) return
      dbBusy.value = true
      try {
        toast.info('恢复中', '正在从备份恢复数据库...')
        const result = await databaseClient.restore({
          backupPath: lastBackupPath.value,
          confirm: true
        })
        if (result.success) {
          toast.success('恢复成功', '数据库已从备份恢复')
          await dbHealth.refresh()
          await loadStats()
        } else {
          toast.error('恢复失败', '恢复未成功完成')
        }
      } catch (err) {
        toast.error('恢复失败', err instanceof Error ? err.message : '未知错误')
      } finally {
        dbBusy.value = false
      }
    }

    async function handleVacuum(): Promise<void> {
      dbBusy.value = true
      try {
        toast.info('优化中', '正在执行 VACUUM...')
        await databaseClient.vacuum()
        toast.success('优化成功', '数据库已整理碎片')
        await dbHealth.refresh()
      } catch (err) {
        toast.error('优化失败', err instanceof Error ? err.message : '未知错误')
      } finally {
        dbBusy.value = false
      }
    }

    async function handleClearLogs(): Promise<void> {
      const ok = await confirm.confirm({
        title: '清空全部日志',
        content: '将清空所有应用日志与审计日志（清空前会记录一条审计痕迹）。此操作不可撤销，确定继续吗？',
        confirmText: '清空',
        cancelText: '取消',
        danger: true
      })
      if (!ok) return
      dbBusy.value = true
      try {
        const result = await databaseClient.clearLogs()
        toast.success('已清空', '共删除 ' + result.deleted + ' 条日志')
        await loadStats()
      } catch (err) {
        toast.error('清空失败', err instanceof Error ? err.message : '未知错误')
      } finally {
        dbBusy.value = false
      }
    }

    /* ───────── 关于 ───────── */
    const appInfo = Vue.ref<AppRuntimeInfo | null>(null)

    async function loadAppInfo(): Promise<void> {
      try {
        const info = await window.desktop.app.getInfo()
        appInfo.value = {
          appName: info.appName,
          appVersion: info.appVersion,
          electronVersion: info.electronVersion,
          chromeVersion: info.chromeVersion,
          platform: info.platform,
          isPackaged: info.isPackaged
        }
      } catch {
        appInfo.value = null
      }
    }

    function formatSize(bytes: number): string {
      if (bytes < 1024) return bytes + ' B'
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
      return (bytes / 1024 / 1024).toFixed(2) + ' MB'
    }

    return {
      // 导航
      sections: SECTIONS,
      activeSection,
      setActive,
      navItemClass,
      // 主题与布局
      currentTheme,
      followSystem,
      sidebarCollapsed,
      themeOptions,
      languageOptions,
      startupOptions,
      densityOptions,
      fontSizeOptions,
      toastPositionOptions,
      handleThemeChange,
      handleFollowSystemChange,
      handleSidebarChange,
      // 应用偏好
      settings: appSettings.state,
      handleSettingUpdate,
      // 账户
      authStore,
      profileNickname,
      profileAvatar,
      savingProfile,
      handleSaveProfile,
      // 安全
      oldPassword,
      newPassword,
      confirmPassword,
      changingPassword,
      handleChangePassword,
      handleTwoFactorChange,
      // 通知
      handleTestNotification,
      // 数据库
      dbHealth,
      stats,
      loadingStats,
      dbBusy,
      handleCheckHealth,
      handleBackup,
      handleRestore,
      handleVacuum,
      handleClearLogs,
      loadStats,
      formatSize,
      // 快捷键
      shortcuts: SHORTCUTS,
      // 关于
      appInfo,
      appInfoConstant: APP_INFO
    }
  },
  template: `
    <FluentPage title="设置" description="应用偏好、账户、安全与系统维护" max-width="1100px">
      <div class="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-6">
        <!-- 左侧导航 -->
        <nav class="space-y-1 lg:sticky lg:top-6 lg:self-start">
          <button
            v-for="section in sections"
            :key="section.id"
            type="button"
            :class="navItemClass(section.id)"
            @click="setActive(section.id)"
          >
            <FluentIcon :name="section.icon" :size="16" />
            <span class="flex-1">{{ section.label }}</span>
          </button>
        </nav>

        <!-- 右侧内容 -->
        <div class="min-w-0 space-y-6">

          <!-- ───────── 通用 ───────── -->
          <template v-if="activeSection === 'general'">
            <FluentCard title="通用设置" subtitle="语言、启动行为与基础偏好">
              <div class="space-y-5 max-w-xl">
                <FluentFormField label="界面语言" hint="选择应用界面语言">
                  <FluentSelect
                    :model-value="settings.language"
                    :options="languageOptions"
                    @update:model-value="(v: string) => handleSettingUpdate('language', v, '界面语言')"
                  />
                </FluentFormField>
                <FluentFormField label="启动时打开" hint="应用启动后默认展示的页面">
                  <FluentSelect
                    :model-value="settings.startup"
                    :options="startupOptions"
                    @update:model-value="(v: string) => handleSettingUpdate('startup', v, '启动页面')"
                  />
                </FluentFormField>
                <FluentDivider />
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-medium text-[var(--xb-text-primary)]">跟随系统主题</p>
                    <p class="text-xs text-[var(--xb-text-tertiary)] mt-0.5">自动适配系统的深浅色偏好</p>
                  </div>
                  <FluentSwitch
                    :model-value="followSystem"
                    @update:model-value="handleFollowSystemChange"
                  />
                </div>
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-medium text-[var(--xb-text-primary)]">折叠侧栏</p>
                    <p class="text-xs text-[var(--xb-text-tertiary)] mt-0.5">折叠以获得更大的内容区域</p>
                  </div>
                  <FluentSwitch
                    :model-value="sidebarCollapsed"
                    @update:model-value="handleSidebarChange"
                  />
                </div>
              </div>
            </FluentCard>
          </template>

          <!-- ───────── 外观 ───────── -->
          <template v-if="activeSection === 'appearance'">
            <FluentCard title="主题" subtitle="选择应用界面主题">
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl">
                <button
                  v-for="opt in themeOptions"
                  :key="opt.value"
                  type="button"
                  :class="[
                    'rounded-[var(--xb-radius-lg)] border p-3 text-left transition-all',
                    currentTheme === opt.value
                      ? 'border-[var(--xb-brand)] ring-1 ring-[var(--xb-brand)] bg-[var(--xb-brand-subtle)]'
                      : 'border-[var(--xb-border-subtle)] hover:border-[var(--xb-border-strong)] bg-[var(--xb-bg-surface)]'
                  ]"
                  @click="handleThemeChange(opt.value)"
                >
                  <div class="flex items-center justify-between">
                    <span class="text-sm font-medium text-[var(--xb-text-primary)]">{{ opt.label }}</span>
                    <FluentIcon v-if="currentTheme === opt.value" name="check" :size="14" class="text-[var(--xb-brand)]" />
                  </div>
                  <div class="mt-2 h-8 rounded-[var(--xb-radius-sm)] overflow-hidden flex">
                    <div class="flex-1" :style="{ background: opt.value === 'dark' || opt.value === 'business' ? '#1f1f1f' : '#ffffff' }"></div>
                    <div class="w-6" :style="{ background: 'var(--xb-brand)' }"></div>
                  </div>
                </button>
              </div>
            </FluentCard>

            <FluentCard title="显示" subtitle="信息密度、字号与动效">
              <div class="space-y-5 max-w-xl">
                <FluentFormField label="信息密度" hint="紧凑模式可减少组件间距">
                  <FluentSelect
                    :model-value="settings.density"
                    :options="densityOptions"
                    @update:model-value="(v: string) => handleSettingUpdate('density', v, '信息密度')"
                  />
                </FluentFormField>
                <FluentFormField label="字体大小" hint="影响正文与界面文字">
                  <FluentSelect
                    :model-value="settings.fontSize"
                    :options="fontSizeOptions"
                    @update:model-value="(v: string) => handleSettingUpdate('fontSize', v, '字体大小')"
                  />
                </FluentFormField>
                <FluentDivider />
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-medium text-[var(--xb-text-primary)]">减弱动效</p>
                    <p class="text-xs text-[var(--xb-text-tertiary)] mt-0.5">减少过渡与动画，提升性能</p>
                  </div>
                  <FluentSwitch
                    :model-value="settings.reducedMotion"
                    @update:model-value="(v: boolean) => handleSettingUpdate('reducedMotion', v, '减弱动效')"
                  />
                </div>
              </div>
            </FluentCard>
          </template>

          <!-- ───────── 通知 ───────── -->
          <template v-if="activeSection === 'notification'">
            <FluentCard title="通知设置" subtitle="消息提醒方式">
              <div class="space-y-5 max-w-xl">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-medium text-[var(--xb-text-primary)]">桌面通知</p>
                    <p class="text-xs text-[var(--xb-text-tertiary)] mt-0.5">通过系统通知中心显示提醒</p>
                  </div>
                  <FluentSwitch
                    :model-value="settings.notifyDesktop"
                    @update:model-value="(v: boolean) => handleSettingUpdate('notifyDesktop', v, '桌面通知')"
                  />
                </div>
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-medium text-[var(--xb-text-primary)]">声音提醒</p>
                    <p class="text-xs text-[var(--xb-text-tertiary)] mt-0.5">收到通知时播放提示音</p>
                  </div>
                  <FluentSwitch
                    :model-value="settings.notifySound"
                    @update:model-value="(v: boolean) => handleSettingUpdate('notifySound', v, '声音提醒')"
                  />
                </div>
                <FluentFormField label="Toast 位置" hint="系统级 Toast 浮层的出现方向">
                  <FluentSelect
                    :model-value="settings.toastPosition"
                    :options="toastPositionOptions"
                    @update:model-value="(v: string) => handleSettingUpdate('toastPosition', v, 'Toast 位置')"
                  />
                </FluentFormField>
                <FluentDivider />
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-medium text-[var(--xb-text-primary)]">自动检查更新</p>
                    <p class="text-xs text-[var(--xb-text-tertiary)] mt-0.5">启动时自动检查新版本</p>
                  </div>
                  <FluentSwitch
                    :model-value="settings.autoUpdate"
                    @update:model-value="(v: boolean) => handleSettingUpdate('autoUpdate', v, '自动更新')"
                  />
                </div>
                <div class="pt-2">
                  <FluentButton variant="secondary" size="small" icon="bell" @click="handleTestNotification">发送测试通知</FluentButton>
                </div>
              </div>
            </FluentCard>
          </template>

          <!-- ───────── 账户 ───────── -->
          <template v-if="activeSection === 'account'">
            <FluentCard title="个人资料" subtitle="编辑您的显示名称与头像">
              <div class="space-y-5 max-w-xl">
                <FluentFormField label="用户名" hint="登录账号，不可修改">
                  <FluentInput
                    :model-value="authStore.state.user?.username || '-'"
                    readonly
                  />
                </FluentFormField>
                <FluentFormField label="显示名称" required>
                  <FluentInput
                    v-model="profileNickname"
                    placeholder="请输入显示名称"
                  />
                </FluentFormField>
                <FluentFormField label="角色">
                  <div class="flex flex-wrap gap-1.5 pt-1">
                    <FluentBadge
                      v-for="role in (authStore.state.user?.roles || [])"
                      :key="role"
                      size="small"
                      variant="brand"
                    >{{ role }}</FluentBadge>
                    <span v-if="!authStore.state.user?.roles?.length" class="text-sm text-[var(--xb-text-tertiary)]">无</span>
                  </div>
                </FluentFormField>
                <FluentFormField label="头像 URL" hint="留空则使用默认头像">
                  <FluentInput
                    v-model="profileAvatar"
                    placeholder="请输入头像链接"
                  />
                </FluentFormField>
                <div class="flex justify-end">
                  <FluentButton
                    variant="primary"
                    icon="check"
                    :loading="savingProfile"
                    @click="handleSaveProfile"
                  >保存资料</FluentButton>
                </div>
              </div>
            </FluentCard>
          </template>

          <!-- ───────── 安全 ───────── -->
          <template v-if="activeSection === 'security'">
            <FluentCard title="修改密码" subtitle="定期更新密码以保障账户安全">
              <div class="space-y-4 max-w-xl">
                <FluentFormField label="旧密码" required>
                  <FluentInput
                    v-model="oldPassword"
                    type="password"
                    placeholder="请输入旧密码"
                  />
                </FluentFormField>
                <FluentFormField label="新密码" required hint="至少 6 位">
                  <FluentInput
                    v-model="newPassword"
                    type="password"
                    placeholder="请输入新密码"
                  />
                </FluentFormField>
                <FluentFormField label="确认新密码" required>
                  <FluentInput
                    v-model="confirmPassword"
                    type="password"
                    placeholder="请再次输入新密码"
                  />
                </FluentFormField>
                <div class="flex justify-end">
                  <FluentButton
                    variant="primary"
                    icon="security"
                    :loading="changingPassword"
                    @click="handleChangePassword"
                  >修改密码</FluentButton>
                </div>
              </div>
            </FluentCard>

            <FluentCard title="两步验证" subtitle="增强账户安全性">
              <div class="flex items-center justify-between max-w-xl">
                <div>
                  <p class="text-sm font-medium text-[var(--xb-text-primary)]">启用两步验证</p>
                  <p class="text-xs text-[var(--xb-text-tertiary)] mt-0.5">登录时需要额外的验证码</p>
                </div>
                <FluentSwitch
                  :model-value="settings.twoFactor"
                  @update:model-value="handleTwoFactorChange"
                />
              </div>
            </FluentCard>
          </template>

          <!-- ───────── 数据与存储 ───────── -->
          <template v-if="activeSection === 'data'">
            <FluentCard title="数据库健康" subtitle="SQLite 主库健康检查">
              <div class="space-y-4">
                <div v-if="dbHealth.loading.value" class="text-sm text-[var(--xb-text-tertiary)]">检查中...</div>
                <div v-else-if="dbHealth.health.value" class="space-y-3">
                  <div class="flex items-center gap-2 flex-wrap">
                    <FluentBadge :variant="dbHealth.isHealthy.value ? 'success' : 'error'" dot>
                      {{ dbHealth.isHealthy.value ? '正常' : '异常' }}
                    </FluentBadge>
                    <span class="text-sm text-[var(--xb-text-tertiary)]">Schema v{{ dbHealth.health.value.schemaVersion }} / 期望 v{{ dbHealth.health.value.expectedSchemaVersion }}</span>
                  </div>
                  <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                    <div class="rounded-[var(--xb-radius-md)] bg-[var(--xb-bg-subtle)] p-3">
                      <div class="text-xs text-[var(--xb-text-tertiary)]">WAL</div>
                      <div :class="dbHealth.health.value.walEnabled ? 'text-[var(--xb-success)]' : 'text-[var(--xb-error)]'" class="mt-1 font-semibold">
                        {{ dbHealth.health.value.walEnabled ? '启用' : '未启用' }}
                      </div>
                    </div>
                    <div class="rounded-[var(--xb-radius-md)] bg-[var(--xb-bg-subtle)] p-3">
                      <div class="text-xs text-[var(--xb-text-tertiary)]">迁移</div>
                      <div :class="dbHealth.health.value.migrationLatest ? 'text-[var(--xb-success)]' : 'text-[var(--xb-warning)]'" class="mt-1 font-semibold">
                        {{ dbHealth.health.value.migrationLatest ? '最新' : '待迁移' }}
                      </div>
                    </div>
                    <div class="rounded-[var(--xb-radius-md)] bg-[var(--xb-bg-subtle)] p-3">
                      <div class="text-xs text-[var(--xb-text-tertiary)]">可写</div>
                      <div :class="dbHealth.health.value.writable ? 'text-[var(--xb-success)]' : 'text-[var(--xb-error)]'" class="mt-1 font-semibold">
                        {{ dbHealth.health.value.writable ? '是' : '否' }}
                      </div>
                    </div>
                    <div class="rounded-[var(--xb-radius-md)] bg-[var(--xb-bg-subtle)] p-3">
                      <div class="text-xs text-[var(--xb-text-tertiary)]">文件大小</div>
                      <div class="mt-1 font-semibold text-[var(--xb-text-primary)]">{{ formatSize(dbHealth.health.value.dbFileSize) }}</div>
                    </div>
                    <div class="rounded-[var(--xb-radius-md)] bg-[var(--xb-bg-subtle)] p-3">
                      <div class="text-xs text-[var(--xb-text-tertiary)]">完整性</div>
                      <div class="mt-1 font-semibold text-[var(--xb-text-primary)] truncate">{{ dbHealth.health.value.integrityCheck }}</div>
                    </div>
                    <div class="rounded-[var(--xb-radius-md)] bg-[var(--xb-bg-subtle)] p-3">
                      <div class="text-xs text-[var(--xb-text-tertiary)]">最近备份</div>
                      <div class="mt-1 font-semibold text-[var(--xb-text-primary)] truncate">{{ dbHealth.health.value.latestBackupTime || '无' }}</div>
                    </div>
                  </div>
                  <div v-if="dbHealth.health.value.issues.length > 0" class="p-3 rounded-[var(--xb-radius-md)] bg-[var(--xb-warning-subtle)] text-sm text-[var(--xb-warning)]">
                    <ul class="list-disc list-inside space-y-0.5"><li v-for="issue in dbHealth.health.value.issues" :key="issue">{{ issue }}</li></ul>
                  </div>
                </div>
                <div v-else-if="dbHealth.error.value" class="p-3 rounded-[var(--xb-radius-md)] bg-[var(--xb-error-subtle)] text-sm text-[var(--xb-error)]">
                  {{ dbHealth.error.value.message }}
                </div>
                <div class="flex flex-wrap gap-2">
                  <FluentButton variant="secondary" size="small" icon="refresh" :loading="dbHealth.loading.value" @click="handleCheckHealth">检查健康</FluentButton>
                  <FluentButton variant="secondary" size="small" icon="download" :loading="dbBusy" @click="handleBackup">备份</FluentButton>
                  <FluentButton variant="secondary" size="small" icon="upload" :loading="dbBusy" @click="handleRestore">从最近备份恢复</FluentButton>
                  <FluentButton variant="subtle" size="small" :loading="dbBusy" @click="handleVacuum">VACUUM</FluentButton>
                </div>
              </div>
            </FluentCard>

            <FluentCard title="数据统计" subtitle="各表记录数量">
              <template #actions>
                <FluentButton variant="subtle" size="small" icon="refresh" :loading="loadingStats" @click="loadStats">刷新</FluentButton>
              </template>
              <div v-if="stats.length" class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div
                  v-for="row in stats"
                  :key="row.label"
                  class="rounded-[var(--xb-radius-md)] bg-[var(--xb-bg-subtle)] p-3"
                >
                  <div class="text-xs text-[var(--xb-text-tertiary)]">{{ row.label }}</div>
                  <div class="mt-1 text-lg font-semibold text-[var(--xb-text-primary)]">{{ row.value }}</div>
                </div>
              </div>
              <div v-else class="text-sm text-[var(--xb-text-tertiary)]">暂无统计数据</div>
            </FluentCard>

            <FluentCard title="日志清理" subtitle="高危操作">
              <div class="flex items-center justify-between max-w-xl">
                <div>
                  <p class="text-sm font-medium text-[var(--xb-text-primary)]">清空全部日志</p>
                  <p class="text-xs text-[var(--xb-text-tertiary)] mt-0.5">将清空应用日志与审计日志，操作不可撤销</p>
                </div>
                <FluentButton variant="danger" size="small" icon="delete" :loading="dbBusy" @click="handleClearLogs">清空</FluentButton>
              </div>
            </FluentCard>
          </template>

          <!-- ───────── 快捷键 ───────── -->
          <template v-if="activeSection === 'shortcuts'">
            <FluentCard title="键盘快捷键" subtitle="常用操作的快捷方式">
              <ul class="divide-y divide-[var(--xb-border-subtle)]">
                <li
                  v-for="item in shortcuts"
                  :key="item.action"
                  class="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                >
                  <span class="text-sm text-[var(--xb-text-primary)]">{{ item.action }}</span>
                  <kbd class="px-2 py-1 rounded-[var(--xb-radius-sm)] bg-[var(--xb-bg-subtle)] border border-[var(--xb-border-subtle)] text-xs text-[var(--xb-text-secondary)] font-mono">{{ item.keys }}</kbd>
                </li>
              </ul>
            </FluentCard>
          </template>

          <!-- ───────── 关于 ───────── -->
          <template v-if="activeSection === 'about'">
            <FluentCard title="关于应用" subtitle="版本与运行时信息">
              <div class="space-y-4">
                <div class="flex items-center gap-3">
                  <div class="h-12 w-12 rounded-[var(--xb-radius-lg)] bg-[var(--xb-brand-subtle)] text-[var(--xb-brand)] flex items-center justify-center">
                    <FluentIcon name="sparkle" :size="24" />
                  </div>
                  <div>
                    <div class="text-base font-semibold text-[var(--xb-text-primary)]">{{ appInfo?.appName || appInfoConstant.NAME }}</div>
                    <div class="text-xs text-[var(--xb-text-tertiary)] mt-0.5">基于 Electron + Vue 3 + TypeScript 构建</div>
                  </div>
                </div>
                <FluentDivider />
                <div class="grid grid-cols-2 gap-3 text-sm">
                  <div class="rounded-[var(--xb-radius-md)] bg-[var(--xb-bg-subtle)] p-3">
                    <div class="text-xs text-[var(--xb-text-tertiary)]">应用版本</div>
                    <div class="mt-1 font-semibold text-[var(--xb-text-primary)]">v{{ appInfo?.appVersion || appInfoConstant.VERSION }}</div>
                  </div>
                  <div class="rounded-[var(--xb-radius-md)] bg-[var(--xb-bg-subtle)] p-3">
                    <div class="text-xs text-[var(--xb-text-tertiary)]">运行环境</div>
                    <div class="mt-1 font-semibold text-[var(--xb-text-primary)]">{{ appInfoConstant.ENVIRONMENT }}</div>
                  </div>
                  <div class="rounded-[var(--xb-radius-md)] bg-[var(--xb-bg-subtle)] p-3">
                    <div class="text-xs text-[var(--xb-text-tertiary)]">Electron</div>
                    <div class="mt-1 font-semibold text-[var(--xb-text-primary)]">{{ appInfo?.electronVersion || '-' }}</div>
                  </div>
                  <div class="rounded-[var(--xb-radius-md)] bg-[var(--xb-bg-subtle)] p-3">
                    <div class="text-xs text-[var(--xb-text-tertiary)]">Chromium</div>
                    <div class="mt-1 font-semibold text-[var(--xb-text-primary)]">{{ appInfo?.chromeVersion || '-' }}</div>
                  </div>
                  <div class="rounded-[var(--xb-radius-md)] bg-[var(--xb-bg-subtle)] p-3">
                    <div class="text-xs text-[var(--xb-text-tertiary)]">平台</div>
                    <div class="mt-1 font-semibold text-[var(--xb-text-primary)]">{{ appInfo?.platform || '-' }}</div>
                  </div>
                  <div class="rounded-[var(--xb-radius-md)] bg-[var(--xb-bg-subtle)] p-3">
                    <div class="text-xs text-[var(--xb-text-tertiary)]">是否打包</div>
                    <div class="mt-1 font-semibold text-[var(--xb-text-primary)]">{{ appInfo?.isPackaged ? '是' : '否' }}</div>
                  </div>
                </div>
              </div>
            </FluentCard>

            <FluentCard title="技术栈" subtitle="本项目使用的主要技术">
              <div class="flex flex-wrap gap-2">
                <FluentBadge variant="brand">Electron</FluentBadge>
                <FluentBadge>Vue 3</FluentBadge>
                <FluentBadge>TypeScript</FluentBadge>
                <FluentBadge>SQLite (better-sqlite3)</FluentBadge>
                <FluentBadge>Zod</FluentBadge>
                <FluentBadge>Tailwind CSS</FluentBadge>
                <FluentBadge>daisyUI</FluentBadge>
              </div>
            </FluentCard>
          </template>

        </div>
      </div>
    </FluentPage>
  `
}
