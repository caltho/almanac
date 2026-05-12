<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { AttrsRenderer } from '$lib/custom-attrs';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Pencil from '@lucide/svelte/icons/pencil';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import MoreVertical from '@lucide/svelte/icons/more-vertical';
	import Search from '@lucide/svelte/icons/search';
	import {
		useUserData,
		type Task,
		type TaskList,
		type TaskListItem
	} from '$lib/stores/userData.svelte';

	const userData = useUserData();
	const defs = $derived(userData.defsFor('tasks'));

	let newTitle = $state('');
	let showNew = $state(false);
	let error = $state<string | null>(null);

	const byStatus = $derived({
		todo: userData.tasks.filter((t) => t.status === 'todo'),
		doing: userData.tasks.filter((t) => t.status === 'doing'),
		done: userData.tasks.filter((t) => t.status === 'done'),
		cancelled: userData.tasks.filter((t) => t.status === 'cancelled')
	});

	const STATUS_LABELS = {
		todo: 'To do',
		doing: 'In progress',
		done: 'Done',
		cancelled: 'Cancelled'
	} as const;
	const STATUS_ORDER: ('todo' | 'doing' | 'done' | 'cancelled')[] = [
		'todo',
		'doing',
		'done',
		'cancelled'
	];

	function fmtDue(d: string | null) {
		if (!d) return '';
		const date = new Date(d + 'T00:00:00');
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const diff = Math.round((date.getTime() - today.getTime()) / 86400000);
		if (diff === 0) return 'Today';
		if (diff === 1) return 'Tomorrow';
		if (diff === -1) return 'Yesterday';
		if (diff < 0) return `${-diff}d overdue`;
		if (diff < 7) return `in ${diff}d`;
		const dd = String(date.getDate()).padStart(2, '0');
		const mm = String(date.getMonth() + 1).padStart(2, '0');
		return `${dd}/${mm}/${date.getFullYear()}`;
	}

	async function toggleDone(task: Task) {
		const prev = task.status;
		const next = task.status === 'done' ? 'todo' : 'done';
		userData.updateTask(task.id, { status: next });
		try {
			const res = await fetch('/tasks/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ op: 'status', id: task.id, status: next })
			});
			if (!res.ok) throw new Error(await res.text());
		} catch (e) {
			userData.updateTask(task.id, { status: prev });
			error = e instanceof Error ? e.message : 'Failed to update';
		}
	}

	async function deleteTask(task: Task) {
		const prev = task;
		userData.removeTask(task.id);
		try {
			const res = await fetch('/tasks/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ op: 'delete', id: task.id })
			});
			if (!res.ok) throw new Error(await res.text());
		} catch (e) {
			userData.addTask(prev);
			error = e instanceof Error ? e.message : 'Failed to delete';
		}
	}

	async function addTask(e: SubmitEvent) {
		e.preventDefault();
		const title = newTitle.trim();
		if (!title) return;
		newTitle = '';
		showNew = false;
		const tempId = `tmp-${Math.random().toString(36).slice(2)}`;
		const temp: Task = {
			id: tempId,
			owner_id: '',
			title,
			status: 'todo',
			due_date: null,
			priority: null,
			description: null,
			completed_at: null,
			custom: {},
			updated_at: new Date().toISOString()
		};
		userData.addTask(temp);
		try {
			const res = await fetch('/tasks/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ op: 'create', title })
			});
			if (!res.ok) throw new Error(await res.text());
			const body = (await res.json()) as { task: Task };
			userData.replaceTask(tempId, body.task);
		} catch (err) {
			userData.removeTask(tempId);
			error = err instanceof Error ? err.message : 'Failed to add';
		}
	}

	// --- Task lists ----------------------------------------------------------
	let newListName = $state('');
	let showNewList = $state(false);
	let newItemDraft = $state<Record<string, string>>({});
	let showAddItem = $state<Record<string, boolean>>({});
	let editingListId = $state<string | null>(null);
	let editListName = $state('');
	let listQuery = $state('');

	function itemsForList(listId: string): TaskListItem[] {
		return userData.taskListItems
			.filter((i) => i.list_id === listId)
			.slice()
			.sort((a, b) => {
				if (a.checked !== b.checked) return a.checked ? 1 : -1;
				return a.order_index - b.order_index;
			});
	}

	function listIsDone(listId: string): boolean {
		const items = userData.taskListItems.filter((i) => i.list_id === listId);
		if (items.length === 0) return false;
		return items.every((i) => i.checked);
	}

	const sortedLists = $derived(
		userData.taskLists
			.slice()
			.sort((a, b) => b.created_at.localeCompare(a.created_at))
	);

	const activeLists = $derived(
		sortedLists.filter((l) => !listIsDone(l.id) && matchesQuery(l))
	);
	const doneLists = $derived(
		sortedLists.filter((l) => listIsDone(l.id) && matchesQuery(l))
	);

	function matchesQuery(l: TaskList): boolean {
		const q = listQuery.trim().toLowerCase();
		if (!q) return true;
		if (l.name.toLowerCase().includes(q)) return true;
		// Match against item titles too — useful when you remember an item
		// but not the list name.
		return userData.taskListItems
			.filter((i) => i.list_id === l.id)
			.some((i) => i.title.toLowerCase().includes(q));
	}

	async function createList(e: SubmitEvent) {
		e.preventDefault();
		const name = newListName.trim();
		if (!name) return;
		newListName = '';
		showNewList = false;
		try {
			const res = await fetch('/tasks/lists/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ op: 'createList', name })
			});
			if (!res.ok) throw new Error();
			const body = (await res.json()) as { list: TaskList };
			userData.addTaskList(body.list);
			// Auto-open the add-item input so the user can start typing items
			// straight away.
			showAddItem[body.list.id] = true;
		} catch {
			newListName = name;
			showNewList = true;
		}
	}

	async function deleteList(l: TaskList) {
		if (!confirm(`Delete list "${l.name}"? This cannot be undone.`)) return;
		const prevItems = userData.taskListItems.filter((i) => i.list_id === l.id);
		userData.removeTaskList(l.id);
		try {
			const res = await fetch('/tasks/lists/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ op: 'deleteList', id: l.id })
			});
			if (!res.ok) throw new Error();
		} catch {
			userData.addTaskList(l);
			for (const i of prevItems) userData.addTaskListItem(i);
		}
	}

	function startRenameList(l: TaskList) {
		editingListId = l.id;
		editListName = l.name;
	}

	async function saveRenameList(l: TaskList) {
		const name = editListName.trim();
		if (!name || name === l.name) {
			editingListId = null;
			return;
		}
		const prev = l.name;
		userData.updateTaskList(l.id, { name });
		editingListId = null;
		try {
			const res = await fetch('/tasks/lists/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ op: 'renameList', id: l.id, name })
			});
			if (!res.ok) throw new Error();
		} catch {
			userData.updateTaskList(l.id, { name: prev });
		}
	}

	async function reopenList(l: TaskList) {
		const prev = userData.taskListItems.filter((i) => i.list_id === l.id);
		for (const i of prev) {
			if (i.checked) userData.updateTaskListItem(i.id, { checked: false });
		}
		try {
			const res = await fetch('/tasks/lists/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ op: 'reopenList', id: l.id })
			});
			if (!res.ok) throw new Error();
		} catch {
			for (const i of prev) {
				userData.updateTaskListItem(i.id, { checked: i.checked });
			}
		}
	}

	async function addItem(l: TaskList, e: SubmitEvent) {
		e.preventDefault();
		const title = (newItemDraft[l.id] ?? '').trim();
		if (!title) return;
		newItemDraft[l.id] = '';
		const tempId = `tmp-${Math.random().toString(36).slice(2)}`;
		const lastOrder = Math.max(
			-1,
			...userData.taskListItems.filter((i) => i.list_id === l.id).map((i) => i.order_index)
		);
		const temp: TaskListItem = {
			id: tempId,
			list_id: l.id,
			title,
			checked: false,
			order_index: lastOrder + 1
		};
		userData.addTaskListItem(temp);
		try {
			const res = await fetch('/tasks/lists/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ op: 'addItem', list_id: l.id, title })
			});
			if (!res.ok) throw new Error();
			const body = (await res.json()) as { item: TaskListItem };
			userData.removeTaskListItem(tempId);
			userData.addTaskListItem(body.item);
		} catch {
			userData.removeTaskListItem(tempId);
			newItemDraft[l.id] = title;
		}
	}

	async function toggleItem(item: TaskListItem) {
		const next = !item.checked;
		userData.updateTaskListItem(item.id, { checked: next });
		try {
			const res = await fetch('/tasks/lists/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ op: 'toggleItem', id: item.id, checked: next })
			});
			if (!res.ok) throw new Error();
		} catch {
			userData.updateTaskListItem(item.id, { checked: !next });
		}
	}

	async function deleteItem(item: TaskListItem) {
		userData.removeTaskListItem(item.id);
		try {
			const res = await fetch('/tasks/lists/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ op: 'deleteItem', id: item.id })
			});
			if (!res.ok) throw new Error();
		} catch {
			userData.addTaskListItem(item);
		}
	}
</script>

<section class="space-y-6">
	<header class="flex items-start justify-between gap-4">
		<div class="space-y-1">
			<h1 class="text-2xl font-semibold tracking-tight">Task lists</h1>
			<p class="text-sm text-muted-foreground">
				Standalone tasks at the top. One-shot grouped lists below.
			</p>
		</div>
		<Button size="sm" onclick={() => (showNew = !showNew)}>
			<Plus class="size-4" />
			<span>{showNew ? 'Close' : 'New task'}</span>
		</Button>
	</header>

	{#if showNew}
		<form onsubmit={addTask} class="flex gap-2">
			<Input
				bind:value={newTitle}
				placeholder="Add a task and press enter…"
				required
				class="flex-1"
				autofocus
			/>
			<Button type="submit">Add</Button>
		</form>
	{/if}
	{#if error}
		<p class="text-sm text-destructive">{error}</p>
	{/if}

	<!-- Main tasks (flat, status-grouped) -->
	<div class="space-y-6">
		{#each STATUS_ORDER as status (status)}
			{@const list = byStatus[status]}
			{#if list.length > 0}
				<section>
					<h2 class="mb-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
						{STATUS_LABELS[status]} · {list.length}
					</h2>
					<ul class="divide-y divide-border rounded-md border">
						{#each list as t (t.id)}
							<li class="flex items-start gap-3 p-3 text-sm">
								<button
									type="button"
									onclick={() => toggleDone(t)}
									class={`mt-0.5 grid size-5 shrink-0 place-items-center rounded border transition-colors ${
										t.status === 'done'
											? 'border-primary bg-primary text-primary-foreground'
											: 'border-border hover:border-foreground'
									}`}
									aria-label={t.status === 'done' ? 'Mark todo' : 'Mark done'}
								>
									{#if t.status === 'done'}✓{/if}
								</button>

								<a href={`/tasks/${t.id}`} class="min-w-0 flex-1 space-y-1">
									<div
										class={`font-medium ${t.status === 'done' ? 'line-through opacity-60' : ''}`}
									>
										{t.title}
									</div>
									<div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
										{#if t.due_date}
											<Badge variant="secondary" class="text-[10px]">{fmtDue(t.due_date)}</Badge>
										{/if}
										{#if typeof t.priority === 'number'}
											<Badge variant="outline" class="text-[10px]">P{t.priority}</Badge>
										{/if}
									</div>
									<AttrsRenderer {defs} values={t.custom as Record<string, unknown>} />
								</a>

								<Button
									type="button"
									variant="ghost"
									size="icon-sm"
									aria-label="Delete"
									onclick={() => deleteTask(t)}
								>
									<Trash2 class="size-4" />
								</Button>
							</li>
						{/each}
					</ul>
				</section>
			{/if}
		{/each}
		{#if userData.tasks.length === 0}
			<p class="text-sm text-muted-foreground">No tasks yet.</p>
		{/if}
	</div>

	<!-- Divider -->
	<hr class="border-border/40" />

	<!-- Task lists (ephemeral one-shots) -->
	<header class="flex items-end justify-between gap-3">
		<div class="space-y-0.5">
			<h2 class="text-base font-semibold tracking-tight">Lists</h2>
			<p class="text-xs text-muted-foreground">
				One-shot groups — tick everything off and they drop to the bottom.
			</p>
		</div>
		<div class="flex items-center gap-2">
			<div class="relative">
				<Search
					class="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
				/>
				<Input
					bind:value={listQuery}
					placeholder="Search lists…"
					class="h-8 w-40 pl-7 sm:w-56"
				/>
			</div>
			<Button size="sm" onclick={() => (showNewList = !showNewList)}>
				<Plus class="size-4" />
				<span>{showNewList ? 'Close' : 'New list'}</span>
			</Button>
		</div>
	</header>

	{#if showNewList}
		<form onsubmit={createList} class="flex gap-2">
			<Input
				bind:value={newListName}
				placeholder="What's this list for? (e.g. Trip to Melbourne)"
				required
				class="flex-1"
				autofocus
			/>
			<Button type="submit" disabled={!newListName.trim()}>Add</Button>
		</form>
	{/if}

	{#if activeLists.length === 0 && doneLists.length === 0 && !listQuery.trim()}
		<p class="text-sm italic text-muted-foreground">
			No lists yet — create one when you need a one-shot checklist for an event, trip, or
			project.
		</p>
	{:else if activeLists.length === 0 && doneLists.length === 0}
		<p class="text-sm italic text-muted-foreground">No matches for "{listQuery}".</p>
	{/if}

	{#if activeLists.length > 0}
		<div class="grid gap-3 md:grid-cols-2">
			{#each activeLists as l (l.id)}
				{@render listCard(l, false)}
			{/each}
		</div>
	{/if}

	{#if doneLists.length > 0}
		<section class="space-y-2">
			<h3 class="text-[10px] font-semibold tracking-widest text-muted-foreground/70 uppercase">
				Done · {doneLists.length}
			</h3>
			<div class="grid gap-3 opacity-55 md:grid-cols-2">
				{#each doneLists as l (l.id)}
					{@render listCard(l, true)}
				{/each}
			</div>
		</section>
	{/if}
</section>

{#snippet listCard(l: TaskList, faded: boolean)}
	{@const items = itemsForList(l.id)}
	{@const checkedCount = items.filter((i) => i.checked).length}
	{@const isEditing = editingListId === l.id}
	<section class={`rounded-lg border bg-card ${faded ? 'border-dashed' : ''}`}>
		<header class="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
			<div class="min-w-0 flex-1">
				{#if isEditing}
					<form
						onsubmit={(e) => {
							e.preventDefault();
							saveRenameList(l);
						}}
						class="flex gap-1.5"
					>
						<Input
							bind:value={editListName}
							class="h-8"
							autofocus
							onblur={() => saveRenameList(l)}
						/>
					</form>
				{:else}
					<h3 class="truncate font-semibold tracking-tight">{l.name}</h3>
					<p class="text-xs text-muted-foreground tabular-nums">
						{items.length} item{items.length === 1 ? '' : 's'}{#if checkedCount > 0 && !faded}
							· {checkedCount} done{/if}{#if faded} · all done{/if}
					</p>
				{/if}
			</div>
			<div class="flex items-center gap-1">
				{#if !faded}
					<Button
						type="button"
						size="sm"
						variant="ghost"
						onclick={() => (showAddItem[l.id] = !showAddItem[l.id])}
					>
						<Plus class="size-4" />
						<span>{showAddItem[l.id] ? 'Close' : 'Add'}</span>
					</Button>
				{/if}
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<Button
								{...props}
								type="button"
								variant="ghost"
								size="icon-sm"
								aria-label="List actions"
							>
								<MoreVertical class="size-4" />
							</Button>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="end" class="w-44">
						<DropdownMenu.Item onclick={() => startRenameList(l)}>
							<Pencil class="size-4" />
							<span>Rename</span>
						</DropdownMenu.Item>
						{#if faded}
							<DropdownMenu.Item onclick={() => reopenList(l)}>
								<RotateCcw class="size-4" />
								<span>Reopen</span>
							</DropdownMenu.Item>
						{/if}
						<DropdownMenu.Separator />
						<DropdownMenu.Item variant="destructive" onclick={() => deleteList(l)}>
							<Trash2 class="size-4" />
							<span>Delete</span>
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</div>
		</header>

		{#if items.length === 0}
			<p class="px-4 py-3 text-xs italic text-muted-foreground">No items yet.</p>
		{:else}
			<ul class="divide-y divide-border">
				{#each items as item (item.id)}
					<li class="flex items-stretch text-sm">
						<button
							type="button"
							onclick={() => toggleItem(item)}
							class="flex flex-1 items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-muted/40"
						>
							<span
								class={`grid size-5 shrink-0 place-items-center rounded border transition-colors ${
									item.checked
										? 'border-primary bg-primary text-primary-foreground'
										: 'border-border'
								}`}
								aria-hidden="true"
							>
								{#if item.checked}✓{/if}
							</span>
							<span class={item.checked ? 'text-muted-foreground line-through' : ''}>
								{item.title}
							</span>
						</button>
						{#if !faded}
							<Button
								type="button"
								variant="ghost"
								size="icon-sm"
								class="my-auto mr-2 opacity-60 hover:opacity-100"
								aria-label="Delete item"
								onclick={() => deleteItem(item)}
							>
								<Trash2 class="size-3.5" />
							</Button>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}

		{#if !faded && showAddItem[l.id]}
			<form
				onsubmit={(e) => addItem(l, e)}
				class="flex gap-2 border-t border-border/60 px-4 py-3"
			>
				<Input
					bind:value={newItemDraft[l.id]}
					placeholder="Add an item…"
					class="h-8 flex-1"
					autofocus
				/>
				<Button type="submit" size="sm" disabled={!(newItemDraft[l.id] ?? '').trim()}>
					Add
				</Button>
			</form>
		{/if}
	</section>
{/snippet}
