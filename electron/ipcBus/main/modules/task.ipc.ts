/**
 * @file 注册长任务、进度推送与取消相关的 IPC 能力。
 */

import { IPC_CHANNELS, IPC_EVENTS, eventContracts, requestContracts } from '../../shared'
import { createIpcError } from '../ipc-errors'
import type { IpcMainBus } from '../ipc-main-bus'
import type { TaskRegistry } from '../task-registry'

interface TaskStartInput {
  taskId: string
  kind: string
}

interface TaskCancelInput {
  taskId: string
}

export interface TaskModuleOptions {
  bus: IpcMainBus
  taskRegistry: TaskRegistry
}

/**
 * 注册任务相关能力。
 *
 * 为什么必须在 main：
 * 长任务调度、取消令牌、跨窗口路由与系统资源控制都必须由主进程掌管。
 *
 * renderer 能拿到什么：
 * 只能拿到任务受理结果、取消结果，以及按任务筛选后的进度/完成/失败事件。
 *
 * renderer 不能拿到什么：
 * 拿不到 `AbortController`、定时器句柄、其他窗口任务或内部调度细节。
 *
 * 输入如何校验：
 * 使用共享契约中的任务启动与取消模型，约束 `taskId`、`kind` 等字段。
 *
 * 输出如何校验：
 * request/response 与事件都通过共享契约模型校验。
 *
 * 失败如何返回：
 * 启动冲突、取消失败、任务异常统一走标准 `IpcError`。
 *
 * 窗口关闭如何清理：
 * 窗口关闭时由 `TaskRegistry.cleanupWindow` 统一中止该窗口持有的任务。
 *
 * @param options 任务模块依赖。
 */
export function registerTaskIpc(options: TaskModuleOptions): void {
  const { bus, taskRegistry } = options

  bus.registerEvent(eventContracts[IPC_EVENTS.taskProgress])
  bus.registerEvent(eventContracts[IPC_EVENTS.taskCompleted])
  bus.registerEvent(eventContracts[IPC_EVENTS.taskFailed])

  bus.registerHandler(requestContracts[IPC_CHANNELS.taskStart], async ({ input, senderWindowId }) => {
    const taskStartInput = input as TaskStartInput

    if (senderWindowId === undefined) {
      throw createIpcError('IPC_NOT_READY', 'The current window is not ready for task routing.')
    }

    const record = taskRegistry.createTask(taskStartInput.taskId, senderWindowId)
    let percent = 0

    const intervalId = setInterval(() => {
      if (record.controller.signal.aborted) {
        clearInterval(intervalId)

        bus.sendToWindow(senderWindowId, IPC_EVENTS.taskProgress, {
          taskId: taskStartInput.taskId,
          phase: 'canceled',
          percent,
          message: 'Task canceled'
        })

        bus.sendToWindow(senderWindowId, IPC_EVENTS.taskFailed, {
          taskId: taskStartInput.taskId,
          error: {
            code: 'IPC_ABORTED',
            message: 'Task canceled',
            retryable: false,
            cause: 'abort'
          },
          failedAt: new Date().toISOString()
        })

        taskRegistry.finishTask(taskStartInput.taskId)
        return
      }

      percent += 20

      bus.sendToWindow(senderWindowId, IPC_EVENTS.taskProgress, {
        taskId: taskStartInput.taskId,
        phase: percent >= 100 ? 'completed' : 'running',
        percent,
        completedUnits: percent,
        totalUnits: 100,
        message: percent >= 100 ? 'Task completed' : 'Task running'
      })

      if (percent >= 100) {
        clearInterval(intervalId)

        bus.sendToWindow(senderWindowId, IPC_EVENTS.taskCompleted, {
          taskId: taskStartInput.taskId,
          result: {
            kind: taskStartInput.kind
          },
          completedAt: new Date().toISOString()
        })

        taskRegistry.finishTask(taskStartInput.taskId)
      }
    }, 300)

    record.cleanup = () => {
      clearInterval(intervalId)
    }

    bus.sendToWindow(senderWindowId, IPC_EVENTS.taskProgress, {
      taskId: taskStartInput.taskId,
      phase: 'queued',
      percent: 0,
      message: 'Task queued'
    })

    return {
      taskId: taskStartInput.taskId,
      accepted: true,
      status: 'running'
    }
  })

  bus.registerHandler(requestContracts[IPC_CHANNELS.taskCancel], async ({ input }) => {
    const taskCancelInput = input as TaskCancelInput

    return {
      taskId: taskCancelInput.taskId,
      cancelled: taskRegistry.cancelTask(taskCancelInput.taskId)
    }
  })
}
