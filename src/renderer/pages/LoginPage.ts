/**
 * @file 登录页，提供用户名密码输入与登录跳转。
 */

import type { ComponentOptions } from '../vue-global'
import type { CurrentRoute, RouteMeta } from '../router/types'
import { BaseButton } from '../components/base/BaseButton'
import { FormField } from '../components/form/FormField'
import { FormInput } from '../components/form/FormInput'
import { useAuthStore } from '../stores/auth.store'

/** 页面 Props */
interface PageProps {
  params: Record<string, string>
  query: Record<string, string>
  meta: RouteMeta
  route: CurrentRoute
}

export const LoginPage: ComponentOptions = {
  name: 'LoginPage',
  components: { BaseButton, FormField, FormInput },
  props: {
    params: { type: Object, default: () => ({}) },
    query: { type: Object, default: () => ({}) },
    meta: { type: Object, default: () => ({}) },
    route: { type: Object, default: () => ({}) }
  },
  setup() {
    const authStore = useAuthStore()

    // 用户名
    const username = Vue.ref('')
    // 密码
    const password = Vue.ref('')
    // 错误信息
    const error = Vue.ref('')
    // 登录中状态
    const loading = Vue.ref(false)

    // 处理登录
    async function handleLogin(): Promise<void> {
      if (!username.value || !password.value) {
        error.value = '请输入用户名和密码'
        return
      }
      error.value = ''
      loading.value = true
      try {
        await authStore.login(username.value, password.value)
        // 登录成功后跳转到仪表盘
        window.location.hash = '#/dashboard'
      } catch (e) {
        error.value = e instanceof Error ? e.message : '登录失败'
      } finally {
        loading.value = false
      }
    }

    return { username, password, error, loading, handleLogin }
  },
  template: `
    <div class="space-y-4">
      <FormField label="用户名" required>
        <FormInput v-model="username" placeholder="请输入用户名" />
      </FormField>
      <FormField label="密码" required>
        <FormInput v-model="password" type="password" placeholder="请输入密码" />
      </FormField>
      <BaseButton block :loading="loading" @click="handleLogin">登录</BaseButton>
      <p v-if="error" class="text-error text-sm text-center">{{ error }}</p>
      <div class="text-center text-xs text-base-content/40">提示：任意用户名密码即可登录（演示）</div>
    </div>
  `
}
