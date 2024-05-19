<template>
  <n-grid :x-gap="16" :y-gap="16" :item-responsive="true">
    <n-grid-item span="0:24 640:24 1024:25">
      <n-card  :bordered="false" class="rounded-16px shadow-sm">
        <n-timeline>
					
        </n-timeline>
      </n-card>
    </n-grid-item>
  </n-grid>
</template>

<script setup lang="ts">
defineOptions({ name: 'DashboardAnalysisBottomPart' });



</script>

<style scoped></style>
