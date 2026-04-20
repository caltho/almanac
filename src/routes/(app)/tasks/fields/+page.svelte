<script lang="ts">
	import { DefsManager } from '$lib/custom-attrs';
	import BackButton from '$lib/components/BackButton.svelte';

	let { data } = $props();
</script>

<section class="mx-auto max-w-2xl space-y-4">
	<div class="flex items-center gap-2">
		<BackButton href="/tasks" />
		<span class="text-xs tracking-widest text-muted-foreground uppercase">Tasks</span>
	</div>
	<header class="space-y-1">
		<h1 class="text-2xl font-semibold tracking-tight">Task fields</h1>
		<p class="text-sm text-muted-foreground">Add your own columns to every task.</p>
	</header>
	<DefsManager defs={data.defs} tableName="tasks" />
</section>
