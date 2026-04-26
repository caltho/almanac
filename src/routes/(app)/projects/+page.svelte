<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import Plus from '@lucide/svelte/icons/plus';
	import Settings2 from '@lucide/svelte/icons/settings-2';
	import FolderKanban from '@lucide/svelte/icons/folder-kanban';
	import GitBranch from '@lucide/svelte/icons/git-branch';
	import { useUserData } from '$lib/stores/userData.svelte';

	let { form } = $props();

	const userData = useUserData();

	type Filter = 'active' | 'done' | 'archived' | 'all';
	let filter = $state<Filter>('active');
	let showNew = $state(false);

	// Per-project stats: total + done counts from the project_items in the
	// store. Aggregating once on every render is fine — the dataset is small.
	const stats = $derived.by(() => {
		const out = new Map<string, { total: number; done: number }>();
		for (const i of userData.projectItems) {
			const s = out.get(i.project_id) ?? { total: 0, done: 0 };
			s.total++;
			if (i.done_at) s.done++;
			out.set(i.project_id, s);
		}
		return out;
	});

	const childCount = $derived.by(() => {
		const out = new Map<string, number>();
		for (const p of userData.projects) {
			if (!p.parent_id) continue;
			out.set(p.parent_id, (out.get(p.parent_id) ?? 0) + 1);
		}
		return out;
	});

	// Top-level only on the list. Sub-projects show on the detail page.
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

	function pct(s: { total: number; done: number } | undefined): number {
		if (!s || s.total === 0) return 0;
		return Math.round((s.done / s.total) * 100);
	}
</script>

<header class="flex flex-wrap items-end justify-between gap-3">
	<div class="space-y-1">
		<h1 class="text-2xl font-semibold tracking-tight">Projects</h1>
		<p class="text-sm text-muted-foreground">Personal initiatives and the work behind them.</p>
	</div>
	<div class="flex items-center gap-2">
		<Button variant="outline" size="sm" href="/projects/fields">
			<Settings2 class="size-4" />
			<span>Fields</span>
		</Button>
		<Button size="sm" onclick={() => (showNew = !showNew)}>
			<Plus class="size-4" />
			<span>{showNew ? 'Close' : 'New'}</span>
		</Button>
	</div>
</header>

<!-- Filter pills — segmented look, low chrome. -->
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
				if (result.type === 'success') showNew = false;
			}}
		class="grid gap-3 rounded-lg border bg-muted/20 p-4 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end"
	>
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
		<div class="space-y-1.5">
			<Label class="text-xs">Color</Label>
			<Input name="color" type="color" value="#6366F1" class="h-9 w-14 cursor-pointer p-1" />
		</div>
		<Button type="submit">Create</Button>
		{#if form?.error}
			<p class="col-span-full text-sm text-destructive">{form.error}</p>
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
			{@const s = stats.get(p.id)}
			{@const subs = childCount.get(p.id) ?? 0}
			{@const pctDone = pct(s)}
			<li>
				<a
					href={`/projects/${p.id}`}
					class="group block overflow-hidden rounded-lg border bg-card transition-all hover:border-foreground/20 hover:shadow-sm"
				>
					<div class="flex">
						<!-- Color accent — left bar runs full height. -->
						<span
							class="w-1 shrink-0"
							style={`background:${p.color ?? 'var(--muted-foreground)'}`}
							aria-hidden="true"
						></span>
						<div class="flex min-w-0 flex-1 flex-col gap-2 p-4">
							<div class="flex items-start justify-between gap-2">
								<h3
									class="truncate text-base font-semibold tracking-tight group-hover:text-foreground"
								>
									{p.name}
								</h3>
								{#if p.status !== 'active'}
									<Badge variant="secondary" class="shrink-0 text-[10px] capitalize">
										{p.status}
									</Badge>
								{/if}
							</div>

							{#if p.description}
								<p class="line-clamp-2 text-xs text-muted-foreground">{p.description}</p>
							{/if}

							<!-- Progress -->
							<div class="mt-auto space-y-1.5 pt-1">
								<div class="flex items-center justify-between text-[11px] text-muted-foreground">
									<span>
										{#if s && s.total > 0}
											{s.done} / {s.total} done
										{:else}
											No items
										{/if}
									</span>
									{#if s && s.total > 0}
										<span class="tabular-nums">{pctDone}%</span>
									{/if}
								</div>
								<div class="h-1 w-full overflow-hidden rounded-full bg-muted">
									{#if s && s.total > 0}
										<div
											class="h-full rounded-full transition-[width] duration-300"
											style={`width:${pctDone}%; background:${p.color ?? 'currentColor'}; opacity:${pctDone === 100 ? 1 : 0.85}`}
										></div>
									{/if}
								</div>
							</div>

							{#if subs > 0}
								<div
									class="flex items-center gap-1.5 text-[11px] text-muted-foreground"
								>
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
