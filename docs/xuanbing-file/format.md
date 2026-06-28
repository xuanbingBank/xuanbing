# .xuanbing 文件格式规范

xuanbing(All In One)桌面应用自研 `.xuanbing` 文件格式,作为数据导出/导入的载体。本文档定义文件结构、二进制布局、payload schema、版本演进策略,以及与运行时 SQLite 数据库的关系。

## 1. 设计目标

- **自描述**:文件内含 magic、formatVersion、schemaVersion、appVersion、metadata,无需外部依赖即可识别。
- **完整性校验**:SHA-256 checksum 覆盖核心字段,防止意外损坏(注意:不防恶意篡改,详见 [io-security.md](./io-security.md) 第 3 节)。
- **类型安全**:通过 Zod schema 校验文件结构,字段类型在运行时强校验。
- **大小受限**:硬性 10MB 上限,防止内存膨胀与 DoS。
- **跨平台**:JSON 文本格式,UTF-8 编码,无平台依赖。

## 2. 文件结构

`.xuanbing` 文件本质是 UTF-8 编码的 JSON 文档,顶层结构定义于 [xuanbing-file-types.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/xuanbing-file-types.ts) 的 `XuanbingFile` 接口,并由 [xuanbing-file.schema.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/xuanbing-file.schema.ts) 的 `xuanbingFileSchema` Zod 校验。

| 字段 | 类型 | 说明 |
|---|---|---|
| `magic` | string(literal) | 固定 `'XUANBING_FILE_DB'`,快速识别文件格式 |
| `formatVersion` | number(int ≥ 1) | 文件格式版本,当前为 1 |
| `type` | XuanbingFileType | 文件类型枚举 |
| `appVersion` | string(非空) | 生成文件的应用版本 |
| `schemaVersion` | number(int ≥ 1) | payload 数据 schema 版本 |
| `createdAt` | string(非空) | 文件创建时间 ISO |
| `updatedAt` | string(非空) | 文件更新时间 ISO |
| `metadata` | XuanbingFileMetadata | 元数据(名称、描述、作者、标签) |
| `payload` | unknown | 实际数据,按 `type` 不同结构不同 |
| `checksum` | string(非空) | SHA-256 校验码,格式 `sha256:<hex>` |

### 2.1 常量

定义于 [constants.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/shared/database/constants.ts):

| 常量 | 值 | 说明 |
|---|---|---|
| `XUANBING_MAGIC` | `'XUANBING_FILE_DB'` | 文件 magic |
| `XUANBING_FORMAT_VERSION` | `1` | 当前格式版本 |
| `XUANBING_EXTENSION` | `'xuanbing'` | 扩展名(不含点) |
| `XUANBING_DOT_EXTENSION` | `'.xuanbing'` | 扩展名(含点) |
| `XUANBING_MAX_FILE_BYTES` | `10 * 1024 * 1024` | 10MB 文件大小上限 |
| `XUANBING_MIN_SUPPORTED_VERSION` | `1` | 最低支持版本(定义于 schema.ts) |

### 2.2 XuanbingFileType 枚举

`XUANBING_FILE_TYPES` 定义 7 种文件类型:

| 类型 | 用途 | payload schema 状态 |
|---|---|---|
| `settings-package` | 设置包 | 占位 `z.record(z.string(), z.unknown())` |
| `task-export` | 任务导出 | 已定义 `taskExportPayloadSchema` |
| `workspace-package` | 工作区包 | 占位 |
| `plugin-package` | 插件包 | 占位 |
| `data-snapshot` | 数据快照 | 占位 |
| `diagnostics-package` | 诊断包 | 占位 |
| `custom-json-db` | 自定义 JSON DB | 占位 |

当前仅 `task-export` 类型有完整 payload schema 与 importer 实现,其余类型 schema 为占位,待后续落地。

### 2.3 XuanbingFileMetadata

```ts
interface XuanbingFileMetadata {
  name: string         // 1-256 字符
  description: string  // ≤ 2048 字符,默认 ''
  author: string       // ≤ 128 字符,默认 'local'
  tags: string[]       // 每项 ≤ 64 字符,最多 50 项,默认 []
}
```

Zod schema 见 [xuanbingMetadataSchema](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/xuanbing-file.schema.ts)。

## 3. 二进制布局示意

`.xuanbing` 文件是 UTF-8 编码的 JSON 文本,无二进制头。布局示意:

```
┌──────────────────────────────────────────────────────────────┐
│  UTF-8 JSON 文本(整体不超过 10MB)                            │
├──────────────────────────────────────────────────────────────┤
│  {                                                            │
│    "magic": "XUANBING_FILE_DB",       ← 16 字节 ASCII 字符串  │
│    "formatVersion": 1,                ← 文件格式版本          │
│    "type": "task-export",             ← 文件类型              │
│    "appVersion": "1.0.0",             ← 应用版本              │
│    "schemaVersion": 1,                ← payload schema 版本   │
│    "createdAt": "2026-06-28T...",     ← ISO 时间              │
│    "updatedAt": "2026-06-28T...",     ← ISO 时间              │
│    "metadata": { ... },               ← 元数据                │
│    "payload": { ... },                ← 实际数据              │
│    "checksum": "sha256:<hex>"         ← SHA-256 校验码        │
│  }                                                            │
└──────────────────────────────────────────────────────────────┘
```

- 文件以 `{` 开头,无 BOM,无前导字节。
- magic 字段是 JSON 字符串,不是二进制 magic number,便于人类阅读与 `JSON.parse`。
- checksum 是 16 进制 SHA-256 加 `sha256:` 前缀,共 71 字符。

## 4. 10MB 文件大小限制(硬约束)

`XUANBING_MAX_FILE_BYTES = 10 * 1024 * 1024`(10MB)是**硬约束**,在多处强制:

- [safe-file-path.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/safe-file-path.ts) 的 `ensureFileSize(filePath, maxBytes)`:读取前 `fs.statSync` 校验大小,超限抛 `XUANBING_FILE_TOO_LARGE`。
- [xuanbing-file-reader.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/xuanbing-file-reader.ts) 读取后再次校验 `Buffer.byteLength(rawContent)`,防止 `ensureFileSize` 与 `readFileSync` 之间发生 TOCTOU(文件被追加写入超过限制)。

### 4.1 限制原因(源码注释)

- 当前读取流程为 `readFileSync` 整读 + `JSON.parse`,会产生 2-5 倍内存膨胀。
- 10MB 上限用于限制峰值内存占用,避免主进程 OOM。
- TODO:大文件应改用流式解析(如流式 JSON parser),届时可放宽上限。

## 5. payload JSON 结构

payload 字段在 [xuanbingFileSchema](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/xuanbing-file.schema.ts) 中当前为 `z.unknown()`,由 importer 内运行时校验兜底。已为各类型预定义 payload schema 常量供后续切换。

### 5.1 task-export payload

`taskExportPayloadSchema`(已定义但未在主 schema 强制使用):

```ts
{
  tasks: Array<{
    id: string
    type: string
    title: string
    status: string
    progress: number
    input: unknown
    output: unknown
    error: string | null
    startedAt: string | null
    finishedAt: string | null
    canceledAt: string | null
    createdAt: string
    updatedAt: string
  }>,
  events?: Array<{  // 可选
    id: string
    taskId: string
    eventType: string
    message: string
    payload: unknown
    createdAt: string
  }>
}
```

与 [xuanbing-file-importer.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/xuanbing-file-importer.ts) 的 `TaskExportPayload` 接口对齐,由 `assertTaskExportPayload` 运行时校验(tasks 必须为数组,events 可选但若存在必须为数组)。

### 5.2 其他类型 payload

`settings-package` / `workspace-package` / `plugin-package` / `data-snapshot` / `diagnostics-package` / `custom-json-db` 的 payload schema 当前为占位 `z.record(z.string(), z.unknown())`,待 importer 落地后细化。

### 5.3 TODO:discriminatedUnion

源码 TODO 标注:payload 当前为 `z.unknown()` 以保持向后兼容,后续改为 `z.discriminatedUnion('type', [...])`,按 `type` 字段自动选择对应 payload schema。届时 importer 内的 `as` 强转与 `assertTaskExportPayload` 可移除。

## 6. checksum 计算

[computeChecksum](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/xuanbing-file-checksum.ts) 计算 SHA-256:

### 6.1 覆盖字段

checksum 覆盖以下字段:
- `formatVersion`
- `type`
- `schemaVersion`
- `metadata`
- `payload`

**不覆盖**:`checksum` 自身、`createdAt`、`updatedAt`、`appVersion`、`magic`(magic 由 literal schema 独立校验)。

### 6.2 稳定序列化

`stableStringify` 对顶层对象键排序后 `JSON.stringify`,保证相同内容产生相同字符串,避免对象键序不同导致 checksum 不稳定。仅对顶层对象键排序;嵌套结构(metadata / payload)由生成方保证键序稳定。

### 6.3 安全说明(源码注释)

- **appVersion 未纳入 checksum**,文件可伪造 appVersion 声称来自任意应用版本而不被发现。
- **checksum 为无密钥 SHA-256,仅防意外损坏,不防恶意篡改**。攻击者可重新计算 checksum 覆盖原值。如需防篡改应改用 HMAC + 密钥签名。

详见 [io-security.md](./io-security.md) 第 3 节。

### 6.4 verifyChecksum

```ts
function verifyChecksum(file): boolean {
  const expected = computeChecksum({ formatVersion, type, schemaVersion, metadata, payload })
  return expected === file.checksum
}
```

读取时通过 [verifyChecksum](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/xuanbing-file-checksum.ts) 比对,不一致抛 `XUANBING_FILE_CHECKSUM_FAILED`(`severity: high`)。

## 7. formatVersion 升级策略

### 7.1 版本兼容矩阵

| 文件 formatVersion | 处理 |
|---|---|
| `< XUANBING_MIN_SUPPORTED_VERSION`(=1) | 拒绝读取,抛 `XUANBING_FILE_VERSION_UNSUPPORTED` |
| `1` ~ `XUANBING_FORMAT_VERSION`(=1) | 正常读取 |
| `> XUANBING_FORMAT_VERSION` | 拒绝读取,抛 `XUANBING_FILE_VERSION_UNSUPPORTED` |

### 7.2 升级流程

当格式演进引入不兼容变更时:

1. 提升 `XUANBING_FORMAT_VERSION` 常量。
2. 在读取层添加版本迁移函数(占位,当前未实现)。
3. 提升 `XUANBING_MIN_SUPPORTED_VERSION` 以拒绝旧版本,或保留低版本支持并实现迁移。
4. 更新 `xuanbingFileSchema` 的 `formatVersion` 约束。

### 7.3 当前状态

- `XUANBING_FORMAT_VERSION = 1`,`XUANBING_MIN_SUPPORTED_VERSION = 1`,即仅支持 v1。
- 升级框架为占位,未来引入 v2 时需补充迁移逻辑。

## 8. 与 app.sqlite 的关系

`.xuanbing` 文件与 `app.sqlite` 数据库是**两种独立的数据形态**,关系如下:

| 维度 | app.sqlite | .xuanbing |
|---|---|---|
| 角色 | 运行时存储 | 导出/导入载体 |
| 格式 | SQLite 二进制 | UTF-8 JSON 文本 |
| 位置 | `userData/app-data/db/app.sqlite` | 任意路径(经 dialog 选择) |
| 大小 | 无硬限 | 10MB 硬限 |
| 校验 | 无 checksum | SHA-256 checksum |
| 生命周期 | 持续读写 | 一次性导出/导入 |
| 访问方式 | better-sqlite3 同步连接 | 文件读写 + Zod 校验 |

**数据流向**:

```
app.sqlite ──export──▶ .xuanbing 文件 ──import──▶ app.sqlite
   (运行时)              (传输/归档)              (运行时)
```

- **导出**:从 `app.sqlite` 查询数据,构建 payload,通过 [xuanbing-file-exporter.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/xuanbing-file-exporter.ts) 写入 `.xuanbing` 文件。
- **导入**:读取 `.xuanbing` 文件,校验 magic/checksum/schema,通过 [xuanbing-file-importer.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/xuanbing-file-importer.ts) 写回 `app.sqlite`。
- **互不替代**:`.xuanbing` 不是数据库,不支持查询;`app.sqlite` 不是传输格式,体积大且二进制。

## 9. 相关文档

- [io-security.md](./io-security.md):读写流程、校验机制、原子写入、路径穿越防护、导入冲突策略、token 机制。
- [../database/overview.md](../database/overview.md):运行时数据库层概览。
- [../database/schema.md](../database/schema.md):app.sqlite 表结构。

## 10. 关键源码索引

- 类型定义:[electron/file-db/xuanbing-file-types.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/xuanbing-file-types.ts)
- Zod schema:[electron/file-db/xuanbing-file.schema.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/xuanbing-file.schema.ts)
- checksum:[electron/file-db/xuanbing-file-checksum.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/xuanbing-file-checksum.ts)
- 常量:[electron/ipcBus/shared/database/constants.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/ipcBus/shared/database/constants.ts)
- 入口:[electron/file-db/index.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/electron/file-db/index.ts)
