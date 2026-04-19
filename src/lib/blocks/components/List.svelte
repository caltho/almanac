<script lang="ts">
	import { Textarea } from '$lib/components/ui/textarea';

	let {
		content,
		edit = false,
		onchange
	}: {
		content: Record<string, unknown>;
		edit?: boolean;
		onchange?: (content: unknown) => void;
	} = $props();

	const items = $derived((content.items as string[]) ?? []);
	const ordered = $derived((content.ordered as boolean) ?? false);

	function onInput(text: string) {
		const lines = text.split(/\n/).filter((l) => l.length > 0);
		onchange?.({ items: lines, ordered });
	}
</script>

{#if edit}
	<div class="space-y-2">
		<label class="flex items-center gap-2 text-xs">
			<input
				type="checkbox"
				checked={ordered}
				onchange={(e) =>
					onchange?.({ items, ordered: (e.currentTarget as HTMLInputElement).checked })}
				class="size-4 accent-foreground"
			/>
			Numbered
		</label>
		<Textarea
			value={items.join('\n')}
			rows={Math.max(3, items.length + 1)}
			placeholder="One item per line"
			oninput={(e) => onInput((e.currentTarget as HTMLTextAreaElement).value)}
		/>
	</div>
{:else if ordered}
	<ol class="ml-6 list-decimal space-y-0.5">
		{#each items as it, i (i)}
			<li>{it}</li>
		{/each}
	</ol>
{:else}
	<ul class="ml-6 list-disc space-y-0.5">
		{#each items as it, i (i)}
			<li>{it}</li>
		{/each}
	</ul>
{/if}
