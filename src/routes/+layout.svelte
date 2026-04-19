<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { invalidate } from '$app/navigation';
	import { onMount } from 'svelte';
	import { getSupabaseBrowserClient } from '$lib/db/browser';

	let { children, data } = $props();

	// Keep SSR session in sync with client-side auth events so form actions don't
	// race a stale session after sign-in/out.
	onMount(() => {
		const supabase = getSupabaseBrowserClient();
		const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
			if (newSession?.expires_at !== data.session?.expires_at) {
				invalidate('supabase:auth');
			}
		});
		return () => sub.subscription.unsubscribe();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Almanac</title>
</svelte:head>

{@render children()}
