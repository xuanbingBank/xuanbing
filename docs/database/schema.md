# 表结构 Schema

xuanbing(All In One)桌面应用的数据库 schema 通过 drizzle-orm 定义于 [electron/database/schema/](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/schema/) 目录,DDL 由 [0001_initial.sql](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/migrations/0001_initial.sql) 创建。本文档列出全部表字段、约束、索引与外键关系。

## 1. 表清单

| 分类 | 表名 | schema 文件 | 用途 |
|---|---|---|---|
| 业务 | `app_settings` | [app.schema.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/schema/app.schema.ts) | 键值对配置 |
| 业务 | `window_states` | [window-state.schema.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/schema/window-state.schema.ts) | 窗口状态 |
| 业务 | `tasks` | [task.schema.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/schema/task.schema.ts) | 后台任务 |
| 业务 | `task_events` | [task.schema.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/schema/task.schema.ts) | 任务事件流水 |
| 业务 | `app_logs` | [log.schema.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/schema/log.schema.ts) | 应用日志 |
| 业务 | `file_assets` | [file-asset.schema.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/schema/file-asset.schema.ts) | 文件素材元数据 |
| 业务 | `sync_outbox` | [sync.schema.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/schema/sync.schema.ts) | 待推送变更队列 |
| 业务 | `sync_inbox` | [sync.schema.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/schema/sync.schema.ts) | 远程拉取变更队列 |
| 系统 | `audit_logs` | [audit.schema.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/schema/audit.schema.ts) | 审计日志 |
| 系统 | `__migrations` | [index.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/schema/index.ts) | migration 记录 |
| 系统 | `__schema_version` | [index.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/schema/index.ts) | schema 版本 |

约定:
- 所有主键为 `TEXT` 类型(除 `__migrations.id` 与 `__schema_version.id` 为 `INTEGER`)。
- 时间字段统一 `TEXT`,存 ISO 8601 字符串,默认 `CURRENT_TIMESTAMP`。
- JSON 字段用 `TEXT` 存储,由 [base.repository.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/repositories/base.repository.ts) 的 `serializeJson` / `deserializeJson` 序列化。
- 布尔字段用 `INTEGER` 存(drizzle `mode: 'boolean'`),0/1。

## 2. app_settings - 应用配置

[app.schema.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/schema/app.schema.ts) | [DDL](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/migrations/0001_initial.sql)

键值对配置存储,按 `namespace + key` 唯一。

| 字段 | 列名 | 类型 | 约束 | 说明 |
|---|---|---|---|---|
| `id` | `id` | TEXT | PRIMARY KEY NOT NULL | UUID |
| `namespace` | `namespace` | TEXT | NOT NULL | 命名空间(system/ui/...) |
| `key` | `key` | TEXT | NOT NULL | 键名 |
| `value` | `value` | TEXT | NOT NULL | 值(按 valueType 解析) |
| `valueType` | `value_type` | TEXT | NOT NULL | 值类型(string/number/boolean/json) |
| `description` | `description` | TEXT | NOT NULL DEFAULT '' | 描述 |
| `isSystem` | `is_system` | INTEGER | NOT NULL DEFAULT 0 | 是否系统项(不可删) |
| `createdAt` | `created_at` | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| `updatedAt` | `updated_at` | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | 更新时间 |

约束:`UNIQUE(namespace, key)`(drizzle `namespace_key_unique`)。

## 3. window_states - 窗口状态

[window-state.schema.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/schema/window-state.schema.ts)

窗口位置、大小、状态持久化。

| 字段 | 列名 | 类型 | 约束 | 说明 |
|---|---|---|---|---|
| `id` | `id` | TEXT | PRIMARY KEY NOT NULL | UUID |
| `role` | `role` | TEXT | NOT NULL | 窗口角色(main/about/...) |
| `instanceKey` | `instance_key` | TEXT | NOT NULL | 实例键(同 role 多实例区分) |
| `bounds` | `bounds` | TEXT | nullable | 窗口边界 JSON `{x,y,width,height}` |
| `isMaximized` | `is_maximized` | INTEGER | NOT NULL DEFAULT 0 | 是否最大化 |
| `isFullScreen` | `is_full_screen` | INTEGER | NOT NULL DEFAULT 0 | 是否全屏 |
| `displayId` | `display_id` | INTEGER | nullable | 显示器 ID |
| `lastRoute` | `last_route` | TEXT | nullable | 最后路由 |
| `customState` | `custom_state` | TEXT | nullable | 自定义状态 JSON |
| `createdAt` | `created_at` | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| `updatedAt` | `updated_at` | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | 更新时间 |

约束:`UNIQUE(role, instance_key)`(drizzle `role_instance_key_unique`)。

## 4. tasks - 后台任务

[task.schema.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/schema/task.schema.ts)

后台任务记录。

| 字段 | 列名 | 类型 | 约束 | 说明 |
|---|---|---|---|---|
| `id` | `id` | TEXT | PRIMARY KEY NOT NULL | UUID |
| `type` | `type` | TEXT | NOT NULL | 任务类型 |
| `title` | `title` | TEXT | NOT NULL | 任务标题 |
| `status` | `status` | TEXT | NOT NULL DEFAULT 'pending' | 状态(pending/running/success/failed/canceled) |
| `progress` | `progress` | INTEGER | NOT NULL DEFAULT 0 | 进度 0-100 |
| `input` | `input` | TEXT | nullable | 输入 JSON |
| `output` | `output` | TEXT | nullable | 输出 JSON |
| `error` | `error` | TEXT | nullable | 错误信息 |
| `startedAt` | `started_at` | TEXT | nullable | 开始时间 |
| `finishedAt` | `finished_at` | TEXT | nullable | 完成时间 |
| `canceledAt` | `canceled_at` | TEXT | nullable | 取消时间 |
| `createdAt` | `created_at` | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| `updatedAt` | `updated_at` | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | 更新时间 |

索引:`idx_tasks_status(status)`、`idx_tasks_type(type)`、`idx_tasks_created_at(created_at)`。

## 5. task_events - 任务事件流水

[task.schema.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/schema/task.schema.ts)

任务事件流水,外键关联 `tasks`。

| 字段 | 列名 | 类型 | 约束 | 说明 |
|---|---|---|---|---|
| `id` | `id` | TEXT | PRIMARY KEY NOT NULL | UUID |
| `taskId` | `task_id` | TEXT | NOT NULL, REFERENCES tasks(id) ON DELETE CASCADE | 任务 ID |
| `eventType` | `event_type` | TEXT | NOT NULL | 事件类型(created/progress/completed/failed/canceled) |
| `message` | `message` | TEXT | NOT NULL DEFAULT '' | 事件消息 |
| `payload` | `payload` | TEXT | nullable | 事件负载 JSON |
| `createdAt` | `created_at` | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | 创建时间 |

索引:`idx_task_events_task_id(task_id)`、`idx_task_events_created_at(created_at)`。

外键:`task_id → tasks.id`,`ON DELETE CASCADE`(任务删除时事件级联删除)。

## 6. app_logs - 应用日志

[log.schema.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/schema/log.schema.ts)

应用日志索引,大日志体可外存,此处仅索引元信息与摘要。

| 字段 | 列名 | 类型 | 约束 | 说明 |
|---|---|---|---|---|
| `id` | `id` | TEXT | PRIMARY KEY NOT NULL | UUID |
| `level` | `level` | TEXT | NOT NULL | 日志级别(debug/info/warn/error) |
| `scope` | `scope` | TEXT | NOT NULL DEFAULT '' | 日志 scope |
| `message` | `message` | TEXT | NOT NULL | 日志消息 |
| `payload` | `payload` | TEXT | nullable | 日志负载 JSON |
| `createdAt` | `created_at` | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | 创建时间 |

索引:`idx_app_logs_level(level)`、`idx_app_logs_scope(scope)`、`idx_app_logs_created_at(created_at)`。

## 7. file_assets - 文件素材元数据

[file-asset.schema.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/schema/file-asset.schema.ts)

文件素材元数据,大文件不存入 SQLite,只存路径、hash、size、mime、metadata。

| 字段 | 列名 | 类型 | 约束 | 说明 |
|---|---|---|---|---|
| `id` | `id` | TEXT | PRIMARY KEY NOT NULL | UUID |
| `name` | `name` | TEXT | NOT NULL | 显示名 |
| `originalName` | `original_name` | TEXT | NOT NULL | 原始文件名 |
| `path` | `path` | TEXT | NOT NULL | 文件绝对路径 |
| `relativePath` | `relative_path` | TEXT | nullable | 相对路径 |
| `mimeType` | `mime_type` | TEXT | NOT NULL | MIME 类型 |
| `size` | `size` | INTEGER | NOT NULL DEFAULT 0 | 文件大小(字节) |
| `sha256` | `sha256` | TEXT | nullable | 文件 SHA-256 |
| `ext` | `ext` | TEXT | nullable | 扩展名 |
| `category` | `category` | TEXT | NOT NULL DEFAULT 'other' | 分类 |
| `tags` | `tags` | TEXT | nullable | 标签 JSON 数组 |
| `metadata` | `metadata` | TEXT | nullable | 自定义元数据 JSON |
| `createdAt` | `created_at` | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| `updatedAt` | `updated_at` | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | 更新时间 |
| `deletedAt` | `deleted_at` | TEXT | nullable | 软删除时间(null=未删除) |

索引:`idx_file_assets_sha256(sha256)`、`idx_file_assets_category(category)`、`idx_file_assets_deleted_at(deleted_at)`。

## 8. sync_outbox - 待推送变更队列

[sync.schema.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/schema/sync.schema.ts)

待推送至远程的变更队列,预留远程同步。

| 字段 | 列名 | 类型 | 约束 | 说明 |
|---|---|---|---|---|
| `id` | `id` | TEXT | PRIMARY KEY NOT NULL | UUID |
| `entityType` | `entity_type` | TEXT | NOT NULL | 实体类型 |
| `entityId` | `entity_id` | TEXT | NOT NULL | 实体 ID |
| `operation` | `operation` | TEXT | NOT NULL | 操作(create/update/delete) |
| `payload` | `payload` | TEXT | nullable | 变更负载 JSON |
| `status` | `status` | TEXT | NOT NULL DEFAULT 'pending' | 状态(pending/sent/failed) |
| `retryCount` | `retry_count` | INTEGER | NOT NULL DEFAULT 0 | 重试次数 |
| `lastError` | `last_error` | TEXT | nullable | 最近错误 |
| `createdAt` | `created_at` | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| `updatedAt` | `updated_at` | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | 更新时间 |

索引:`idx_sync_outbox_status(status)`、`idx_sync_outbox_entity(entity_type, entity_id)`。

## 9. sync_inbox - 远程拉取变更队列

[sync.schema.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/schema/sync.schema.ts)

从远程拉取的变更队列。

| 字段 | 列名 | 类型 | 约束 | 说明 |
|---|---|---|---|---|
| `id` | `id` | TEXT | PRIMARY KEY NOT NULL | UUID |
| `entityType` | `entity_type` | TEXT | NOT NULL | 实体类型 |
| `externalId` | `external_id` | TEXT | NOT NULL | 远程实体 ID |
| `source` | `source` | TEXT | NOT NULL | 来源标识 |
| `payload` | `payload` | TEXT | nullable | 变更负载 JSON |
| `status` | `status` | TEXT | NOT NULL DEFAULT 'pending' | 状态(pending/processed/failed) |
| `retryCount` | `retry_count` | INTEGER | NOT NULL DEFAULT 0 | 重试次数 |
| `lastError` | `last_error` | TEXT | nullable | 最近错误 |
| `createdAt` | `created_at` | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| `processedAt` | `processed_at` | TEXT | nullable | 处理时间 |

索引:`idx_sync_inbox_status(status)`、`idx_sync_inbox_entity(entity_type, external_id)`。

## 10. audit_logs - 审计日志(系统表)

[audit.schema.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/schema/audit.schema.ts)

审计日志,记录重要写操作的 before/after。

| 字段 | 列名 | 类型 | 约束 | 说明 |
|---|---|---|---|---|
| `id` | `id` | TEXT | PRIMARY KEY NOT NULL | UUID |
| `actorType` | `actor_type` | TEXT | NOT NULL | 操作者类型(system/user/...) |
| `actorId` | `actor_id` | TEXT | NOT NULL | 操作者 ID |
| `action` | `action` | TEXT | NOT NULL | 动作(create/update/delete/backup/restore-db/export/import) |
| `entityType` | `entity_type` | TEXT | NOT NULL | 实体类型(task/setting/database/xuanbing-file) |
| `entityId` | `entity_id` | TEXT | NOT NULL | 实体 ID |
| `before` | `before` | TEXT | nullable | 变更前状态 JSON |
| `after` | `after` | TEXT | nullable | 变更后状态 JSON |
| `metadata` | `metadata` | TEXT | nullable | 元数据 JSON |
| `createdAt` | `created_at` | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | 创建时间 |

索引:`idx_audit_logs_actor(actor_type, actor_id)`、`idx_audit_logs_entity(entity_type, entity_id)`、`idx_audit_logs_action(action)`、`idx_audit_logs_created_at(created_at)`。

审计日志由 [AuditRepository](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/repositories/audit.repository.ts) 写入,Service 层在写操作前后调用。审计写入失败不回滚业务事务,仅 `console.warn`(见 [setting.service.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/services/setting.service.ts) 等的 try/catch 模式)。

## 11. __migrations - migration 记录(系统表)

[index.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/schema/index.ts)

跟踪已执行的 migration。

| 字段 | 列名 | 类型 | 约束 | 说明 |
|---|---|---|---|---|
| `id` | `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | 自增 |
| `name` | `name` | TEXT | NOT NULL UNIQUE | migration 名(去 .sql) |
| `hash` | `hash` | TEXT | NOT NULL | 归一化后 SHA-256 |
| `appliedAt` | `applied_at` | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | 应用时间 |

详见 [migrations.md](./migrations.md)。

## 12. __schema_version - schema 版本(系统表)

[index.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/schema/index.ts)

存储当前 schema 版本号。

| 字段 | 列名 | 类型 | 约束 | 说明 |
|---|---|---|---|---|
| `id` | `id` | INTEGER | PRIMARY KEY | 固定为 1 |
| `version` | `version` | INTEGER | NOT NULL | 版本号(当前 `CURRENT_SCHEMA_VERSION = 1`) |
| `updatedAt` | `updated_at` | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | 更新时间 |

初始化:`INSERT OR IGNORE INTO __schema_version (id, version) VALUES (1, 1)`(见 [0001_initial.sql](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/migrations/0001_initial.sql) 末尾)。

## 13. 表关系图

```
┌──────────────┐        ┌──────────────┐
│   tasks      │ 1    N │ task_events  │
│              │◄───────│ task_id      │
└──────────────┘        └──────────────┘
        │ ON DELETE CASCADE
        ▼
   (任务删除时事件级联删除)

┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ app_settings │  │window_states │  │  app_logs    │  (独立表,无外键)
└──────────────┘  └──────────────┘  └──────────────┘

┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ file_assets  │  │ sync_outbox  │  │  sync_inbox  │  (独立表,无外键)
└──────────────┘  └──────────────┘  └──────────────┘

┌──────────────┐
│ audit_logs   │  (系统表,记录所有写操作,无外键)
└──────────────┘

┌──────────────┐  ┌──────────────────┐
│ __migrations │  │ __schema_version │  (系统表,迁移框架内部)
└──────────────┘  └──────────────────┘
```

**外键关系**:仅 `task_events.task_id → tasks.id`(ON DELETE CASCADE)一条显式外键。其余表通过 `entityType` / `entityId` 等字符串字段软关联(如 `audit_logs`、`sync_outbox`、`sync_inbox`),不强制外键约束。

## 14. 索引清单

| 索引名 | 表 | 字段 | 用途 |
|---|---|---|---|
| `idx_tasks_status` | tasks | status | 按状态查询任务 |
| `idx_tasks_type` | tasks | type | 按类型查询任务 |
| `idx_tasks_created_at` | tasks | created_at | 按时间排序 |
| `idx_task_events_task_id` | task_events | task_id | 按任务查事件 |
| `idx_task_events_created_at` | task_events | created_at | 按时间排序 |
| `idx_app_logs_level` | app_logs | level | 按级别过滤 |
| `idx_app_logs_scope` | app_logs | scope | 按scope过滤 |
| `idx_app_logs_created_at` | app_logs | created_at | 按时间排序 |
| `idx_audit_logs_actor` | audit_logs | actor_type, actor_id | 按操作者查询 |
| `idx_audit_logs_entity` | audit_logs | entity_type, entity_id | 按实体查询 |
| `idx_audit_logs_action` | audit_logs | action | 按动作查询 |
| `idx_audit_logs_created_at` | audit_logs | created_at | 按时间排序 |
| `idx_file_assets_sha256` | file_assets | sha256 | 按内容hash去重 |
| `idx_file_assets_category` | file_assets | category | 按分类查询 |
| `idx_file_assets_deleted_at` | file_assets | deleted_at | 软删除过滤 |
| `idx_sync_outbox_status` | sync_outbox | status | 按状态拉取待推送 |
| `idx_sync_outbox_entity` | sync_outbox | entity_type, entity_id | 按实体查询 |
| `idx_sync_inbox_status` | sync_inbox | status | 按状态拉取待处理 |
| `idx_sync_inbox_entity` | sync_inbox | entity_type, external_id | 按实体查询 |

## 15. 唯一约束

| 约束名 | 表 | 字段 |
|---|---|---|
| `namespace_key_unique` | app_settings | namespace, key |
| `role_instance_key_unique` | window_states | role, instance_key |
| (内联 UNIQUE) | __migrations | name |

## 16. 关键源码索引

- schema 入口:[electron/database/schema/index.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/schema/index.ts)
- 初始 migration DDL:[electron/database/migrations/0001_initial.sql](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/database/migrations/0001_initial.sql)
- Repository 基类(序列化辅助):[electron/repositories/base.repository.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/repositories/base.repository.ts)
- Audit Repository(审计日志写入):[electron/repositories/audit.repository.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/repositories/audit.repository.ts)
- 常量(CURRENT_SCHEMA_VERSION):[electron/ipcBus/shared/database/constants.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/shared/database/constants.ts)
