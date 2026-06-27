/**
 * @file 渲染层入口，创建哈希路由、注册路由守卫、初始化 stores、挂载 Vue 应用。
 *
 * 渲染层只通过 `window.desktop` 与主进程通信，不直接接触 Electron 或 Node API。
 * Vue 通过 CDN 全局脚本加载，全部 Composition API 通过 `Vue.xxx` 访问。
 *
 * 启动流程：
 * 1. 初始化全部 stores（theme/auth/permission/layout/window/tab/notification）
 * 2. 初始化主题（应用 data-theme 到 <html>）
 * 3. 初始化窗口上下文（从 main 获取 windowId/role/permissions）
 * 4. 创建哈希路由
 * 5. 注册路由守卫
 * 6. 挂载 Vue 应用（根据 route.meta.layout 选择布局）
 */

import { createHashRouter } from './renderer/router'
import type { HashRouter } from './renderer/router'
import { executeGuards } from './renderer/router/guards'
import type { CurrentRoute } from './renderer/router/types'
import { PAGES } from './renderer/pages'
import { useCurrentWindow } from './renderer/composables/useCurrentWindow'
import { useWindowTitle } from './renderer/composables/useWindowTitle'
import type { ComponentOptions } from './renderer/vue-global'
import type { DesktopUnsubscribe } from '../electron/ipcBus/renderer'

/* ───────────────────────── Stores 初始化 ───────────────────────── */

import { initStores } from './renderer/stores'
import { useThemeStore } from './renderer/stores/theme.store'
import { useAuthStore } from './renderer/stores/auth.store'
import { usePermissionStore } from './renderer/stores/permission.store'
import { useLayoutStore, initLayoutResizeListener } from './renderer/stores/layout.store'
import { useWindowStore } from './renderer/stores/window.store'
import { useTabStore } from './renderer/stores/tab.store'
import { useAppStore } from './renderer/stores/app.store'

/* ───────────────────────── 布局组件 ───────────────────────── */

import { BasicLayout, BlankLayout, AuthLayout, WindowLayout } from './renderer/layouts'

/* ───────────────────────── 全局组件 ───────────────────────── */

import { BaseToast } from './renderer/components/base/BaseToast'

/* ───────────────────────── 路由工具 ───────────────────────── */

import { buildPageTitle } from './renderer/utils/route'
import { APP_INFO, ROUTE_PATHS } from './renderer/constants'

/**
 * 根组件视图状态（setup 返回值在 this 上的展开类型）。
 */
interface RootView {
  currentRoute: CurrentRoute
  router: HashRouter
  currentLayout: ComponentOptions
  pageComponent: ComponentOptions
  pageProps: Record<string, unknown>
  windowId: number
  role: string
  isMaximized: boolean
  isFocused: boolean
  isVisible: boolean
  permissions: string[]
}

/**
 * 根据路由 meta.layout 选择布局组件。
 *
 * @param route 当前路由。
 * @returns 布局组件。
 */
function resolveLayout(route: CurrentRoute): ComponentOptions {
  const layout = route.meta.layout
  switch (layout) {
    case 'basic':
      return BasicLayout
    case 'blank':
      return BlankLayout
    case 'auth':
      return AuthLayout
    case 'window':
      return WindowLayout
    case 'default':
      return BasicLayout
    case 'modal':
      return BlankLayout
    default:
      return BasicLayout
  }
}

/**
 * 创建并挂载 Vue 应用。
 */
function bootstrap(): void {
  // 1. 初始化全部 stores
  initStores()

  // 2. 初始化主题
  const themeStore = useThemeStore()
  themeStore.initTheme()

  // 3. 初始化应用信息
  const appStore = useAppStore()
  appStore.initApp()

  // 4. 初始化认证状态恢复
  const authStore = useAuthStore()
  authStore.restoreSession()

  // 5. 初始化布局响应式监听
  const cleanupResize = initLayoutResizeListener()

  // 6. 获取窗口/权限/tab store
  const windowStore = useWindowStore()
  const permissionStore = usePermissionStore()
  const tabStore = useTabStore()

  // 7. 创建哈希路由
  const router = createHashRouter()

  // 8. 根组件选项
  const rootComponent: ComponentOptions = {
    setup() {
      // 获取当前窗口的响应式状态
      const currentWindow = useCurrentWindow()

      // 同步路由标题到窗口标题
      useWindowTitle(router)

      // 当前路由状态
      const currentRoute = Vue.ref<CurrentRoute>(router.getCurrentRoute())

      let routerUnsubscribe: DesktopUnsubscribe | null = null
      let guardsInitialized = false

      /**
       * 执行路由守卫，根据结果更新当前路由或重定向。
       *
       * @param route 目标路由。
       */
      const runGuards = (route: CurrentRoute): void => {
        // 同步窗口角色到 permission store
        if (currentWindow.role.value) {
          permissionStore.setWindowContext(
            currentWindow.role.value as unknown as string,
            currentWindow.permissions.value as unknown as string[]
          )
          tabStore.setWindowRole(currentWindow.role.value as unknown as string)
        }

        // 同步窗口信息到 window store
        if (currentWindow.windowId.value) {
          windowStore.setWindowInfo({
            windowId: currentWindow.windowId.value as unknown as number,
            windowRole: currentWindow.role.value as unknown as string,
            instanceKey: currentWindow.instanceKey.value as unknown as string
          })
          windowStore.setInitialized()
        }

        const result = executeGuards(route, currentRoute.value, {
          windowRole: currentWindow.role.value as unknown as string,
          permissions: currentWindow.permissions.value as unknown as string[],
          isAuthenticated: authStore.isLoggedIn.value as unknown as boolean
        })

        if (result.redirect) {
          router.navigate(result.redirect)
        } else {
          currentRoute.value = route

          // 更新页面标题
          const title = buildPageTitle(route, APP_INFO.NAME)
          if (typeof document !== 'undefined') {
            document.title = title
          }

          // 添加标签页
          if (!route.meta.hidden) {
            tabStore.addTab({
              name: route.name,
              path: route.path,
              title: route.meta.title,
              icon: route.meta.icon,
              affix: route.meta.affixTab ?? false,
              closable: route.meta.closableTab ?? true,
              query: route.query
            })
          }
        }
      }

      Vue.onMounted(() => {
        // 订阅路由变更
        routerUnsubscribe = router.onChange((route) => {
          runGuards(route)
        })

        // 标记应用就绪
        appStore.setReady(true)
      })

      // 监听窗口角色加载完成，执行初始路由守卫
      Vue.watch(
        () => currentWindow.role.value,
        ((newRole: unknown) => {
          if (typeof newRole === 'string' && newRole !== '' && !guardsInitialized) {
            guardsInitialized = true
            runGuards(router.getCurrentRoute())
          }
        }) as (...args: unknown[]) => void
      )

      Vue.onBeforeUnmount(() => {
        routerUnsubscribe?.()
        routerUnsubscribe = null
        cleanupResize()
      })

      /**
       * 根据当前路由获取页面组件。
       */
      const pageComponent = Vue.computed<ComponentOptions>(() => {
        const name = currentRoute.value.matched.component
        return PAGES[name] || PAGES.notFound
      })

      /**
       * 构造传递给当前页面的属性对象。
       */
      const pageProps = Vue.computed<Record<string, unknown>>(() => {
        return {
          params: currentRoute.value.params,
          query: currentRoute.value.query,
          meta: currentRoute.value.meta,
          route: currentRoute.value
        }
      })

      /**
       * 根据当前路由选择布局组件。
       */
      const currentLayout = Vue.computed<ComponentOptions>(() =>
        resolveLayout(currentRoute.value)
      )

      // ?????????????????????
      Vue.provide('currentRoute', currentRoute)
      Vue.provide('getPageComponent', () => pageComponent.value)
      Vue.provide('renderPage', () => pageComponent.value)
      Vue.provide('getPageProps', () => pageProps.value)
      Vue.provide('cachedNames', [])

      return {
        currentRoute,
        router,
        currentLayout,
        pageComponent,
        pageProps,
        windowId: currentWindow.windowId,
        role: currentWindow.role,
        isMaximized: currentWindow.isMaximized,
        isFocused: currentWindow.isFocused,
        isVisible: currentWindow.isVisible,
        permissions: currentWindow.permissions
      }
    },

    computed: {
      /**
       * 根据当前路由的 component 字段返回对应的页面组件。
       */
      currentPage(this: RootView): ComponentOptions {
        return this.pageComponent
      },
      /**
       * 构造传递给当前页面的属性对象。
       */
      currentPageProps(this: RootView): Record<string, unknown> {
        return this.pageProps
      }
    },

    methods: {
      /**
       * 导航到指定路径。
       *
       * @param path 目标路径。
       */
      navigate(this: RootView, path: string): void {
        this.router.navigate(path)
      }
    },

    template: `
      <div id="app-root" class="min-h-screen">
        <component :is="currentLayout" />
        <BaseToast />
      </div>
    `
  }

  // 注册全局组件
  const app = Vue.createApp(rootComponent)
  app.component('BaseToast', BaseToast)

  // ???????????????????? setup ?? Vue.provide ??????
  app.provide('router', router)

  app.mount('#app')
}

// 启动应用
bootstrap()
