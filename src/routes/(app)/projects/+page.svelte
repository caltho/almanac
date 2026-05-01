<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import Plus from '@lucide/svelte/icons/plus';
	import FolderKanban from '@lucide/svelte/icons/folder-kanban';
	import GitBranch from '@lucide/svelte/icons/git-branch';
	import ColorPicker from '$lib/components/ColorPicker.svelte';
	import ColorDot from '$lib/components/ColorDot.svelte';
	import { paletteHex, type PaletteToken } from '$lib/palette';
	import { htmlPreview } from '$lib/html-preview';
	import { useUserData } from '$lib/stores/userData.svelte';

	let { form } = $props();

	const userData = useUserData();

	type Filter = 'active' | 'done' | 'archived' | 'all';
	let filter = $state<Filter>('active');
	let showNew = $state(false);
	let newColor = $state<PaletteToken | null>(null);

	const childCount = $derived.by(() => {
		const out = new Map<string, number>();
		for (const p of userData.projects) {
			if (!p.parent_id) continue;
			out.set(p.parent_id, (out.get(p.parent_id) ?? 0) + 1);
		}
		return out;
	});

	const visible = $derived.by(() => {
		const tops = userData.projects.filter((p) => !p.parent_id);
		if (filter === 'all') return tops;
		return tops.filter((p) => p.status === filter);
	});

	const counts = $derived({
		active: userData.projects.filter((p) => !p.parent_id && p.status === 'active').length,
		done: userData.projects.filter((p) => !p.parent_id && p.status === 'done').length,
		archived: userData.projects.filter((p) => !p.parent_id && p.status === 'archived').length,
		all: userData.projects.filter((p) => !p.parent_id).length
	});

	const FILTERS: { id: Filter; label: string }[] = [
		{ id: 'active', label: 'Active' },
		{ id: 'done', label: 'Done' },
		{ id: 'archived', label: 'Archived' },
		{ id: 'all', label: 'All' }
	];

</script>

<header class="flex flex-wrap items-end justify-between gap-3">
	<div class="space-y-1">
		<h1 class="text-2xl font-semibold tracking-tight">Projects</h1>
		<p class="text-sm text-muted-foreground">Personal initiatives and the work behind them.</p>
	</div>
	<Button size="sm" onclick={() => (showNew = !showNew)}>
		<Plus class="size-4" />
		<span>{showNew ? 'Close' : 'New'}</span>
	</Button>
</header>

<nav class="flex flex-wrap gap-1">
	{#each FILTERS as f (f.id)}
		{@const active = filter === f.id}
		<button
			type="button"
			onclick={() => (filter = f.id)}
			class={`rounded-full px-3 py-1 text-xs transition-colors ${
				active
					? 'bg-foreground text-background'
					: 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
			}`}
		>
			{f.label}
			<span class={`ml-1 ${active ? 'opacity-70' : 'opacity-50'}`}>{counts[f.id]}</span>
		</button>
	{/each}
</nav>

{#if showNew}
	<form
		method="POST"
		action="?/create"
		use:enhance={() =>
			async ({ update, result }) => {
				await update({ reset: true });
				if (result.type === 'redirect') {
					showNew = false;
					newColor = null;
				}
			}}
		class="space-y-3 rounded-lg border bg-muted/20 p-4"
	>
		<div class="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
			<div class="space-y-1.5">
				<Label class="text-xs">Name</Label>
				<Input name="name" placeholder="What are you working on?" required autofocus />
			</div>
			<div class="space-y-1.5">
				<Label class="text-xs">Parent</Label>
				<select
					name="parent_id"
					class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
				>
					<option value="">— top level —</option>
					{#each userData.projects as p (p.id)}
						<option value={p.id}>{p.name}</option>
					{/each}
				</select>
			</div>
			<Button type="submit">Create</Button>
		</div>
		<div class="space-y-1.5">
			<Label class="text-xs">Color</Label>
			<ColorPicker bind:value={newColor} name="color" label="Project color" />
		</div>
		{#if form?.error}
			<p class="text-sm text-destructive">{form.error}</p>
		{/if}
	</form>
{/if}

{#if visible.length === 0}
	<div class="rounded-lg border border-dashed p-12 text-center">
		<FolderKanban class="mx-auto mb-3 size-10 text-muted-foreground/60" />
		<p class="text-sm text-muted-foreground">
			{#if filter === 'active'}
				No active projects. Start something with <button
					class="underline underline-offset-2"
					onclick={() => (showNew = true)}>+ New</button
				>.
			{:else}
				Nothing here.
			{/if}
		</p>
	</div>
{:else}
	<ul class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
		{#each visible as p (p.id)}
			{@const subs = childCount.get(p.id) ?? 0}
			{@const accent = paletteHex(p.color) ?? 'var(--muted-foreground)'}
			<li>
				<a
					href={`/projects/${p.id}`}
					class="group block overflow-hidden rounded-lg border bg-card transition-all hover:border-foreground/20 hover:shadow-sm"
				>
					<div class="flex">
						<span class="w-1 shrink-0" style={`background:${accent}`} aria-hidden="true"></span>
						<div class="flex min-w-0 flex-1 flex-col gap-2 p-4">
							<div class="flex items-start justify-between gap-2">
								<h3
									class="flex min-w-0 items-center gap-2 truncate text-base font-semibold tracking-tight group-hover:text-foreground"
								>
									<ColorDot token={p.color} />
									<span class="truncate">{p.name}</span>
								</h3>
								{#if p.status !== 'active'}
									<Badge variant="secondary" class="shrink-0 text-[10px] capitalize">
										{p.status}
									</Badge>
								{/if}
							</div>

							{#if p.description}
								<p class="line-clamp-2 text-xs text-muted-foreground">{p.description}</p>
							{:else if p.body_html}
								<p class="line-clamp-3 text-xs text-muted-foreground">{htmlPreview(p.body_html)}</p>
							{:else}
								<p class="text-xs text-muted-foreground italic">No notes yet</p>
							{/if}

							{#if subs > 0}
								<div class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
									<GitBranch class="size-3" />
									<span>{subs} sub-{subs === 1 ? 'project' : 'projects'}</span>
								</div>
							{/if}
						</div>
					</div>
				</a>
			</li>
		{/each}
	</ul>
{/if}
