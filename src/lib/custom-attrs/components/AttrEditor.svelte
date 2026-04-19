<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import Star from '@lucide/svelte/icons/star';
	import type { CustomAttrDef, UiHints } from '../types';

	let {
		def,
		value = $bindable()
	}: {
		def: CustomAttrDef;
		value: unknown;
	} = $props();

	const hints = $derived((def.ui_hints ?? {}) as UiHints);
	const name = $derived(`custom.${def.key}`);

	const maxRating = $derived(hints.max ?? 5);
</script>

<div class="space-y-2">
	<Label for={name}>
		{def.label}
		{#if def.required}<span class="text-destructive">*</span>{/if}
	</Label>

	{#if def.type === 'text' || def.type === 'url'}
		<Input
			id={name}
			{name}
			type={def.type === 'url' ? 'url' : 'text'}
			required={def.required}
			placeholder={hints.placeholder ?? ''}
			bind:value={value as string}
		/>
	{:else if def.type === 'longtext'}
		<Textarea
			id={name}
			{name}
			required={def.required}
			rows={4}
			placeholder={hints.placeholder ?? ''}
			bind:value={value as string}
		/>
	{:else if def.type === 'number'}
		<div class="flex items-center gap-2">
			<Input
				id={name}
				{name}
				type="number"
				required={def.required}
				min={hints.min}
				max={hints.max}
				step={hints.step ?? 'any'}
				bind:value={value as number}
			/>
			{#if hints.unit}<span class="text-sm text-muted-foreground">{hints.unit}</span>{/if}
		</div>
	{:else if def.type === 'boolean'}
		{@const current = value === true || value === 'on'}
		<input type="hidden" {name} value={current ? 'on' : ''} />
		<Switch id={name} checked={current} onCheckedChange={(c: boolean) => (value = c)} />
	{:else if def.type === 'date'}
		<Input id={name} {name} type="date" required={def.required} bind:value={value as string} />
	{:else if def.type === 'datetime'}
		<Input
			id={name}
			{name}
			type="datetime-local"
			required={def.required}
			bind:value={value as string}
		/>
	{:else if def.type === 'select'}
		<select
			id={name}
			{name}
			required={def.required}
			bind:value={value as string}
			class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
		>
			<option value="">—</option>
			{#each hints.options ?? [] as opt (opt)}
				<option value={opt}>{opt}</option>
			{/each}
		</select>
	{:else if def.type === 'multiselect'}
		{@const arr = (Array.isArray(value) ? value : []) as string[]}
		<div class="flex flex-wrap gap-3 text-sm">
			{#each hints.options ?? [] as opt (opt)}
				<label class="flex items-center gap-2">
					<input
						type="checkbox"
						{name}
						value={opt}
						checked={arr.includes(opt)}
						class="size-4 accent-foreground"
					/>
					<span>{opt}</span>
				</label>
			{/each}
		</div>
	{:else if def.type === 'rating'}
		{@const rating = Number(value) || 0}
		<div class="flex items-center gap-1">
			<input type="hidden" {name} value={rating || ''} />
			{#each Array.from({ length: maxRating }) as _unused, i (i)}
				<button
					type="button"
					onclick={() => (value = i + 1 === rating ? 0 : i + 1)}
					class="p-0.5"
					aria-label={`Set rating to ${i + 1}`}
				>
					<Star
						class={`size-5 ${i < rating ? 'fill-primary text-primary' : 'text-muted-foreground'}`}
					/>
				</button>
			{/each}
			{#if rating > 0}
				<button
					type="button"
					onclick={() => (value = 0)}
					class="ml-1 text-xs text-muted-foreground hover:underline"
				>
					clear
				</button>
			{/if}
		</div>
	{/if}
</div>
