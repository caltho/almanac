<script lang="ts">
	// Tiny colored dot used in lists. Resolves a palette token to its hex via
	// $lib/palette so we don't sprinkle `style={`background:${hex}`}` calls
	// across pages. Renders nothing when token is null/unknown.
	import { paletteHex, paletteLabel } from '$lib/palette';

	type Props = {
		token: string | null | undefined;
		size?: 'xs' | 'sm' | 'md';
		class?: string;
	};

	let { token, size = 'sm', class: extraClass = '' }: Props = $props();

	const hex = $derived(paletteHex(token));
	const sizeClass = $derived(size === 'xs' ? 'size-2' : size === 'md' ? 'size-3' : 'size-2.5');
</script>

{#if hex}
	<span
		class={`inline-block shrink-0 rounded-full ${sizeClass} ${extraClass}`}
		style={`background:${hex}`}
		title={paletteLabel(token)}
		aria-hidden="true"
	></span>
{/if}
