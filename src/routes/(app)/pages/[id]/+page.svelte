<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import Bold from '@lucide/svelte/icons/bold';
	import Italic from '@lucide/svelte/icons/italic';
	import Underline from '@lucide/svelte/icons/underline';
	import Heading2 from '@lucide/svelte/icons/heading-2';
	import Heading3 from '@lucide/svelte/icons/heading-3';
	import List from '@lucide/svelte/icons/list';
	import ListOrdered from '@lucide/svelte/icons/list-ordered';
	import LinkIcon from '@lucide/svelte/icons/link';
	import Quote from '@lucide/svelte/icons/quote';
	import Eraser from '@lucide/svelte/icons/eraser';

	let { data, form } = $props();

	let editingMeta = $state(false);
	let editor = $state<HTMLDivElement | null>(null);
	// svelte-ignore state_referenced_locally
	let bodyHtml = $state(data.page.body_html);
	let dirty = $state(false);
	let saving = $state(false);

	// Re-seed the editor whenever the loaded page changes (e.g. nav between
	// pages, or after a rename round-trip). Don't blow away local edits.
	$effect(() => {
		if (!editor) return;
		if (dirty) return;
		const incoming = data.page.body_html ?? '';
		if (editor.innerHTML !== incoming) {
			editor.innerHTML = incoming;
			bodyHtml = incoming;
		}
	});

	function exec(command: string, value?: string) {
		// execCommand is officially deprecated but every browser still ships it
		// and it remains the simplest path to "basic rich text" without dragging
		// in a 50 KB editor library. Swap for a real editor (Tiptap etc.) if we
		// outgrow this.
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		document.execCommand(command, false, value);
		editor?.focus();
		onInput();
	}

	function onInput() {
		if (!editor) return;
		bodyHtml = editor.innerHTML;
		dirty = true;
	}

	function promptLink() {
		const url = window.prompt('Link URL');
		if (!url) return;
		exec('createLink', url);
	}

	function clearFormatting() {
		exec('removeFormat');
		exec('formatBlock', 'p');
	}

	// Cmd/Ctrl+S → save without leaving the page.
	function onKeydown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
			e.preventDefault();
			(document.getElementById('save-body-form') as HTMLFormElement | null)?.requestSubmit();
		}
	}

	type ToolbarBtn = {
		label: string;
		icon: typeof Bold;
		run: () => void;
	};
	const tools: ToolbarBtn[] = [
		{ label: 'Bold (⌘B)', icon: Bold, run: () => exec('bold') },
		{ label: 'Italic (⌘I)', icon: Italic, run: () => exec('italic') },
		{ label: 'Underline (⌘U)', icon: Underline, run: () => exec('underline') },
		{ label: 'Heading 2', icon: Heading2, run: () => exec('formatBlock', 'h2') },
		{ label: 'Heading 3', icon: Heading3, run: () => exec('formatBlock', 'h3') },
		{ label: 'Bulleted list', icon: List, run: () => exec('insertUnorderedList') },
		{ label: 'Numbered list', icon: ListOrdered, run: () => exec('insertOrderedList') },
		{ label: 'Quote', icon: Quote, run: () => exec('formatBlock', 'blockquote') },
		{ label: 'Link', icon: LinkIcon, run: promptLink },
		{ label: 'Clear formatting', icon: Eraser, run: clearFormatting }
	];
</script>

<svelte:document onkeydown={onKeydown} />

<header class="flex items-start justify-between">
	<div class="flex min-w-0 items-center gap-3">
		<span class="text-3xl leading-none">{data.page.icon ?? '📄'}</span>
		<div class="min-w-0">
			<h1 class="truncate text-2xl font-semibold tracking-tight">{data.page.title}</h1>
			<p class="text-xs text-muted-foreground">
				Last updated {new Date(data.page.updated_at).toLocaleString()}
			</p>
		</div>
	</div>
	<div class="flex shrink-0 gap-2">
		{#if data.canEdit}
			<Button size="sm" variant="outline" onclick={() => (editingMeta = !editingMeta)}>
				{editingMeta ? 'Close' : 'Rename'}
			</Button>
			<form
				method="POST"
				action="?/deletePage"
				use:enhance={({ cancel }) => {
					if (!confirm('Archive this page?')) cancel();
					return async ({ update }) => await update();
				}}
			>
				<Button type="submit" variant="ghost" size="sm">Archive</Button>
			</form>
		{/if}
		<Button variant="ghost" size="sm" href="/pages">Back</Button>
	</div>
</header>

{#if editingMeta}
	<form
		method="POST"
		action="?/rename"
		use:enhance={() =>
			async ({ update }) => {
				await update();
				editingMeta = false;
			}}
		class="grid gap-3 rounded-md border p-4 sm:grid-cols-[auto_1fr_1fr_auto] sm:items-end"
	>
		<div class="space-y-1">
			<Label>Icon</Label>
			<Input name="icon" value={data.page.icon ?? ''} maxlength={4} class="w-20" />
		</div>
		<div class="space-y-1">
			<Label>Title</Label>
			<Input name="title" value={data.page.title} required />
		</div>
		<div class="space-y-1">
			<Label>Parent</Label>
			<select
				name="parent_id"
				class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
			>
				<option value="">— top level —</option>
				{#each data.allPages.filter((p) => p.id !== data.page.id) as p (p.id)}
					<option value={p.id} selected={data.page.parent_id === p.id}>{p.title}</option>
				{/each}
			</select>
		</div>
		<Button type="submit">Save</Button>
	</form>
{/if}

<form
	method="POST"
	action="?/saveBody"
	id="save-body-form"
	use:enhance={() => {
		saving = true;
		return async ({ update }) => {
			await update({ reset: false });
			dirty = false;
			saving = false;
		};
	}}
	class="space-y-2"
>
	<input type="hidden" name="body_html" value={bodyHtml} />

	{#if data.canEdit}
		<div
			class="sticky top-2 z-10 flex flex-wrap items-center gap-1 rounded-md border bg-background/95 p-1 shadow-sm backdrop-blur"
		>
			{#each tools as t (t.label)}
				{@const Icon = t.icon}
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					onclick={t.run}
					title={t.label}
					aria-label={t.label}
				>
					<Icon class="size-4" />
				</Button>
			{/each}
			<div class="ml-auto flex items-center gap-2 pr-1">
				{#if dirty}
					<span class="text-xs text-muted-foreground">Unsaved</span>
				{/if}
				<Button type="submit" size="sm" disabled={!dirty || saving}>
					{saving ? 'Saving…' : 'Save'}
				</Button>
			</div>
		</div>
	{/if}

	<div
		bind:this={editor}
		contenteditable={data.canEdit}
		spellcheck="true"
		oninput={onInput}
		role="textbox"
		aria-multiline="true"
		aria-label="Page body"
		class="prose prose-sm max-w-none rounded-md border p-4 focus:outline-none dark:prose-invert min-h-[24rem] [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_h2]:mt-4 [&_h3]:mt-3"
	></div>

	{#if form?.error}
		<p class="text-sm text-destructive">{form.error}</p>
	{/if}
</form>

{#if data.children.length > 0}
	<section class="space-y-2">
		<h2 class="text-sm font-semibold tracking-widest uppercase">Sub-pages</h2>
		<ul class="divide-y divide-border rounded-md border">
			{#each data.children as c (c.id)}
				<li>
					<a
						href={`/pages/${c.id}`}
						class="flex items-center gap-2 p-3 text-sm transition-colors hover:bg-muted/30"
					>
						<span class="w-5">{c.icon ?? '📄'}</span>
						<span class="flex-1">{c.title}</span>
					</a>
				</li>
			{/each}
		</ul>
	</section>
{/if}
