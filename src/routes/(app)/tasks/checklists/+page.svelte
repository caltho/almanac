<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Eraser from '@lucide/svelte/icons/eraser';
	import ListChecks from '@lucide/svelte/icons/list-checks';
	import Archive from '@lucide/svelte/icons/archive';
	import { useUserData, type Checklist, type ChecklistItem } from '$lib/stores/userData.svelte';

	const userData = useUserData();

	let newListName = $state('');
	let newItemDraft = $state<Record<string, string>>({});

	const checklistsSorted = $derived(
		userData.checklists.slice().sort((a, b) => a.name.localeCompare(b.name))
	);

	function itemsFor(listId: string): ChecklistItem[] {
		return userData.checklistItems
			.filter((i) => i.checklist_id === listId)
			.slice()
			.sort((a, b) => a.order_index - b.order_index);
	}

	async function createList(e: SubmitEvent) {
		e.preventDefault();
		const name = newListName.trim();
		if (!name) return;
		newListName = '';
		try {
			const res = await fetch('/tasks/checklists/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ op: 'createList', name })
			});
			if (!res.ok) throw new Error();
			const body = (await res.json()) as { list: Checklist };
			userData.addChecklist(body.list);
		} catch {
			newListName = name;
		}
	}

	async function archiveList(list: Checklist) {
		if (!confirm(`Archive "${list.name}"?`)) return;
		userData.removeChecklist(list.id);
		try {
			const res = await fetch('/tasks/checklists/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ op: 'archiveList', id: list.id })
			});
			if (!res.ok) throw new Error();
		} catch {
			userData.addChecklist(list);
		}
	}

	async function addItem(list: Checklist, e: SubmitEvent) {
		e.preventDefault();
		const title = (newItemDraft[list.id] ?? '').trim();
		if (!title) return;
		newItemDraft[list.id] = '';
		const tempId = `tmp-${Math.random().toString(36).slice(2)}`;
		const lastOrder = Math.max(
			-1,
			...userData.checklistItems.filter((i) => i.checklist_id === list.id).map((i) => i.order_index)
		);
		const temp: ChecklistItem = {
			id: tempId,
			checklist_id: list.id,
			title,
			checked: false,
			order_index: lastOrder + 1
		};
		userData.addChecklistItem(temp);
		try {
			const res = await fetch('/tasks/checklists/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ op: 'addItem', checklist_id: list.id, title })
			});
			if (!res.ok) throw new Error();
			const body = (await res.json()) as { item: ChecklistItem };
			userData.removeChecklistItem(tempId);
			userData.addChecklistItem(body.item);
		} catch {
			userData.removeChecklistItem(tempId);
			newItemDraft[list.id] = title;
		}
	}

	async function toggleItem(item: ChecklistItem) {
		const next = !item.checked;
		userData.updateChecklistItem(item.id, { checked: next });
		try {
			const res = await fetch('/tasks/checklists/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ op: 'toggleItem', id: item.id, checked: next })
			});
			if (!res.ok) throw new Error();
		} catch {
			userData.updateChecklistItem(item.id, { checked: !next });
		}
	}

	async function deleteItem(item: ChecklistItem) {
		userData.removeChecklistItem(item.id);
		try {
			const res = await fetch('/tasks/checklists/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ op: 'deleteItem', id: item.id })
			});
			if (!res.ok) throw new Error();
		} catch {
			userData.addChecklistItem(item);
		}
	}

	async function clearChecks(list: Checklist) {
		const before = userData.checklistItems.filter((i) => i.checklist_id === list.id && i.checked);
		userData.clearChecklistChecks(list.id);
		try {
			const res = await fetch('/tasks/checklists/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ op: 'clearChecks', checklist_id: list.id })
			});
			if (!res.ok) throw new Error();
		} catch {
			for (const item of before) {
				userData.updateChecklistItem(item.id, { checked: true });
			}
		}
	}
</script>

<header class="flex flex-wrap items-end justify-between gap-3">
	<div class="space-y-1">
		<h1 class="text-2xl font-semibold tracking-tight">Checklists</h1>
		<p class="text-sm text-muted-foreground">
			Lightweight lists. Tick off items, hit "Clear" when you're back home.
		</p>
	</div>
</header>

<form onsubmit={createList} class="flex gap-2">
	<Input
		bind:value={newListName}
		placeholder="New list name (e.g. Day pack, Gym bag…)"
		class="flex-1"
	/>
	<Button type="submit" disabled={!newListName.trim()}>
		<Plus class="size-4" />
		New list
	</Button>
</form>

{#if checklistsSorted.length === 0}
	<div class="rounded-lg border border-dashed p-12 text-center">
		<ListChecks class="mx-auto mb-3 size-10 text-muted-foreground/60" />
		<p class="text-sm text-muted-foreground">No checklists yet. Create one above.</p>
	</div>
{:else}
	<div class="grid gap-4 md:grid-cols-2">
		{#each checklistsSorted as list (list.id)}
			{@const items = itemsFor(list.id)}
			{@const checkedCount = items.filter((i) => i.checked).length}
			<section class="rounded-lg border bg-card">
				<header class="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
					<div class="min-w-0">
						<h2 class="truncate font-semibold tracking-tight">{list.name}</h2>
						<p class="text-xs text-muted-foreground">
							{items.length} item{items.length === 1 ? '' : 's'}
							{#if checkedCount > 0}
								· {checkedCount} checked{/if}
						</p>
					</div>
					<div class="flex items-center gap-1">
						<Button
							size="sm"
							variant="ghost"
							onclick={() => clearChecks(list)}
							disabled={checkedCount === 0}
							title="Uncheck everything"
						>
							<Eraser class="size-4" />
							Clear
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							aria-label="Archive list"
							onclick={() => archiveList(list)}
						>
							<Archive class="size-4" />
						</Button>
					</div>
				</header>

				<ul class="divide-y divide-border">
					{#each items as item (item.id)}
						<li class="flex items-center gap-3 px-4 py-2 text-sm">
							<button
								type="button"
								onclick={() => toggleItem(item)}
								class={`grid size-5 shrink-0 place-items-center rounded border transition-colors ${
									item.checked
										? 'border-primary bg-primary text-primary-foreground'
										: 'border-border hover:border-foreground'
								}`}
								aria-label={item.checked ? 'Uncheck' : 'Check'}
							>
								{#if item.checked}✓{/if}
							</button>
							<button
								type="button"
								onclick={() => toggleItem(item)}
								class={`flex-1 text-left ${item.checked ? 'text-muted-foreground line-through' : ''}`}
							>
								{item.title}
							</button>
							<Button
								type="button"
								variant="ghost"
								size="icon-sm"
								aria-label="Delete item"
								onclick={() => deleteItem(item)}
							>
								<Trash2 class="size-4" />
							</Button>
						</li>
					{/each}
				</ul>

				<form
					onsubmit={(e) => addItem(list, e)}
					class="flex gap-2 border-t border-border/60 px-4 py-3"
				>
					<Input bind:value={newItemDraft[list.id]} placeholder="Add an item…" class="h-8 flex-1" />
					<Button type="submit" size="sm" disabled={!(newItemDraft[list.id] ?? '').trim()}>
						Add
					</Button>
				</form>
			</section>
		{/each}
	</div>
{/if}
