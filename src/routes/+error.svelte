<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
</script>

<main
	class="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 text-center"
>
	<p class="text-xs tracking-[0.25em] text-muted-foreground uppercase">
		Error {page.status}
	</p>
	<h1 class="text-2xl font-semibold tracking-tight">
		{page.error?.message || 'Something went wrong.'}
	</h1>
	<div class="flex gap-2">
		<Button variant="outline" href="/">Home</Button>
		{#if page.status === 401 || page.status === 403}
			<Button href="/login">Sign in</Button>
		{/if}
	</div>
</main>
