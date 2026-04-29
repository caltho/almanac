<script lang="ts">
	// Compact swatch row. Bind:value gives back a palette token (or null for
	// "no color"). The picker always shows all 8 tokens plus a "none" pill,
	// so it's keyboard-friendly and predictable.
	import { PALETTE, PALETTE_TOKENS, type PaletteToken } from '$lib/palette';
	import Check from '@lucide/svelte/icons/check';
	import Ban from '@lucide/svelte/icons/ban';

	type Props = {
		value: PaletteToken | null;
		onchange?: (next: PaletteToken | null) => void;
		/** Render as a hidden input with this name for plain form-action submits. */
		name?: string;
		/** Label/aria attribute for the group. */
		label?: string;
		/** Slightly larger swatches, e.g. on a dedicated edit screen. */
		size?: 'sm' | 'md';
	};

	let { value = $bindable(null), onchange, name, label, size = 'sm' }: Props = $props();

	const swatchSize = $derived(size === 'md' ? 'size-7' : 'size-5');

	function pick(next: PaletteToken | null) {
		value = next;
		onchange?.(next);
	}
</script>

<div class="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label={label ?? 'Color'}>
	<button
		type="button"
		role="radio"
		aria-checked={value === null}
		aria-label="No color"
		onclick={() => pick(null)}
		class={`inline-flex ${swatchSize} items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-all hover:border-foreground/40 ${
			value === null ? 'ring-2 ring-foreground/40' : ''
		}`}
	>
		<Ban class="size-3" />
	</button>
	{#each PALETTE_TOKENS as token (token)}
		{@const sw = PALETTE[token]}
		{@const selected = value === token}
		<button
			type="button"
			role="radio"
			aria-checked={selected}
			aria-label={sw.label}
			title={sw.label}
			onclick={() => pick(token)}
			style={`background:${sw.hex}`}
			class={`inline-flex ${swatchSize} items-center justify-center rounded-full text-white transition-all ${
				selected
					? 'ring-2 ring-foreground/60 ring-offset-1 ring-offset-background'
					: 'opacity-80 hover:opacity-100'
			}`}
		>
			{#if selected}
				<Check class={size === 'md' ? 'size-3.5' : 'size-2.5'} />
			{/if}
		</button>
	{/each}

	{#if name}
		<input type="hidden" {name} value={value ?? ''} />
	{/if}
</div>
