<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { SHARE_RESOURCE_TYPES, SHARE_PERMS, resourceTypeLabel } from '$lib/shares/constants';

	let { data, form } = $props();

	let submitting = $state(false);
</script>

<section class="mx-auto max-w-2xl space-y-8">
	<header class="space-y-1">
		<h1 class="text-2xl font-semibold tracking-tight">Shares</h1>
		<p class="text-sm text-muted-foreground">
			Give someone else read/comment/write access to a whole domain. Row-level sharing arrives when
			each domain's UI does (M3+).
		</p>
	</header>

	<Card.Root>
		<Card.Header>
			<Card.Title class="text-base">Invite by email</Card.Title>
			<Card.Description>The recipient must have an Almanac account first.</Card.Description>
		</Card.Header>
		<form
			method="POST"
			action="?/invite"
			use:enhance={() => {
				submitting = true;
				return async ({ update }) => {
					await update({ reset: form?.invited });
					submitting = false;
				};
			}}
		>
			<Card.Content class="space-y-4">
				<div class="space-y-2">
					<Label for="email">Email</Label>
					<Input
						id="email"
						name="email"
						type="email"
						required
						value={form?.email ?? ''}
						placeholder="friend@example.com"
					/>
				</div>

				<div class="space-y-2">
					<Label for="resource_type">Domain</Label>
					<select
						id="resource_type"
						name="resource_type"
						required
						class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
					>
						<option value="">Pick one…</option>
						{#each SHARE_RESOURCE_TYPES as t (t.value)}
							<option value={t.value}>{t.label}</option>
						{/each}
					</select>
				</div>

				<fieldset class="space-y-2">
					<legend class="text-sm font-medium">Permissions</legend>
					<div class="flex flex-wrap gap-4 text-sm">
						{#each SHARE_PERMS as p (p)}
							<label class="flex items-center gap-2">
								<input
									type="checkbox"
									name="perms"
									value={p}
									checked={p === 'read'}
									class="size-4 accent-foreground"
								/>
								<span class="capitalize">{p}</span>
							</label>
						{/each}
					</div>
				</fieldset>

				{#if form?.error}
					<p class="text-sm text-destructive">{form.error}</p>
				{:else if form?.invited}
					<p class="text-sm text-emerald-600">Invited.</p>
				{/if}
			</Card.Content>
			<Card.Footer>
				<Button type="submit" disabled={submitting}>
					{submitting ? 'Sending…' : 'Share'}
				</Button>
			</Card.Footer>
		</form>
	</Card.Root>

	<section class="space-y-3">
		<h2 class="text-sm font-semibold tracking-widest uppercase">Outgoing</h2>
		{#if data.outgoing.length === 0}
			<p class="text-sm text-muted-foreground">You haven't shared anything yet.</p>
		{:else}
			<ul class="divide-y divide-border rounded-md border">
				{#each data.outgoing as s (s.id)}
					<li class="flex items-center justify-between gap-4 p-3">
						<div class="space-y-1">
							<div class="text-sm font-medium">
								{s.grantee?.display_name ?? 'Unknown user'}
								<span class="text-muted-foreground">— {resourceTypeLabel(s.resource_type)}</span>
							</div>
							<div class="flex flex-wrap gap-1">
								{#each s.perms as p (p)}
									<Badge variant="secondary" class="text-xs capitalize">{p}</Badge>
								{/each}
							</div>
						</div>
						<form method="POST" action="?/revoke" use:enhance>
							<input type="hidden" name="id" value={s.id} />
							<Button type="submit" variant="ghost" size="sm">Revoke</Button>
						</form>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<Separator />

	<section class="space-y-3">
		<h2 class="text-sm font-semibold tracking-widest uppercase">Incoming</h2>
		{#if data.incoming.length === 0}
			<p class="text-sm text-muted-foreground">No one has shared anything with you yet.</p>
		{:else}
			<ul class="divide-y divide-border rounded-md border">
				{#each data.incoming as s (s.id)}
					<li class="flex items-center justify-between gap-4 p-3">
						<div class="space-y-1">
							<div class="text-sm font-medium">
								{s.owner?.display_name ?? 'Unknown user'}
								<span class="text-muted-foreground">— {resourceTypeLabel(s.resource_type)}</span>
							</div>
							<div class="flex flex-wrap gap-1">
								{#each s.perms as p (p)}
									<Badge variant="secondary" class="text-xs capitalize">{p}</Badge>
								{/each}
							</div>
						</div>
						<form method="POST" action="?/revoke" use:enhance>
							<input type="hidden" name="id" value={s.id} />
							<Button type="submit" variant="ghost" size="sm">Leave</Button>
						</form>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</section>
