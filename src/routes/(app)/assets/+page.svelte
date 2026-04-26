<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import { AttrsEditor, AttrsRenderer } from '$lib/custom-attrs';
	import Settings2 from '@lucide/svelte/icons/settings-2';
	import Archive from '@lucide/svelte/icons/archive';
	import { formatMoney } from '$lib/finance';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { useUserData } from '$lib/stores/userData.svelte';

	let { form } = $props();

	const userData = useUserData();
	const defs = $derived(userData.defsFor('assets'));

	let values = $state<Record<string, unknown>>({});
	let submitting = $state(false);

	const ASSET_KINDS = ['cash', 'investment', 'property', 'vehicle', 'possession', 'other'] as const;

	const fieldErrors = $derived(
		(form && 'fieldErrors' in form ? (form.fieldErrors as Record<string, string>) : {}) ?? {}
	);

	// Filters live in the URL so links are shareable + back-button-friendly,
	// but the filtering itself runs client-side over the in-memory asset list.
	const filters = $derived({
		kind: page.url.searchParams.get('kind') ?? '',
		tag: page.url.searchParams.get('tag') ?? '',
		q: page.url.searchParams.get('q') ?? ''
	});

	const filteredAssets = $derived.by(() => {
		const q = filters.q.toLowerCase();
		return userData.assets.filter((a) => {
			if (filters.kind && a.kind !== filters.kind) return false;
			if (filters.tag && !(a.tags ?? []).includes(filters.tag)) return false;
			if (q && !a.name.toLowerCase().includes(q)) return false;
			return true;
		});
	});

	const allTags = $derived.by(() => {
		const set = new Set<string>();
		for (const a of userData.assets) for (const t of a.tags ?? []) set.add(t);
		return [...set].sort();
	});

	const totalsByKind = $derived(
		filteredAssets.reduce(
			(acc, a) => {
				const v = typeof a.value === 'number' ? a.value : 0;
				acc[a.kind] = (acc[a.kind] ?? 0) + v;
				return acc;
			},
			{} as Record<string, number>
		)
	);

	function applyFilters(e: SubmitEvent) {
		e.preventDefault();
		const f = e.currentTarget as HTMLFormElement;
		const fd = new FormData(f);
		const params = new URLSearchParams();
		for (const k of ['kind', 'tag', 'q'] as const) {
			const v = String(fd.get(k) ?? '').trim();
			if (v) params.set(k, v);
		}
		const qs = params.toString();
		void goto(qs ? `/assets?${qs}` : '/assets', { keepFocus: true, noScroll: true });
	}
</script>

<header class="flex items-start justify-between">
	<div class="space-y-1">
		<h2 class="text-xl font-semibold tracking-tight">Assets</h2>
		<p class="text-sm text-muted-foreground">
			Everything you own. Tag-and-locate for household inventory.
		</p>
	</div>
	<Button variant="outline" size="sm" href="/assets/fields">
		<Settings2 class="size-4" />
		<span>Fields</span>
	</Button>
</header>

<form onsubmit={applyFilters} class="grid gap-3 sm:grid-cols-[auto_auto_1fr_auto] sm:items-end">
	<div class="space-y-1">
		<Label for="kind">Kind</Label>
		<select
			id="kind"
			name="kind"
			class="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
		>
			<option value="">All</option>
			{#each ASSET_KINDS as k (k)}
				<option value={k} selected={filters.kind === k}>{k}</option>
			{/each}
		</select>
	</div>
	<div class="space-y-1">
		<Label for="tag">Tag</Label>
		<select
			id="tag"
			name="tag"
			class="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
		>
			<option value="">Any</option>
			{#each allTags as t (t)}
				<option value={t} selected={filters.tag === t}>{t}</option>
			{/each}
		</select>
	</div>
	<div class="space-y-1">
		<Label for="q">Search</Label>
		<Input id="q" name="q" value={filters.q} />
	</div>
	<Button type="submit">Apply</Button>
</form>

<Card.Root>
	<Card.Header>
		<Card.Title class="text-base">New asset</Card.Title>
	</Card.Header>
	<form
		method="POST"
		action="?/create"
		use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				await update({ reset: true });
				values = {};
				submitting = false;
			};
		}}
	>
		<Card.Content class="grid gap-3 sm:grid-cols-2">
			<div class="space-y-2">
				<Label for="name">Name</Label>
				<Input id="name" name="name" required />
			</div>
			<div class="space-y-2">
				<Label for="asset_kind">Kind</Label>
				<select
					id="asset_kind"
					name="kind"
					class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
				>
					{#each ASSET_KINDS as k (k)}
						<option value={k}>{k}</option>
					{/each}
				</select>
			</div>
			<div class="space-y-2">
				<Label for="value">Value</Label>
				<Input id="value" name="value" type="number" step="0.01" />
			</div>
			<div class="space-y-2">
				<Label for="location">Location</Label>
				<Input id="location" name="location" placeholder="e.g. Garage" />
			</div>
			<div class="space-y-2 sm:col-span-2">
				<Label for="tags">Tags</Label>
				<Input id="tags" name="tags" placeholder="comma-separated" />
			</div>

			<div class="sm:col-span-2">
				<AttrsEditor {defs} bind:values errors={fieldErrors} />
			</div>

			{#if form?.error}
				<p class="text-sm text-destructive sm:col-span-2">{form.error}</p>
			{/if}
		</Card.Content>
		<Card.Footer>
			<Button type="submit" disabled={submitting}>{submitting ? 'Saving…' : 'Save'}</Button>
		</Card.Footer>
	</form>
</Card.Root>

{#if Object.keys(totalsByKind).length > 0}
	<div class="flex flex-wrap gap-2 text-xs">
		{#each Object.entries(totalsByKind) as [k, v] (k)}
			<Badge variant="outline">{k}: {formatMoney(v)}</Badge>
		{/each}
	</div>
{/if}

{#if filteredAssets.length === 0}
	<p class="text-sm text-muted-foreground">No assets yet.</p>
{:else}
	<ul class="divide-y divide-border rounded-md border">
		{#each filteredAssets as a (a.id)}
			<li class="space-y-1 p-4 text-sm">
				<div class="flex items-center gap-3">
					<a href={`/assets/${a.id}`} class="font-medium hover:underline">{a.name}</a>
					<Badge variant="outline" class="text-[10px]">{a.kind}</Badge>
					{#if a.location}<Badge variant="secondary" class="text-[10px]">{a.location}</Badge>{/if}
					{#each a.tags ?? [] as t (t)}
						<Badge variant="secondary" class="text-[10px]">#{t}</Badge>
					{/each}
					{#if typeof a.value === 'number'}
						<span class="ml-auto font-mono">{formatMoney(a.value, a.currency)}</span>
					{:else}
						<span class="ml-auto"></span>
					{/if}
					<form method="POST" action="?/archive" use:enhance>
						<input type="hidden" name="id" value={a.id} />
						<Button type="submit" variant="ghost" size="icon-sm" aria-label="Archive">
							<Archive class="size-4" />
						</Button>
					</form>
				</div>
				{#if a.notes}<p class="text-xs text-muted-foreground">{a.notes}</p>{/if}
				<AttrsRenderer {defs} values={a.custom as Record<string, unknown>} />
			</li>
		{/each}
	</ul>
{/if}
