"use strict";
/**
 * @file 组件演示页，集中展示基础组件的能力与用法。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComponentDemoPage = void 0;
const PageContainer_1 = require("../components/base/PageContainer");
const BaseCard_1 = require("../components/base/BaseCard");
const BaseButton_1 = require("../components/base/BaseButton");
const BaseAlert_1 = require("../components/base/BaseAlert");
const BaseModal_1 = require("../components/base/BaseModal");
const BaseDrawer_1 = require("../components/base/BaseDrawer");
const BaseEmpty_1 = require("../components/base/BaseEmpty");
const BaseLoading_1 = require("../components/base/BaseLoading");
const BaseError_1 = require("../components/base/BaseError");
const FormField_1 = require("../components/form/FormField");
const FormInput_1 = require("../components/form/FormInput");
const FormSelect_1 = require("../components/form/FormSelect");
const FormTextarea_1 = require("../components/form/FormTextarea");
const FormSwitch_1 = require("../components/form/FormSwitch");
const SearchForm_1 = require("../components/form/SearchForm");
const DataTable_1 = require("../components/table/DataTable");
const PermissionGate_1 = require("../components/business/PermissionGate");
const useToast_1 = require("../composables/useToast");
exports.ComponentDemoPage = {
    name: 'ComponentDemoPage',
    components: {
        PageContainer: PageContainer_1.PageContainer,
        BaseCard: BaseCard_1.BaseCard,
        BaseButton: BaseButton_1.BaseButton,
        BaseAlert: BaseAlert_1.BaseAlert,
        BaseModal: BaseModal_1.BaseModal,
        BaseDrawer: BaseDrawer_1.BaseDrawer,
        BaseEmpty: BaseEmpty_1.BaseEmpty,
        BaseLoading: BaseLoading_1.BaseLoading,
        BaseError: BaseError_1.BaseError,
        FormField: FormField_1.FormField,
        FormInput: FormInput_1.FormInput,
        FormSelect: FormSelect_1.FormSelect,
        FormTextarea: FormTextarea_1.FormTextarea,
        FormSwitch: FormSwitch_1.FormSwitch,
        SearchForm: SearchForm_1.SearchForm,
        DataTable: DataTable_1.DataTable,
        PermissionGate: PermissionGate_1.PermissionGate
    },
    props: {
        params: { type: Object, default: () => ({}) },
        query: { type: Object, default: () => ({}) },
        meta: { type: Object, default: () => ({}) },
        route: { type: Object, default: () => ({}) }
    },
    setup() {
        const toast = (0, useToast_1.useToast)();
        // Modal / Drawer 显示状态
        const modalVisible = Vue.ref(false);
        const drawerVisible = Vue.ref(false);
        // 表单演示数据
        const formInput = Vue.ref('');
        const formSelect = Vue.ref('');
        const formTextarea = Vue.ref('');
        const formSwitch = Vue.ref(false);
        const selectOptions = [
            { label: '选项一', value: 'opt1' },
            { label: '选项二', value: 'opt2' },
            { label: '选项三', value: 'opt3' }
        ];
        // 搜索表单数据
        const searchKeyword = Vue.ref('');
        const searchStatus = Vue.ref('');
        // 表格数据
        const tableColumns = [
            { key: 'name', title: '名称' },
            { key: 'age', title: '年龄' },
            { key: 'city', title: '城市' }
        ];
        const tableData = [
            { name: '张三', age: 28, city: '北京' },
            { name: '李四', age: 34, city: '上海' },
            { name: '王五', age: 22, city: '广州' }
        ];
        // Toast 演示
        function showToast(type) {
            toast[type](type + ' 提示', '这是一条演示消息');
        }
        // 搜索
        function handleSearch() {
            toast.info('搜索', '关键词: ' + searchKeyword.value);
        }
        // 重置
        function handleReset() {
            searchKeyword.value = '';
            searchStatus.value = '';
        }
        return {
            modalVisible,
            drawerVisible,
            formInput,
            formSelect,
            formTextarea,
            formSwitch,
            selectOptions,
            searchKeyword,
            searchStatus,
            tableColumns,
            tableData,
            showToast,
            handleSearch,
            handleReset
        };
    },
    template: `
    <PageContainer title="组件演示" description="基础组件能力展示">
      <div class="space-y-6">
        <!-- 1. Button -->
        <BaseCard title="Button 按钮" subtitle="变体、尺寸、状态">
          <div class="space-y-3">
            <div class="flex flex-wrap gap-2">
              <BaseButton variant="primary">primary</BaseButton>
              <BaseButton variant="secondary">secondary</BaseButton>
              <BaseButton variant="accent">accent</BaseButton>
              <BaseButton variant="ghost">ghost</BaseButton>
              <BaseButton variant="link">link</BaseButton>
              <BaseButton variant="error">error</BaseButton>
              <BaseButton variant="warning">warning</BaseButton>
              <BaseButton variant="success">success</BaseButton>
              <BaseButton variant="info">info</BaseButton>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <BaseButton size="xs">xs</BaseButton>
              <BaseButton size="sm">sm</BaseButton>
              <BaseButton size="md">md</BaseButton>
              <BaseButton size="lg">lg</BaseButton>
            </div>
            <div class="flex flex-wrap gap-2">
              <BaseButton :loading="true">loading</BaseButton>
              <BaseButton :disabled="true">disabled</BaseButton>
              <BaseButton variant="primary" outline>outline</BaseButton>
            </div>
            <BaseButton block>block</BaseButton>
          </div>
        </BaseCard>

        <!-- 2. Card -->
        <BaseCard title="Card 卡片" subtitle="标题与副标题">
          <p class="text-sm">这是卡片内容，支持 title、subtitle、loading 等属性。</p>
        </BaseCard>

        <!-- 3. Alert -->
        <BaseCard title="Alert 告警" subtitle="四种类型">
          <div class="space-y-2">
            <BaseAlert type="info" title="信息" description="这是一条信息提示" />
            <BaseAlert type="success" title="成功" description="操作已完成" />
            <BaseAlert type="warning" title="警告" description="请注意潜在风险" />
            <BaseAlert type="error" title="错误" description="操作执行失败" />
          </div>
        </BaseCard>

        <!-- 4. Modal -->
        <BaseCard title="Modal 模态框" subtitle="点击按钮打开">
          <BaseButton variant="primary" @click="modalVisible = true">打开模态框</BaseButton>
          <BaseModal v-model="modalVisible" title="演示模态框">
            <p class="text-sm">这是一个模态框示例内容。</p>
          </BaseModal>
        </BaseCard>

        <!-- 5. Drawer -->
        <BaseCard title="Drawer 抽屉" subtitle="点击按钮打开">
          <BaseButton variant="primary" @click="drawerVisible = true">打开抽屉</BaseButton>
          <BaseDrawer v-model="drawerVisible" title="演示抽屉">
            <p class="text-sm">这是抽屉内容。</p>
          </BaseDrawer>
        </BaseCard>

        <!-- 6. Toast -->
        <BaseCard title="Toast 提示" subtitle="四种类型">
          <div class="flex flex-wrap gap-2">
            <BaseButton variant="success" size="sm" @click="showToast('success')">success</BaseButton>
            <BaseButton variant="error" size="sm" @click="showToast('error')">error</BaseButton>
            <BaseButton variant="warning" size="sm" @click="showToast('warning')">warning</BaseButton>
            <BaseButton variant="info" size="sm" @click="showToast('info')">info</BaseButton>
          </div>
        </BaseCard>

        <!-- 7. Form -->
        <BaseCard title="Form 表单" subtitle="表单组件集合">
          <div class="space-y-4 max-w-lg">
            <FormField label="文本输入" required>
              <FormInput v-model="formInput" placeholder="请输入文本" />
            </FormField>
            <FormField label="下拉选择">
              <FormSelect v-model="formSelect" :options="selectOptions" placeholder="请选择" />
            </FormField>
            <FormField label="多行文本">
              <FormTextarea v-model="formTextarea" placeholder="请输入内容" />
            </FormField>
            <FormField label="开关">
              <FormSwitch v-model="formSwitch" label="启用选项" />
            </FormField>
          </div>
        </BaseCard>

        <!-- 8. SearchForm -->
        <BaseCard title="SearchForm 搜索表单" subtitle="搜索与重置">
          <SearchForm @search="handleSearch" @reset="handleReset">
            <FormField label="关键词">
              <FormInput v-model="searchKeyword" placeholder="请输入关键词" />
            </FormField>
            <FormField label="状态">
              <FormSelect v-model="searchStatus" :options="selectOptions" placeholder="请选择状态" />
            </FormField>
          </SearchForm>
        </BaseCard>

        <!-- 9. DataTable -->
        <BaseCard title="DataTable 数据表格" subtitle="简单表格">
          <DataTable :columns="tableColumns" :data="tableData" row-key="name" />
        </BaseCard>

        <!-- 10. Empty -->
        <BaseCard title="Empty 空状态">
          <BaseEmpty title="暂无数据" description="这里还没有任何内容" />
        </BaseCard>

        <!-- 11. Loading -->
        <BaseCard title="Loading 加载" subtitle="多种模式">
          <div class="space-y-4">
            <div>
              <p class="text-xs text-base-content/50 mb-1">spinner</p>
              <BaseLoading type="spinner" />
            </div>
            <div>
              <p class="text-xs text-base-content/50 mb-1">skeleton</p>
              <BaseLoading type="skeleton" />
            </div>
            <div>
              <p class="text-xs text-base-content/50 mb-1">text</p>
              <BaseLoading type="text" text="加载中..." />
            </div>
          </div>
        </BaseCard>

        <!-- 12. Error -->
        <BaseCard title="Error 错误状态">
          <BaseError
            title="加载失败"
            description="数据获取失败，请重试"
            :show-retry="false"
            :show-back="false"
            :show-home="false"
          />
        </BaseCard>

        <!-- 13. ThemeToggle -->
        <BaseCard title="ThemeToggle 主题切换" subtitle="主题切换组件">
          <p class="text-sm text-base-content/60">主题切换组件位于顶部导航栏，点击图标可切换浅色/深色/商务/企业主题。</p>
        </BaseCard>

        <!-- 14. PermissionGate -->
        <BaseCard title="PermissionGate 权限控制" subtitle="根据权限显示内容">
          <PermissionGate :permissions="['user:create']">
            <BaseButton variant="primary" size="sm">拥有 user:create 权限可见</BaseButton>
            <template #fallback>
              <p class="text-sm text-base-content/50">当前用户无 user:create 权限，按钮已隐藏。</p>
            </template>
          </PermissionGate>
        </BaseCard>

        <!-- 15. WindowControls -->
        <BaseCard title="WindowControls 窗口控制" subtitle="窗口操作组件">
          <p class="text-sm text-base-content/60">窗口控制组件位于标题栏右侧，提供最小化、最大化/还原、关闭按钮，通过 useWindowControls 组合式函数实现。</p>
        </BaseCard>
      </div>
    </PageContainer>
  `
};
