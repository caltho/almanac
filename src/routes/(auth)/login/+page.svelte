<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';

	let { data, form } = $props();

	let submitting = $state(false);
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Sign in</Card.Title>
		<Card.Description>We'll email you a magic link.</Card.Description>
	</Card.Header>

	{#if form?.sent}
		<Card.Content>
			<p class="text-sm">
				Link sent to <span class="font-medium">{form.email}</span>. Open it on this device to finish
				signing in. The email may take up to a minute.
			</p>
		</Card.Content>
	{:else}
		<form
			method="POST"
			use:enhance={() => {
				submitting = true;
				return async ({ update }) => {
					await update();
					submitting = false;
				};
			}}
		>
			<Card.Content class="space-y-3">
				<div class="space-y-2">
					<Label for="email">Email</Label>
					<Input
						id="email"
						name="email"
						type="email"
						autocomplete="email"
						required
						value={form?.email ?? ''}
						placeholder="you@example.com"
					/>
				</div>
				<input type="hidden" name="redirect" value={data.redirectTo} />
				{#if form?.error}
					<p class="text-sm text-destructive">{form.error}</p>
				{/if}
			</Card.Content>
			<Card.Footer>
				<Button type="submit" class="w-full" disabled={submitting}>
					{submitting ? 'Sending…' : 'Send magic link'}
				</Button>
			</Card.Footer>
		</form>
	{/if}
</Card.Root>
