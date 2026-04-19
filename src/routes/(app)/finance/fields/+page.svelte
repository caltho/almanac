<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { DefsManager } from '$lib/custom-attrs';
	import { Separator } from '$lib/components/ui/separator';

	let { data } = $props();
</script>

<header class="flex items-center justify-between">
	<div class="space-y-1">
		<h2 class="text-xl font-semibold tracking-tight">Finance fields</h2>
		<p class="text-sm text-muted-foreground">Custom attributes on transactions and categories.</p>
	</div>
	<Button variant="ghost" size="sm" href="/finance">Back</Button>
</header>

<section class="space-y-3">
	<h3 class="text-sm font-semibold tracking-widest uppercase">Transactions</h3>
	<DefsManager defs={data.transactions} tableName="transactions" />
</section>

<Separator />

<section class="space-y-3">
	<h3 class="text-sm font-semibold tracking-widest uppercase">Categories</h3>
	<DefsManager defs={data.categories} tableName="categories" />
</section>
