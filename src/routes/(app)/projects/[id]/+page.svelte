<script lang="ts">
	// {@html} renders the project body — sanitized server-side via
	// `$lib/server/sanitize-html` on every write.
	/* eslint-disable svelte/no-at-html-tags */
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import { AttrsEditor } from '$lib/custom-attrs';
	import RichTextEditor from '$lib/components/RichTextEditor.svelte';
	import ColorPicker from '$lib/components/ColorPicker.svelte';
	import ColorDot from '$lib/components/ColorDot.svelte';
	import BackButton from '$lib/components/BackButton.svelte';
	import { type PaletteToken } from '$lib/palette';
	import Save from '@lucide/svelte/icons/save';

	let { data, form } = $props();

	let editing = $state(false);
	// svelte-ignore state_referenced_locally
	let name = $state(data.project.name);
	// svelte-ignore state_referenced_locally
	let description = $state(data.project.description ?? '');
	// svelte-ignore state_referenced_locally
	let status = $state(data.project.status);
	// svelte-ignore state_referenced_locally
	let color = $state<PaletteToken | null>((data.project.color as PaletteToken | null) ?? null);
	// svelte-ignore state_referenced_locally
	let body = $state(data.project.body_html ?? '');
	// svelte-ignore state_referenced_locally
	let values = $state<Record<string, unknown>>({ ...(data.project.custom as object) });

	let submitting = $state(false);

	const fieldErrors = $derived(
		(form && 'fieldErrors' in form ? (form.fieldErrors as Record<string, string>) : {}) ?? {}
	);

	const STATUSES = ['active', 'done', 'archived'] as const;
</script>

<section class="space-y-6">
	<div class="flex items-center justify-between gap-2">
		<div class="flex items-center gap-2">
			<BackButton href="/projects" />
			<span class="text-xs tracking-widest text-muted-foreground uppercase">Projects</span>
		</div>
		{#if data.canEdit}
			<form
				method="POST"
				action="?/delete"
				use:enhance={({ cancel }) => {
					if (!confirm('Delete project?')) cancel();
					return async ({ update }) => await update();
				}}
			>
				<Button type="submit" variant="ghost" size="sm">Delete</Button>
			</form>
		{/if}
	</div>

	<form
		method="POST"
		action="?/update"
		use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				await update();
				submitting = false;
				editing = false;
			};
		}}
		class="space-y-5"
	>
		<header class="space-y-3">
			{#if editing}
				<div class="grid gap-3 sm:grid-cols-[2fr_auto] sm:items-end">
					<div class="space-y-1.5">
						<Label class="text-xs">Name</Label>
						<Input name="name" bind:value={name} required class="text-lg font-semibold" />
					</div>
					<div class="space-y-1.5">
						<Label class="text-xs">Status</Label>
						<select
							name="status"
							bind:value={status}
							class="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
						>
							{#each STATUSES as s (s)}
								<option value={s}>{s}</option>
							{/each}
						</select>
					</div>
				</div>
				<div class="space-y-1.5">
					<Label class="text-xs">Description</Label>
					<Textarea name="description" rows={2} bind:value={description} />
				</div>
				<div class="space-y-1.5">
					<Label class="text-xs">Color</Label>
					<ColorPicker bind:value={color} name="color" label="Project color" />
				</div>
			{:else}
				<div class="flex items-center justify-between gap-3">
					<div class="min-w-0 space-y-1">
						<h1 class="flex min-w-0 items-center gap-2 text-2xl font-semibold tracking-tight">
							<ColorDot token={data.project.color} size="md" />
							<span class="truncate">{data.project.name}</span>
							<Badge variant="secondary" class="ml-1 capitalize">{data.project.status}</Badge>
						</h1>
						{#if data.project.description}
							<p class="text-sm text-muted-foreground">{data.project.description}</p>
						{/if}
					</div>
					{#if data.canEdit}
						<Button size="sm" variant="outline" onclick={() => (editing = true)}>Edit</Button>
					{/if}
				</div>
			{/if}
		</header>

		<div class="space-y-1.5">
			{#if editing}
				<Label class="text-xs">Notes</Label>
				<RichTextEditor
					bind:value={body}
					name="body_html"
					placeholder="What's the plan, what's blocking, what's next…"
					minHeight="20rem"
				/>
			{:else if body}
				<div
					class="prose prose-sm max-w-none rounded-lg border bg-card px-4 py-3 dark:prose-invert"
				>
					{@html body}
				</div>
			{:else}
				<button
					type="button"
					onclick={() => (editing = true)}
					class="block w-full rounded-lg border border-dashed bg-card px-4 py-12 text-center text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
				>
					Click to add notes…
				</button>
			{/if}
		</div>

		{#if editing}
			<AttrsEditor defs={data.defs} bind:values errors={fieldErrors} />

			{#if form?.error}
				<p class="text-sm text-destructive">{form.error}</p>
			{/if}

			<div class="flex items-center gap-2">
				<Button type="submit" disabled={submitting}>
					<Save class="size-4" />
					{submitting ? 'Saving…' : 'Save'}
				</Button>
				<Button type="button" variant="ghost" onclick={() => (editing = false)}>Cancel</Button>
			</div>
		{/if}
	</form>

	{#if data.subprojects.length > 0}
		<section class="space-y-3">
			<h2 class="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
				Sub-projects · {data.subprojects.length}
			</h2>
			<ul class="divide-y divide-border rounded-md border">
				{#each data.subprojects as p (p.id)}
					<li>
						<a
							href={`/projects/${p.id}`}
							class="flex items-center gap-3 p-3 text-sm transition-colors hover:bg-muted/30"
						>
							<ColorDot token={p.color} />
							<span class="flex-1">{p.name}</span>
							<Badge variant="secondary" class="text-[10px] capitalize">{p.status}</Badge>
						</a>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	{#if data.tasks.length > 0}
		<section class="space-y-3">
			<h2 class="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
				Linked tasks · {data.tasks.length}
			</h2>
			<ul class="divide-y divide-border rounded-md border">
				{#each data.tasks as t (t.id)}
					<li>
						<a
							href={`/tasks/${t.id}`}
							class="flex items-center gap-3 p-3 text-sm transition-colors hover:bg-muted/30"
						>
							<span class="flex-1">{t.title}</span>
							<Badge variant="outline" class="text-[10px] capitalize">{t.status}</Badge>
							{#if t.due_date}
								<Badge variant="secondary" class="text-[10px]">{t.due_date}</Badge>
							{/if}
						</a>
					</li>
				{/each}
			</ul>
		</section>
	{/if}
</section>
