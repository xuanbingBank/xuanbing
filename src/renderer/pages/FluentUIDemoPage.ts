/**
 * @file Fluent UI 演示页。
 *
 * 集中展示所有 Fluent 风格组件的用法与样式，便于开发预览与回归测试。
 * 包含：按钮、图标、卡片、表单、数据展示、导航、反馈、业务组件等。
 */

import type { ComponentOptions } from '../vue-global'
import type { CurrentRoute, RouteMeta } from '../router/types'
import { FluentPage } from '../components/layout/FluentPage'
import { FluentCard } from '../components/base/FluentCard'
import { FluentButton } from '../components/base/FluentButton'
import { FluentIconButton } from '../components/base/FluentIconButton'
import { FluentIcon } from '../components/base/FluentIcon'
import { FluentInput } from '../components/base/FluentInput'
import { FluentSelect } from '../components/base/FluentSelect'
import { FluentTextarea } from '../components/base/FluentTextarea'
import { FluentSwitch } from '../components/base/FluentSwitch'
import { FluentCheckbox } from '../components/base/FluentCheckbox'
import { FluentBadge } from '../components/base/FluentBadge'
import { FluentTag } from '../components/base/FluentTag'
import { FluentDivider } from '../components/base/FluentDivider'
import { FluentSegmented } from '../components/base/FluentSegmented'
import { FluentModal } from '../components/base/FluentModal'
import { FluentDrawer } from '../components/base/FluentDrawer'
import { FluentDropdown } from '../components/base/FluentDropdown'
import type { FluentDropdownItem } from '../components/base/FluentDropdown'
import { FluentTable } from '../components/data/FluentTable'
import type { FluentTableColumn } from '../components/data/FluentTable'
import { FluentPagination } from '../components/data/FluentPagination'
import { FluentStatCard } from '../components/data/FluentStatCard'
import { FluentDescriptionList } from '../components/data/FluentDescriptionList'
import type { FluentDescriptionItem } from '../components/data/FluentDescriptionList'
import { FluentBreadcrumb } from '../components/navigation/FluentBreadcrumb'
import type { FluentBreadcrumbItem } from '../components/navigation/FluentBreadcrumb'
import { FluentTabs } from '../components/navigation/FluentTabs'
import type { FluentTabItem } from '../components/navigation/FluentTabs'
import { FluentCommandBar } from '../components/navigation/FluentCommandBar'
import type { FluentCommandBarItem } from '../components/navigation/FluentCommandBar'
import { FluentFormField } from '../components/form/FluentFormField'
import { FluentFormActions } from '../components/form/FluentFormActions'
import { StatusBadge } from '../components/business/StatusBadge'
import { useToast } from '../composables/useToast'

/** 页面 Props */
interface PageProps {
  params: Record<string, string>
  query: Record<string, string>
  meta: RouteMeta
  route: CurrentRoute
}

export const FluentUIDemoPage: ComponentOptions = {
  name: 'FluentUIDemoPage',
  components: {
    FluentPage,
    FluentCard,
    FluentButton,
    FluentIconButton,
    FluentIcon,
    FluentInput,
    FluentSelect,
    FluentTextarea,
    FluentSwitch,
    FluentCheckbox,
    FluentBadge,
    FluentTag,
    FluentDivider,
    FluentSegmented,
    FluentModal,
    FluentDrawer,
    FluentDropdown,
    FluentTable,
    FluentPagination,
    FluentStatCard,
    FluentDescriptionList,
    FluentBreadcrumb,
    FluentTabs,
    FluentCommandBar,
    FluentFormField,
    FluentFormActions,
    StatusBadge
  },
  props: {
    params: { type: Object, default: () => ({}) },
    query: { type: Object, default: () => ({}) },
    meta: { type: Object, default: () => ({}) },
    route: { type: Object, default: () => ({}) }
  },
  setup() {
    const toast = useToast()

    // 表单状态
    const inputValue = Vue.ref('')
    const selectValue = Vue.ref('option1')
    const textareaValue = Vue.ref('')
    const switchValue = Vue.ref(true)
    const checkboxValue = Vue.ref(false)
    const segmentedValue = Vue.ref('tab1')

    const selectOptions = [
      { label: '选项一', value: 'option1' },
      { label: '选项二', value: 'option2' },
      { label: '选项三', value: 'option3' }
    ]

    const segmentedOptions = [
      { label: '标签一', value: 'tab1' },
      { label: '标签二', value: 'tab2' },
      { label: '标签三', value: 'tab3' }
    ]

    // Modal / Drawer
    const modalVisible = Vue.ref(false)
    const drawerVisible = Vue.ref(false)

    // Dropdown 项
    const dropdownItems: FluentDropdownItem[] = [
      { id: 'edit', title: '编辑', icon: 'edit' },
      { id: 'copy', title: '复制', icon: 'copy', shortcut: 'Ctrl+C' },
      { id: 'divider', title: '', divider: true },
      { id: 'delete', title: '删除', icon: 'delete', danger: true }
    ]

    function handleDropdownSelect(item: FluentDropdownItem): void {
      toast.info('下拉选择', item.title)
    }

    // 面包屑
    const breadcrumbItems: FluentBreadcrumbItem[] = [
      { title: '首页', path: '/', clickable: true },
      { title: '演示', path: '/demo', clickable: true },
      { title: 'Fluent UI', clickable: false }
    ]

    // 标签页
    const tabItems: FluentTabItem[] = [
      { key: 'overview', label: '概览' },
      { key: 'detail', label: '详情' },
      { key: 'settings', label: '设置' }
    ]
    const activeTab = Vue.ref('overview')

    // 统计卡片
    const stats = [
      { label: '总用户', value: '12,847', unit: '人', icon: 'user', color: 'brand' as const, trend: 'up' as const, trendValue: '12.5%', trendLabel: '较上月' },
      { label: '活跃用户', value: '3,692', unit: '人', icon: 'dashboard', color: 'success' as const, trend: 'up' as const, trendValue: '8.2%', trendLabel: '较上周' },
      { label: '任务完成', value: '98.5', unit: '%', icon: 'check', color: 'info' as const, trend: 'flat' as const, trendValue: '0.1%', trendLabel: '较昨日' },
      { label: '错误率', value: '0.3', unit: '%', icon: 'warning', color: 'error' as const, trend: 'down' as const, trendValue: '0.1%', trendLabel: '较昨日' }
    ]

    // 表格
    const tableColumns: FluentTableColumn[] = [
      { key: 'id', title: 'ID', width: '80px' },
      { key: 'name', title: '名称' },
      { key: 'status', title: '状态', width: '120px' },
      { key: 'createdAt', title: '创建时间', width: '180px' }
    ]

    const tableData = [
      { id: 1, name: '示例任务一', status: 'success', createdAt: '2026-06-22 10:30' },
      { id: 2, name: '示例任务二', status: 'running', createdAt: '2026-06-22 11:00' },
      { id: 3, name: '示例任务三', status: 'pending', createdAt: '2026-06-22 11:30' },
      { id: 4, name: '示例任务四', status: 'failed', createdAt: '2026-06-22 12:00' },
      { id: 5, name: '示例任务五', status: 'success', createdAt: '2026-06-22 12:30' }
    ]

    // 分页
    const currentPage = Vue.ref(1)
    const pageSize = Vue.ref(20)

    function handlePageChange(page: number): void {
      toast.info('分页', '跳转到第 ' + page + ' 页')
    }

    // 描述列表
    const descriptionItems: FluentDescriptionItem[] = [
      { label: '任务名称', value: 'Fluent UI 系统构建' },
      { label: '负责人', value: '前端团队' },
      { label: '状态', value: '进行中' },
      { label: '优先级', value: '高' },
      { label: '创建时间', value: '2026-06-22 09:00' },
      { label: '预计完成', value: '2026-06-23 18:00' },
      { label: '描述', value: '构建完整的 Fluent UI 组件系统，包含基础组件、数据组件、表单组件、业务组件等', span: 2 }
    ]

    // 命令栏
    const primaryAction: FluentCommandBarItem = {
      id: 'create',
      title: '新建',
      icon: 'plus'
    }
    const secondaryActions: FluentCommandBarItem[] = [
      { id: 'import', title: '导入', icon: 'download' },
      { id: 'export', title: '导出', icon: 'upload' },
      { id: 'refresh', title: '刷新', icon: 'refresh' }
    ]
    const moreActions: FluentCommandBarItem[] = [
      { id: 'settings', title: '设置', icon: 'settings' },
      { id: 'divider', title: '', divider: true },
      { id: 'delete', title: '清空', icon: 'delete', danger: true }
    ]

    function handleCommandAction(item: FluentCommandBarItem): void {
      toast.info('命令栏', item.title)
    }

    // Toast 演示
    function showSuccessToast(): void {
      toast.success('操作成功', '这是一条成功提示')
    }
    function showErrorToast(): void {
      toast.error('操作失败', '这是一条错误提示')
    }
    function showWarningToast(): void {
      toast.warning('警告', '这是一条警告提示')
    }
    function showInfoToast(): void {
      toast.info('提示', '这是一条信息提示')
    }

    // 图标列表
    const iconNames = [
      'home', 'dashboard', 'task', 'settings', 'profile', 'security', 'info',
      'log', 'beaker', 'sparkle', 'search', 'bell', 'menu', 'close', 'check',
      'plus', 'minus', 'refresh', 'filter', 'more', 'edit', 'delete', 'eye',
      'download', 'upload', 'sun', 'moon', 'window', 'user', 'logout',
      'warning', 'error', 'success', 'star', 'folder', 'link', 'copy'
    ]

    return {
      inputValue,
      selectValue,
      textareaValue,
      switchValue,
      checkboxValue,
      segmentedValue,
      selectOptions,
      segmentedOptions,
      modalVisible,
      drawerVisible,
      dropdownItems,
      breadcrumbItems,
      tabItems,
      activeTab,
      stats,
      tableColumns,
      tableData,
      currentPage,
      pageSize,
      descriptionItems,
      primaryAction,
      secondaryActions,
      moreActions,
      iconNames,
      handleDropdownSelect,
      handlePageChange,
      handleCommandAction,
      showSuccessToast,
      showErrorToast,
      showWarningToast,
      showInfoToast
    }
  },
  template: `
    <FluentPage title="Fluent UI 演示" description="Fluent 风格组件系统预览">
      <!-- 命令栏 -->
      <div class="mb-6">
        <FluentCommandBar
          :primary="primaryAction"
          :secondary="secondaryActions"
          :more="moreActions"
          @action="handleCommandAction"
        />
      </div>

      <!-- 统计卡片 -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <FluentStatCard
          v-for="stat in stats"
          :key="stat.label"
          :label="stat.label"
          :value="stat.value"
          :unit="stat.unit"
          :icon="stat.icon"
          :color="stat.color"
          :trend="stat.trend"
          :trend-value="stat.trendValue"
          :trend-label="stat.trendLabel"
        />
      </div>

      <!-- 面包屑 + 标签页 -->
      <FluentCard class="mb-6">
        <div class="mb-4">
          <FluentBreadcrumb :items="breadcrumbItems" />
        </div>
        <FluentTabs v-model="activeTab" :tabs="tabItems" />
        <div class="mt-4 text-sm text-[var(--xb-text-secondary)]">
          当前标签：{{ activeTab }}
        </div>
      </FluentCard>

      <!-- 按钮组件 -->
      <FluentCard title="按钮" subtitle="变体、尺寸、状态" class="mb-6">
        <div class="space-y-4">
          <div class="flex flex-wrap items-center gap-2">
            <FluentButton variant="primary">主要按钮</FluentButton>
            <FluentButton variant="secondary">次要按钮</FluentButton>
            <FluentButton variant="subtle">弱化按钮</FluentButton>
            <FluentButton variant="transparent">透明按钮</FluentButton>
            <FluentButton variant="danger">危险按钮</FluentButton>
            <FluentButton variant="success">成功按钮</FluentButton>
          </div>
          <FluentDivider />
          <div class="flex flex-wrap items-center gap-2">
            <FluentButton variant="primary" size="small">小</FluentButton>
            <FluentButton variant="primary" size="medium">中</FluentButton>
            <FluentButton variant="primary" size="large">大</FluentButton>
          </div>
          <FluentDivider />
          <div class="flex flex-wrap items-center gap-2">
            <FluentButton variant="primary" icon="plus">带图标</FluentButton>
            <FluentButton variant="secondary" icon="check" icon-position="right">右图标</FluentButton>
            <FluentButton variant="primary" loading>加载中</FluentButton>
            <FluentButton variant="primary" disabled>禁用</FluentButton>
            <FluentIconButton icon="refresh" tooltip="刷新" />
            <FluentIconButton icon="delete" tooltip="删除" danger />
          </div>
        </div>
      </FluentCard>

      <!-- 表单组件 -->
      <FluentCard title="表单" subtitle="输入、选择、开关" class="mb-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FluentFormField label="用户名" required hint="请输入用户名">
            <FluentInput v-model="inputValue" placeholder="请输入用户名" clearable />
          </FluentFormField>
          <FluentFormField label="角色" hint="选择用户角色">
            <FluentSelect v-model="selectValue" :options="selectOptions" />
          </FluentFormField>
          <FluentFormField label="描述" hint="请输入描述信息">
            <FluentTextarea v-model="textareaValue" placeholder="请输入描述" :rows="3" />
          </FluentFormField>
          <FluentFormField label="开关">
            <FluentSwitch v-model="switchValue" label="启用通知" />
          </FluentFormField>
          <FluentFormField label="复选框">
            <FluentCheckbox v-model="checkboxValue" label="我已阅读并同意条款" />
          </FluentFormField>
          <FluentFormField label="分段选择">
            <FluentSegmented v-model="segmentedValue" :options="segmentedOptions" />
          </FluentFormField>
        </div>
        <FluentFormActions align="right" class="mt-4">
          <FluentButton variant="secondary">取消</FluentButton>
          <FluentButton variant="primary" icon="check">提交</FluentButton>
        </FluentFormActions>
      </FluentCard>

      <!-- 数据展示 -->
      <FluentCard title="表格" subtitle="排序、选择、分页" class="mb-6">
        <FluentTable
          :columns="tableColumns"
          :data="tableData"
          row-key="id"
          selectable
        />
        <div class="mt-4">
          <FluentPagination
            :current="currentPage"
            :page-size="pageSize"
            :total="100"
            @change="handlePageChange"
          />
        </div>
      </FluentCard>

      <!-- 描述列表 -->
      <FluentCard title="描述列表" class="mb-6">
        <FluentDescriptionList :items="descriptionItems" :columns="2" />
      </FluentCard>

      <!-- 徽标与标签 -->
      <FluentCard title="徽标与标签" class="mb-6">
        <div class="space-y-4">
          <div class="flex flex-wrap items-center gap-2">
            <FluentBadge>默认</FluentBadge>
            <FluentBadge variant="brand">品牌</FluentBadge>
            <FluentBadge variant="success">成功</FluentBadge>
            <FluentBadge variant="warning">警告</FluentBadge>
            <FluentBadge variant="error">错误</FluentBadge>
            <FluentBadge variant="info">信息</FluentBadge>
          </div>
          <FluentDivider />
          <div class="flex flex-wrap items-center gap-2">
            <FluentBadge dot>默认</FluentBadge>
            <FluentBadge variant="success" dot>成功</FluentBadge>
            <FluentBadge variant="warning" dot>警告</FluentBadge>
          </div>
          <FluentDivider />
          <div class="flex flex-wrap items-center gap-2">
            <FluentTag>默认标签</FluentTag>
            <FluentTag closable>可关闭</FluentTag>
            <StatusBadge status="pending" />
            <StatusBadge status="running" />
            <StatusBadge status="success" />
            <StatusBadge status="failed" />
          </div>
        </div>
      </FluentCard>

      <!-- 反馈组件 -->
      <FluentCard title="反馈" subtitle="Toast / Modal / Drawer / Dropdown" class="mb-6">
        <div class="space-y-4">
          <div class="flex flex-wrap items-center gap-2">
            <FluentButton variant="secondary" icon="success" @click="showSuccessToast">成功 Toast</FluentButton>
            <FluentButton variant="secondary" icon="error" @click="showErrorToast">错误 Toast</FluentButton>
            <FluentButton variant="secondary" icon="warning" @click="showWarningToast">警告 Toast</FluentButton>
            <FluentButton variant="secondary" icon="info" @click="showInfoToast">信息 Toast</FluentButton>
          </div>
          <FluentDivider />
          <div class="flex flex-wrap items-center gap-2">
            <FluentButton variant="secondary" @click="modalVisible = true">打开 Modal</FluentButton>
            <FluentButton variant="secondary" @click="drawerVisible = true">打开 Drawer</FluentButton>
            <FluentDropdown :items="dropdownItems" placement="bottom-start" @select="handleDropdownSelect">
              <FluentButton variant="secondary" icon="more">下拉菜单</FluentButton>
            </FluentDropdown>
          </div>
        </div>
      </FluentCard>

      <!-- 图标库 -->
      <FluentCard title="图标" subtitle="Fluent 风格线性图标" class="mb-6">
        <div class="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
          <div
            v-for="name in iconNames"
            :key="name"
            class="flex flex-col items-center gap-1 p-2 rounded-[var(--xb-radius-md)] hover:bg-[var(--xb-bg-hover)] transition-colors"
          >
            <FluentIcon :name="name" :size="20" class="text-[var(--xb-text-secondary)]" />
            <span class="text-[10px] text-[var(--xb-text-tertiary)] truncate w-full text-center">{{ name }}</span>
          </div>
        </div>
      </FluentCard>

      <!-- Modal -->
      <FluentModal
        v-model="modalVisible"
        title="示例弹窗"
        description="这是一个 Fluent 风格的模态框"
        :show-confirm="true"
        :show-cancel="true"
      >
        <p class="text-sm text-[var(--xb-text-secondary)]">
          Modal 内容区域。可以放置任何内容，包括表单、文本、图表等。
        </p>
      </FluentModal>

      <!-- Drawer -->
      <FluentDrawer
        v-model="drawerVisible"
        title="示例抽屉"
        description="这是一个 Fluent 风格的抽屉"
      >
        <p class="text-sm text-[var(--xb-text-secondary)]">
          Drawer 内容区域。适合展示详细信息、设置面板等。
        </p>
      </FluentDrawer>
    </FluentPage>
  `
}
