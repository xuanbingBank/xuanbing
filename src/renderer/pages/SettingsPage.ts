/**
 * @file 设置页，提供通用设置、通知设置与关于信息。
 */

import type { ComponentOptions } from '../vue-global'
import type { CurrentRoute, RouteMeta } from '../router/types'
import { PageContainer } from '../components/base/PageContainer'
import { BaseCard } from '../components/base/BaseCard'
import { BaseButton } from '../components/base/BaseButton'
import { FormField } from '../components/form/FormField'
import { FormSelect } from '../components/form/FormSelect'
import { FormSwitch } from '../components/form/FormSwitch'
import { useThemeStore } from '../stores/theme.store'
import { useLayoutStore } from '../stores/layout.store'
import { useToast } from '../composables/useToast'
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
  components: { PageContainer, BaseCard, BaseButton, FormField, FormSelect, FormSwitch },
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

    // 当前主题
    const currentTheme = Vue.computed(() => themeStore.currentTheme.value as string)
    // 可用主题选项
    const themeOptions = themeStore.availableThemes.map((t) => ({
      label: t.label,
      value: t.value
    }))
    // 侧栏折叠状态
    const sidebarCollapsed = Vue.computed(() => layoutStore.state.sidebarCollapsed)

    // 通知设置
    const desktopNotify = Vue.ref(true)
    const soundNotify = Vue.ref(false)
    const autoUpdate = Vue.ref(true)

    // 主题变更
    function handleThemeChange(value: string): void {
      themeStore.setTheme(value as ThemeName)
    }

    // 侧栏折叠变更
    function handleSidebarChange(value: boolean): void {
      layoutStore.setSidebarCollapsed(value)
    }

    // 保存设置
    function handleSave(): void {
      toast.success('保存成功', '设置已更新')
    }

    return {
      currentTheme,
      themeOptions,
      sidebarCollapsed,
      desktopNotify,
      soundNotify,
      autoUpdate,
      handleThemeChange,
      handleSidebarChange,
      handleSave
    }
  },
  template: `
    <PageContainer title="设置">
      <div class="space-y-6">
        <!-- 通用设置 -->
        <BaseCard title="通用设置" subtitle="主题与界面偏好">
          <div class="space-y-4">
            <FormField label="主题">
              <FormSelect
                :model-value="currentTheme"
                :options="themeOptions"
                @update:model-value="handleThemeChange"
              />
            </FormField>
            <FormField label="侧栏折叠" hint="折叠侧栏以获得更大的内容区域">
              <FormSwitch
                :model-value="sidebarCollapsed"
                label="折叠侧栏"
                @update:model-value="handleSidebarChange"
              />
            </FormField>
          </div>
        </BaseCard>

        <!-- 通知设置 -->
        <BaseCard title="通知设置" subtitle="消息提醒方式">
          <div class="space-y-4">
            <FormField label="桌面通知">
              <FormSwitch v-model="desktopNotify" label="启用桌面通知" />
            </FormField>
            <FormField label="声音提醒">
              <FormSwitch v-model="soundNotify" label="启用声音提醒" />
            </FormField>
            <FormField label="自动更新">
              <FormSwitch v-model="autoUpdate" label="自动检查更新" />
            </FormField>
          </div>
        </BaseCard>

        <!-- 关于 -->
        <BaseCard title="关于" subtitle="应用信息">
          <p class="text-sm text-base-content/60">All In One v1.0.0，基于 Electron + Vue 3 + TypeScript 构建。</p>
        </BaseCard>

        <!-- 保存按钮 -->
        <div class="flex justify-end">
          <BaseButton variant="primary" @click="handleSave">保存设置</BaseButton>
        </div>
      </div>
    </PageContainer>
  `
}
