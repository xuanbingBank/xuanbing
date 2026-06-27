/**
 * @file 声明 Vue 全局变量类型，Vue 通过 CDN 全局脚本加载，渲染层直接通过 `Vue.xxx` 访问 Composition API。
 */

/**
 * 响应式引用类型。
 */
export interface Ref<T = unknown> {
  value: T
}

/**
 * Vue 应用实例类型。
 */
export interface VueApp {
  mount(selector: string): void
  provide(key: string, value: unknown): VueApp
  component(name: string, options: ComponentOptions): VueApp
  use(plugin: unknown, ...options: unknown[]): VueApp
}

/**
 * setup 上下文类型，Vue 在调用 setup 时传入的上下文对象。
 */
export interface SetupCtx {
  emit: (event: string, ...args: unknown[]) => void
  attrs: Record<string, unknown>
  slots: Record<string, unknown>
}

/**
 * Vue 组件选项类型（Options API + setup 混合）。
 */
export interface ComponentOptions {
  name?: string
  template?: string
  props?: Record<string, unknown> | string[]
  data?(): object
  computed?: Record<string, () => unknown>
  // 保留 any[]：methods 的参数签名随组件变化（如 navigate(path: string)），
  // 改为 unknown[] 会因参数逆变导致带具体参数的方法无法赋值，故维持原状。
  methods?: Record<string, (...args: any[]) => unknown>
  mounted?(): void | Promise<void>
  beforeUnmount?(): void
  unmounted?(): void
  components?: Record<string, ComponentOptions>
  provide?: Record<string, unknown>
  inject?: string[] | Record<string, string>
  emits?: string[]
  setup?(props: Record<string, unknown>, ctx: SetupCtx): Record<string, unknown>
}

/**
 * Vue 全局对象类型，CDN 构建暴露的全部 Composition API 入口。
 */
export interface VueGlobal {
  createApp(options: ComponentOptions): VueApp
  ref<T>(value: T): Ref<T>
  reactive<T>(obj: T): T
  computed<T>(getter: () => T): Ref<T>
  computed<T>(options: { get: () => T; set: (value: T) => void }): Ref<T>
  watch(source: unknown, callback: (...args: unknown[]) => void, options?: Record<string, unknown>): () => void
  onMounted(callback: () => void): void
  onBeforeUnmount(callback: () => void): void
  onUnmounted(callback: () => void): void
  /**
   * 按注入键获取祖先组件 provide 的值，未命中时返回 undefined。
   */
  inject<T>(key: string): T | undefined
  provide(key: string, value: unknown): void
  nextTick(callback?: () => void): Promise<void>
  isRef(obj: unknown): boolean
  unref<T>(obj: T | Ref<T>): T
  toRaw<T>(obj: T): T
  h(type: unknown, props?: unknown, children?: unknown): unknown
  watchEffect(fn: () => void): () => void
  toRefs<T>(obj: T): { [K in keyof T]: Ref<T[K]> }
}

declare global {
  const Vue: VueGlobal
}

export {}
