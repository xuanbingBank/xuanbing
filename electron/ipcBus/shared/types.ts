/**
 * @file 共享 IPC 契约层的 TypeScript 类型定义。
 */

import { IPC_CHANNELS, IPC_EVENTS, IPC_PERMISSIONS } from './constants'
import type { InferZodSchema, ZodSchema } from './zod'

/**
 * 单窗口 IPC 限流配置。
 */
export interface IpcRateLimit {
  maxCalls: number
  windowMs: number
}

/**
 * IPC 事件传递方向。
 */
export type IpcEventDirection = 'main-to-renderer' | 'renderer-to-main'

/**
 * 受控的 IPC 请求通道类型。
 */
export type IpcRequestChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]

/**
 * 受控的 IPC 事件通道类型。
 */
export type IpcEventChannel = (typeof IPC_EVENTS)[keyof typeof IPC_EVENTS]

/**
 * 受控的 IPC 权限类型。
 */
export type IpcPermission = (typeof IPC_PERMISSIONS)[keyof typeof IPC_PERMISSIONS]

/**
 * 描述 IPC 契约的公共元数据。
 */
export interface IpcContractMetadata<TPermission extends IpcPermission> {
  description: string
  permission: TPermission
  audit?: boolean
  rateLimit?: IpcRateLimit
  maxPayloadBytes?: number
}

/**
 * 请求型 IPC 契约定义。
 */
export interface RequestContract<
  TInputSchema extends ZodSchema<unknown>,
  TOutputSchema extends ZodSchema<unknown>,
  TPermission extends IpcPermission = IpcPermission,
  TChannel extends IpcRequestChannel = IpcRequestChannel
> extends IpcContractMetadata<TPermission> {
  channel: TChannel
  inputSchema: TInputSchema
  outputSchema: TOutputSchema
  timeoutMs: number
}

/**
 * 事件型 IPC 契约定义。
 */
export interface EventContract<
  TPayloadSchema extends ZodSchema<unknown>,
  TPermission extends IpcPermission = IpcPermission,
  TEvent extends IpcEventChannel = IpcEventChannel
> extends IpcContractMetadata<TPermission> {
  event: TEvent
  direction: IpcEventDirection
  payloadSchema: TPayloadSchema
}

/**
 * 全部请求契约的映射类型。
 */
export type RequestContractMap = Record<IpcRequestChannel, RequestContract<ZodSchema<unknown>, ZodSchema<unknown>>>

/**
 * 全部事件契约的映射类型。
 */
export type EventContractMap = Record<IpcEventChannel, EventContract<ZodSchema<unknown>>>

/**
 * 从 schema 推断其校验输出类型。
 */
export type InferSchema<TSchema extends ZodSchema<unknown>> = InferZodSchema<TSchema>

/**
 * 推断请求契约的输入类型。
 */
export type InferRequestInput<TContract extends RequestContract<ZodSchema<unknown>, ZodSchema<unknown>>> =
  InferSchema<TContract['inputSchema']>

/**
 * 推断请求契约的输出类型。
 */
export type InferRequestOutput<TContract extends RequestContract<ZodSchema<unknown>, ZodSchema<unknown>>> =
  InferSchema<TContract['outputSchema']>

/**
 * 推断事件契约的载荷类型。
 */
export type InferEventPayload<TContract extends EventContract<ZodSchema<unknown>>> =
  InferSchema<TContract['payloadSchema']>
