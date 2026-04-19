<script lang="ts">
	import Paragraph from './Paragraph.svelte';
	import Heading from './Heading.svelte';
	import List from './List.svelte';
	import Checklist from './Checklist.svelte';
	import DataPoint from './DataPoint.svelte';
	import type { Block } from '../types';

	let {
		block,
		edit = false,
		onchange
	}: {
		block: Block;
		edit?: boolean;
		onchange?: (content: unknown) => void;
	} = $props();

	const content = $derived(block.content as Record<string, unknown>);
</script>

{#if block.type === 'paragraph'}
	<Paragraph {content} {edit} {onchange} />
{:else if block.type === 'heading'}
	<Heading {content} {edit} {onchange} />
{:else if block.type === 'list'}
	<List {content} {edit} {onchange} />
{:else if block.type === 'checklist'}
	<Checklist {content} {edit} {onchange} />
{:else if block.type === 'data-point'}
	<DataPoint {content} {edit} {onchange} />
{:else}
	<pre class="text-xs text-destructive">Unknown block type: {block.type}</pre>
{/if}
