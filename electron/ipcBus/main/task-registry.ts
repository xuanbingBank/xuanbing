/**
 * @file 长时任务注册表，支持进度推送、取消与窗口级清理。
 */

import { createIpcError } from './ipc-errors'

/**
 * 单个窗口允许同时运行的最大任务数。
 */
const MAX_CONCURRENT_TASKS_PER_WINDOW = 8

/**
 * 全局允许同时运行的最大任务数。
 */
const MAX_CONCURRENT_TASKS_GLOBAL = 32

export interface TaskRecord {
  taskId: string
  ownerWindowId: number
  controller: AbortController
  startedAt: number
  cleanup?: () => void
}

/**
 * 任务注册表。
 */
export class TaskRegistry {
  private readonly tasks = new Map<string, TaskRecord>()

  /**
   * 注册一个新的任务。
   *
   * @param taskId 任务标识符。
   * @param ownerWindowId 任务所属窗口标识符。
   * @param cleanup 任务结束时的清理回调。
   * @returns 任务记录。
   */
  public createTask(taskId: string, ownerWindowId: number, cleanup?: () => void): TaskRecord {
    if (this.tasks.has(taskId)) {
      throw createIpcError('IPC_CONFLICT', `Task ${taskId} is already running.`, undefined, 'conflict', false)
    }

    let windowTaskCount = 0
    for (const record of this.tasks.values()) {
      if (record.ownerWindowId === ownerWindowId) {
        windowTaskCount += 1
      }
    }

    if (windowTaskCount >= MAX_CONCURRENT_TASKS_PER_WINDOW) {
      throw createIpcError(
        'IPC_TASK_LIMIT_EXCEEDED',
        `Window ${ownerWindowId} has reached the per-window task limit (${MAX_CONCURRENT_TASKS_PER_WINDOW}).`,
        undefined,
        'limit',
        true
      )
    }

    if (this.tasks.size >= MAX_CONCURRENT_TASKS_GLOBAL) {
      throw createIpcError(
        'IPC_TASK_LIMIT_EXCEEDED',
        `The global task limit (${MAX_CONCURRENT_TASKS_GLOBAL}) has been reached.`,
        undefined,
        'limit',
        true
      )
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
   * @param taskId 任务标识符。
   * @returns 任务记录。
   */
  public getTask(taskId: string): TaskRecord | undefined {
    return this.tasks.get(taskId)
  }

  /**
   * 取消一个任务。
   *
   * @param taskId 任务标识符。
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
   * @param taskId 任务标识符。
   * @returns 是否标记成功。
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
   * @param windowId 窗口标识符。
   */
  public cleanupWindow(windowId: number): void {
    for (const record of this.tasks.values()) {
      if (record.ownerWindowId === windowId) {
        this.cancelTask(record.taskId)
      }
    }
  }

  /**
   * 取消所有运行中的任务。
   */
  public cancelAll(): void {
    for (const taskId of [...this.tasks.keys()]) {
      this.cancelTask(taskId)
    }
  }
}
