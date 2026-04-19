<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';

	let { data, form } = $props();
	let uploading = $state(false);
</script>

<header class="space-y-1">
	<h2 class="text-xl font-semibold tracking-tight">Import CSV</h2>
	<p class="text-sm text-muted-foreground">
		We'll parse, propose categories from your rules, flag duplicates, and stage for your review
		before saving.
	</p>
</header>

<Card.Root>
	<Card.Header>
		<Card.Title class="text-base">New import</Card.Title>
		<Card.Description>Max 2 MB. ANZ + generic banks supported.</Card.Description>
	</Card.Header>
	<form
		method="POST"
		action="?/upload"
		enctype="multipart/form-data"
		use:enhance={() => {
			uploading = true;
			return async ({ update }) => {
				await update();
				uploading = false;
			};
		}}
	>
		<Card.Content>
			<div class="space-y-2">
				<Label for="file">CSV file</Label>
				<Input id="file" name="file" type="file" accept=".csv,text/csv" required />
			</div>
			{#if form?.error}
				<p class="mt-3 text-sm text-destructive">{form.error}</p>
			{/if}
		</Card.Content>
		<Card.Footer>
			<Button type="submit" disabled={uploading}>{uploading ? 'Uploading…' : 'Stage import'}</Button
			>
		</Card.Footer>
	</form>
</Card.Root>

<section class="space-y-2">
	<h3 class="text-sm font-semibold tracking-widest uppercase">Recent imports</h3>
	{#if data.batches.length === 0}
		<p class="text-sm text-muted-foreground">No imports yet.</p>
	{:else}
		<ul class="divide-y divide-border rounded-md border">
			{#each data.batches as b (b.id)}
				<li class="flex items-center justify-between gap-3 p-3 text-sm">
					<div class="min-w-0 space-y-1">
						<a href={`/finance/import/${b.id}`} class="font-medium hover:underline">
							{b.filename ?? b.id}
						</a>
						<div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
							<Badge
								variant={b.status === 'confirmed'
									? 'secondary'
									: b.status === 'cancelled'
										? 'outline'
										: 'default'}
								class="text-[10px]">{b.status}</Badge
							>
							{#if b.source}
								<span>{b.source}</span>
							{/if}
							<span>{b.total_rows} rows</span>
							{#if b.duplicate_rows > 0}
								<span>· {b.duplicate_rows} dupes</span>
							{/if}
							{#if b.confirmed_rows > 0}
								<span>· {b.confirmed_rows} imported</span>
							{/if}
							<span>· {new Date(b.created_at).toLocaleString()}</span>
						</div>
					</div>
					{#if b.status === 'staged'}
						<Button size="sm" href={`/finance/import/${b.id}`}>Review</Button>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</section>
