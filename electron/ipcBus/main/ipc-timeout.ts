/**
 * @file 提供可中止异步操作的超时辅助函数。
 */

/**
 * 为异步操作附加超时与中止控制。
 *
 * @param operation 异步操作。
 * @param timeoutMs 超时时长。
 * @param controller 共享的中止控制器。
 * @returns 操作结果与是否超时标记。
 */
export async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  controller: AbortController
): Promise<{ value: T; timedOut: boolean }> {
  let timedOut = false

  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    const timer = setTimeout(() => {
      timedOut = true
      controller.abort()
      reject(new Error('IPC_TIMEOUT'))
    }, timeoutMs)

    controller.signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
      },
      { once: true }
    )
  })

  try {
    const value = await Promise.race([operation(), timeoutPromise])
    return { value, timedOut }
  } finally {
    if (!controller.signal.aborted) {
      controller.abort()
    }
  }
}
