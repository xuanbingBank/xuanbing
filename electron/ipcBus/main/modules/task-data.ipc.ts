/**
 * @file 任务数据持久化 IPC 处理器（CRUD）。
 *
 * IPC handler 不写复杂 SQL，只调用 TaskService。
 * service 负责业务事务（任务创建 + 任务事件 + 审计）。
 */

import { IPC_CHANNELS, requestContracts } from '../../shared'
import type { IpcMainBus } from '../ipc-main-bus'
import type { TaskService } from '../../../services/task.service'

interface TaskDataListInput {
  page?: number
  pageSize?: number
  status?: string
  type?: string
}

interface TaskDataCreateInput {
  id?: string
  type: string
  title: string
  status?: string
  progress?: number
  input?: unknown
}

interface TaskDataUpdateInput {
  id: string
  status?: string
  progress?: number
  output?: unknown
  error?: string | null
}

interface TaskDataByIdInput {
  id: string
}

export interface TaskDataIpcModuleOptions {
  bus: IpcMainBus
  taskService: TaskService
}

/**
 * 注册任务数据 IPC 处理器。
 *
 * @param options 模块选项。
 */
export function registerTaskDataIpc(options: TaskDataIpcModuleOptions): void {
  const { bus, taskService } = options

  bus.registerHandler(requestContracts[IPC_CHANNELS.taskDataList], async ({ input }) => {
    const listInput = input as TaskDataListInput

    const result = taskService.list({
      page: listInput.page,
      pageSize: listInput.pageSize,
      filter: {
        status: listInput.status as 'pending' | 'running' | 'success' | 'failed' | 'canceled' | undefined,
        type: listInput.type as 'sync' | 'import' | 'export' | 'analysis' | 'custom' | undefined
      }
    })

    return {
      items: result.items,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
      hasMore: result.hasMore
    }
  })

  bus.registerHandler(requestContracts[IPC_CHANNELS.taskDataGetById], async ({ input }) => {
    const getByIdInput = input as TaskDataByIdInput
    const task = taskService.findById(getByIdInput.id)

    if (!task) {
      throw new Error(`Task not found: ${getByIdInput.id}`)
    }

    return task
  })

  bus.registerHandler(requestContracts[IPC_CHANNELS.taskDataCreate], async ({ input }) => {
    const createInput = input as TaskDataCreateInput

    const task = taskService.create({
      id: createInput.id,
      type: createInput.type as 'sync' | 'import' | 'export' | 'analysis' | 'custom',
      title: createInput.title,
      status: createInput.status as 'pending' | 'running' | 'success' | 'failed' | 'canceled' | undefined,
      progress: createInput.progress,
      input: createInput.input
    })

    return task
  })

  bus.registerHandler(requestContracts[IPC_CHANNELS.taskDataUpdate], async ({ input }) => {
    const updateInput = input as TaskDataUpdateInput

    const task = taskService.update(updateInput.id, {
      status: updateInput.status as 'pending' | 'running' | 'success' | 'failed' | 'canceled' | undefined,
      progress: updateInput.progress,
      output: updateInput.output,
      error: updateInput.error
    })

    if (!task) {
      throw new Error(`Task not found: ${updateInput.id}`)
    }

    return task
  })

  bus.registerHandler(requestContracts[IPC_CHANNELS.taskDataDelete], async ({ input }) => {
    const deleteInput = input as TaskDataByIdInput
    const deleted = taskService.delete(deleteInput.id)
    return { deleted }
  })
}
