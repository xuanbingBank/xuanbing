"use strict";
/**
 * @file 设置页，提供通用设置、通知设置与关于信息。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsPage = void 0;
const PageContainer_1 = require("../components/base/PageContainer");
const BaseCard_1 = require("../components/base/BaseCard");
const BaseButton_1 = require("../components/base/BaseButton");
const FormField_1 = require("../components/form/FormField");
const FormSelect_1 = require("../components/form/FormSelect");
const FormSwitch_1 = require("../components/form/FormSwitch");
const theme_store_1 = require("../stores/theme.store");
const layout_store_1 = require("../stores/layout.store");
const useToast_1 = require("../composables/useToast");
exports.SettingsPage = {
    name: 'SettingsPage',
    components: { PageContainer: PageContainer_1.PageContainer, BaseCard: BaseCard_1.BaseCard, BaseButton: BaseButton_1.BaseButton, FormField: FormField_1.FormField, FormSelect: FormSelect_1.FormSelect, FormSwitch: FormSwitch_1.FormSwitch },
    props: {
        params: { type: Object, default: () => ({}) },
        query: { type: Object, default: () => ({}) },
        meta: { type: Object, default: () => ({}) },
        route: { type: Object, default: () => ({}) }
    },
    setup() {
        const themeStore = (0, theme_store_1.useThemeStore)();
        const layoutStore = (0, layout_store_1.useLayoutStore)();
        const toast = (0, useToast_1.useToast)();
        // 当前主题
        const currentTheme = Vue.computed(() => themeStore.currentTheme.value);
        // 可用主题选项
        const themeOptions = themeStore.availableThemes.map((t) => ({
            label: t.label,
            value: t.value
        }));
        // 侧栏折叠状态
        const sidebarCollapsed = Vue.computed(() => layoutStore.state.sidebarCollapsed);
        // 通知设置
        const desktopNotify = Vue.ref(true);
        const soundNotify = Vue.ref(false);
        const autoUpdate = Vue.ref(true);
        // 主题变更
        function handleThemeChange(value) {
            themeStore.setTheme(value);
        }
        // 侧栏折叠变更
        function handleSidebarChange(value) {
            layoutStore.setSidebarCollapsed(value);
        }
        // 保存设置
        function handleSave() {
            toast.success('保存成功', '设置已更新');
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
        };
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
};
