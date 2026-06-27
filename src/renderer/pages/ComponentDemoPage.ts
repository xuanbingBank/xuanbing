/**
 * @file 组件演示页，集中展示基础组件的能力与用法。
 */

import type { ComponentOptions } from '../vue-global'
import type { CurrentRoute, RouteMeta } from '../router/types'
import { PageContainer } from '../components/base/PageContainer'
import { BaseCard } from '../components/base/BaseCard'
import { BaseButton } from '../components/base/BaseButton'
import { BaseAlert } from '../components/base/BaseAlert'
import { BaseModal } from '../components/base/BaseModal'
import { BaseDrawer } from '../components/base/BaseDrawer'
import { BaseEmpty } from '../components/base/BaseEmpty'
import { BaseLoading } from '../components/base/BaseLoading'
import { BaseError } from '../components/base/BaseError'
import { FormField } from '../components/form/FormField'
import { FormInput } from '../components/form/FormInput'
import { FormSelect } from '../components/form/FormSelect'
import { FormTextarea } from '../components/form/FormTextarea'
import { FormSwitch } from '../components/form/FormSwitch'
import { SearchForm } from '../components/form/SearchForm'
import { DataTable } from '../components/table/DataTable'
import { PermissionGate } from '../components/business/PermissionGate'
import { useToast } from '../composables/useToast'
import { useSystemNotification, useSystemMessageBox, useSystemToast } from '../composables/useSystem'

/** 页面 Props */
interface PageProps {
  params: Record<string, string>
  query: Record<string, string>
  meta: RouteMeta
  route: CurrentRoute
}

/** Toast 类型 */
type ToastType = 'success' | 'error' | 'warning' | 'info'

export const ComponentDemoPage: ComponentOptions = {
  name: 'ComponentDemoPage',
  components: {
    PageContainer,
    BaseCard,
    BaseButton,
    BaseAlert,
    BaseModal,
    BaseDrawer,
    BaseEmpty,
    BaseLoading,
    BaseError,
    FormField,
    FormInput,
    FormSelect,
    FormTextarea,
    FormSwitch,
    SearchForm,
    DataTable,
    PermissionGate
  },
  props: {
    params: { type: Object, default: () => ({}) },
    query: { type: Object, default: () => ({}) },
    meta: { type: Object, default: () => ({}) },
    route: { type: Object, default: () => ({}) }
  },
  setup() {
    const toast = useToast()
    const notify = useSystemNotification()
    const msgbox = useSystemMessageBox()
    const desktopToast = useSystemToast()

    // Modal / Drawer 显示状态
    const modalVisible = Vue.ref(false)
    const drawerVisible = Vue.ref(false)

    // 系统消息框最近结果
    const msgboxResult = Vue.ref('')

    // 表单演示数据
    const formInput = Vue.ref('')
    const formSelect = Vue.ref('')
    const formTextarea = Vue.ref('')
    const formSwitch = Vue.ref(false)
    const selectOptions = [
      { label: '选项一', value: 'opt1' },
      { label: '选项二', value: 'opt2' },
      { label: '选项三', value: 'opt3' }
    ]

    // 搜索表单数据
    const searchKeyword = Vue.ref('')
    const searchStatus = Vue.ref('')

    // 表格数据
    const tableColumns = [
      { key: 'name', title: '名称' },
      { key: 'age', title: '年龄' },
      { key: 'city', title: '城市' }
    ]
    const tableData = [
      { name: '张三', age: 28, city: '北京' },
      { name: '李四', age: 34, city: '上海' },
      { name: '王五', age: 22, city: '广州' }
    ]

    // Toast 演示
    function showToast(type: ToastType): void {
      toast[type](type + ' 提示', '这是一条演示消息')
    }

    // 搜索
    function handleSearch(): void {
      toast.info('搜索', '关键词: ' + searchKeyword.value)
    }

    // 重置
    function handleReset(): void {
      searchKeyword.value = ''
      searchStatus.value = ''
    }

    // ── 系统桌面通知演示 ──
    async function showSystemNotification(type: 'info' | 'warning' | 'error'): Promise<void> {
      const presets = {
        info: { title: '玄冰系统', body: '新版本 v2.4.1 已准备就绪，点击立即更新。' },
        warning: { title: '安全中心', body: 'C 盘剩余空间不足 5%，建议清理临时文件。' },
        error: { title: '网络服务', body: '无法连接到远程服务器，请检查网络后重试。' }
      }
      const preset = presets[type]
      try {
        await notify.show(preset.title, preset.body)
        toast.success('系统通知已发送', preset.title)
      } catch (e) {
        toast.error('通知发送失败', e instanceof Error ? e.message : String(e))
      }
    }

    // ── 桌面 Toast 浮层演示 ──
    async function showDesktopToast(position: 'top-left' | 'top-center' | 'top-right' | 'center-left' | 'center-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'): Promise<void> {
      const positionLabels: Record<string, string> = {
        'top-left': '左上角',
        'top-center': '上方居中',
        'top-right': '右上角',
        'center-left': '左侧居中',
        'center-right': '右侧居中',
        'bottom-left': '左下角',
        'bottom-center': '下方居中',
        'bottom-right': '右下角'
      }
      try {
        await desktopToast.show('桌面 Toast', `出现在${positionLabels[position]}`, { type: 'info', duration: 4000, position })
      } catch (e) {
        toast.error('Toast 显示失败', e instanceof Error ? e.message : String(e))
      }
    }

    // ── 系统消息框演示 ──
    async function showMsgboxOk(): Promise<void> {
      const result = await msgbox.show({
        title: '关于玄冰',
        message: '玄冰桌面任务管理系统 v2.4.1\nCopyright © 2026',
        type: 'info',
        buttons: ['确定']
      })
      msgboxResult.value = `点击了按钮 ${result}`
    }

    async function showMsgboxConfirm(): Promise<void> {
      const result = await msgbox.show({
        title: '确认删除',
        message: '确定要删除选中的 3 条任务记录吗？此操作不可撤销。',
        type: 'warning',
        buttons: ['删除', '取消'],
        defaultId: 1
      })
      msgboxResult.value = result === 0 ? '已删除' : '已取消'
    }

    async function showMsgboxError(): Promise<void> {
      const result = await msgbox.show({
        title: '操作失败',
        message: '文件导入失败：格式不支持或文件已损坏。是否重试？',
        type: 'error',
        buttons: ['重试', '取消'],
        defaultId: 0
      })
      msgboxResult.value = result === 0 ? '重试' : '取消'
    }

    async function showMsgboxQuestion(): Promise<void> {
      const result = await msgbox.show({
        title: '保存更改',
        message: '当前文件已修改但尚未保存。是否在关闭前保存更改？',
        type: 'question',
        buttons: ['保存', '不保存', '取消'],
        defaultId: 0
      })
      const labels = ['保存', '不保存', '取消']
      msgboxResult.value = labels[result] || `按钮 ${result}`
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
      handleReset,
      showSystemNotification,
      showDesktopToast,
      showMsgboxOk,
      showMsgboxConfirm,
      showMsgboxError,
      showMsgboxQuestion,
      msgboxResult
    }
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

        <!-- 16. 系统桌面通知 -->
        <BaseCard title="系统桌面通知" subtitle="调用 Windows Toast / macOS Notification Center">
          <div class="space-y-3">
            <div class="flex flex-wrap gap-2">
              <BaseButton variant="info" size="sm" @click="showSystemNotification('info')">信息通知</BaseButton>
              <BaseButton variant="warning" size="sm" @click="showSystemNotification('warning')">警告通知</BaseButton>
              <BaseButton variant="error" size="sm" @click="showSystemNotification('error')">错误通知</BaseButton>
            </div>
            <p class="text-xs text-base-content/50">通过 Electron Notification API 调用操作系统原生桌面通知，通知会出现在 Windows 通知中心。</p>
          </div>
        </BaseCard>

        <!-- 17. 桌面 Toast 浮层 -->
        <BaseCard title="桌面 Toast 浮层" subtitle="独立置顶透明窗口，显示在应用外的桌面上，支持 8 个方向">
          <div class="space-y-3">
            <div class="grid grid-cols-4 gap-2 max-w-sm">
              <BaseButton variant="ghost" size="sm" @click="showDesktopToast('top-left')">左上</BaseButton>
              <BaseButton variant="ghost" size="sm" @click="showDesktopToast('top-center')">上中</BaseButton>
              <BaseButton variant="ghost" size="sm" @click="showDesktopToast('top-right')">右上</BaseButton>
              <div></div>
              <BaseButton variant="ghost" size="sm" @click="showDesktopToast('center-left')">左中</BaseButton>
              <div class="flex items-center justify-center text-xs text-base-content/30">8 方向</div>
              <BaseButton variant="ghost" size="sm" @click="showDesktopToast('center-right')">右中</BaseButton>
              <div></div>
              <BaseButton variant="ghost" size="sm" @click="showDesktopToast('bottom-left')">左下</BaseButton>
              <BaseButton variant="ghost" size="sm" @click="showDesktopToast('bottom-center')">下中</BaseButton>
              <BaseButton variant="ghost" size="sm" @click="showDesktopToast('bottom-right')">右下</BaseButton>
              <div></div>
            </div>
            <p class="text-xs text-base-content/50">点击按钮在桌面对应位置显示 Toast 浮层（不在应用窗口内），4 秒后自动消失。窗口位置和 toast 排列方向自动适配。</p>
          </div>
        </BaseCard>

        <!-- 18. 系统消息框 -->
        <BaseCard title="系统消息框" subtitle="调用 Windows MessageBox 原生弹窗">
          <div class="space-y-3">
            <div class="flex flex-wrap gap-2">
              <BaseButton variant="info" size="sm" @click="showMsgboxOk">关于框</BaseButton>
              <BaseButton variant="warning" size="sm" @click="showMsgboxConfirm">确认删除</BaseButton>
              <BaseButton variant="error" size="sm" @click="showMsgboxError">错误重试</BaseButton>
              <BaseButton variant="primary" size="sm" @click="showMsgboxQuestion">保存确认</BaseButton>
            </div>
            <p v-if="msgboxResult" class="text-sm text-base-content/70 px-3 py-2 bg-base-200 rounded">{{ msgboxResult }}</p>
            <p class="text-xs text-base-content/50">通过 dialog.showMessageBox 调用操作系统原生消息框，返回用户点击的按钮索引。</p>
          </div>
        </BaseCard>
      </div>
    </PageContainer>
  `
}
