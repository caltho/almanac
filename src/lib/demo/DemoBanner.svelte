<script lang="ts">
	import { onMount } from 'svelte';
	import FlaskConical from '@lucide/svelte/icons/flask-conical';
	import { DEMO_BLOCKED_HEADER, DEMO_READ_ONLY_MESSAGE } from '$lib/demo';

	let notice = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	// Every write the server refuses carries DEMO_BLOCKED_HEADER (see
	// refuseDemoWrite). Watching fetch here gives form actions and JSON
	// endpoints the same notice without touching each page; the pages
	// already roll back their optimistic updates when a request fails.
	onMount(() => {
		const nativeFetch = window.fetch;
		window.fetch = async (...args: Parameters<typeof fetch>) => {
			const res = await nativeFetch(...args);
			if (res.headers.has(DEMO_BLOCKED_HEADER)) {
				notice = true;
				clearTimeout(timer);
				timer = setTimeout(() => (notice = false), 4000);
			}
			return res;
		};
		return () => {
			window.fetch = nativeFetch;
			clearTimeout(timer);
		};
	});
</script>

<div
	class="border-b border-amber-300/70 bg-amber-50 text-amber-950 dark:border-amber-300/15 dark:bg-amber-300/10 dark:text-amber-100"
>
	<p class="mx-auto flex max-w-5xl items-start gap-2 px-4 py-2 text-sm">
		<FlaskConical class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
		<span>
			You're in demo mode, looking at sample data.
			<a
				href="/demo/exit"
				data-sveltekit-reload
				class="font-medium underline underline-offset-2 hover:no-underline">Click here</a
			> to sign in and use real data.
		</span>
	</p>
</div>

<div
	role="status"
	aria-live="polite"
	class="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4"
>
	{#if notice}
		<p class="rounded-full bg-foreground px-4 py-2 text-sm text-background shadow-lg">
			{DEMO_READ_ONLY_MESSAGE}
		</p>
	{/if}
</div>
