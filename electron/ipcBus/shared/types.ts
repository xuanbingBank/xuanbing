/**
 * @file ?? IPC ??????? TypeScript ????????????
 */

import { IPC_CHANNELS, IPC_EVENTS, IPC_PERMISSIONS } from './constants'
import type { InferZodSchema, ZodSchema } from './zod'

/**
 * ?? IPC ????????????
 */
export interface IpcRateLimit {
  maxCalls: number
  windowMs: number
}

/**
 * ?? IPC ??????????
 */
export type IpcEventDirection = 'main-to-renderer' | 'renderer-to-main'

/**
 * ??????? IPC ??????????
 */
export type IpcRequestChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]

/**
 * ??????? IPC ??????????
 */
export type IpcEventChannel = (typeof IPC_EVENTS)[keyof typeof IPC_EVENTS]

/**
 * ??????? IPC ????????
 */
export type IpcPermission = (typeof IPC_PERMISSIONS)[keyof typeof IPC_PERMISSIONS]

/**
 * ???? IPC ???????????
 */
export interface IpcContractMetadata<TPermission extends IpcPermission> {
  description: string
  permission: TPermission
  audit?: boolean
  rateLimit?: IpcRateLimit
  maxPayloadBytes?: number
}

/**
 * ???? IPC ?????????????
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
 * ???? IPC ?????????????
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
 * ??????????????
 */
export type RequestContractMap = Record<IpcRequestChannel, RequestContract<ZodSchema<unknown>, ZodSchema<unknown>>>

/**
 * ??????????????
 */
export type EventContractMap = Record<IpcEventChannel, EventContract<ZodSchema<unknown>>>

/**
 * ?????????????????
 */
export type InferSchema<TSchema extends ZodSchema<unknown>> = InferZodSchema<TSchema>

/**
 * ???????????????
 */
export type InferRequestInput<TContract extends RequestContract<ZodSchema<unknown>, ZodSchema<unknown>>> =
  InferSchema<TContract['inputSchema']>

/**
 * ???????????????
 */
export type InferRequestOutput<TContract extends RequestContract<ZodSchema<unknown>, ZodSchema<unknown>>> =
  InferSchema<TContract['outputSchema']>

/**
 * ???????????????
 */
export type InferEventPayload<TContract extends EventContract<ZodSchema<unknown>>> =
  InferSchema<TContract['payloadSchema']>

