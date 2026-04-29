<script lang="ts">
	// Click-to-change color picker. Trigger is a small dot showing the current
	// color (or a dashed empty ring when unset). Clicking opens a popover with
	// the 8 palette swatches + "no color"; picking one fires `onchange` and
	// closes the popover. No persistent control sits in the row.

	import Popover from './Popover.svelte';
	import { PALETTE, PALETTE_TOKENS, paletteHex, type PaletteToken } from '$lib/palette';
	import Check from '@lucide/svelte/icons/check';
	import Ban from '@lucide/svelte/icons/ban';

	type Props = {
		value: PaletteToken | null;
		onchange: (next: PaletteToken | null) => void;
		size?: 'sm' | 'md';
		label?: string;
	};

	let { value, onchange, size = 'sm', label = 'Change color' }: Props = $props();

	const dotClass = $derived(size === 'md' ? 'size-4' : 'size-3');
	const hex = $derived(paletteHex(value));
</script>

<Popover {label} contentClass="p-2">
	{#snippet trigger()}
		<span class="inline-flex size-7 items-center justify-center">
			{#if hex}
				<span class={`rounded-full ${dotClass}`} style={`background:${hex}`} aria-hidden="true"
				></span>
			{:else}
				<span
					class={`rounded-full border border-dashed border-muted-foreground/50 ${dotClass}`}
					aria-hidden="true"
				></span>
			{/if}
		</span>
	{/snippet}

	{#snippet children({ close })}
		<div class="flex items-center gap-1.5" role="radiogroup" aria-label="Color">
			<button
				type="button"
				role="radio"
				aria-checked={value === null}
				aria-label="No color"
				onclick={() => {
					onchange(null);
					close();
				}}
				class={`inline-flex size-6 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-all hover:border-foreground/40 ${
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
					onclick={() => {
						onchange(token);
						close();
					}}
					style={`background:${sw.hex}`}
					class={`inline-flex size-6 items-center justify-center rounded-full text-white transition-all ${
						selected
							? 'ring-2 ring-foreground/60 ring-offset-1 ring-offset-popover'
							: 'opacity-85 hover:opacity-100'
					}`}
				>
					{#if selected}
						<Check class="size-3" />
					{/if}
				</button>
			{/each}
		</div>
	{/snippet}
</Popover>
