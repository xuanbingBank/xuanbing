/**
 * @file 安全设置页，提供修改密码、两步验证与登录会话管理（Fluent 风格）。
 *
 * 修改密码通过 authClient 调用主进程 AuthService 完成真实校验。
 */

import type { ComponentOptions } from '../vue-global'
import type { CurrentRoute, RouteMeta } from '../router/types'
import { FluentPage } from '../components/layout/FluentPage'
import { FluentCard } from '../components/base/FluentCard'
import { FluentButton } from '../components/base/FluentButton'
import { FluentInput } from '../components/base/FluentInput'
import { FluentSwitch } from '../components/base/FluentSwitch'
import { FluentFormField } from '../components/form/FluentFormField'
import { FluentBadge } from '../components/base/FluentBadge'
import { useAuthStore } from '../stores/auth.store'
import { useToast } from '../composables/useToast'
import { useAppSettings } from '../composables/useAppSettings'
import { authClient } from '../services/auth.client'

/** 页面 Props */
interface PageProps {
  params: Record<string, string>
  query: Record<string, string>
  meta: RouteMeta
  route: CurrentRoute
}

/** 登录会话 */
interface SessionItem {
  id: number
  device: string
  ip: string
  lastActive: string
  current: boolean
}

export const SettingsSecurityPage: ComponentOptions = {
  name: 'SettingsSecurityPage',
  components: { FluentPage, FluentCard, FluentButton, FluentFormField, FluentInput, FluentSwitch, FluentBadge },
  props: {
    params: { type: Object, default: () => ({}) },
    query: { type: Object, default: () => ({}) },
    meta: { type: Object, default: () => ({}) },
    route: { type: Object, default: () => ({}) }
  },
  setup() {
    const authStore = useAuthStore()
    const toast = useToast()
    const appSettings = useAppSettings()

    // 修改密码表单
    const oldPassword = Vue.ref('')
    const newPassword = Vue.ref('')
    const confirmPassword = Vue.ref('')
    const changingPassword = Vue.ref(false)

    // TODO: mock 数据,待接入真实数据源
    // 登录会话 mock 数据
    const sessions: SessionItem[] = [
      { id: 1, device: 'Windows - Chrome', ip: '192.168.1.100', lastActive: '当前会话', current: true },
      { id: 2, device: 'macOS - Safari', ip: '192.168.1.101', lastActive: '2 小时前', current: false },
      { id: 3, device: 'iOS - App', ip: '10.0.0.5', lastActive: '1 天前', current: false }
    ]

    Vue.onMounted(() => {
      void appSettings.load()
    })

    // 修改密码
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

    // 两步验证
    async function handleTwoFactorChange(value: boolean): Promise<void> {
      const ok = await appSettings.update('twoFactor', value)
      if (ok) {
        toast.success('已保存', '两步验证已更新')
      } else {
        toast.warning('保存失败', '已本地更新，但未能写入数据库')
      }
    }

    // 注销会话
    function handleRevokeSession(id: number): void {
      toast.success('已注销', '会话 ' + id + ' 已注销')
    }

    return {
      settings: appSettings.state,
      oldPassword,
      newPassword,
      confirmPassword,
      changingPassword,
      sessions,
      handleChangePassword,
      handleTwoFactorChange,
      handleRevokeSession
    }
  },
  template: `
    <FluentPage title="安全设置" description="密码、两步验证与会话管理">
      <div class="max-w-2xl space-y-6">
        <!-- 修改密码 -->
        <FluentCard title="修改密码" subtitle="定期更新密码以保障账户安全">
          <div class="space-y-4">
            <FluentFormField label="旧密码" required>
              <FluentInput v-model="oldPassword" type="password" placeholder="请输入旧密码" />
            </FluentFormField>
            <FluentFormField label="新密码" required hint="至少 6 位">
              <FluentInput v-model="newPassword" type="password" placeholder="请输入新密码" />
            </FluentFormField>
            <FluentFormField label="确认密码" required>
              <FluentInput v-model="confirmPassword" type="password" placeholder="请再次输入新密码" />
            </FluentFormField>
            <div class="flex justify-end">
              <FluentButton variant="primary" icon="security" :loading="changingPassword" @click="handleChangePassword">修改密码</FluentButton>
            </div>
          </div>
        </FluentCard>

        <!-- 两步验证 -->
        <FluentCard title="两步验证" subtitle="增强账户安全性">
          <div class="flex items-center justify-between">
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

        <!-- 登录会话 -->
        <FluentCard title="登录会话" subtitle="管理已登录的设备">
          <ul class="space-y-3">
            <li
              v-for="session in sessions"
              :key="session.id"
              class="flex items-center justify-between p-3 rounded-[var(--xb-radius-md)] bg-[var(--xb-bg-subtle)]"
            >
              <div class="min-w-0">
                <p class="text-sm font-medium text-[var(--xb-text-primary)] flex items-center gap-1.5">
                  {{ session.device }}
                  <FluentBadge v-if="session.current" size="small" variant="brand">当前</FluentBadge>
                </p>
                <p class="text-xs text-[var(--xb-text-tertiary)] mt-0.5">{{ session.ip }} · {{ session.lastActive }}</p>
              </div>
              <FluentButton
                v-if="!session.current"
                variant="subtle"
                size="small"
                @click="handleRevokeSession(session.id)"
              >注销</FluentButton>
            </li>
          </ul>
        </FluentCard>
      </div>
    </FluentPage>
  `
}
