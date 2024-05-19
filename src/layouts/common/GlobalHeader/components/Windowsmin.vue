<template>
  <hover-container
    tooltip-content="最小化"
    class="w-40px h-full"
    :inverted="theme.header.inverted"
    @click="Minimize"
  >
    <icon-mi:remove class="text-20px" />
  </hover-container>
</template>

<script lang="ts" setup>
import { useThemeStore } from '@/store';


defineOptions({ name: 'Windowsmin' });

const theme = useThemeStore();
function Minimize() {

}
</script>

<style scoped></style>
