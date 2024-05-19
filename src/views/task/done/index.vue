<template>
<!-- 万年历 -->
	<div class="flex flex-col items-center justify-center h-full">
		<div class="text-4xl">万年历</div>
		<div class="text-2xl">这里是万年历</div>
		<ul>
			<li class="text-xl">星期一</li>
			<li class="text-xl">星期二</li>
			<li class="text-xl">星期三</li>
			<li class="text-xl">星期四</li>
			<li class="text-xl">星期五</li>
			<li class="text-xl">星期六</li>
			<li class="text-xl">星期日</li>
		</ul>
		<ul>
		<li v-for="day"></li>
		</ul>
	</div>
</template>

<script setup lang="ts">
import dayjs from 'dayjs';

const b = 0;


</script>

<style scoped>


</style>
