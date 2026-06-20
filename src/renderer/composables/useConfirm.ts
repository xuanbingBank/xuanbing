/**
 * @file 确认对话框组合式函数，提供 Promise 风格的确认交互。
 */

import { defineState } from '../stores/base'

/**
 * 确认对话框选项。
 */
export interface ConfirmOptions {
  /** 标题 */
  title?: string
  /** 内容 */
  content?: string
  /** 确认按钮文本 */
  confirmText?: string
  /** 取消按钮文本 */
  cancelText?: string
  /** 危险操作（确认按钮变红） */
  danger?: boolean
}

/**
 * 确认对话框状态。
 */
interface ConfirmState {
  /** 是否可见 */
  visible: boolean
  /** 标题 */
  title: string
  /** 内容 */
  content: string
  /** 确认按钮文本 */
  confirmText: string
  /** 取消按钮文本 */
  cancelText: string
  /** 是否危险操作 */
  danger: boolean
  /** resolve 函数 */
  resolver: ((value: boolean) => void) | null
}

/** 确认对话框全局状态（单例） */
const confirmState = defineState<ConfirmState>({
  visible: false,
  title: '确认操作',
  content: '',
  confirmText: '确认',
  cancelText: '取消',
  danger: false,
  resolver: null
})

/**
 * 确认对话框组合式函数返回值。
 */
export interface UseConfirmReturn {
  /** 状态 */
  state: ConfirmState
  /** 弹出确认框，返回 Promise */
  confirm: (options: ConfirmOptions) => Promise<boolean>
  /** 用户点击确认 */
  resolve: (value: boolean) => void
}

/**
 * 确认对话框组合式函数。
 *
 * @returns 确认操作方法。
 */
export function useConfirm(): UseConfirmReturn {
  function confirm(options: ConfirmOptions): Promise<boolean> {
    confirmState.title = options.title ?? '确认操作'
    confirmState.content = options.content ?? ''
    confirmState.confirmText = options.confirmText ?? '确认'
    confirmState.cancelText = options.cancelText ?? '取消'
    confirmState.danger = options.danger ?? false
    confirmState.visible = true

    return new Promise<boolean>((resolve) => {
      confirmState.resolver = resolve
    })
  }

  function resolve(value: boolean): void {
    if (confirmState.resolver) {
      confirmState.resolver(value)
      confirmState.resolver = null
    }
    confirmState.visible = false
  }

  return {
    state: confirmState,
    confirm,
    resolve
  }
}
