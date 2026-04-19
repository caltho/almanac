<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import Star from '@lucide/svelte/icons/star';
	import type { CustomAttrDef, UiHints } from '../types';

	let { def, value }: { def: CustomAttrDef; value: unknown } = $props();

	const hints = $derived((def.ui_hints ?? {}) as UiHints);
	const maxRating = $derived(hints.max ?? 5);

	function fmtDate(s: string) {
		try {
			return new Date(s).toLocaleDateString();
		} catch {
			return s;
		}
	}
	function fmtDateTime(s: string) {
		try {
			return new Date(s).toLocaleString();
		} catch {
			return s;
		}
	}
</script>

{#if value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)}
	<span class="text-muted-foreground">—</span>
{:else if def.type === 'text' || def.type === 'number'}
	<span>
		{value}{#if hints.unit && def.type === 'number'}&nbsp;<span
				class="text-xs text-muted-foreground">{hints.unit}</span
			>{/if}
	</span>
{:else if def.type === 'longtext'}
	<p class="whitespace-pre-wrap">{value}</p>
{:else if def.type === 'boolean'}
	<span>{value ? 'Yes' : 'No'}</span>
{:else if def.type === 'date'}
	<time>{fmtDate(String(value))}</time>
{:else if def.type === 'datetime'}
	<time>{fmtDateTime(String(value))}</time>
{:else if def.type === 'url'}
	<a class="underline" href={String(value)} target="_blank" rel="noopener">{value}</a>
{:else if def.type === 'select'}
	<Badge variant="secondary">{value}</Badge>
{:else if def.type === 'multiselect'}
	<span class="inline-flex flex-wrap gap-1">
		{#each value as string[] as v (v)}
			<Badge variant="secondary">{v}</Badge>
		{/each}
	</span>
{:else if def.type === 'rating'}
	<span class="inline-flex items-center gap-0.5">
		{#each Array.from({ length: maxRating }) as _unused, i (i)}
			<Star
				class={`size-4 ${i < Number(value) ? 'fill-primary text-primary' : 'text-muted-foreground/30'}`}
			/>
		{/each}
	</span>
{/if}
