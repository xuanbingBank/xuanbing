"use strict";
/**
 * @file 基础按钮组件，基于 daisyUI btn 类。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseButton = void 0;
/** 变体到 daisyUI 类名映射 */
const variantMap = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    accent: 'btn-accent',
    ghost: 'btn-ghost',
    link: 'btn-link',
    error: 'btn-error',
    warning: 'btn-warning',
    success: 'btn-success',
    info: 'btn-info'
};
/** 尺寸到 daisyUI 类名映射 */
const sizeMap = {
    xs: 'btn-xs',
    sm: 'btn-sm',
    md: '',
    lg: 'btn-lg'
};
exports.BaseButton = {
    name: 'BaseButton',
    props: {
        variant: { type: Object, default: 'primary' },
        size: { type: Object, default: 'md' },
        loading: { type: Boolean, default: false },
        disabled: { type: Boolean, default: false },
        block: { type: Boolean, default: false },
        outline: { type: Boolean, default: false },
        leftIcon: { type: String, default: '' },
        rightIcon: { type: String, default: '' },
        type: { type: Object, default: 'button' }
    },
    emits: ['click'],
    setup(props, ctx) {
        const { emit } = ctx;
        const p = props;
        // 计算按钮 class
        const btnClass = Vue.computed(() => {
            const classes = ['btn'];
            if (p.outline && p.variant !== 'link') {
                classes.push('btn-outline');
            }
            classes.push(variantMap[p.variant] || 'btn-primary');
            if (sizeMap[p.size]) {
                classes.push(sizeMap[p.size]);
            }
            if (p.block) {
                classes.push('w-full');
            }
            return classes.join(' ');
        });
        // 点击处理
        function handleClick(event) {
            if (p.disabled || p.loading)
                return;
            emit('click', event);
        }
        return { btnClass, handleClick };
    },
    template: `
    <button :class="btnClass" :disabled="disabled || loading" :type="type" @click="handleClick">
      <span v-if="loading" class="loading loading-spinner loading-xs"></span>
      <span v-if="leftIcon" class="text-sm">{{ leftIcon }}</span>
      <slot></slot>
      <span v-if="rightIcon" class="text-sm">{{ rightIcon }}</span>
    </button>
  `
};
