"use strict";
/**
 * @file 下拉选择组件，基于 daisyUI select。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormSelect = void 0;
exports.FormSelect = {
    name: 'FormSelect',
    props: {
        modelValue: { type: [String, Number], default: '' },
        options: { type: Array, default: () => [] },
        placeholder: { type: String, default: '' },
        disabled: { type: Boolean, default: false },
        size: { type: Object, default: 'md' },
        error: { type: Boolean, default: false }
    },
    emits: ['update:modelValue', 'change'],
    setup(props, ctx) {
        const { emit } = ctx;
        // 选择变更处理
        function handleChange(event) {
            const target = event.target;
            emit('update:modelValue', target.value);
            emit('change', target.value);
        }
        return { handleChange };
    },
    template: `
    <select
      class="select select-bordered w-full"
      :class="{ 'select-error': error, 'select-sm': size === 'sm', 'select-lg': size === 'lg' }"
      :value="modelValue"
      :disabled="disabled"
      @change="handleChange"
    >
      <option value="" v-if="placeholder" :selected="!modelValue" disabled>{{ placeholder }}</option>
      <option v-for="opt in options" :key="opt.value" :value="opt.value" :disabled="opt.disabled">{{ opt.label }}</option>
    </select>
  `
};
