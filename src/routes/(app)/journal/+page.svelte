<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import { AttrsRenderer } from '$lib/custom-attrs';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import Plus from '@lucide/svelte/icons/plus';
	import MoreVertical from '@lucide/svelte/icons/more-vertical';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Palette from '@lucide/svelte/icons/palette';
	import Archive from '@lucide/svelte/icons/archive';
	import ArchiveRestore from '@lucide/svelte/icons/archive-restore';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import ColorPicker from '$lib/components/ColorPicker.svelte';
	import { paletteHex, type PaletteToken } from '$lib/palette';
	import { useUserData, type QuickNote } from '$lib/stores/userData.svelte';

	const userData = useUserData();
	const defs = $derived(userData.defsFor('journal_entries'));

	let showNewNote = $state(false);
	let newTitle = $state('');
	let newBody = $state('');
	let editingId = $state<string | null>(null);
	let editTitle = $state('');
	let editBody = $state('');
	let colorPickerId = $state<string | null>(null);

	const activeNotes = $derived(userData.quickNotes.filter((n) => !n.internalised));
	const internalisedNotes = $derived(userData.quickNotes.filter((n) => n.internalised));

	function fmt(date: string) {
		return new Date(date + 'T00:00:00').toLocaleDateString(undefined, {
			weekday: 'short',
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}

	async function createNote(e: SubmitEvent) {
		e.preventDefault();
		const title = newTitle.trim();
		if (!title) return;
		const bodyText = newBody.trim();
		newTitle = '';
		newBody = '';
		showNewNote = false;
		try {
			const res = await fetch('/journal/notes/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ op: 'create', title, body: bodyText })
			});
			if (!res.ok) throw new Error();
			const body = (await res.json()) as { note: QuickNote };
			userData.addQuickNote(body.note);
		} catch {
			newTitle = title;
			newBody = bodyText;
			showNewNote = true;
		}
	}

	function startEdit(n: QuickNote) {
		editingId = n.id;
		editTitle = n.title;
		editBody = n.body;
	}

	async function saveEdit(n: QuickNote) {
		const title = editTitle.trim();
		const body = editBody.trim();
		if (!title) return;
		editingId = null;
		const prev = { title: n.title, body: n.body };
		userData.updateQuickNote(n.id, { title, body });
		try {
			const res = await fetch('/journal/notes/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ op: 'update', id: n.id, title, body })
			});
			if (!res.ok) throw new Error();
		} catch {
			userData.updateQuickNote(n.id, prev);
		}
	}

	async function setColor(n: QuickNote, color: PaletteToken | null) {
		const prev = n.color;
		userData.updateQuickNote(n.id, { color });
		colorPickerId = null;
		try {
			const res = await fetch('/journal/notes/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ op: 'setColor', id: n.id, color })
			});
			if (!res.ok) throw new Error();
		} catch {
			userData.updateQuickNote(n.id, { color: prev });
		}
	}

	async function setInternalised(n: QuickNote, internalised: boolean) {
		userData.updateQuickNote(n.id, { internalised });
		try {
			const res = await fetch('/journal/notes/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ op: 'setInternalised', id: n.id, internalised })
			});
			if (!res.ok) throw new Error();
		} catch {
			userData.updateQuickNote(n.id, { internalised: !internalised });
		}
	}

	async function deleteNote(n: QuickNote) {
		if (!confirm(`Delete "${n.title}"?`)) return;
		userData.removeQuickNote(n.id);
		try {
			const res = await fetch('/journal/notes/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ op: 'delete', id: n.id })
			});
			if (!res.ok) throw new Error();
		} catch {
			userData.addQuickNote(n);
		}
	}
</script>

<section class="space-y-6">
	<header class="flex items-start justify-between gap-4">
		<div class="space-y-1">
			<h1 class="text-2xl font-semibold tracking-tight">Journal</h1>
			<p class="text-sm text-muted-foreground">Dated entries with mood + your own fields.</p>
		</div>
		<div class="flex items-center gap-2">
			<Button size="sm" href="/journal/new">
				<Plus class="size-4" />
				<span>New entry</span>
			</Button>
		</div>
	</header>

	<!-- Quick notes — short title-and-body scratchpad -->
	<section class="space-y-2">
		<div class="flex items-center justify-between">
			<h2 class="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
				Quick notes
			</h2>
			<Button
				size="sm"
				variant="ghost"
				onclick={() => (showNewNote = !showNewNote)}
				class="gap-1.5"
			>
				<Plus class="size-3.5" />
				<span>{showNewNote ? 'Close' : 'Add'}</span>
			</Button>
		</div>

		{#if showNewNote}
			<form
				onsubmit={createNote}
				class="space-y-2 rounded-lg border bg-muted/20 p-3"
			>
				<Input
					bind:value={newTitle}
					placeholder="Title (e.g. TV Lift link)"
					required
					autofocus
					class="h-8"
				/>
				<Input
					bind:value={newBody}
					placeholder="Body (e.g. http://192.168.50.48/)"
					class="h-8"
				/>
				<div class="flex justify-end">
					<Button type="submit" size="sm" disabled={!newTitle.trim()}>Add note</Button>
				</div>
			</form>
		{/if}

		{#if activeNotes.length > 0}
			<ul class="space-y-1">
				{#each activeNotes as n (n.id)}
					{@render noteRow(n, false)}
				{/each}
			</ul>
		{:else if !showNewNote}
			<p class="text-xs text-muted-foreground italic">No quick notes — add a link, password hint, or anything you want pinned.</p>
		{/if}

		{#if internalisedNotes.length > 0}
			<div class="pt-4">
				<h3 class="mb-1 text-[10px] font-semibold tracking-widest text-muted-foreground/70 uppercase">
					Internalised · {internalisedNotes.length}
				</h3>
				<ul class="space-y-1 opacity-50">
					{#each internalisedNotes as n (n.id)}
						{@render noteRow(n, true)}
					{/each}
				</ul>
			</div>
		{/if}
	</section>

	<!-- Journal entries -->
	{#if userData.journalEntries.length === 0}
		<div class="rounded-md border p-8 text-center">
			<p class="text-sm text-muted-foreground">No entries yet.</p>
			<Button class="mt-4" href="/journal/new">Write the first one</Button>
		</div>
	{:else}
		<ul class="divide-y divide-border rounded-md border">
			{#each userData.journalEntries as e (e.id)}
				<li class="p-4 hover:bg-muted/30">
					<a href={`/journal/${e.id}`} class="block space-y-2">
						<div class="flex flex-wrap items-center gap-2">
							<time class="text-xs tracking-widest text-muted-foreground uppercase"
								>{fmt(e.entry_date)}</time
							>
							{#if typeof e.mood === 'number'}
								<Badge variant="secondary" class="text-xs">Mood {e.mood}/10</Badge>
							{/if}
						</div>
						{#if e.title}
							<h3 class="text-lg font-semibold tracking-tight">{e.title}</h3>
						{/if}
						{#if e.body}
							<p class="line-clamp-2 text-sm text-muted-foreground">{e.body}</p>
						{/if}
						<AttrsRenderer {defs} values={e.custom as Record<string, unknown>} />
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</section>

{#snippet noteRow(n: QuickNote, faded: boolean)}
	{@const hex = paletteHex((n.color as PaletteToken | null) ?? null)}
	{@const isEditing = editingId === n.id}
	<li class="flex items-start gap-2 text-sm">
		<span
			class="mt-1.5 inline-block size-1.5 shrink-0 rounded-full"
			style={hex ? `background:${hex}` : 'background:currentColor'}
			aria-hidden="true"
		></span>

		{#if isEditing}
			<div class="flex-1 space-y-1.5">
				<Input bind:value={editTitle} placeholder="Title" class="h-8" autofocus />
				<Input bind:value={editBody} placeholder="Body" class="h-8" />
				<div class="flex gap-1.5">
					<Button size="sm" onclick={() => saveEdit(n)} disabled={!editTitle.trim()}>Save</Button>
					<Button size="sm" variant="ghost" onclick={() => (editingId = null)}>Cancel</Button>
				</div>
			</div>
		{:else}
			<div class="min-w-0 flex-1 leading-snug">
				<span class="font-bold">{n.title}</span>
				{#if n.body}
					<span class="text-muted-foreground"> – </span><span>{n.body}</span>
				{/if}
			</div>
		{/if}

		{#if !isEditing}
			<div class="relative shrink-0">
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<Button
								{...props}
								type="button"
								variant="ghost"
								size="icon-sm"
								aria-label="Note actions"
							>
								<MoreVertical class="size-4" />
							</Button>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="end" class="w-44">
						<DropdownMenu.Item onclick={() => startEdit(n)}>
							<Pencil class="size-4" />
							<span>Edit</span>
						</DropdownMenu.Item>
						<DropdownMenu.Item onclick={() => (colorPickerId = n.id)}>
							<Palette class="size-4" />
							<span>Color</span>
						</DropdownMenu.Item>
						<DropdownMenu.Item onclick={() => setInternalised(n, !faded)}>
							{#if faded}
								<ArchiveRestore class="size-4" />
								<span>Bring back</span>
							{:else}
								<Archive class="size-4" />
								<span>Internalise</span>
							{/if}
						</DropdownMenu.Item>
						<DropdownMenu.Separator />
						<DropdownMenu.Item variant="destructive" onclick={() => deleteNote(n)}>
							<Trash2 class="size-4" />
							<span>Delete</span>
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>

				{#if colorPickerId === n.id}
					<div
						class="absolute right-0 z-10 mt-1 rounded-lg border bg-popover p-2 shadow-md"
						role="dialog"
						aria-label="Pick color"
					>
						<ColorPicker
							value={(n.color as PaletteToken | null) ?? null}
							onchange={(c) => setColor(n, c)}
						/>
						<div class="mt-2 flex justify-end">
							<Button size="sm" variant="ghost" onclick={() => (colorPickerId = null)}
								>Done</Button
							>
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</li>
{/snippet}
