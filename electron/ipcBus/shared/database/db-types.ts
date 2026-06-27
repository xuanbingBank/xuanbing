/**
 * @file 数据库层实体基础类型与同步状态、工作区标识等通用枚举。
 */

import type { DbTimestamp } from './pagination'

/**
 * 同步状态枚举，预留远程同步队列使用。
 */
export const SYNC_STATUSES = ['pending', 'synced', 'conflict', 'error', 'skipped'] as const
export type SyncStatus = (typeof SYNC_STATUSES)[number]

/**
 * 所有实体共有的基础字段。
 */
export interface BaseEntity {
  id: string
  createdAt: DbTimestamp
  updatedAt: DbTimestamp
}

/**
 * 可软删除实体基础字段。
 */
export interface SoftDeletableEntity extends BaseEntity {
  deletedAt: DbTimestamp | null
}

/**
 * 可同步实体预留字段。
 */
export interface SyncableEntity {
  /** 乐观锁版本号。 */
  version: number
  /** 工作区标识，预留多工作区。 */
  workspaceId: string | null
  /** 同步状态，预留远程同步。 */
  syncStatus: SyncStatus
}

/**
 * 任务状态枚举。
 */
export const TASK_STATUSES = ['pending', 'running', 'success', 'failed', 'canceled'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

/**
 * 任务类型枚举。
 */
export const TASK_TYPES = ['sync', 'import', 'export', 'analysis', 'custom'] as const
export type TaskType = (typeof TASK_TYPES)[number]

/**
 * 任务事件类型枚举。
 */
export const TASK_EVENT_TYPES = ['created', 'started', 'progress', 'completed', 'failed', 'canceled'] as const
export type TaskEventType = (typeof TASK_EVENT_TYPES)[number]

/**
 * 任务事件记录（对应 task_events 表的共享类型）。
 */
export interface TaskEvent {
  id: string
  taskId: string
  eventType: TaskEventType
  message: string | null
  payload: unknown
  createdAt: DbTimestamp
}

/**
 * 日志级别枚举。
 */
export const LOG_LEVELS = ['debug', 'info', 'warn', 'error', 'fatal'] as const
export type LogLevel = (typeof LOG_LEVELS)[number]

/**
 * 审计操作者类型。
 */
export const AUDIT_ACTOR_TYPES = ['user', 'system', 'plugin', 'sync'] as const
export type AuditActorType = (typeof AUDIT_ACTOR_TYPES)[number]

/**
 * 审计操作类型。
 */
export const AUDIT_ACTIONS = ['create', 'update', 'delete', 'restore', 'export', 'import', 'backup', 'restore-db', 'login', 'logout', 'invoke'] as const
export type AuditAction = (typeof AUDIT_ACTIONS)[number]

/**
 * 同步操作类型。
 */
export const SYNC_OPERATIONS = ['create', 'update', 'delete'] as const
export type SyncOperation = (typeof SYNC_OPERATIONS)[number]

/**
 * 同步方向。
 */
export const SYNC_DIRECTIONS = ['outbox', 'inbox'] as const
export type SyncDirection = (typeof SYNC_DIRECTIONS)[number]

/**
 * 文件素材分类。
 */
export const FILE_ASSET_CATEGORIES = ['image', 'document', 'video', 'audio', 'archive', 'code', 'data', 'other'] as const
export type FileAssetCategory = (typeof FILE_ASSET_CATEGORIES)[number]

/**
 * 设置值类型枚举。
 */
export const SETTING_VALUE_TYPES = ['string', 'number', 'boolean', 'json', 'null'] as const
export type SettingValueType = (typeof SETTING_VALUE_TYPES)[number]
