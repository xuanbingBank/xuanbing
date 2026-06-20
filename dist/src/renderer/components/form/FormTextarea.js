"use strict";
/**
 * @file 多行文本输入组件，基于 daisyUI textarea。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormTextarea = void 0;
exports.FormTextarea = {
    name: 'FormTextarea',
    props: {
        modelValue: { type: String, default: '' },
        placeholder: { type: String, default: '' },
        rows: { type: Number, default: 3 },
        disabled: { type: Boolean, default: false },
        readonly: { type: Boolean, default: false },
        error: { type: Boolean, default: false },
        resize: { type: Object, default: 'vertical' }
    },
    emits: ['update:modelValue', 'blur'],
    setup(props, ctx) {
        const { emit } = ctx;
        // 输入事件处理
        function handleInput(event) {
            const target = event.target;
            emit('update:modelValue', target.value);
        }
        return { handleInput };
    },
    template: `
    <textarea
      :value="modelValue"
      :placeholder="placeholder"
      :rows="rows"
      :disabled="disabled"
      :readonly="readonly"
      class="textarea textarea-bordered w-full"
      :class="{ 'textarea-error': error }"
      :style="{ resize }"
      @input="handleInput"
      @blur="$emit('blur', $event)"
    ></textarea>
  `
};
