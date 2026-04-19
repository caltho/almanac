<script lang="ts">
	import { Input } from '$lib/components/ui/input';

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
	const level = $derived((content.level as number) ?? 2);

	function change(patch: Record<string, unknown>) {
		onchange?.({ text, level, ...patch });
	}
</script>

{#if edit}
	<div class="grid gap-2 sm:grid-cols-[auto_1fr]">
		<select
			value={level}
			onchange={(e) => change({ level: Number((e.currentTarget as HTMLSelectElement).value) })}
			class="flex h-9 rounded-md border border-input bg-background px-2 text-sm"
		>
			<option value={1}>H1</option>
			<option value={2}>H2</option>
			<option value={3}>H3</option>
		</select>
		<Input
			value={text}
			placeholder="Heading text"
			oninput={(e) => change({ text: (e.currentTarget as HTMLInputElement).value })}
		/>
	</div>
{:else if level === 1}
	<h1 class="text-2xl font-bold tracking-tight">{text || 'Untitled'}</h1>
{:else if level === 2}
	<h2 class="text-xl font-semibold tracking-tight">{text || 'Untitled'}</h2>
{:else}
	<h3 class="text-lg font-semibold tracking-tight">{text || 'Untitled'}</h3>
{/if}
