<script lang="ts">
	import AttrEditor from './AttrEditor.svelte';
	import type { CustomAttrDef } from '../types';

	let {
		defs,
		values = $bindable(),
		errors = {}
	}: {
		defs: CustomAttrDef[];
		values: Record<string, unknown>;
		errors?: Record<string, string>;
	} = $props();

	function setValue(key: string, v: unknown) {
		values = { ...values, [key]: v };
	}
</script>

{#if defs.length > 0}
	<div class="space-y-4">
		{#each defs as def (def.id)}
			<div class="space-y-1">
				<AttrEditor {def} bind:value={() => values[def.key], (v) => setValue(def.key, v)} />
				{#if errors[def.key]}
					<p class="text-xs text-destructive">{errors[def.key]}</p>
				{/if}
			</div>
		{/each}
	</div>
{/if}
