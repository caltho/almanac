<script lang="ts">
	import * as Card from '$lib/components/ui/card';

	let { data } = $props();
	const name = $derived(data.profile?.display_name ?? data.user?.email?.split('@')[0] ?? 'you');
</script>

<section class="space-y-6">
	<header class="space-y-1">
		<h1 class="text-3xl font-semibold tracking-tight">Welcome, {name}.</h1>
		<p class="text-muted-foreground">Milestone M1 — auth + sharing foundation — is live.</p>
	</header>

	<div class="grid gap-4 sm:grid-cols-2">
		<Card.Root>
			<Card.Header>
				<Card.Title class="text-base">Domains</Card.Title>
				<Card.Description>Arrive with M3</Card.Description>
			</Card.Header>
			<Card.Content class="text-sm text-muted-foreground">
				Journal, sleep, tasks, habits, finance, assets, projects, pages — each gets its own screen.
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title class="text-base">Sharing</Card.Title>
				<Card.Description
					>Invite via <a class="underline" href="/settings/shares">settings</a>
				</Card.Description>
			</Card.Header>
			<Card.Content class="text-sm text-muted-foreground">
				Granular row-level access via <code>shares</code> + Postgres RLS. No domain data to share yet
				— UI works the moment those tables land.
			</Card.Content>
		</Card.Root>
	</div>
</section>
