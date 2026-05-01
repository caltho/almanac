<script lang="ts">
	import { DefsManager } from '$lib/custom-attrs';
	import { Separator } from '$lib/components/ui/separator';

	let { data } = $props();

	// Order = the order they appear on the page. Group adjacent so finance
	// (transactions + categories) sits together and assets follows them.
	const SECTIONS: { table: keyof typeof data.defs; title: string; description: string }[] = [
		{
			table: 'journal_entries',
			title: 'Journal',
			description: 'Custom fields on every journal entry.'
		},
		{
			table: 'sleep_logs',
			title: 'Sleep',
			description: 'Custom fields on every sleep log.'
		},
		{
			table: 'tasks',
			title: 'Tasks',
			description: 'Custom fields on every task.'
		},
		{
			table: 'habits',
			title: 'Habits',
			description: 'Custom fields on every habit.'
		},
		{
			table: 'projects',
			title: 'Projects',
			description: 'Custom fields on every project.'
		},
		{
			table: 'transactions',
			title: 'Transactions',
			description: 'Custom fields on every finance transaction.'
		},
		{
			table: 'categories',
			title: 'Categories',
			description: 'Custom fields on every finance category.'
		},
		{
			table: 'assets',
			title: 'Stuff',
			description: 'Custom fields on every asset.'
		}
	];
</script>

<header class="space-y-1">
	<h1 class="text-2xl font-semibold tracking-tight">Fields</h1>
	<p class="text-sm text-muted-foreground">
		Add or remove custom fields for any domain. Changes apply to all rows in that domain.
	</p>
</header>

<div class="space-y-8">
	{#each SECTIONS as s, i (s.table)}
		{#if i > 0}
			<Separator />
		{/if}
		<section class="space-y-3">
			<div class="space-y-0.5">
				<h2 class="text-base font-semibold tracking-tight">{s.title}</h2>
				<p class="text-xs text-muted-foreground">{s.description}</p>
			</div>
			<DefsManager defs={data.defs[s.table]} tableName={s.table} />
		</section>
	{/each}
</div>
