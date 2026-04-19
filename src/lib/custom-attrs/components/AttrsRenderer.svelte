<script lang="ts">
	import AttrRenderer from './AttrRenderer.svelte';
	import type { CustomAttrDef } from '../types';

	let {
		defs,
		values
	}: {
		defs: CustomAttrDef[];
		values: Record<string, unknown>;
	} = $props();
</script>

{#if defs.length > 0}
	<dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
		{#each defs as def (def.id)}
			<dt class="text-muted-foreground">{def.label}</dt>
			<dd><AttrRenderer {def} value={values[def.key]} /></dd>
		{/each}
	</dl>
{/if}
