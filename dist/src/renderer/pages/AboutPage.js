"use strict";
/**
 * @file 关于页，展示应用信息与技术栈。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AboutPage = void 0;
const PageContainer_1 = require("../components/base/PageContainer");
const BaseCard_1 = require("../components/base/BaseCard");
const app_store_1 = require("../stores/app.store");
exports.AboutPage = {
    name: 'AboutPage',
    components: { PageContainer: PageContainer_1.PageContainer, BaseCard: BaseCard_1.BaseCard },
    props: {
        params: { type: Object, default: () => ({}) },
        query: { type: Object, default: () => ({}) },
        meta: { type: Object, default: () => ({}) },
        route: { type: Object, default: () => ({}) }
    },
    setup() {
        const appStore = (0, app_store_1.useAppStore)();
        // 应用信息
        const appName = Vue.computed(() => appStore.state.appName);
        const version = Vue.computed(() => appStore.state.version);
        const platform = Vue.computed(() => appStore.state.platform);
        const environment = Vue.computed(() => appStore.state.environment);
        // 技术栈列表
        const techStack = [
            { name: 'Electron', desc: '跨平台桌面应用框架' },
            { name: 'Vue 3', desc: '渐进式前端框架' },
            { name: 'TypeScript', desc: '类型安全的 JavaScript' },
            { name: 'Tailwind CSS', desc: '原子化 CSS 框架' },
            { name: 'daisyUI v5', desc: 'Tailwind 组件库' }
        ];
        return { appName, version, platform, environment, techStack };
    },
    template: `
    <PageContainer title="关于">
      <div class="space-y-6 max-w-2xl">
        <BaseCard title="应用信息">
          <div class="space-y-3">
            <div class="flex justify-between">
              <span class="text-sm text-base-content/60">应用名称</span>
              <span class="text-sm font-medium">{{ appName }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-base-content/60">版本</span>
              <span class="text-sm font-medium">{{ version }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-base-content/60">Electron 版本</span>
              <span class="text-sm font-medium">42.x</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-base-content/60">平台</span>
              <span class="text-sm font-medium">{{ platform }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-base-content/60">环境</span>
              <span class="text-sm font-medium">{{ environment }}</span>
            </div>
          </div>
        </BaseCard>

        <BaseCard title="技术栈">
          <ul class="space-y-3">
            <li v-for="tech in techStack" :key="tech.name" class="flex items-center justify-between">
              <span class="text-sm font-medium">{{ tech.name }}</span>
              <span class="text-xs text-base-content/50">{{ tech.desc }}</span>
            </li>
          </ul>
        </BaseCard>
      </div>
    </PageContainer>
  `
};
