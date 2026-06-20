"use strict";
/**
 * @file 开关组件，基于 daisyUI toggle。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormSwitch = void 0;
exports.FormSwitch = {
    name: 'FormSwitch',
    props: {
        modelValue: { type: Boolean, default: false },
        disabled: { type: Boolean, default: false },
        label: { type: String, default: '' },
        size: { type: Object, default: 'md' }
    },
    emits: ['update:modelValue', 'change'],
    setup(props, ctx) {
        const { emit } = ctx;
        // 切换处理
        function handleChange(event) {
            const target = event.target;
            emit('update:modelValue', target.checked);
            emit('change', target.checked);
        }
        return { handleChange };
    },
    template: `
    <label class="label cursor-pointer justify-start gap-3">
      <input
        type="checkbox"
        :checked="modelValue"
        :disabled="disabled"
        class="toggle"
        :class="{ 'toggle-sm': size === 'sm', 'toggle-lg': size === 'lg' }"
        @change="handleChange"
      >
      <span v-if="label" class="label-text">{{ label }}</span>
    </label>
  `
};
