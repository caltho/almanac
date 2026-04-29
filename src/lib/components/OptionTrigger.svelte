<script lang="ts">
	// Click-to-change one-of-N selector. Trigger renders the *current* option
	// label as a subtle muted-foreground pill; clicking opens a popover with
	// the full list as a radio menu. Picking fires `onchange` and closes the
	// popover. No persistent <select> sits in the row.
	//
	// Generic over a string-keyed value (enum, status, period, …). Keep the
	// label list short — this is for ≤10 options. Use a real <select> for
	// larger sets.

	import Popover from './Popover.svelte';
	import Check from '@lucide/svelte/icons/check';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';

	type Props<T extends string> = {
		value: T;
		options: { value: T; label: string }[];
		onchange: (next: T) => void;
		label?: string;
		/** Optional override for the trigger button's pill text (defaults to the option label). */
		display?: string;
	};

	let { value, options, onchange, label, display }: Props<string> = $props();

	const current = $derived(options.find((o) => o.value === value));
</script>

<Popover {label} contentClass="p-1 min-w-[10rem]">
	{#snippet trigger()}
		<span
			class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground"
		>
			{display ?? current?.label ?? value}
			<ChevronDown class="size-3" />
		</span>
	{/snippet}

	{#snippet children({ close })}
		<ul class="min-w-[8rem]" role="menu">
			{#each options as opt (opt.value)}
				{@const selected = opt.value === value}
				<li>
					<button
						type="button"
						role="menuitemradio"
						aria-checked={selected}
						onclick={() => {
							onchange(opt.value);
							close();
						}}
						class={`flex w-full items-center justify-between gap-3 rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted/60 ${
							selected ? 'text-foreground' : 'text-muted-foreground'
						}`}
					>
						<span>{opt.label}</span>
						{#if selected}
							<Check class="size-3.5" />
						{/if}
					</button>
				</li>
			{/each}
		</ul>
	{/snippet}
</Popover>
