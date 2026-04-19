<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';

	let {
		content,
		edit = false,
		onchange
	}: {
		content: Record<string, unknown>;
		edit?: boolean;
		onchange?: (content: unknown) => void;
	} = $props();

	const label = $derived((content.label as string) ?? '');
	const value = $derived(content.value ?? '');
	const unit = $derived((content.unit as string) ?? '');
	const loggedAt = $derived((content.logged_at as string) ?? '');

	function change(patch: Record<string, unknown>) {
		onchange?.({ label, value, unit, logged_at: loggedAt, ...patch });
	}
</script>

{#if edit}
	<div class="grid gap-2 sm:grid-cols-4">
		<div class="space-y-1 sm:col-span-2">
			<Label class="text-xs">Label</Label>
			<Input
				value={label}
				oninput={(e) => change({ label: (e.currentTarget as HTMLInputElement).value })}
			/>
		</div>
		<div class="space-y-1">
			<Label class="text-xs">Value</Label>
			<Input
				value={value as string}
				oninput={(e) => change({ value: (e.currentTarget as HTMLInputElement).value })}
			/>
		</div>
		<div class="space-y-1">
			<Label class="text-xs">Unit</Label>
			<Input
				value={unit}
				oninput={(e) => change({ unit: (e.currentTarget as HTMLInputElement).value })}
			/>
		</div>
		<div class="space-y-1 sm:col-span-4">
			<Label class="text-xs">Logged at</Label>
			<Input
				type="datetime-local"
				value={loggedAt.slice(0, 16)}
				oninput={(e) =>
					change({
						logged_at: (e.currentTarget as HTMLInputElement).value
							? new Date((e.currentTarget as HTMLInputElement).value).toISOString()
							: ''
					})}
			/>
		</div>
	</div>
{:else}
	<div class="flex items-baseline gap-3 rounded-md border bg-muted/40 p-3">
		<span class="text-xs tracking-widest text-muted-foreground uppercase">{label || 'value'}</span>
		<span class="text-lg font-semibold">
			{value}{#if unit}&nbsp;<span class="text-xs text-muted-foreground">{unit}</span>{/if}
		</span>
		{#if loggedAt}
			<span class="ml-auto text-xs text-muted-foreground"
				>{new Date(loggedAt).toLocaleString()}</span
			>
		{/if}
	</div>
{/if}
