/**
 * @file 安全设置页，提供修改密码、两步验证与登录会话管理。
 */

import type { ComponentOptions } from '../vue-global'
import type { CurrentRoute, RouteMeta } from '../router/types'
import { PageContainer } from '../components/base/PageContainer'
import { BaseCard } from '../components/base/BaseCard'
import { BaseButton } from '../components/base/BaseButton'
import { FormField } from '../components/form/FormField'
import { FormInput } from '../components/form/FormInput'
import { FormSwitch } from '../components/form/FormSwitch'
import { useToast } from '../composables/useToast'

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
  components: { PageContainer, BaseCard, BaseButton, FormField, FormInput, FormSwitch },
  props: {
    params: { type: Object, default: () => ({}) },
    query: { type: Object, default: () => ({}) },
    meta: { type: Object, default: () => ({}) },
    route: { type: Object, default: () => ({}) }
  },
  setup() {
    const toast = useToast()

    // 修改密码表单
    const oldPassword = Vue.ref('')
    const newPassword = Vue.ref('')
    const confirmPassword = Vue.ref('')

    // 两步验证
    const twoFactor = Vue.ref(false)

    // 登录会话 mock 数据
    const sessions: SessionItem[] = [
      { id: 1, device: 'Windows - Chrome', ip: '192.168.1.100', lastActive: '当前会话', current: true },
      { id: 2, device: 'macOS - Safari', ip: '192.168.1.101', lastActive: '2 小时前', current: false },
      { id: 3, device: 'iOS - App', ip: '10.0.0.5', lastActive: '1 天前', current: false }
    ]

    // 修改密码
    function handleChangePassword(): void {
      if (!oldPassword.value || !newPassword.value) {
        toast.warning('请填写完整', '请输入旧密码与新密码')
        return
      }
      if (newPassword.value !== confirmPassword.value) {
        toast.error('密码不一致', '两次输入的密码不匹配')
        return
      }
      toast.success('修改成功', '密码已更新')
      oldPassword.value = ''
      newPassword.value = ''
      confirmPassword.value = ''
    }

    // 注销会话
    function handleRevokeSession(id: number): void {
      toast.success('已注销', '会话 ' + id + ' 已注销')
    }

    return {
      oldPassword,
      newPassword,
      confirmPassword,
      twoFactor,
      sessions,
      handleChangePassword,
      handleRevokeSession
    }
  },
  template: `
    <PageContainer title="安全设置">
      <div class="space-y-6">
        <!-- 修改密码 -->
        <BaseCard title="修改密码" subtitle="定期更新密码以保障账户安全">
          <div class="space-y-4 max-w-lg">
            <FormField label="旧密码" required>
              <FormInput v-model="oldPassword" type="password" placeholder="请输入旧密码" />
            </FormField>
            <FormField label="新密码" required>
              <FormInput v-model="newPassword" type="password" placeholder="请输入新密码" />
            </FormField>
            <FormField label="确认密码" required>
              <FormInput v-model="confirmPassword" type="password" placeholder="请再次输入新密码" />
            </FormField>
            <div class="flex justify-end">
              <BaseButton variant="primary" @click="handleChangePassword">修改密码</BaseButton>
            </div>
          </div>
        </BaseCard>

        <!-- 两步验证 -->
        <BaseCard title="两步验证" subtitle="增强账户安全性">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm">启用两步验证</p>
              <p class="text-xs text-base-content/50">登录时需要额外的验证码</p>
            </div>
            <FormSwitch v-model="twoFactor" />
          </div>
        </BaseCard>

        <!-- 登录会话 -->
        <BaseCard title="登录会话" subtitle="管理已登录的设备">
          <ul class="space-y-3">
            <li
              v-for="session in sessions"
              :key="session.id"
              class="flex items-center justify-between p-3 rounded-lg bg-base-200"
            >
              <div>
                <p class="text-sm font-medium">
                  {{ session.device }}
                  <span v-if="session.current" class="badge badge-primary badge-sm ml-1">当前</span>
                </p>
                <p class="text-xs text-base-content/50">{{ session.ip }} · {{ session.lastActive }}</p>
              </div>
              <BaseButton
                v-if="!session.current"
                variant="ghost"
                size="sm"
                @click="handleRevokeSession(session.id)"
              >注销</BaseButton>
            </li>
          </ul>
        </BaseCard>
      </div>
    </PageContainer>
  `
}
