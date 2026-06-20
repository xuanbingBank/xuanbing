"use strict";
/**
 * @file 数据表格组件，支持排序、选择、分页、自定义渲染。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataTable = void 0;
const BaseLoading_1 = require("../base/BaseLoading");
const BaseEmpty_1 = require("../base/BaseEmpty");
const BaseError_1 = require("../base/BaseError");
/** 对齐方式到 class 映射 */
const alignMap = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right'
};
exports.DataTable = {
    name: 'DataTable',
    components: { BaseLoading: BaseLoading_1.BaseLoading, BaseEmpty: BaseEmpty_1.BaseEmpty, BaseError: BaseError_1.BaseError },
    props: {
        columns: { type: Array, default: () => [] },
        data: { type: Array, default: () => [] },
        loading: { type: Boolean, default: false },
        rowKey: { type: String, default: 'id' },
        selectable: { type: Boolean, default: false },
        showIndex: { type: Boolean, default: false },
        emptyText: { type: String, default: '暂无数据' },
        errorText: { type: String, default: '加载失败' },
        error: { type: String, default: '' },
        pagination: { type: Object, default: () => null },
        selectedKeys: { type: Array, default: () => [] }
    },
    emits: ['sort', 'pageChange', 'pageSizeChange', 'select', 'selectAll', 'refresh'],
    setup(props, ctx) {
        const { emit } = ctx;
        const p = props;
        // 是否全选
        const isAllSelected = Vue.computed(() => {
            if (!p.selectable || p.data.length === 0)
                return false;
            return p.data.every((row) => {
                const key = String(row[p.rowKey]);
                return p.selectedKeys.includes(key);
            });
        });
        // 是否半选
        const isIndeterminate = Vue.computed(() => {
            if (!p.selectable || p.data.length === 0)
                return false;
            const selectedCount = p.data.filter((row) => {
                const key = String(row[p.rowKey]);
                return p.selectedKeys.includes(key);
            }).length;
            return selectedCount > 0 && selectedCount < p.data.length;
        });
        // 是否为空数据
        const isEmpty = Vue.computed(() => !p.loading && !p.error && p.data.length === 0);
        // 获取行的 key
        function getRowKey(row) {
            return String(row[p.rowKey]);
        }
        // 判断行是否选中
        function isRowSelected(row) {
            return p.selectedKeys.includes(getRowKey(row));
        }
        // 获取列对齐 class
        function getAlignClass(align) {
            return align ? alignMap[align] : 'text-left';
        }
        // 获取单元格内容（支持自定义渲染）
        function getCellContent(col, row, index) {
            if (col.render) {
                return col.render(row, index);
            }
            const val = row[col.key];
            return val == null ? '' : String(val);
        }
        // 全选切换
        function handleSelectAll(event) {
            const target = event.target;
            if (target.checked) {
                const keys = p.data.map((row) => getRowKey(row));
                emit('selectAll', keys);
            }
            else {
                emit('selectAll', []);
            }
        }
        // 单行选择
        function handleSelectRow(row, event) {
            const target = event.target;
            const key = getRowKey(row);
            emit('select', { key, selected: target.checked, row });
        }
        return {
            isAllSelected,
            isIndeterminate,
            isEmpty,
            getRowKey,
            isRowSelected,
            getAlignClass,
            getCellContent,
            handleSelectAll,
            handleSelectRow
        };
    },
    template: `
    <div class="data-table">
      <!-- 加载中 -->
      <BaseLoading v-if="loading" type="spinner" size="lg" />
      <!-- 错误状态 -->
      <BaseError
        v-else-if="error"
        :title="errorText"
        :description="error"
        :show-back="false"
        :show-home="false"
        @retry="$emit('refresh')"
      />
      <!-- 空数据 -->
      <BaseEmpty v-else-if="isEmpty" :title="emptyText" />
      <!-- 表格主体 -->
      <div v-else class="overflow-x-auto">
        <table class="table table-zebra">
          <thead>
            <tr>
              <th v-if="selectable" class="w-12">
                <input
                  type="checkbox"
                  class="checkbox checkbox-sm"
                  :checked="isAllSelected"
                  :indeterminate.prop="isIndeterminate"
                  @change="handleSelectAll"
                >
              </th>
              <th v-if="showIndex" class="w-16">#</th>
              <th
                v-for="col in columns"
                :key="col.key"
                :style="{ width: col.width }"
                :class="[getAlignClass(col.align), col.sortable ? 'cursor-pointer select-none' : '']"
                @click="col.sortable && $emit('sort', col.key)"
              >
                {{ col.title }}
                <span v-if="col.sortable" class="opacity-50 text-xs ml-1">⇅</span>
              </th>
              <th v-if="$slots.action" class="text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in data" :key="getRowKey(row)">
              <td v-if="selectable" class="w-12">
                <input
                  type="checkbox"
                  class="checkbox checkbox-sm"
                  :checked="isRowSelected(row)"
                  @change="handleSelectRow(row, $event)"
                >
              </td>
              <td v-if="showIndex">{{ index + 1 }}</td>
              <td
                v-for="col in columns"
                :key="col.key"
                :class="getAlignClass(col.align)"
                v-html="getCellContent(col, row, index)"
              ></td>
              <td v-if="$slots.action" class="text-right">
                <slot name="action" :row="row" :index="index"></slot>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
};
