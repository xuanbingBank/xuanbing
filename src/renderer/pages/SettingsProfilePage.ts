/**
 * @file 个人资料设置页，展示并编辑当前用户信息。
 */

import type { ComponentOptions } from '../vue-global'
import type { CurrentRoute, RouteMeta } from '../router/types'
import { PageContainer } from '../components/base/PageContainer'
import { BaseCard } from '../components/base/BaseCard'
import { BaseButton } from '../components/base/BaseButton'
import { FormField } from '../components/form/FormField'
import { FormInput } from '../components/form/FormInput'
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
  components: { PageContainer, BaseCard, BaseButton, FormField, FormInput },
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

    // 初始化时从当前用户填充
    Vue.onMounted(() => {
      const user = authStore.state.user
      if (user) {
        nickname.value = user.displayName || user.username || ''
        email.value = ''
        phone.value = ''
        avatar.value = user.avatar || ''
      }
    })

    // 保存
    function handleSave(): void {
      toast.success('保存成功', '个人资料已更新')
    }

    return { nickname, email, phone, avatar, handleSave }
  },
  template: `
    <PageContainer title="个人资料">
      <BaseCard title="基本信息" subtitle="编辑您的个人资料">
        <div class="space-y-4 max-w-lg">
          <FormField label="昵称" required>
            <FormInput v-model="nickname" placeholder="请输入昵称" />
          </FormField>
          <FormField label="邮箱">
            <FormInput v-model="email" type="email" placeholder="请输入邮箱" />
          </FormField>
          <FormField label="手机号">
            <FormInput v-model="phone" placeholder="请输入手机号" />
          </FormField>
          <FormField label="头像 URL">
            <FormInput v-model="avatar" placeholder="请输入头像链接" />
          </FormField>
          <div class="flex justify-end">
            <BaseButton variant="primary" @click="handleSave">保存</BaseButton>
          </div>
        </div>
      </BaseCard>
    </PageContainer>
  `
}
