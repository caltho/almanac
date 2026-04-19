<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';

	let { data, form } = $props();
	let saving = $state(false);
</script>

<section class="mx-auto max-w-xl space-y-6">
	<header class="space-y-1">
		<h1 class="text-2xl font-semibold tracking-tight">Profile</h1>
		<p class="text-sm text-muted-foreground">How you appear to people you share data with.</p>
	</header>

	<Card.Root>
		<form
			method="POST"
			action="?/update"
			use:enhance={() => {
				saving = true;
				return async ({ update }) => {
					await update();
					saving = false;
				};
			}}
		>
			<Card.Content class="space-y-4">
				<div class="space-y-2">
					<Label for="email">Email</Label>
					<Input id="email" value={data.user?.email ?? ''} readonly disabled />
					<p class="text-xs text-muted-foreground">Email changes go through Supabase Auth.</p>
				</div>

				<div class="space-y-2">
					<Label for="display_name">Display name</Label>
					<Input
						id="display_name"
						name="display_name"
						required
						minlength={1}
						maxlength={60}
						value={form?.displayName ?? data.profile?.display_name ?? ''}
					/>
				</div>

				{#if form?.error}
					<p class="text-sm text-destructive">{form.error}</p>
				{:else if form?.saved}
					<p class="text-sm text-emerald-600">Saved.</p>
				{/if}
			</Card.Content>
			<Card.Footer>
				<Button type="submit" disabled={saving}>
					{saving ? 'Saving…' : 'Save changes'}
				</Button>
			</Card.Footer>
		</form>
	</Card.Root>
</section>
