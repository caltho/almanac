<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { NAV_ITEMS } from '$lib/nav';

	let { data } = $props();
	const name = $derived(data.profile?.display_name ?? data.user?.email?.split('@')[0] ?? 'you');
	const currentMilestone = 4;
	const domains = $derived(NAV_ITEMS.filter((n) => n.milestone <= currentMilestone));
	const upcoming = $derived(NAV_ITEMS.filter((n) => n.milestone > currentMilestone));
</script>

<section class="space-y-6">
	<header class="space-y-1">
		<h1 class="text-3xl font-semibold tracking-tight">Welcome, {name}.</h1>
		<p class="text-muted-foreground">Pick a domain to log or review.</p>
	</header>

	<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
		{#each domains as d (d.href)}
			{@const Icon = d.icon}
			<a
				href={d.href}
				class="group rounded-lg border border-border p-4 transition-colors hover:bg-muted/30"
			>
				<div class="flex items-center gap-3">
					<div class="grid size-9 place-items-center rounded-md bg-muted">
						<Icon class="size-4" />
					</div>
					<div>
						<div class="font-medium">{d.label}</div>
					</div>
				</div>
			</a>
		{/each}
	</div>

	{#if upcoming.length > 0}
		<Card.Root>
			<Card.Header>
				<Card.Title class="text-sm font-medium">Coming soon</Card.Title>
				<Card.Description>Domains that arrive in later milestones.</Card.Description>
			</Card.Header>
			<Card.Content>
				<ul class="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
					{#each upcoming as d (d.href)}
						<li>{d.label} <span class="text-xs">— M{d.milestone}</span></li>
					{/each}
				</ul>
			</Card.Content>
			<Card.Footer>
				<Button variant="outline" size="sm" href="/settings/shares">Manage shares</Button>
			</Card.Footer>
		</Card.Root>
	{/if}
</section>
