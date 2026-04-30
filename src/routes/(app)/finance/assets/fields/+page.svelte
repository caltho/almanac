<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { DefsManager } from '$lib/custom-attrs';

	let { data } = $props();
</script>

<section class="mx-auto max-w-2xl space-y-4">
	<header class="flex items-center justify-between">
		<div class="space-y-1">
			<h1 class="text-2xl font-semibold tracking-tight">Asset fields</h1>
		</div>
		<Button variant="ghost" size="sm" href="/finance/assets">Back</Button>
	</header>
	<DefsManager defs={data.defs} tableName="assets" />
</section>
