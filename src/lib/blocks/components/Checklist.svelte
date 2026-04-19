<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';

	type Item = { text: string; done: boolean };

	let {
		content,
		edit = false,
		onchange
	}: {
		content: Record<string, unknown>;
		edit?: boolean;
		onchange?: (content: unknown) => void;
	} = $props();

	const items = $derived((content.items as Item[]) ?? []);

	function update(items: Item[]) {
		onchange?.({ items });
	}
</script>

{#if edit}
	<div class="space-y-2">
		{#each items as it, i (i)}
			<div class="flex items-center gap-2">
				<input
					type="checkbox"
					checked={it.done}
					onchange={(e) => {
						const next = [...items];
						next[i] = { ...it, done: (e.currentTarget as HTMLInputElement).checked };
						update(next);
					}}
					class="size-4 accent-foreground"
				/>
				<Input
					value={it.text}
					class="flex-1"
					oninput={(e) => {
						const next = [...items];
						next[i] = { ...it, text: (e.currentTarget as HTMLInputElement).value };
						update(next);
					}}
				/>
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					onclick={() => update(items.filter((_, idx) => idx !== i))}
					aria-label="Remove"
				>
					<Trash2 class="size-4" />
				</Button>
			</div>
		{/each}
		<Button
			type="button"
			variant="outline"
			size="sm"
			onclick={() => update([...items, { text: '', done: false }])}
		>
			<Plus class="size-4" />
			<span>Add item</span>
		</Button>
	</div>
{:else}
	<ul class="space-y-1">
		{#each items as it, i (i)}
			<li class="flex items-center gap-2 text-sm">
				<span
					class={`grid size-4 shrink-0 place-items-center rounded border ${
						it.done ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
					}`}
				>
					{#if it.done}✓{/if}
				</span>
				<span class={it.done ? 'line-through opacity-60' : ''}>{it.text}</span>
			</li>
		{/each}
	</ul>
{/if}
