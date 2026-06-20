"use strict";
/**
 * @file 任务中心页，展示任务列表与状态，支持查看与取消操作。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskCenterPage = void 0;
const PageContainer_1 = require("../components/base/PageContainer");
const BaseButton_1 = require("../components/base/BaseButton");
const DataTable_1 = require("../components/table/DataTable");
const useToast_1 = require("../composables/useToast");
/** 状态到 badge class 映射 */
const statusBadgeMap = {
    running: 'badge-primary',
    completed: 'badge-success',
    failed: 'badge-error',
    cancelled: 'badge-warning'
};
/** 状态到中文文案映射 */
const statusTextMap = {
    running: '运行中',
    completed: '已完成',
    failed: '已失败',
    cancelled: '已取消'
};
exports.TaskCenterPage = {
    name: 'TaskCenterPage',
    components: { PageContainer: PageContainer_1.PageContainer, BaseButton: BaseButton_1.BaseButton, DataTable: DataTable_1.DataTable },
    props: {
        params: { type: Object, default: () => ({}) },
        query: { type: Object, default: () => ({}) },
        meta: { type: Object, default: () => ({}) },
        route: { type: Object, default: () => ({}) }
    },
    setup() {
        const toast = (0, useToast_1.useToast)();
        // 任务列表 mock 数据
        const tasks = Vue.ref([
            { taskId: 'task-1001', name: '数据同步', status: 'running', progress: 65, createdAt: '2026-06-20 09:30' },
            { taskId: 'task-1002', name: '日志归档', status: 'completed', progress: 100, createdAt: '2026-06-20 08:15' },
            { taskId: 'task-1003', name: '报表生成', status: 'failed', progress: 45, createdAt: '2026-06-19 18:00' },
            { taskId: 'task-1004', name: '缓存清理', status: 'cancelled', progress: 20, createdAt: '2026-06-19 14:20' },
            { taskId: 'task-1005', name: '索引重建', status: 'completed', progress: 100, createdAt: '2026-06-19 10:00' }
        ]);
        // 表格列定义
        const columns = [
            { key: 'taskId', title: '任务ID', width: '140px' },
            { key: 'name', title: '名称' },
            {
                key: 'status',
                title: '状态',
                render: (row) => {
                    const status = row.status;
                    return '<span class="badge ' + statusBadgeMap[status] + ' badge-sm">' + statusTextMap[status] + '</span>';
                }
            },
            {
                key: 'progress',
                title: '进度',
                render: (row) => {
                    const progress = row.progress;
                    return '<progress class="progress progress-primary w-32" value="' + progress + '" max="100"></progress><span class="text-xs ml-2">' + progress + '%</span>';
                }
            },
            { key: 'createdAt', title: '创建时间', width: '160px' }
        ];
        // 新建任务
        function handleCreate() {
            toast.info('新建任务', '功能开发中');
        }
        // 查看任务
        function handleView(row) {
            toast.info('查看任务', '任务 ' + String(row.taskId) + ' 详情');
        }
        // 取消任务
        function handleCancel(row) {
            toast.warning('已取消', '任务 ' + String(row.taskId) + ' 已取消');
        }
        return { tasks, columns, handleCreate, handleView, handleCancel };
    },
    template: `
    <PageContainer title="任务中心">
      <template #actions>
        <BaseButton variant="primary" left-icon="➕" @click="handleCreate">新建任务</BaseButton>
      </template>
      <DataTable :columns="columns" :data="tasks" row-key="taskId">
        <template #action="{ row }">
          <div class="flex justify-end gap-1">
            <BaseButton variant="ghost" size="sm" @click="handleView(row)">查看</BaseButton>
            <BaseButton variant="ghost" size="sm" @click="handleCancel(row)">取消</BaseButton>
          </div>
        </template>
      </DataTable>
    </PageContainer>
  `
};
