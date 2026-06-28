# 三层缓存系统

渲染层实现了一个三层缓存系统，用于减少 IPC 往返、提升页面响应速度，同时保证数据新鲜度。本文档描述三层架构、缓存策略、清理机制、缓存键设计与 IPC 协作流程。

源码目录：[src/renderer/cache/](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/cache/)

## 设计原则

| 原则 | 说明 |
| --- | --- |
| IndexedDB 不是主数据库 | IndexedDB 仅用于缓存，数据可随时删除；主数据库是主进程的 SQLite |
| 不存敏感数据 | IndexedDB 不存 token、密钥、密码；token 暂存于 `localStorage` |
| SQLite 是事实来源 | 缓存与 SQLite 冲突时，永远以 SQLite 为准 |
| 错误降级 | 缓存读写失败时 `console.warn` 后静默降级，不影响主流程 |
| 不裸写 IndexedDB | 页面必须通过 cache client 访问 IndexedDB |

## 三层架构

```
┌──────────────────────────────────────────────────────────────┐
│  Layer 3: useCachedQuery（composable）                       │
│  - 三策略：cacheFirst / networkFirst / staleWhileRevalidate  │
│  - 响应式 data / loading / refreshing / error                │
│  - 调用方组件直接消费                                         │
└───────────────▲──────────────────────────────────────────────┘
                │ getCache / setCache / getCacheEntry
┌───────────────┴──────────────────────────────────────────────┐
│  Layer 2: cache-store（读写门面）                             │
│  - setCache / getCache / getCacheEntry / removeCache          │
│  - clearByNamespace / clearByTag / clearExpired / clearAll    │
│  - 合并 CachePolicy、计算 expiresAt、版本校验、过期删除        │
└───────────────▲──────────────────────────────────────────────┘
                │ withStore / openCacheDb
┌───────────────┴──────────────────────────────────────────────┐
│  Layer 1: indexeddb-client（IDB 封装）                        │
│  - openCacheDb 单例连接                                       │
│  - withStore 事务辅助                                         │
│  - 4 个 object store：cache_entries / cache_meta / draft / ui │
│  - cacheEntryId 生成                                          │
└──────────────────────────────────────────────────────────────┘
```

## Layer 1: indexeddb-client.ts

源码：[src/renderer/cache/indexeddb-client.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/cache/indexeddb-client.ts)

渲染层唯一的 IndexedDB 访问入口。数据库配置：

| 项 | 值 |
| --- | --- |
| DB_NAME | `xuanbing-cache` |
| DB_VERSION | `1` |

### 4 个 object store

| store 名 | keyPath | 索引 | 用途 |
| --- | --- | --- | --- |
| `cache_entries` | `id` | `namespace` / `namespace_key`（unique）/ `expiresAt` | 缓存条目主存储 |
| `cache_meta` | `id` | `namespace`（unique） | 命名空间元信息（version / updatedAt） |
| `draft_entries` | `id` | `namespace` | 草稿条目（用户未提交的表单数据） |
| `ui_state` | `id` | `namespace` | UI 状态持久化（如表格分页、筛选条件） |

### CacheEntry 结构

```typescript
interface CacheEntry {
  id: string            // `${namespace}::${key}`
  namespace: string
  key: string
  value: unknown
  version: number
  tags: string[]
  createdAt: number
  updatedAt: number
  expiresAt: number | null  // null 表示永不过期
  stale: boolean
}
```

### 核心 API

- `openCacheDb()`：单例连接，复用 `dbInstance` 或 `openPromise`，避免重复打开。
- `withStore<T>(storeName, mode, fn)`：事务辅助函数，封装 `transaction` + `objectStore` + `request.onsuccess/onerror`，返回 Promise。
- `cacheEntryId(namespace, key)`：生成 `${namespace}::${key}` 形式的条目 ID。

### onupgradeneeded

首次打开或版本升级时创建 4 个 object store 与对应索引。`cache_entries` 的 `namespace_key` 索引为 unique，确保同一 namespace + key 只有一条记录。

## Layer 2: cache-store.ts

源码：[src/renderer/cache/cache-store.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/cache/cache-store.ts)

提供缓存读写的门面 API，封装策略合并、版本校验、过期清理等逻辑。所有方法均 `try/catch` 降级，失败时 `console.warn` 后静默返回 null/undefined。

### 核心 API

| API | 职责 |
| --- | --- |
| `setCache(namespace, key, value, policyOverride?)` | 写入缓存条目，合并 `DEFAULT_CACHE_POLICY` 与 `policyOverride`，计算 `expiresAt`，同时更新 `cache_meta` |
| `getCache<T>(namespace, key, expectedVersion?)` | 读取缓存值；版本不匹配返回 null；过期时同步删除并返回 null |
| `getCacheEntry(namespace, key)` | 读取完整 CacheEntry（含元信息），供 staleWhileRevalidate 判断 stale |
| `removeCache(namespace, key)` | 删除单条缓存 |
| `clearByNamespace(namespace)` | 按命名空间清理（使用 `namespace` 索引 + cursor） |
| `clearByTag(tag)` | 按标签清理（遍历全部条目，命中 tag 则删除） |
| `clearExpired()` | 清理过期缓存（使用 `expiresAt` 索引 + `IDBKeyRange.upperBound(now, true)`） |
| `clearAll()` | 清空 `cache_entries` 全部条目 |

### getCache 的版本与过期校验

```typescript
// 版本校验
if (expectedVersion !== undefined && entry.version !== expectedVersion) {
  return null
}
// 过期校验
if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
  await removeCache(namespace, key)  // 同步删除避免反复命中过期数据
  return null
}
```

## Layer 2.5: cache-policy.ts

源码：[src/renderer/cache/cache-policy.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/cache/cache-policy.ts)

定义缓存策略与查询策略。

### CachePolicy

```typescript
interface CachePolicy {
  ttlMs: number | null   // TTL 毫秒，null 表示永不过期
  staleMs: number | null // stale 时间毫秒，超过此时间标记为 stale 但仍可返回
  version: number        // 缓存版本，版本变化清理
  tags: string[]         // 标签，用于批量清理
}
```

### 默认策略

```typescript
const DEFAULT_CACHE_POLICY: CachePolicy = {
  ttlMs: 5 * 60 * 1000,      // 5 分钟 TTL
  staleMs: 30 * 60 * 1000,   // 30 分钟 stale 窗口
  version: 1,
  tags: []
}
```

### 双时间窗：fresh + stale

```
  写入 ──────── ttlMs (5min) ──────── staleMs (30min) ────────►
  │  fresh（直接用）  │  stale（后台刷新，仍可返回）  │  过期（删除）  │
```

- **fresh 窗口**（`ttlMs` 内）：缓存命中直接返回，不触发后台刷新。
- **stale 窗口**（超过 `ttlMs` 但未超过 `staleMs`）：缓存命中仍可返回，但 `staleWhileRevalidate` 策略下触发后台刷新。
- **过期**（超过 `staleMs` 或 `expiresAt`）：`getCache` 删除并返回 null；`staleWhileRevalidate` 策略下网络失败时仍可回退 stale 数据。

注意：`ttlMs` 与 `staleMs` 是独立配置。`expiresAt` 由 `computeExpiresAt(policy)` 计算（`Date.now() + ttlMs`），用于 `getCache` 的过期判断。`staleMs` 仅在 `staleWhileRevalidate` 策略中通过 `isExpired` 判断是否触发后台刷新。

### 辅助函数

- `isExpired(entry)`：`entry.expiresAt === null ? false : Date.now() > entry.expiresAt`。
- `isStale(entry, policy)`：`policy.staleMs === null ? false : Date.now() - entry.updatedAt > policy.staleMs`。
- `mergePolicy(base, override)`：合并策略，override 优先。
- `computeExpiresAt(policy)`：计算过期时间戳，`ttlMs === null` 返回 null。

### QueryStrategy

```typescript
type QueryStrategy = 'cacheFirst' | 'networkFirst' | 'staleWhileRevalidate'
const DEFAULT_QUERY_STRATEGY: QueryStrategy = 'staleWhileRevalidate'
```

## Layer 3: useCachedQuery

源码：[src/renderer/composables/useCachedQuery.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/composables/useCachedQuery.ts)

组合式函数，实现三种查询策略，返回响应式 `data` / `loading` / `refreshing` / `error` 与 `execute` / `refresh` 方法。

### 三策略详解

#### cacheFirst

1. `getCache(namespace, key, policy.version)` 读缓存。
2. 命中 → 返回缓存值，`state.data` 更新。
3. 未命中 → `fetchFromNetwork()`（调用 `fetcher` + `setCache` + 更新 `state.data`）。

适用：缓存优先，仅在缓存缺失时走网络。如静态配置、字典数据。

#### networkFirst

1. `fetchFromNetwork()` 走网络。
2. 成功 → 返回网络数据。
3. 失败 → `getCache` 回退缓存；无缓存则抛错。

适用：数据新鲜度优先，网络失败时回退缓存。如列表数据、实时状态。

#### staleWhileRevalidate（默认）

1. `getCacheEntry(namespace, key)` 读完整条目。
2. 有 stale 且未过期（`!isExpired(entry)`）→ 立即返回 stale 值 + 后台 `backgroundRefresh()`。
3. 有 stale 但过期 → 走网络；网络失败时回退 stale 值（避免无数据可用）。
4. 无 stale → 走网络。

适用：大多数场景。兼顾响应速度与数据新鲜度。

### 后台刷新

`backgroundRefresh()`：

- 设置 `state.refreshing = true`。
- 调用 `fetchFromNetwork()`（`fetcher` + `setCache` + 更新 `state.data`）。
- 触发 `options.onRefresh?.(result)` 回调，通知调用方刷新完成。
- finally 重置 `state.refreshing = false`。

### refresh 方法

`refresh()`：强制走网络（跳过缓存读取），用于手动刷新场景。设置 `loading = true`（非 `refreshing`）。

## cache-cleaner.ts — 周期清理

源码：[src/renderer/cache/cache-cleaner.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/cache/cache-cleaner.ts)

周期清理过期缓存，避免 IndexedDB 无限膨胀。

| API | 职责 |
| --- | --- |
| `startCacheCleaner()` | 启动周期定时器（`CLEAN_INTERVAL_MS = 5 * 60 * 1000`，5 分钟），调用 `clearExpired()` |
| `stopCacheCleaner()` | 停止定时器，清空 `cleanerTimer` |
| `runCleanup()` | 手动触发一次清理 |

### 生命周期

- `startCacheCleaner()` 在根组件 `onMounted` 中调用（见 [src/renderer.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer.ts) 第 208 行）。
- `stopCacheCleaner()` 在根组件 `onBeforeUnmount` 中调用（第 229 行），释放定时器。
- `startCacheCleaner` 内部 `if (cleanerTimer) return` 防止重复启动。

## 缓存键设计

### 条目 ID

`cacheEntryId(namespace, key)` 生成 `${namespace}::${key}` 形式的 ID，作为 `cache_entries` 的 keyPath。

### namespace 设计建议

- 按业务领域划分：`task` / `setting` / `database` / `dashboard` 等。
- 按数据类型细分：`task:list` / `task:detail` / `setting:namespace:xxx`。
- 避免过细粒度，导致 namespace 数量爆炸。

### version 设计

- `version` 用于缓存失效：版本变化时，`getCache` 返回 null，触发重新获取。
- 适用场景：schema 变更、数据结构升级、强制刷新。
- `cache_meta` store 记录每个 namespace 的最新 version 与 updatedAt。

### tags 设计

- `tags` 用于批量清理：`clearByTag(tag)` 遍历所有条目，命中 tag 则删除。
- 适用场景：用户登出时清理 `auth-related` tag、任务完成时清理 `task:pending` tag。

## 与 IPC 请求的协作流程

典型流程（以 `useCachedQuery('task', 'list', () => taskClient.list())` 为例）：

```
组件 setup
  │
  ▼
useCachedQuery('task', 'list', fetcher)
  │
  ▼
execute()  ──► strategy = 'staleWhileRevalidate'（默认）
  │
  ├─► getCacheEntry('task', 'list')
  │     │
  │     ├─ indexedDB.get(id)
  │     │
  │     ├─ 命中且未过期 ──► state.data = entry.value
  │     │                    │
  │     │                    └─ backgroundRefresh()
  │     │                          │
  │     │                          ├─ fetcher() ──► taskClient.list()
  │     │                          │                   │
  │     │                          │                   └─ window.desktop.taskData.list()
  │     │                          │                          │
  │     │                          │                          └─ IPC ──► 主进程 SQLite 查询
  │     │                          │
  │     │                          ├─ setCache('task', 'list', result)
  │     │                          │     │
  │     │                          │     └─ indexedDB.put(entry) + cache_meta.put
  │     │                          │
  │     │                          └─ state.data = result（刷新 UI）
  │     │
  │     └─ 过期但有 stale ──► 走网络，失败回退 stale
  │
  └─► 无缓存 ──► fetchFromNetwork() ──► fetcher() ──► IPC ──► SQLite
                                                    │
                                                    └─ setCache + state.data
```

### 关键点

1. **IPC 是真实数据源**：`fetcher` 内部调用 `services/*.client.ts`，client 调用 `window.desktop`，最终由主进程的 IpcMainBus 分发到 SQLite。
2. **缓存是加速层**：缓存命中时立即返回，后台异步刷新；缓存未命中时走 IPC 同步获取。
3. **错误降级**：IndexedDB 读写失败时 `console.warn` 后静默降级，不影响主流程；网络失败时 `staleWhileRevalidate` 回退 stale 缓存。
4. **版本校验**：`getCache` 接受 `expectedVersion` 参数，版本不匹配返回 null，触发重新获取。
5. **清理机制**：`cache-cleaner` 每 5 分钟清理过期条目；`getCache` 读到过期条目时同步删除。

## 相关文档

- [渲染层概览](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/docs/renderer/overview.md)
- [Composables](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/docs/renderer/composables.md)
- [架构总览](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/docs/architecture/overview.md)
