"use strict";
/**
 * @file 个人资料设置页，展示并编辑当前用户信息。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsProfilePage = void 0;
const PageContainer_1 = require("../components/base/PageContainer");
const BaseCard_1 = require("../components/base/BaseCard");
const BaseButton_1 = require("../components/base/BaseButton");
const FormField_1 = require("../components/form/FormField");
const FormInput_1 = require("../components/form/FormInput");
const auth_store_1 = require("../stores/auth.store");
const useToast_1 = require("../composables/useToast");
exports.SettingsProfilePage = {
    name: 'SettingsProfilePage',
    components: { PageContainer: PageContainer_1.PageContainer, BaseCard: BaseCard_1.BaseCard, BaseButton: BaseButton_1.BaseButton, FormField: FormField_1.FormField, FormInput: FormInput_1.FormInput },
    props: {
        params: { type: Object, default: () => ({}) },
        query: { type: Object, default: () => ({}) },
        meta: { type: Object, default: () => ({}) },
        route: { type: Object, default: () => ({}) }
    },
    setup() {
        const authStore = (0, auth_store_1.useAuthStore)();
        const toast = (0, useToast_1.useToast)();
        // 表单字段
        const nickname = Vue.ref('');
        const email = Vue.ref('');
        const phone = Vue.ref('');
        const avatar = Vue.ref('');
        // 初始化时从当前用户填充
        Vue.onMounted(() => {
            const user = authStore.state.user;
            if (user) {
                nickname.value = user.displayName || user.username || '';
                email.value = '';
                phone.value = '';
                avatar.value = user.avatar || '';
            }
        });
        // 保存
        function handleSave() {
            toast.success('保存成功', '个人资料已更新');
        }
        return { nickname, email, phone, avatar, handleSave };
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
};
