<template>
  <n-space :vertical="true" :size="16">
    <home />
		<data-card />
    <bottom-part />
    <top-chart />
  </n-space>
</template>

<script lang="ts" setup>
import { BottomPart, DataCard, TopChart,home } from './components';

</script>

<style scoped></style>
