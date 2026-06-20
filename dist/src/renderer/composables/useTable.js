"use strict";
/**
 * @file 表格组合式函数，封装分页、排序、选择等逻辑。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.useTable = useTable;
const base_1 = require("../stores/base");
/**
 * 表格组合式函数。
 *
 * @param options 表格选项。
 * @returns 表格操作方法。
 */
function useTable(options) {
    const { columns, data: initialData = [], rowKey = 'id', pagination: enablePagination = true, pageSize: initialPageSize = 10, selectable: enableSelectable = false, serverSide = false, fetchData } = options;
    const state = (0, base_1.defineState)({
        data: initialData,
        loading: false,
        sort: { field: '', order: null },
        pagination: {
            current: 1,
            pageSize: initialPageSize,
            total: initialData.length
        },
        selectedKeys: []
    });
    const hasSelected = (0, base_1.computedRef)(() => state.selectedKeys.length > 0);
    const totalPages = (0, base_1.computedRef)(() => Math.max(1, Math.ceil(state.pagination.total / state.pagination.pageSize)));
    const data = (0, base_1.computedRef)(() => getLocalPageData());
    const loading = (0, base_1.computedRef)(() => state.loading);
    const selectedKeys = (0, base_1.computedRef)(() => state.selectedKeys);
    function toggleSort(field) {
        if (state.sort.field !== field) {
            state.sort = { field, order: 'asc' };
        }
        else if (state.sort.order === 'asc') {
            state.sort = { field, order: 'desc' };
        }
        else if (state.sort.order === 'desc') {
            state.sort = { field: '', order: null };
        }
        else {
            state.sort = { field, order: 'asc' };
        }
        if (!serverSide) {
            applyLocalSort();
        }
        else {
            void refresh();
        }
    }
    function applyLocalSort() {
        if (!state.sort.field || !state.sort.order)
            return;
        const field = state.sort.field;
        const order = state.sort.order === 'asc' ? 1 : -1;
        state.data = [...state.data].sort((a, b) => {
            const av = a[field];
            const bv = b[field];
            if (av === bv)
                return 0;
            if (av === undefined || av === null)
                return 1;
            if (bv === undefined || bv === null)
                return -1;
            return av > bv ? order : -order;
        });
    }
    function getLocalPageData() {
        if (!enablePagination)
            return state.data;
        const start = (state.pagination.current - 1) * state.pagination.pageSize;
        const end = start + state.pagination.pageSize;
        return state.data.slice(start, end);
    }
    async function refresh() {
        if (serverSide && fetchData) {
            state.loading = true;
            try {
                const result = await fetchData({
                    current: state.pagination.current,
                    pageSize: state.pagination.pageSize,
                    sort: state.sort
                });
                state.data = result.data;
                state.pagination.total = result.total;
            }
            finally {
                state.loading = false;
            }
        }
        else {
            applyLocalSort();
            state.pagination.total = state.data.length;
        }
    }
    function goToPage(page) {
        const total = totalPages.value;
        const target = Math.max(1, Math.min(page, total));
        state.pagination.current = target;
        if (serverSide)
            void refresh();
    }
    function nextPage() {
        goToPage(state.pagination.current + 1);
    }
    function prevPage() {
        goToPage(state.pagination.current - 1);
    }
    function toggleSelect(key) {
        if (!enableSelectable)
            return;
        const index = state.selectedKeys.indexOf(key);
        if (index >= 0) {
            state.selectedKeys.splice(index, 1);
        }
        else {
            state.selectedKeys.push(key);
        }
    }
    function toggleSelectAll() {
        if (!enableSelectable)
            return;
        const pageData = getLocalPageData();
        const allKeys = pageData.map((row) => row[rowKey]);
        if (state.selectedKeys.length === allKeys.length) {
            state.selectedKeys = [];
        }
        else {
            state.selectedKeys = allKeys;
        }
    }
    function clearSelected() {
        state.selectedKeys = [];
    }
    function setPageSize(size) {
        state.pagination.pageSize = size;
        state.pagination.current = 1;
        if (serverSide)
            void refresh();
    }
    return {
        columns,
        data,
        loading,
        sort: state.sort,
        pagination: state.pagination,
        selectedKeys,
        hasSelected,
        totalPages,
        toggleSort,
        goToPage,
        nextPage,
        prevPage,
        toggleSelect,
        toggleSelectAll,
        clearSelected,
        refresh,
        setPageSize
    };
}
