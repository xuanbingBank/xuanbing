/**
 * @file 标签页组件，支持多标签切换、关闭与右键菜单。
 */

import type { ComponentOptions } from '../../vue-global'
import { useTabStore } from '../../stores/tab.store'

export const AppTabs: ComponentOptions = {
  name: 'AppTabs',
  setup() {
    const tabStore = useTabStore()
    // 注入路由器
    const router = Vue.inject<{ navigate: (path: string) => void }>('router')

    // 标签列表
    const tabs = Vue.computed(() => tabStore.state.tabs)
    // 当前激活标签路径
    const activePath = Vue.computed(() => tabStore.state.activePath)

    // 右键菜单状态
    const contextMenuVisible = Vue.ref(false)
    const contextMenuX = Vue.ref(0)
    const contextMenuY = Vue.ref(0)
    const contextMenuPath = Vue.ref('')

    // 导航到指定路径
    function navigate(path: string): void {
      if (router) {
        router.navigate(path)
      }
    }

    // 关闭标签
    function closeTab(path: string): void {
      const next = tabStore.removeTab(path)
      if (next) {
        navigate(next)
      }
    }

    // 关闭其他标签
    function closeOthers(path: string): void {
      tabStore.removeOthers(path)
      navigate(path)
    }

    // 关闭全部标签
    function closeAll(): void {
      tabStore.removeAll()
      const first = tabStore.state.tabs[0]
      if (first) {
        navigate(first.path)
      }
    }

    // 显示右键菜单
    function showContextMenu(event: MouseEvent, path: string): void {
      contextMenuX.value = event.clientX
      contextMenuY.value = event.clientY
      contextMenuPath.value = path
      contextMenuVisible.value = true
    }

    // 隐藏右键菜单
    function hideContextMenu(): void {
      contextMenuVisible.value = false
    }

    // 右键菜单：关闭当前
    function handleCloseCurrent(): void {
      closeTab(contextMenuPath.value)
      hideContextMenu()
    }

    // 右键菜单：关闭其他
    function handleCloseOthers(): void {
      closeOthers(contextMenuPath.value)
      hideContextMenu()
    }

    // 右键菜单：关闭全部
    function handleCloseAll(): void {
      closeAll()
      hideContextMenu()
    }

    // 点击外部关闭右键菜单
    Vue.onMounted(() => {
      window.addEventListener('click', hideContextMenu)
    })

    Vue.onBeforeUnmount(() => {
      window.removeEventListener('click', hideContextMenu)
    })

    return {
      tabs,
      activePath,
      contextMenuVisible,
      contextMenuX,
      contextMenuY,
      navigate,
      closeTab,
      showContextMenu,
      handleCloseCurrent,
      handleCloseOthers,
      handleCloseAll
    }
  },
  template: `
    <div class="tabs-container border-b border-base-300 bg-base-100 flex items-center gap-1 px-2 overflow-x-auto scrollbar-thin">
      <div
        v-for="tab in tabs"
        :key="tab.path"
        class="tab-item flex items-center gap-1 px-3 py-2 cursor-pointer rounded-t text-sm"
        :class="{ 'bg-base-200 text-primary': tab.path === activePath }"
        @click="navigate(tab.path)"
        @contextmenu.prevent="showContextMenu($event, tab.path)"
      >
        <span>{{ tab.title }}</span>
        <button
          v-if="tab.closable && !tab.affix"
          class="btn btn-ghost btn-xs btn-circle"
          @click.stop="closeTab(tab.path)"
          aria-label="关闭标签"
        >✕</button>
      </div>
      <!-- 右键菜单 -->
      <div
        v-if="contextMenuVisible"
        class="fixed z-50 menu bg-base-100 rounded-box shadow-lg border border-base-300 p-2 w-40"
        :style="{ left: contextMenuX + 'px', top: contextMenuY + 'px' }"
        @click.stop
      >
        <ul>
          <li><a @click="handleCloseCurrent">关闭当前</a></li>
          <li><a @click="handleCloseOthers">关闭其他</a></li>
          <li><a @click="handleCloseAll">关闭全部</a></li>
        </ul>
      </div>
    </div>
  `
}
