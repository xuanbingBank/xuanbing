<template>
  <hover-container
    tooltip-content="关闭"
    class="w-40px h-full"
    :inverted="theme.header.inverted"
    @click="windowsclosedown"
  >
    <icon-icons8:shutdown class="text-20px" />
  </hover-container>
</template>

<script lang="ts" setup>
import { useThemeStore } from '@/store';

defineOptions({ name: 'Windowsclose' });

const theme = useThemeStore();



function windowsclosedown() {
		window.$dialog?.info({
			title: '提示',
			content: '是否要关闭软件？',
			positiveText: '是',
			negativeText: '否',
			onPositiveClick: () => {
				window.close();
			},
		})
}
</script>

<style scoped></style>
