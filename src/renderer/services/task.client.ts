/**
 * @file 任务数据客户端，renderer 唯一访问任务持久化数据的入口。
 *
 * 页面只调用 client。client 不写裸 channel。
 * client 处理 Result unwrap。client 处理错误映射。
 */

import type {
  TaskDataCreateInput,
  TaskDataItem,
  TaskDataListInput,
  TaskDataListOutput,
  TaskDataUpdateInput,
  TaskDataDeleteOutput
} from '../../../electron/ipcBus/renderer/desktop-api'

/**
 * 获取 desktop API。
 */
function getDesktop(): Window['desktop'] {
  if (typeof window === 'undefined' || !window.desktop) {
    throw new Error('window.desktop is not available. Preload may not have loaded.')
  }
  return window.desktop
}

/**
 * 任务数据客户端。
 */
export const taskClient = {
  /**
   * 分页查询任务列表。
   */
  async list(input?: TaskDataListInput): Promise<TaskDataListOutput> {
    return getDesktop().taskData.list(input)
  },

  /**
   * 按 ID 查询任务。
   */
  async getById(id: string): Promise<TaskDataItem> {
    return getDesktop().taskData.getById(id)
  },

  /**
   * 创建任务。
   */
  async create(input: TaskDataCreateInput): Promise<TaskDataItem> {
    return getDesktop().taskData.create(input)
  },

  /**
   * 更新任务。
   */
  async update(input: TaskDataUpdateInput): Promise<TaskDataItem> {
    return getDesktop().taskData.update(input)
  },

  /**
   * 删除任务。
   */
  async delete(id: string): Promise<TaskDataDeleteOutput> {
    return getDesktop().taskData.delete(id)
  }
}
