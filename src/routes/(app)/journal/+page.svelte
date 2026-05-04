<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { AttrsRenderer } from '$lib/custom-attrs';
	import Plus from '@lucide/svelte/icons/plus';
	import { useUserData } from '$lib/stores/userData.svelte';

	const userData = useUserData();
	const defs = $derived(userData.defsFor('journal_entries'));

	function fmt(date: string) {
		const d = new Date(date + 'T00:00:00');
		const dd = String(d.getDate()).padStart(2, '0');
		const mm = String(d.getMonth() + 1).padStart(2, '0');
		return `${dd}/${mm}/${d.getFullYear()}`;
	}
</script>

<header class="flex items-start justify-between gap-4">
	<div class="space-y-1">
		<h1 class="text-2xl font-semibold tracking-tight">Journal</h1>
		<p class="text-sm text-muted-foreground">Dated entries with mood + your own fields.</p>
	</div>
	<Button size="sm" href="/journal/new">
		<Plus class="size-4" />
		<span>New entry</span>
	</Button>
</header>

{#if userData.journalEntries.length === 0}
	<div class="rounded-md border p-8 text-center">
		<p class="text-sm text-muted-foreground">No entries yet.</p>
		<Button class="mt-4" href="/journal/new">Write the first one</Button>
	</div>
{:else}
	<ul class="divide-y divide-border rounded-md border">
		{#each userData.journalEntries as e (e.id)}
			<li class="p-4 hover:bg-muted/30">
				<a href={`/journal/${e.id}`} class="block space-y-2">
					<div class="flex flex-wrap items-center gap-2">
						<time class="text-xs tracking-widest text-muted-foreground uppercase">
							{fmt(e.entry_date)}
						</time>
						{#if typeof e.mood === 'number'}
							<Badge variant="secondary" class="text-xs">Mood {e.mood}/10</Badge>
						{/if}
					</div>
					{#if e.title}
						<h3 class="text-lg font-semibold tracking-tight">{e.title}</h3>
					{/if}
					{#if e.body}
						<p class="line-clamp-2 text-sm text-muted-foreground">{e.body}</p>
					{/if}
					<AttrsRenderer {defs} values={e.custom as Record<string, unknown>} />
				</a>
			</li>
		{/each}
	</ul>
{/if}
