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

	const text = $derived((content.text as string) ?? '');
</script>

{#if edit}
	<Textarea
		value={text}
		rows={3}
		placeholder="Write…"
		oninput={(e) => onchange?.({ text: (e.currentTarget as HTMLTextAreaElement).value })}
	/>
{:else if text}
	<p class="whitespace-pre-wrap">{text}</p>
{:else}
	<p class="text-muted-foreground italic">Empty paragraph</p>
{/if}
