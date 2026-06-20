/**
 * @file 表格分页器组件，提供页码跳转与每页条数切换。
 */

import type { ComponentOptions } from '../../vue-global'

/** 组件 Props */
interface DataTablePaginationProps {
  current: number
  pageSize: number
  total: number
  pageSizeOptions: number[]
  showTotal: boolean
  showJumper: boolean
}

/** setup 上下文类型 */
interface SetupCtx {
  emit: (event: string, ...args: unknown[]) => void
  slots: Record<string, unknown>
}

export const DataTablePagination: ComponentOptions = {
  name: 'DataTablePagination',
  props: {
    current: { type: Number, default: 1 },
    pageSize: { type: Number, default: 10 },
    total: { type: Number, default: 0 },
    pageSizeOptions: { type: Array, default: () => [10, 20, 50, 100] },
    showTotal: { type: Boolean, default: true },
    showJumper: { type: Boolean, default: true }
  },
  emits: ['pageChange', 'pageSizeChange'],
  setup(props, ctx) {
    const { emit } = ctx as unknown as SetupCtx
    const p = props as unknown as DataTablePaginationProps

    // 总页数
    const totalPages = Vue.computed(() => {
      if (p.pageSize <= 0) return 1
      return Math.max(1, Math.ceil(p.total / p.pageSize))
    })

    // 每页条数变更
    function handlePageSizeChange(event: Event): void {
      const target = event.target as HTMLSelectElement
      emit('pageSizeChange', Number(target.value))
    }

    // 跳转指定页
    function handleJump(event: Event): void {
      const target = event.target as HTMLInputElement
      const page = Number(target.value)
      if (page >= 1 && page <= totalPages.value) {
        emit('pageChange', page)
      }
    }

    return { totalPages, handlePageSizeChange, handleJump }
  },
  template: `
    <div class="flex items-center justify-between px-4 py-3 border-t border-base-300">
      <div v-if="showTotal" class="text-sm text-base-content/60">共 {{ total }} 条</div>
      <div class="flex items-center gap-2">
        <select class="select select-bordered select-sm w-24" :value="pageSize" @change="handlePageSizeChange">
          <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }} 条/页</option>
        </select>
        <div class="join">
          <button class="join-item btn btn-sm" :disabled="current <= 1" @click="$emit('pageChange', current - 1)">«</button>
          <button class="join-item btn btn-sm btn-active">{{ current }} / {{ totalPages }}</button>
          <button class="join-item btn btn-sm" :disabled="current >= totalPages" @click="$emit('pageChange', current + 1)">»</button>
        </div>
        <div v-if="showJumper" class="flex items-center gap-1 text-sm">
          <span>前往</span>
          <input
            type="number"
            class="input input-bordered input-sm w-16"
            :value="current"
            @change="handleJump"
          >
          <span>页</span>
        </div>
      </div>
    </div>
  `
}
