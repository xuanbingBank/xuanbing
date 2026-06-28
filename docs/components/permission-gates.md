# 权限门禁组件

xuanbing（All In One）Electron 桌面应用提供两套 UI 层权限门禁组件，分别面向「用户权限」与「窗口角色权限」两个维度。两者均位于 `src/renderer/components/business/`，统一导出于 [business/index.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/business/index.ts)。

> ⚠️ 安全提示：UI 层权限判断仅用于**控制元素显隐 / 禁用**以提升体验，真实安全边界在主进程 IPC 守卫与路由守卫中强制校验。任何敏感操作都不得仅依赖本组件。

---

## 一、权限模型背景

应用存在两个相互独立的权限维度：

- **用户权限（user permission）**：登录用户的全局权限码 / 角色，例如 `task:create`、`role:admin`，决定用户在整个应用中能做什么。
- **窗口角色权限（window role permission）**：当前 Electron 窗口的角色，例如 `main` / `child` / `dialog`，决定某个窗口内能显示哪些 UI。同一个用户在不同窗口（主窗口 vs 子窗口 vs 弹窗）可能呈现不同界面。

二者的数据来源、判断函数、适用场景均不同，因此拆分为两个门禁组件。

---

## 二、PermissionGate

文件：[PermissionGate.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/business/PermissionGate.ts)

### 用途

基于**用户权限 / 角色 / 窗口角色**三类条件组合控制子元素显隐或禁用。是三者中能力最全的门禁组件，适合需要同时校验多个维度的场景。

### Props

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| permissions | `string[]` | `[]` | 需要校验的权限码列表 |
| mode | `'any' \| 'all'` | `'any'` | 权限匹配模式：`any`=拥有任一即可；`all`=必须全部拥有 |
| roles | `string[]` | `[]` | 用户角色列表，任一匹配即可 |
| windowRoles | `string[]` | `[]` | 窗口角色列表，任一匹配即可 |
| behavior | `'hide' \| 'disable'` | `'hide'` | 无权限行为：`hide`=隐藏并渲染 fallback；`disable`=置灰禁用 |

### 判定逻辑

`allowed` 计算属性按以下顺序短路求值，所有「非空条件」均需满足：

1. `permissions` 非空 → 按 `mode` 调用 `hasAnyPermission` 或 `hasAllPermissions`；
2. `roles` 非空 → `roles.some(r => hasRole(r))`；
3. `windowRoles` 非空 → `windowRoles.some(r => isWindowRole(r))`；
4. 三类条件均通过（或都为空）→ `allowed = true`。

> 注意：当三类 prop 均为空时，`allowed` 恒为 `true`，即默认放行。

### 渲染分支

- `allowed` → 渲染默认插槽；
- `!allowed && behavior === 'disable'` → 渲染默认插槽，但容器加 `pointer-events-none opacity-50`；
- `!allowed && behavior === 'hide'` → 渲染 `fallback` 具名插槽（无则不输出任何节点）。

### 依赖的 composable

[usePermission](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/composables/usePermission.ts)，封装自 `permission.store`，提供：

| 方法 | 说明 |
| --- | --- |
| `permissions` | 当前全部权限（computed） |
| `windowRole` | 当前窗口角色（string） |
| `hasPermission(permission)` | 是否拥有指定权限 |
| `hasAnyPermission(permissions)` | 是否拥有任一权限 |
| `hasAllPermissions(permissions)` | 是否拥有全部权限 |
| `hasRole(role)` | 是否拥有指定角色 |
| `isWindowRole(role)` | 当前窗口角色是否匹配 |

---

## 三、WindowPermissionGate

文件：[WindowPermissionGate.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/business/WindowPermissionGate.ts)

### 用途

仅基于**当前窗口角色**控制子元素显隐或禁用。语义更窄、API 更简洁，适合「只在主窗口显示」「只在子窗口显示」这类纯窗口维度判断。

### Props

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| roles | `string[]` | `[]` | 允许的窗口角色列表，任一匹配即可 |
| behavior | `'hide' \| 'disable'` | `'hide'` | 无权限行为，与 `PermissionGate` 一致 |

### 判定逻辑

- `roles` 为空 → `allowed = true`（默认放行）；
- `roles` 非空 → `isRoleIn(roles)`。

### 渲染分支

与 `PermissionGate` 完全一致（hide / disable / fallback 三分支）。

### 依赖的 composable

[useWindowRole](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/composables/useWindowRole.ts)，封装自 `window.store`，提供：

| 方法 / 字段 | 说明 |
| --- | --- |
| `windowRole` | 当前窗口角色（computed） |
| `windowId` | 窗口 ID（computed） |
| `isElectron` | 是否 Electron 环境 |
| `isMaximized` / `isFocused` / `isVisible` / `initialized` | 窗口状态 |
| `isRole(role)` | 当前窗口角色是否等于 `role` |
| `isRoleIn(roles)` | 当前窗口角色是否在 `roles` 列表中 |

---

## 四、两者差异对比

| 维度 | PermissionGate | WindowPermissionGate |
| --- | --- | --- |
| 权限来源 | 用户权限 + 用户角色 + 窗口角色（三维度组合） | 仅窗口角色 |
| 校验范围 | 全局用户身份为主，可附带窗口角色 | 仅当前窗口身份 |
| Props 数量 | 5 个（permissions / mode / roles / windowRoles / behavior） | 2 个（roles / behavior） |
| 匹配模式 | 支持 `any` / `all`（针对 permissions） | 仅 `any`（roles 任一匹配） |
| 依赖 composable | [usePermission](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/composables/usePermission.ts) | [useWindowRole](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/composables/useWindowRole.ts) |
| 底层 store | `permission.store` | `window.store` |
| 使用场景 | 控制全局 UI 元素（菜单项、操作按钮）按用户权限显隐 | 控制窗口内 UI 元素按窗口角色显隐（如仅主窗口显示侧栏） |
| 默认放行 | 三类 prop 均为空时放行 | `roles` 为空时放行 |
| 渲染分支 | hide / disable / fallback | hide / disable / fallback（一致） |

### 选择建议

- 只关心「这是不是某个窗口」→ 用 `WindowPermissionGate`，API 更简单。
- 需要校验「登录用户是否有 `task:create` 权限」→ 用 `PermissionGate`。
- 既校验用户权限又校验窗口角色 → 用 `PermissionGate` 同时传 `permissions` 与 `windowRoles`，避免嵌套两层门禁。

---

## 五、RouteViewWrapper

文件：[RouteViewWrapper.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/business/RouteViewWrapper.ts)

### 用途

路由视图包装器，渲染当前路由对应的页面组件，并用 `<Suspense>` 包裹以处理异步加载态。

### 机制

- 通过 `inject('getPageComponent')` 获取当前页面组件工厂函数；
- 通过 `inject('getPageProps')` 获取当前页面 props；
- `<Suspense>` 的 `#default` 插槽渲染 `<component :is="pageComponent" v-bind="pageProps" />`；
- `#fallback` 插槽渲染 daisyUI 的 `loading loading-spinner loading-lg` 居中加载态。

### 与权限守卫的关系

`RouteViewWrapper` 自身不直接做权限判断，而是配合**路由守卫**工作：路由守卫在导航前完成权限校验（未通过则重定向），通过后才进入 `RouteViewWrapper` 渲染页面。因此组件内的权限门禁（`PermissionGate` / `WindowPermissionGate`）主要用于页面内细粒度元素控制，而非整页访问控制。

> 已知 TODO（见组件文件头注释）：当前仅有 `Suspense` 处理异步加载态，缺少 `ErrorBoundary` 包裹路由页面，单个页面抛同步异常时可能导致白屏。建议后续新增 `ErrorBoundary` 组件兜底。

---

## 六、StatusBadge

文件：[StatusBadge.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/business/StatusBadge.ts)

虽然不属于权限门禁，但同属 business/ 分类，常与门禁组件配合用于展示权限 / 流程状态。

### 用途

统一展示任务 / 工单 / 流程等业务状态，内置 8 种预设状态映射，支持自定义。

### Props

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| status | `StatusType \| string` | `'pending'` | 状态类型 |
| statusMap | `Record<string, StatusMapItem>` | `{}` | 自定义状态映射，与 `DEFAULT_STATUS_MAP` 合并 |
| dot | boolean | true | 是否显示圆点 |
| size | `'small' \| 'medium'` | `'small'` | 大小 |
| text | string | `''` | 自定义文本，覆盖映射中的 label |
| clickable | boolean | false | 是否可点击 |

### 预设状态映射 `DEFAULT_STATUS_MAP`

| StatusType | label | variant | icon |
| --- | --- | --- | --- |
| pending | 待处理 | warning | clock |
| running | 进行中 | info | refresh |
| success | 已完成 | success | check |
| failed | 已失败 | error | close |
| warning | 警告 | warning | warning |
| disabled | 已禁用 | default | close |
| archived | 已归档 | default | folder |
| info | 信息 | info | info |

底层渲染委托给 [FluentBadge](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/base/FluentBadge.ts)。

---

## 七、使用示例

### 1. PermissionGate：按用户权限隐藏按钮

```vue
<PermissionGate :permissions="['task:create']" behavior="hide">
  <template #default>
    <FluentButton variant="primary" icon="plus" @click="createTask">新建任务</FluentButton>
  </template>
  <template #fallback>
    <span class="text-[var(--xb-text-tertiary)] text-sm">无新建权限</span>
  </template>
</PermissionGate>
```

### 2. PermissionGate：要求全部权限 + 禁用态

```vue
<PermissionGate
  :permissions="['report:read', 'report:export']"
  mode="all"
  behavior="disable"
>
  <FluentButton variant="subtle" icon="download" @click="exportReport">导出报表</FluentButton>
</PermissionGate>
```

### 3. PermissionGate：组合用户角色与窗口角色

```vue
<!-- 仅 admin 用户 且 在 main 窗口显示 -->
<PermissionGate :roles="['admin']" :window-roles="['main']">
  <FluentButton variant="danger" @click="resetSystem">重置系统</FluentButton>
</PermissionGate>
```

### 4. WindowPermissionGate：仅主窗口显示侧栏折叠按钮

```vue
<WindowPermissionGate :roles="['main']">
  <AppSidebar />
</WindowPermissionGate>
```

### 5. WindowPermissionGate：弹窗窗口禁用某区块

```vue
<WindowPermissionGate :roles="['main', 'child']" behavior="disable">
  <div class="settings-panel">
    <!-- 仅主/子窗口可操作，dialog 窗口置灰 -->
  </div>
</WindowPermissionGate>
```

### 6. RouteViewWrapper：在布局中渲染当前页面

```vue
<template>
  <AppContent>
    <RouteViewWrapper />
  </AppContent>
</template>
```

页面组件通过上层 `provide('getPageComponent')` / `provide('getPageProps')` 注入；路由守卫负责权限校验后再注入。

### 7. StatusBadge：展示任务状态

```vue
<!-- 使用预设 -->
<StatusBadge status="running" />

<!-- 自定义状态 -->
<StatusBadge
  status="reviewing"
  :status-map="{ reviewing: { label: '审核中', variant: 'info', icon: 'eye' } }"
/>
```

---

## 八、相关引用

- 组件：[PermissionGate.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/business/PermissionGate.ts) · [WindowPermissionGate.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/business/WindowPermissionGate.ts) · [RouteViewWrapper.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/business/RouteViewWrapper.ts) · [StatusBadge.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/business/StatusBadge.ts)
- Composables：[usePermission.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/composables/usePermission.ts) · [useWindowRole.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/composables/useWindowRole.ts)
- 统一导出：[business/index.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/business/index.ts)
- 组件库总览：[overview.md](./overview.md)
