<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { AttrsRenderer } from '$lib/custom-attrs';
	import Plus from '@lucide/svelte/icons/plus';
	import Settings2 from '@lucide/svelte/icons/settings-2';

	let { data } = $props();

	function fmt(date: string) {
		return new Date(date + 'T00:00:00').toLocaleDateString(undefined, {
			weekday: 'short',
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}
</script>

<section class="space-y-6">
	<header class="flex items-start justify-between gap-4">
		<div class="space-y-1">
			<h1 class="text-2xl font-semibold tracking-tight">Journal</h1>
			<p class="text-sm text-muted-foreground">Dated entries with mood + your own fields.</p>
		</div>
		<div class="flex items-center gap-2">
			<Button variant="outline" size="sm" href="/journal/fields">
				<Settings2 class="size-4" />
				<span>Fields</span>
			</Button>
			<Button size="sm" href="/journal/new">
				<Plus class="size-4" />
				<span>New entry</span>
			</Button>
		</div>
	</header>

	{#if data.entries.length === 0}
		<div class="rounded-md border p-8 text-center">
			<p class="text-sm text-muted-foreground">No entries yet.</p>
			<Button class="mt-4" href="/journal/new">Write the first one</Button>
		</div>
	{:else}
		<ul class="divide-y divide-border rounded-md border">
			{#each data.entries as e (e.id)}
				<li class="p-4 hover:bg-muted/30">
					<a href={`/journal/${e.id}`} class="block space-y-2">
						<div class="flex flex-wrap items-center gap-2">
							<time class="text-xs tracking-widest text-muted-foreground uppercase"
								>{fmt(e.entry_date)}</time
							>
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
						<AttrsRenderer defs={data.defs} values={e.custom as Record<string, unknown>} />
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</section>
