<script lang="ts">
	// Tiny popover wrapper around bits-ui's Popover.Root. Used for inline
	// "click to edit" triggers — color swatch grid, period select, etc. The
	// trigger is whatever the consumer renders inside the `trigger` snippet;
	// the popover content is the children. We auto-close on selection by
	// exposing `close` to the children snippet.
	//
	// Why a wrapper: bits-ui's Popover is unstyled. This adds the standard
	// shadcn-style chrome (rounded-md border bg-popover shadow-md) so
	// callers don't repeat it.

	import { Popover as PopoverPrimitive } from 'bits-ui';
	import type { Snippet } from 'svelte';

	type Props = {
		trigger: Snippet<[{ open: boolean }]>;
		children: Snippet<[{ close: () => void }]>;
		side?: 'top' | 'right' | 'bottom' | 'left';
		align?: 'start' | 'center' | 'end';
		/** Popover content padding. Defaults to a compact `p-2`. */
		contentClass?: string;
		/** Aria label for the trigger button. */
		label?: string;
	};

	let {
		trigger,
		children,
		side = 'bottom',
		align = 'end',
		contentClass = 'p-2',
		label
	}: Props = $props();

	let open = $state(false);

	function close() {
		open = false;
	}
</script>

<PopoverPrimitive.Root bind:open>
	<PopoverPrimitive.Trigger>
		{#snippet child({ props })}
			<button
				type="button"
				{...props}
				aria-label={label}
				class="inline-flex items-center justify-center rounded-md transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:outline-none"
			>
				{@render trigger({ open })}
			</button>
		{/snippet}
	</PopoverPrimitive.Trigger>
	<PopoverPrimitive.Portal>
		<PopoverPrimitive.Content
			{side}
			{align}
			sideOffset={6}
			class={`z-50 rounded-md border bg-popover text-popover-foreground shadow-md outline-none ${contentClass}`}
		>
			{@render children({ close })}
		</PopoverPrimitive.Content>
	</PopoverPrimitive.Portal>
</PopoverPrimitive.Root>
