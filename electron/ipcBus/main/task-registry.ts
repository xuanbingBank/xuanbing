/**
 * @file 跟踪长任务的生命周期，支持进度、取消与窗口级清理。
 */

import { createIpcError } from './ipc-errors'

export interface TaskRecord {
  taskId: string
  ownerWindowId: number
  controller: AbortController
  startedAt: number
  cleanup?: () => void
}

/**
 * 管理可取消的长任务。
 */
export class TaskRegistry {
  private readonly tasks = new Map<string, TaskRecord>()

  /**
   * 注册一个新的任务。
   *
   * @param taskId 任务标识。
   * @param ownerWindowId 任务所属窗口标识。
   * @param cleanup 任务结束时的清理函数。
   * @returns 任务记录。
   */
  public createTask(taskId: string, ownerWindowId: number, cleanup?: () => void): TaskRecord {
    if (this.tasks.has(taskId)) {
      throw createIpcError('IPC_CONFLICT', `Task ${taskId} is already running.`, undefined, 'conflict', false)
    }

    const record: TaskRecord = {
      taskId,
      ownerWindowId,
      controller: new AbortController(),
      startedAt: Date.now(),
      cleanup
    }

    this.tasks.set(taskId, record)
    return record
  }

  /**
   * 获取任务记录。
   *
   * @param taskId 任务标识。
   * @returns 任务记录。
   */
  public getTask(taskId: string): TaskRecord | undefined {
    return this.tasks.get(taskId)
  }

  /**
   * 取消一个任务。
   *
   * @param taskId 任务标识。
   * @returns 是否取消成功。
   */
  public cancelTask(taskId: string): boolean {
    const record = this.tasks.get(taskId)

    if (!record) {
      return false
    }

    record.controller.abort()
    record.cleanup?.()
    this.tasks.delete(taskId)
    return true
  }

  /**
   * 标记任务完成。
   *
   * @param taskId 任务标识。
   * @returns 是否清理成功。
   */
  public finishTask(taskId: string): boolean {
    const record = this.tasks.get(taskId)

    if (!record) {
      return false
    }

    record.cleanup?.()
    this.tasks.delete(taskId)
    return true
  }

  /**
   * 清理某个窗口拥有的所有任务。
   *
   * @param windowId 窗口标识。
   */
  public cleanupWindow(windowId: number): void {
    for (const record of this.tasks.values()) {
      if (record.ownerWindowId === windowId) {
        this.cancelTask(record.taskId)
      }
    }
  }

  /**
   * 取消所有正在运行的任务。
   */
  public cancelAll(): void {
    for (const taskId of [...this.tasks.keys()]) {
      this.cancelTask(taskId)
    }
  }
}
