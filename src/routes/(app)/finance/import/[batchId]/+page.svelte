<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { formatMoney } from '$lib/finance';

	let { data, form } = $props();
	let confirming = $state(false);

	const catMap = $derived(new Map(data.categories.map((c) => [c.id, c])));
	const includedCount = $derived(data.rows.filter((r) => r.include).length);
</script>

<header class="flex items-start justify-between gap-4">
	<div class="space-y-1">
		<h2 class="text-xl font-semibold tracking-tight">Review import</h2>
		<p class="text-sm text-muted-foreground">
			{data.batch.filename ?? data.batch.id} · {data.rows.length} rows · {data.batch.source}
		</p>
	</div>
	<div class="flex gap-2">
		{#if data.batch.status === 'staged'}
			<form
				method="POST"
				action="?/confirm"
				use:enhance={({ cancel }) => {
					if (
						!confirm(`Import ${includedCount} transactions? This can't be undone in one click.`)
					) {
						cancel();
						return () => {};
					}
					confirming = true;
					return async ({ update }) => {
						await update();
						confirming = false;
					};
				}}
			>
				<Button type="submit" disabled={confirming}>
					{confirming ? 'Importing…' : `Confirm ${includedCount}`}
				</Button>
			</form>
			<form method="POST" action="?/cancel" use:enhance>
				<Button type="submit" variant="ghost">Cancel</Button>
			</form>
		{:else}
			<Badge variant="secondary" class="capitalize">{data.batch.status}</Badge>
		{/if}
	</div>
</header>

{#if form?.error}
	<p class="text-sm text-destructive">{form.error}</p>
{/if}

<ul class="divide-y divide-border rounded-md border text-sm">
	{#each data.rows as r (r.id)}
		{@const proposed = r.proposed_category_id ? catMap.get(r.proposed_category_id) : null}
		<li
			class={`grid grid-cols-[auto_auto_1fr_auto_auto_auto] items-center gap-3 p-3 ${
				r.is_duplicate ? 'bg-muted/40' : ''
			}`}
		>
			<form method="POST" action="?/updateRow" class="contents" use:enhance>
				<input type="hidden" name="id" value={r.id} />
				<input
					type="checkbox"
					name="include"
					checked={r.include}
					disabled={data.batch.status !== 'staged'}
					onchange={(e) => (e.currentTarget.form as HTMLFormElement).requestSubmit()}
					class="size-4 accent-foreground"
				/>
				<time class="text-xs tracking-widest text-muted-foreground">{r.posted_at}</time>
				<div class="min-w-0 truncate">
					<div class={`${r.is_duplicate ? 'line-through opacity-60' : ''}`}>{r.description}</div>
					<div class="text-[10px] tracking-wider text-muted-foreground uppercase">
						{#if r.is_duplicate}
							duplicate
						{:else if r.proposed_source === 'rule'}
							rule → {proposed?.name}
						{:else if r.proposed_source === 'trgm'}
							similarity → {proposed?.name}
						{:else}
							unclassified
						{/if}
					</div>
				</div>
				<span
					class={`font-mono ${r.amount && r.amount < 0 ? 'text-destructive' : 'text-emerald-600'}`}
				>
					{r.amount === null ? '—' : formatMoney(r.amount, 'AUD', { showSign: true })}
				</span>
				<select
					name="confirmed_category_id"
					disabled={data.batch.status !== 'staged'}
					onchange={(e) => (e.currentTarget.form as HTMLFormElement).requestSubmit()}
					class="flex h-7 rounded-md border border-input bg-background px-2 text-xs"
				>
					<option value="">—</option>
					{#each data.categories as c (c.id)}
						<option
							value={c.id}
							selected={(r.confirmed_category_id ?? r.proposed_category_id) === c.id}
						>
							{c.name}
						</option>
					{/each}
				</select>
				<span></span>
			</form>
		</li>
	{/each}
</ul>
