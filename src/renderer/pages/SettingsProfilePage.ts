/**
 * @file 个人资料设置页，展示并编辑当前用户信息（Fluent 风格）。
 */

import type { ComponentOptions } from '../vue-global'
import type { CurrentRoute, RouteMeta } from '../router/types'
import { FluentPage } from '../components/layout/FluentPage'
import { FluentCard } from '../components/base/FluentCard'
import { FluentButton } from '../components/base/FluentButton'
import { FluentInput } from '../components/base/FluentInput'
import { FluentFormField } from '../components/form/FluentFormField'
import { FluentBadge } from '../components/base/FluentBadge'
import { useAuthStore } from '../stores/auth.store'
import { useToast } from '../composables/useToast'

/** 页面 Props */
interface PageProps {
  params: Record<string, string>
  query: Record<string, string>
  meta: RouteMeta
  route: CurrentRoute
}

export const SettingsProfilePage: ComponentOptions = {
  name: 'SettingsProfilePage',
  components: { FluentPage, FluentCard, FluentButton, FluentFormField, FluentInput, FluentBadge },
  props: {
    params: { type: Object, default: () => ({}) },
    query: { type: Object, default: () => ({}) },
    meta: { type: Object, default: () => ({}) },
    route: { type: Object, default: () => ({}) }
  },
  setup() {
    const authStore = useAuthStore()
    const toast = useToast()

    // 表单字段
    const nickname = Vue.ref('')
    const email = Vue.ref('')
    const phone = Vue.ref('')
    const avatar = Vue.ref('')
    const saving = Vue.ref(false)

    // 初始化时从当前用户填充
    Vue.onMounted(() => {
      const user = authStore.state.user
      if (user) {
        nickname.value = user.displayName || user.username || ''
        avatar.value = user.avatar || ''
      }
    })

    // 保存
    async function handleSave(): Promise<void> {
      saving.value = true
      try {
        const user = authStore.state.user
        if (user) {
          authStore.setUser({
            ...user,
            displayName: nickname.value || user.username,
            avatar: avatar.value
          })
        }
        toast.success('保存成功', '个人资料已更新')
      } catch (err) {
        toast.error('保存失败', err instanceof Error ? err.message : '未知错误')
      } finally {
        saving.value = false
      }
    }

    return { authStore, nickname, email, phone, avatar, saving, handleSave }
  },
  template: `
    <FluentPage title="个人资料" description="编辑您的显示名称与头像">
      <div class="max-w-xl space-y-6">
        <FluentCard title="基本信息" subtitle="编辑您的个人资料">
          <div class="space-y-5">
            <FluentFormField label="用户名" hint="登录账号，不可修改">
              <FluentInput
                :model-value="authStore.state.user?.username || '-'"
                readonly
              />
            </FluentFormField>
            <FluentFormField label="昵称" required>
              <FluentInput v-model="nickname" placeholder="请输入昵称" />
            </FluentFormField>
            <FluentFormField label="邮箱">
              <FluentInput v-model="email" type="email" placeholder="请输入邮箱" />
            </FluentFormField>
            <FluentFormField label="手机号">
              <FluentInput v-model="phone" placeholder="请输入手机号" />
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
            <FluentFormField label="头像 URL">
              <FluentInput v-model="avatar" placeholder="请输入头像链接" />
            </FluentFormField>
            <div class="flex justify-end">
              <FluentButton variant="primary" icon="check" :loading="saving" @click="handleSave">保存</FluentButton>
            </div>
          </div>
        </FluentCard>
      </div>
    </FluentPage>
  `
}
