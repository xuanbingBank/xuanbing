"use strict";
/**
 * @file 文本输入框组件，基于 daisyUI input。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormInput = void 0;
exports.FormInput = {
    name: 'FormInput',
    props: {
        modelValue: { type: [String, Number], default: '' },
        type: { type: Object, default: 'text' },
        placeholder: { type: String, default: '' },
        disabled: { type: Boolean, default: false },
        readonly: { type: Boolean, default: false },
        size: { type: Object, default: 'md' },
        error: { type: Boolean, default: false }
    },
    emits: ['update:modelValue', 'blur', 'focus'],
    setup(props, ctx) {
        const { emit } = ctx;
        const p = props;
        // 输入事件处理，number 类型自动转为数值
        function handleInput(event) {
            const target = event.target;
            const value = p.type === 'number' ? Number(target.value) : target.value;
            emit('update:modelValue', value);
        }
        return { handleInput };
    },
    template: `
    <input
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      class="input input-bordered w-full"
      :class="{ 'input-error': error, 'input-sm': size === 'sm', 'input-lg': size === 'lg' }"
      @input="handleInput"
      @blur="$emit('blur', $event)"
      @focus="$emit('focus', $event)"
    >
  `
};
