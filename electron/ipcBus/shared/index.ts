/**
 * @file 统一 Electron IPC 总线全部共享导出。
 */

export { IPC_CHANNELS, IPC_EVENTS, IPC_PERMISSIONS, DEFAULT_IPC_MAX_PAYLOAD_BYTES, DEFAULT_IPC_TIMEOUT_MS } from './constants'
export { requestContracts, eventContracts, defineEventContract, defineRequestContract, createEmptyObjectSchema } from './contracts'
export { IPC_ERROR_CODES, createIpcError, createIpcErrorResult, createIpcSuccessResult, isIpcErrorCode } from './errors'
export {
  FILE_DIALOG_PROPERTIES,
  TASK_KINDS,
  TASK_START_STATUSES,
  appInfoResponseSchema,
  fileDialogFilterSchema,
  fileDialogRequestSchema,
  fileDialogResponseSchema,
  getCurrentWindowResponseSchema,
  getInitPayloadResponseSchema,
  ipcErrorSchema,
  ipcResultSchema,
  openWindowRequestSchema,
  openWindowResponseSchema,
  setWindowTitleRequestSchema,
  taskCancelRequestSchema,
  taskCancelResponseSchema,
  taskCompletedEventSchema,
  taskFailedEventSchema,
  taskProgressEventSchema,
  taskStartRequestSchema,
  taskStartResponseSchema,
  windowActionRequestSchema,
  windowActionResponseSchema,
  windowCloseByRoleRequestSchema,
  windowControlRequestSchema,
  windowControlResponseSchema,
  windowCountResponseSchema,
  windowCreatedEventSchema,
  windowFocusChangedEventSchema,
  windowListResponseSchema,
  windowRefSchema,
  windowRouteChangedEventSchema,
  windowSetTitleIpcRequestSchema,
  windowSetTitleResponseSchema,
  windowStateChangedEventSchema,
  createIpcResultSchema
} from './schemas'
export type {
  OpenWindowRequestInput,
  OpenWindowResponseOutput,
  WindowControlRequestInput,
  WindowControlResponseOutput,
  WindowListResponseOutput,
  SetWindowTitleRequestInput,
  GetInitPayloadResponseOutput,
  GetCurrentWindowResponseOutput
} from './schemas'
export { SimpleZodSchema, ZodValidationError, z } from './zod'
export type {
  EventContract,
  EventContractMap,
  InferEventPayload,
  InferRequestInput,
  InferRequestOutput,
  InferSchema,
  IpcContractMetadata,
  IpcEventChannel,
  IpcEventDirection,
  IpcPermission,
  IpcRateLimit,
  IpcRequestChannel,
  RequestContract,
  RequestContractMap
} from './types'
export type {
  IpcError,
  IpcErrorCode,
  IpcFailureResult,
  IpcResult,
  IpcSuccessResult
} from './errors'
