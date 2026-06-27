/**
 * @file 注册长时任务、进度推送、取消等相关的 IPC 处理器。
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
 * 单个任务允许运行的最大时长（30 分钟）。超过后主动失败并停止 interval，
 * 防止任务因异常长时间空转占用资源。
 */
const MAX_TASK_DURATION_MS = 30 * 60 * 1000

/**
 * 连续发送进度事件失败次数上限，超过后视为接收窗口不可达，停止 interval。
 */
const MAX_SEND_FAILURES = 3

/**
 * 注册任务相关的 IPC 处理器。
 *
 * 为什么放在 main？
 * 任务需要支持取消机制，如窗口路由、系统资源管理等都需要主进程的控制功能。
 *
 * renderer 可调用什么？
 * 只可调用启动任务、取消任务，以及按条件筛选的进度/完成/失败事件。
 *
 * renderer 不可调用什么？
 * 不可传入 `AbortController`、超时配置等，也不可访问内部实现细节。
 *
 * 输入校验：
 * 使用共享契约中的取消模型，以及其 `taskId`、`kind` 等字段。
 *
 * 输出校验：
 * request/response 与事件均通过共享契约模型校验。
 *
 * 失败如何返回？
 * 用户取消、内部失败、未知异常统一归为标准 `IpcError`。
 *
 * 窗口关闭如何处理？
 * 窗口关闭时由 `TaskRegistry.cleanupWindow` 统一终止该窗口中的所有任务。
 *
 * @param options 任务模块初始化选项。
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
    let consecutiveSendFailures = 0

    const intervalId = setInterval(() => {
      try {
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

        // 总时长上限保护：超过最大允许时长则主动失败并停止 interval，避免长时间空转。
        if (Date.now() - record.startedAt > MAX_TASK_DURATION_MS) {
          clearInterval(intervalId)

          bus.sendToWindow(senderWindowId, IPC_EVENTS.taskFailed, {
            taskId: taskStartInput.taskId,
            error: {
              code: 'IPC_TIMEOUT',
              message: 'Task exceeded the maximum allowed duration.',
              retryable: false,
              cause: 'max-duration'
            },
            failedAt: new Date().toISOString()
          })

          taskRegistry.finishTask(taskStartInput.taskId)
          return
        }

        percent += 20

        const progressSent = bus.sendToWindow(senderWindowId, IPC_EVENTS.taskProgress, {
          taskId: taskStartInput.taskId,
          phase: percent >= 100 ? 'completed' : 'running',
          percent,
          completedUnits: percent,
          totalUnits: 100,
          message: percent >= 100 ? 'Task completed' : 'Task running'
        })

        // 接收窗口不可达（已关闭/销毁）时 sendToWindow 返回 false；
        // 连续失败达到阈值则停止 interval，避免对已关闭窗口无意义地继续推送。
        if (!progressSent) {
          consecutiveSendFailures += 1
          if (consecutiveSendFailures >= MAX_SEND_FAILURES) {
            clearInterval(intervalId)
            taskRegistry.finishTask(taskStartInput.taskId)
          }
          return
        }
        consecutiveSendFailures = 0

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
      } catch (err) {
        console.error('[task.ipc] interval error', err)
        clearInterval(intervalId)
        bus.sendToWindow(senderWindowId, IPC_EVENTS.taskFailed, {
          taskId: taskStartInput.taskId,
          error: {
            code: 'IPC_INTERNAL_ERROR',
            message: 'Task failed unexpectedly.',
            retryable: false,
            cause: 'interval-error'
          },
          failedAt: new Date().toISOString()
        })
        taskRegistry.finishTask(taskStartInput.taskId)
      }
    }, 300)

    // cleanup 清理内部 interval 定时器，确保窗口关闭/任务取消后不再继续触发回调。
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
