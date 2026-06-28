# 组件库概览

xuanbing（All In One）Electron 桌面应用的渲染层组件库文档。组件库位于 `src/renderer/components/`，采用 **Fluent UI** 设计语言，以 CSS 变量 `--xb-*` 驱动视觉表现，按功能划分为 7 个分类、共 70+ 组件。样式系统位于 `src/renderer/styles/`，基于 Tailwind CSS v4 + daisyUI v5 构建。

---

## 一、设计原则

1. **Fluent UI 优先**：所有新组件以 `Fluent` 前缀命名，视觉来源于 `--xb-*` 设计 token，避免硬编码颜色。
2. **CSS 变量驱动**：颜色 / 圆角 / 阴影 / 间距 / 动效全部抽象为 `--xb-*` 变量，主题切换只需修改 `data-theme` 属性。
3. **Tailwind + daisyUI 共存**：Fluent 自定义组件优先使用 `--xb-*` token 与 Tailwind 工具类；daisyUI 仍可在非 Fluent 区域（如 `RouteViewWrapper` 的 loading spinner）使用。
4. **克制动效**：hover 背景变化、active 缩放、浮层淡入位移等，全部尊重 `prefers-reduced-motion`。
5. **权限分层**：UI 层用 `PermissionGate` / `WindowPermissionGate` 控制显隐；真实安全边界在主进程 IPC 守卫与路由守卫中强制校验。

---

## 二、组件分类清单

### 1. base/ — 基础组件

同时导出遗留 `Base*` 组件（向后兼容）与新的 `Fluent*` 组件。新代码请优先使用 `Fluent*`。统一导出见 [base/index.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/base/index.ts)。

| 分类 | 组件 | 文件 | 说明 |
| --- | --- | --- | --- |
| Fluent 基础 | FluentIcon | [FluentIcon.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/base/FluentIcon.ts) | 图标组件，按 name 渲染 SVG |
| Fluent 基础 | FluentButton | [FluentButton.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/base/FluentButton.ts) | 按钮，6 种 variant / 3 种 size / 3 种 shape |
| Fluent 基础 | FluentIconButton | [FluentIconButton.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/base/FluentIconButton.ts) | 仅图标按钮 |
| Fluent 基础 | FluentCard | [FluentCard.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/base/FluentCard.ts) | 卡片容器 |
| Fluent 基础 | FluentInput | [FluentInput.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/base/FluentInput.ts) | 文本输入框 |
| Fluent 基础 | FluentSelect | [FluentSelect.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/base/FluentSelect.ts) | 下拉选择 |
| Fluent 基础 | FluentTextarea | [FluentTextarea.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/base/FluentTextarea.ts) | 多行输入 |
| Fluent 基础 | FluentSwitch | [FluentSwitch.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/base/FluentSwitch.ts) | 开关 |
| Fluent 基础 | FluentCheckbox | [FluentCheckbox.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/base/FluentCheckbox.ts) | 复选框，支持 indeterminate |
| Fluent 基础 | FluentBadge | [FluentBadge.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/base/FluentBadge.ts) | 徽标 |
| Fluent 基础 | FluentTag | [FluentTag.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/base/FluentTag.ts) | 标签 |
| Fluent 基础 | FluentDivider | [FluentDivider.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/base/FluentDivider.ts) | 分隔线 |
| Fluent 基础 | FluentSkeleton | [FluentSkeleton.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/base/FluentSkeleton.ts) | 骨架屏 |
| Fluent 基础 | FluentEmpty | [FluentEmpty.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/base/FluentEmpty.ts) | 空态 |
| Fluent 基础 | FluentLoading | [FluentLoading.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/base/FluentLoading.ts) | 加载态 |
| Fluent 基础 | FluentError | [FluentError.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/base/FluentError.ts) | 错误态（含重试） |
| Fluent 浮层 | FluentModal | [FluentModal.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/base/FluentModal.ts) | 模态框，v-model + teleport |
| Fluent 浮层 | FluentDrawer | [FluentDrawer.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/base/FluentDrawer.ts) | 抽屉，左 / 右滑入 |
| Fluent 浮层 | FluentToast | [FluentToast.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/base/FluentToast.ts) | 轻提示 |
| Fluent 浮层 | FluentDropdown | [FluentDropdown.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/base/FluentDropdown.ts) | 下拉菜单 |
| Fluent 浮层 | FluentContextMenu | [FluentContextMenu.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/base/FluentContextMenu.ts) | 右键上下文菜单 |
| Fluent 浮层 | FluentSegmented | [FluentSegmented.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/base/FluentSegmented.ts) | 分段控制器 |
| 遗留 Base | BaseButton / BaseCard / BaseModal / BaseDrawer / BaseAlert / BaseLoading / BaseEmpty / BaseError / BaseToast | [base/](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/base/) | 旧组件，向后兼容，逐步迁移到 Fluent |
| 容器 | PageContainer | [PageContainer.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/base/PageContainer.ts) | 页面容器 |

### 2. business/ — 业务组件

统一导出见 [business/index.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/business/index.ts)。

| 组件 | 文件 | 说明 |
| --- | --- | --- |
| PermissionGate | [PermissionGate.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/business/PermissionGate.ts) | 基于用户权限 / 角色 / 窗口角色控制显隐 |
| WindowPermissionGate | [WindowPermissionGate.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/business/WindowPermissionGate.ts) | 基于窗口角色控制显隐 |
| RouteViewWrapper | [RouteViewWrapper.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/business/RouteViewWrapper.ts) | 路由视图包装，Suspense 异步加载 |
| StatusBadge | [StatusBadge.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/business/StatusBadge.ts) | 业务状态徽章，预设 8 种状态映射 |

> 权限门禁组件的详细说明见 [permission-gates.md](./permission-gates.md)。

### 3. data/ — 数据展示

统一导出见 [data/index.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/data/index.ts)。

| 组件 | 文件 | 说明 |
| --- | --- | --- |
| FluentTable | [FluentTable.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/data/FluentTable.ts) | 数据表格，列定义 / 排序 / 选择 / 粘性表头 |
| FluentTableToolbar | [FluentTableToolbar.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/data/FluentTableToolbar.ts) | 表格工具栏，含密度切换 |
| FluentPagination | [FluentPagination.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/data/FluentPagination.ts) | 分页 |
| FluentDescriptionList | [FluentDescriptionList.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/data/FluentDescriptionList.ts) | 描述列表 |
| FluentStatCard | [FluentStatCard.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/data/FluentStatCard.ts) | 统计卡片，含趋势 / 颜色 |

### 4. form/ — 表单

统一导出见 [form/index.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/form/index.ts)。

| 组件 | 文件 | 说明 |
| --- | --- | --- |
| FluentFormField | [FluentFormField.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/form/FluentFormField.ts) | 表单字段容器（label / 错误） |
| FluentSearchForm | [FluentSearchForm.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/form/FluentSearchForm.ts) | 搜索表单 |
| FluentFormActions | [FluentFormActions.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/form/FluentFormActions.ts) | 表单操作区 |
| FormField / FormInput / FormSelect / FormTextarea / FormSwitch / SearchForm | [form/](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/form/) | 遗留表单组件，逐步迁移到 Fluent 系列 |

### 5. layout/ — 布局

统一导出见 [layout/index.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/layout/index.ts)。

| 组件 | 文件 | 说明 |
| --- | --- | --- |
| AppHeader | [AppHeader.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/layout/AppHeader.ts) | 顶部栏 |
| AppSidebar | [AppSidebar.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/layout/AppSidebar.ts) | 侧边栏，多级菜单 / 折叠 |
| AppSidebarItem | [AppSidebarItem.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/layout/AppSidebarItem.ts) | 侧边栏菜单项（递归） |
| AppContent | [AppContent.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/layout/AppContent.ts) | 主内容区 |
| AppBreadcrumb | [AppBreadcrumb.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/layout/AppBreadcrumb.ts) | 面包屑 |
| AppTabs | [AppTabs.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/layout/AppTabs.ts) | 多标签页 |
| AppThemeToggle | [AppThemeToggle.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/layout/AppThemeToggle.ts) | 主题切换 |
| AppWindowControls | [AppWindowControls.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/layout/AppWindowControls.ts) | Electron 窗口控制（最小化 / 最大化 / 关闭） |
| AppSearchBox | [AppSearchBox.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/layout/AppSearchBox.ts) | 顶部搜索框 |
| AppUserMenu | [AppUserMenu.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/layout/AppUserMenu.ts) | 用户菜单 |
| FluentPage | [FluentPage.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/layout/FluentPage.ts) | 页面级布局容器 |

### 6. navigation/ — 导航

统一导出见 [navigation/index.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/navigation/index.ts)。

| 组件 | 文件 | 说明 |
| --- | --- | --- |
| FluentBreadcrumb | [FluentBreadcrumb.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/navigation/FluentBreadcrumb.ts) | 面包屑导航 |
| FluentCommandBar | [FluentCommandBar.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/navigation/FluentCommandBar.ts) | 命令栏 |
| FluentCommandPalette | [FluentCommandPalette.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/navigation/FluentCommandPalette.ts) | 命令面板（Ctrl+K） |
| FluentMenu / FluentMenuGroup / FluentMenuItem / FluentSubMenu | [navigation/](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/navigation/) | 菜单族 |
| FluentTabs | [FluentTabs.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/navigation/FluentTabs.ts) | 标签页 |

### 7. table/ — 表格

统一导出见 [table/index.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/table/index.ts)。

| 组件 | 文件 | 说明 |
| --- | --- | --- |
| DataTable | [DataTable.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/table/DataTable.ts) | 通用表格封装 |
| DataTablePagination | [DataTablePagination.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/table/DataTablePagination.ts) | 表格分页配套 |
| DataTableToolbar | [DataTableToolbar.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/table/DataTableToolbar.ts) | 表格工具栏配套 |

---

## 三、命名规范与迁移策略

### 命名规范

- **Fluent 前缀 + 业务名**：`FluentButton`、`FluentTable`、`FluentCommandPalette`。
- **文件名**：PascalCase（与类名一致），如 `FluentButton.ts`。
- **App 前缀**：应用级布局组件使用 `App` 前缀，如 `AppSidebar`、`AppHeader`。
- **遗留 Base 前缀**：旧组件使用 `Base` 前缀，如 `BaseButton`、`BaseModal`。

### Base* vs Fluent* 迁移策略

| 维度 | Base*（遗留） | Fluent*（新系统） |
| --- | --- | --- |
| 视觉来源 | 部分硬编码颜色 + daisyUI 主题 | `--xb-*` 设计 token，零硬编码 |
| 主题切换 | 依赖 daisyUI 主题 | 修改 `data-theme` 即生效 |
| 动效 | 不统一 | 统一 `--xb-motion-*` + `--xb-ease` |
| 可访问性 | 部分 | 统一 `:focus-visible` 焦点环、aria-label |
| 维护状态 | 仅保留向后兼容，不再新增功能 | 持续迭代，新功能优先在此实现 |

迁移原则：
1. **新代码一律使用 Fluent\***，禁止新建 `Base*` 组件。
2. [base/index.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/base/index.ts) 同时导出两套组件，保证渐进迁移不破坏现有调用方。
3. 旧页面重构时，将 `Base*` 调用替换为对应 `Fluent*`，删除旧引用。
4. 全部迁移完成后，再统一移除 `Base*` 组件及其导出。

---

## 四、样式系统

样式入口 [index.css](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/styles/index.css) 通过 `<link>` 由 `index.html` 直接加载，依次引入 daisyUI 编译样式、Fluent token、主题、动画与滚动条。

### 文件职责

| 文件 | 职责 |
| --- | --- |
| [tokens.css](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/styles/tokens.css) | Fluent 设计 token：颜色 / 圆角 / 阴影 / 间距 / 动效 / 字体 / 布局尺寸 / 焦点环 / 层级。含暗色模式覆盖 |
| [themes.css](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/styles/themes.css) | 自定义品牌色 `--brand-*`，作为 daisyUI 主题的补充；提供 `.bg-brand-*` / `.text-brand-*` 工具类 |
| [fluent-theme.css](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/styles/fluent-theme.css) | 全局基础样式 + Fluent 工具类（`.xb-bg-*` / `.xb-text-*` / `.xb-border-*` / `.xb-radius-*` / `.xb-shadow-*` / `.xb-card` / `.xb-input` 等） |
| [animations.css](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/styles/animations.css) | 动效规范：fade / fade-slide / modal / drawer / toast / menu-expand / page / skeleton / spinner，含 reduced-motion 降级 |
| [transitions.css](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/styles/transitions.css) | 过渡辅助类 |
| [scrollbar.css](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/styles/scrollbar.css) | 统一滚动条外观（Webkit + Firefox），含 `.xb-scrollbar-thin` / `.xb-scrollbar-none` |
| [index.css](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/styles/index.css) | 入口：`@import` daisyUI + 所有 Fluent 样式；设置全局背景与文字色 |

### 核心 token 速查（tokens.css）

| 类别 | 代表变量 | 说明 |
| --- | --- | --- |
| 背景色 | `--xb-bg-app` / `--xb-bg-surface` / `--xb-bg-subtle` / `--xb-bg-hover` / `--xb-bg-active` / `--xb-bg-disabled` | 应用 / 卡片 / 次级 / 悬停 / 选中 / 禁用 |
| 文字色 | `--xb-text-primary` / `--xb-text-secondary` / `--xb-text-tertiary` / `--xb-text-disabled` / `--xb-text-on-brand` | 主 / 次 / 三级 / 禁用 / 品牌色上文字 |
| 边框 | `--xb-border` / `--xb-border-subtle` / `--xb-border-strong` | 默认 / 次级 / 强 |
| 品牌色 | `--xb-brand` / `--xb-brand-hover` / `--xb-brand-active` / `--xb-brand-subtle` | 主品牌色及交互态 |
| 语义色 | `--xb-success` / `--xb-warning` / `--xb-error` / `--xb-info`（各含 `-subtle`） | 成功 / 警告 / 错误 / 信息 |
| 圆角 | `--xb-radius-sm` 6px / `--xb-radius-md` 8px / `--xb-radius-lg` 12px / `--xb-radius-xl` 14px / `--xb-radius-pill` 9999px | 5 档 |
| 阴影 | `--xb-shadow-card` / `--xb-shadow-card-hover` / `--xb-shadow-popover` / `--xb-shadow-dialog` | 卡片 / 悬停 / 浮层 / 对话框 |
| 间距 | `--xb-space-1` 4px … `--xb-space-8` 32px | 4px 基准 |
| 动效 | `--xb-motion-fast` 120ms / `--xb-motion-normal` 180ms / `--xb-motion-slow` 220ms / `--xb-ease` | 时长 + 缓动 |
| 字体 | `--xb-font-family` | Segoe UI 优先的中文字体栈 |
| 布局 | `--xb-header-height` 48px / `--xb-sidebar-width` 260px / `--xb-sidebar-collapsed-width` 64px / `--xb-content-padding` 24px | 应用骨架尺寸 |
| 焦点环 | `--xb-focus-ring` | 双层 box-shadow 焦点环 |
| 层级 | `--xb-z-sidebar` 30 … `--xb-z-command-palette` 90 | 7 档 z-index |

### 主题切换

- daisyUI v5 内置 `light` / `dark` / `business` / `corporate` 等主题，通过 `<html data-theme="xxx">` 切换。
- [tokens.css](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/styles/tokens.css) 在 `[data-theme='dark']`、`[data-theme='business']` 选择器下覆盖 `--xb-*` 变量，使 Fluent 组件随主题切换。
- [themes.css](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/styles/themes.css) 在不同主题下覆盖 `--brand-*` 品牌色。
- 切换组件 [AppThemeToggle.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/layout/AppThemeToggle.ts) 修改 `data-theme` 属性即可。

### Tailwind v4 + daisyUI v5 集成方式

项目使用纯 tsc 构建（无 Vite / PostCSS），Tailwind v4 由 HTML 中的 CDN 脚本提供，daisyUI v5 使用包内实际发布的 CSS 文件。[index.css](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/styles/index.css) 直接 `@import` 以下内容：

```css
@import '../../../node_modules/daisyui/daisyui.css';
@import '../../../node_modules/daisyui/themes.css';
@import './tokens.css';
@import './fluent-theme.css';
@import './themes.css';
@import './animations.css';
@import './scrollbar.css';
```

组件内大量使用 Tailwind 任意值语法引用 CSS 变量，例如 `bg-[var(--xb-bg-surface)]`、`rounded-[var(--xb-radius-lg)]`、`duration-[var(--xb-motion-fast)]`，既保留 Tailwind 的工具类便利，又通过变量驱动主题。

---

## 五、组件依赖关系

Fluent 组件之间形成清晰的分层依赖（底层 → 上层）：

```
FluentIcon  ←  FluentButton / FluentIconButton  ←  FluentModal / FluentDrawer / FluentDropdown
FluentCheckbox / FluentLoading / FluentEmpty / FluentError / FluentIcon  ←  FluentTable
FluentBadge  ←  StatusBadge
AppSidebarItem  ←  AppSidebar
```

典型依赖示例：

| 上层组件 | 依赖的底层组件 |
| --- | --- |
| [FluentModal](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/base/FluentModal.ts) | FluentIconButton、FluentButton |
| [FluentTable](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/data/FluentTable.ts) | FluentCheckbox、FluentLoading、FluentEmpty、FluentError、FluentIcon |
| [StatusBadge](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/business/StatusBadge.ts) | FluentBadge |
| [AppSidebar](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/layout/AppSidebar.ts) | AppSidebarItem、FluentIcon |
| [FluentButton](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/base/FluentButton.ts) | FluentIcon |

通用工具：组件类名通过 [utils/fluent-class](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/utils/fluent-class.ts) 的 `cx` / `buttonVariantClass` / `buttonSizeClass` / `modalSizeClass` 统一拼接；表格单元格转义通过 [utils/escapeHtml](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/utils/escapeHtml.ts)。

---

## 六、抽样详解

### 1. FluentButton

文件：[FluentButton.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/base/FluentButton.ts)

**Props：**

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| variant | `'primary' \| 'secondary' \| 'subtle' \| 'transparent' \| 'danger' \| 'success'` | `'secondary'` | 视觉变体 |
| size | `'small' \| 'medium' \| 'large'` | `'medium'` | 尺寸（图标 14 / 16 / 18px） |
| shape | `'rounded' | 'circular' | 'square'` | `'rounded'` | 形状（圆角 / 圆形 / 直角） |
| loading | boolean | false | 加载态，显示 spinner，禁用点击 |
| disabled | boolean | false | 禁用态 |
| block | boolean | false | 占满父容器宽度 |
| icon | string | `''` | 图标 name |
| iconPosition | `'left' | 'right'` | `'left'` | 图标位置 |
| type | `'button' | 'submit' | 'reset'` | `'button'` | 原生 type |

**事件：** `click`（loading / disabled 时不触发）。

**状态：** `loading` 时左侧渲染 SVG spinner；`active:scale-[0.98]` 提供按压反馈；`disabled:opacity-50`；`focus-visible` 走全局焦点环。变体与尺寸的类名映射来自 `buttonVariantClass` / `buttonSizeClass`，避免在模板内硬编码。

### 2. FluentModal

文件：[FluentModal.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/base/FluentModal.ts)

**核心机制：**
- **v-model**：`modelValue` + `update:modelValue` 事件双向绑定显隐。
- **Portal**：`<teleport to="body">` 渲染到 body，避免父级 `overflow` / `transform` 裁切。
- **可访问性**：关闭按钮带 `aria-label="关闭"`；`closeOnEsc` 监听全局 `keydown` Escape 关闭；`closeOnBackdrop` 点击遮罩区域（`@click.self`）关闭。
- **动效**：`transition name="xb-modal"`，遮罩淡入 + 模态框 `scale(0.98) → 1`。
- **拦截关闭**：`beforeClose` 回调返回 `false` 可阻止关闭（适合表单未保存场景）。
- **结构**：header（title / description / close）/ body（默认插槽）/ footer（confirm / cancel 插槽），均支持具名插槽覆盖。
- **加载遮罩**：`loading` 时在模态框内层覆盖 spinner，不阻塞关闭按钮交互。

**Props 摘要：** `modelValue` / `title` / `description` / `size`（`sm|md|lg|xl|full`）/ `loading` / `confirmText` / `cancelText` / `closeOnEsc` / `closeOnBackdrop` / `showConfirm` / `showCancel` / `showClose` / `beforeClose`。
**事件：** `update:modelValue` / `confirm` / `cancel` / `close`。

### 3. FluentTable

文件：[FluentTable.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/data/FluentTable.ts)

**列定义 `FluentTableColumn`：** `key` / `title` / `width` / `sortable` / `align`（left|center|right）/ `fixed`（left|right）/ `render`（返回 HTML 字符串）/ `hidden` / `className`。

**能力：**
- **排序**：点击可排序列头切换 `asc → desc → null`，通过 `sort` prop 受控，`sort` 事件回传 `{ key, order }`。
- **行选择**：`selectable` 开启，表头 `FluentCheckbox` 支持 `indeterminate` 半选态；`select` / `select-all` 事件回传选中 keys。
- **加载 / 空态 / 错误态**：`loading` 覆盖 spinner；`data.length === 0` 显示 `FluentEmpty`；`error` 非空显示 `FluentError` 并提供重试。
- **粘性表头**：`stickyHeader` 默认 true，`thead` 使用 `sticky top-0`。
- **样式开关**：`striped`（斑马纹）/ `bordered`（边框）/ `compact`（紧凑内边距）/ `hoverable`（行 hover 高亮）。
- **安全**：非 render 分支调用 `escapeHtml` 转义原始数据，避免 v-html XSS；render 分支由调用方负责转义。

**Props 摘要：** `columns` / `data` / `loading` / `rowKey`（默认 `id`）/ `selectable` / `selectedKeys` / `showIndex` / `stickyHeader` / `striped` / `bordered` / `compact` / `emptyText` / `error` / `sort` / `hoverable`。
**事件：** `sort` / `select` / `select-all` / `row-click` / `refresh`。

### 4. AppSidebar

文件：[AppSidebar.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/layout/AppSidebar.ts)

**菜单树渲染：**
- 通过 `useMenuTree()` 获取 `menu`（树形数据）与 `expandActiveChain(path)`。
- 模板内 `v-for` 渲染顶层 `AppSidebarItem`，由 `AppSidebarItem` 递归渲染子级（`level` 递增）。

**折叠：**
- `useSidebar()` 提供 `collapsed` / `isMobile` / `closeMobileDrawer`。
- 折叠态宽度 `w-16`，展开态 `w-60`，过渡使用 `--xb-motion-normal`。
- 折叠态仅显示图标，`title` 属性提供悬停提示；底部按钮（仅桌面端）调用 `layoutStore.toggleSidebar()` 切换。

**激活态：**
- 通过 `inject('router')` / `inject('currentRoute')` 获取当前路径，`watch(currentPath)` 触发 `expandActiveChain(path)` 自动展开祖先链。
- 选中项使用 `.xb-selected-bar` 左侧指示条 + `--xb-bg-active` 背景（具体在 `AppSidebarItem` 内实现）。

**其他：** 顶部 Logo 区点击回首页 `/`；移动端导航后自动关闭 drawer；菜单区使用 `xb-scroll-y` Fluent 风格滚动条。

---

## 七、相关引用

- 组件导出入口：[base/index.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/base/index.ts) · [business/index.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/business/index.ts) · [data/index.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/data/index.ts) · [form/index.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/form/index.ts) · [layout/index.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/layout/index.ts) · [navigation/index.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/navigation/index.ts) · [table/index.ts](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/components/table/index.ts)
- 样式文件：[tokens.css](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/styles/tokens.css) · [themes.css](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/styles/themes.css) · [fluent-theme.css](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/styles/fluent-theme.css) · [animations.css](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/styles/animations.css) · [transitions.css](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/styles/transitions.css) · [scrollbar.css](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/styles/scrollbar.css) · [index.css](file:///e:/zhuomian/xuanbing-all/all-in-one/xuanbing/src/renderer/styles/index.css)
- 权限门禁专题：[permission-gates.md](./permission-gates.md)
