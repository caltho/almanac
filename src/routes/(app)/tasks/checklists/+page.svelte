<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Eraser from '@lucide/svelte/icons/eraser';
	import ListChecks from '@lucide/svelte/icons/list-checks';
	import MoreVertical from '@lucide/svelte/icons/more-vertical';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Check from '@lucide/svelte/icons/check';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import { useUserData, type Checklist, type ChecklistItem } from '$lib/stores/userData.svelte';

	const userData = useUserData();

	let newListName = $state('');
	let showNewList = $state(false);
	let newItemDraft = $state<Record<string, string>>({});
	let editing = $state<Record<string, boolean>>({});
	let showAdd = $state<Record<string, boolean>>({});
	let celebrating = $state<Set<string>>(new Set());

	const checklistsSorted = $derived(
		userData.checklists.slice().sort((a, b) => a.name.localeCompare(b.name))
	);

	function itemsFor(listId: string): ChecklistItem[] {
		return userData.checklistItems
			.filter((i) => i.checklist_id === listId)
			.slice()
			.sort((a, b) => {
				if (a.checked !== b.checked) return a.checked ? 1 : -1;
				return a.order_index - b.order_index;
			});
	}

	async function createList(e: SubmitEvent) {
		e.preventDefault();
		const name = newListName.trim();
		if (!name) return;
		newListName = '';
		showNewList = false;
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

	async function deleteList(list: Checklist) {
		if (!confirm(`Delete "${list.name}"? This cannot be undone.`)) return;
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
			return;
		}

		// All-ticked celebration: only fires on the tick that completes the list.
		if (next) {
			const items = userData.checklistItems.filter((i) => i.checklist_id === item.checklist_id);
			if (items.length > 0 && items.every((i) => i.checked)) {
				const listId = item.checklist_id;
				celebrating = new Set([...celebrating, listId]);
				setTimeout(() => {
					const list = userData.checklists.find((l) => l.id === listId);
					if (list) clearChecks(list);
					setTimeout(() => {
						celebrating.delete(listId);
						celebrating = new Set(celebrating);
					}, 600);
				}, 1500);
			}
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
	<Button size="sm" onclick={() => (showNewList = !showNewList)}>
		<Plus class="size-4" />
		<span>{showNewList ? 'Close' : 'New list'}</span>
	</Button>
</header>

{#if showNewList}
	<form onsubmit={createList} class="flex gap-2">
		<Input
			bind:value={newListName}
			placeholder="New list name (e.g. Day pack, Gym bag…)"
			class="flex-1"
			autofocus
		/>
		<Button type="submit" disabled={!newListName.trim()}>Add</Button>
	</form>
{/if}

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
			{@const isEditing = !!editing[list.id]}
			{@const isCelebrating = celebrating.has(list.id)}
			<section class={`relative overflow-hidden rounded-lg border bg-card ${isCelebrating ? 'celebrate' : ''}`}>
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
							type="button"
							size="sm"
							onclick={() => (showAdd[list.id] = !showAdd[list.id])}
						>
							<Plus class="size-4" />
							<span>{showAdd[list.id] ? 'Close' : 'Add item'}</span>
						</Button>
						<Button
							type="button"
							size="sm"
							variant={isEditing ? 'default' : 'outline'}
							onclick={() => (editing[list.id] = !isEditing)}
						>
							{#if isEditing}
								<Check class="size-4" />
								<span>Done</span>
							{:else}
								<Pencil class="size-4" />
								<span>Edit</span>
							{/if}
						</Button>
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
								<DropdownMenu.Item
									disabled={checkedCount === 0}
									onclick={() => clearChecks(list)}
								>
									<Eraser class="size-4" />
									<span>Clear checks</span>
								</DropdownMenu.Item>
								<DropdownMenu.Separator />
								<DropdownMenu.Item
									variant="destructive"
									onclick={() => deleteList(list)}
								>
									<Trash2 class="size-4" />
									<span>Delete list</span>
								</DropdownMenu.Item>
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					</div>
				</header>

				<ul class="divide-y divide-border">
					{#each items as item (item.id)}
						<li class="flex items-stretch text-sm">
							<button
								type="button"
								onclick={() => toggleItem(item)}
								class="flex flex-1 items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-muted/50"
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
							{#if isEditing}
								<Button
									type="button"
									variant="ghost"
									size="icon-sm"
									class="my-auto mr-2"
									aria-label="Delete item"
									onclick={() => deleteItem(item)}
								>
									<Trash2 class="size-4" />
								</Button>
							{/if}
						</li>
					{/each}
				</ul>

				{#if showAdd[list.id]}
					<form
						onsubmit={(e) => addItem(list, e)}
						class="flex gap-2 border-t border-border/60 px-4 py-3"
					>
						<Input
							bind:value={newItemDraft[list.id]}
							placeholder="Add an item…"
							class="h-8 flex-1"
							autofocus
						/>
						<Button type="submit" size="sm" disabled={!(newItemDraft[list.id] ?? '').trim()}>
							Add
						</Button>
					</form>
				{/if}

				{#if isCelebrating}
					<div
						class="pointer-events-none absolute inset-0 grid place-items-center bg-emerald-500/10 backdrop-blur-[1px]"
						aria-hidden="true"
					>
						<div class="celebrate-pill">
							<Sparkles class="size-4" />
							<span>All done!</span>
						</div>
						<span class="confetti confetti-1">✨</span>
						<span class="confetti confetti-2">🎉</span>
						<span class="confetti confetti-3">⭐</span>
						<span class="confetti confetti-4">✨</span>
						<span class="confetti confetti-5">🎉</span>
						<span class="confetti confetti-6">⭐</span>
					</div>
				{/if}
			</section>
		{/each}
	</div>
{/if}

<style>
	.celebrate {
		animation: celebrate-pop 600ms ease-out;
	}
	@keyframes celebrate-pop {
		0% {
			transform: scale(1);
			box-shadow: 0 0 0 rgba(16, 185, 129, 0);
		}
		40% {
			transform: scale(1.02);
			box-shadow: 0 0 24px rgba(16, 185, 129, 0.45);
		}
		100% {
			transform: scale(1);
			box-shadow: 0 0 0 rgba(16, 185, 129, 0);
		}
	}

	.celebrate-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		border-radius: 9999px;
		background: #10b981;
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 600;
		color: white;
		box-shadow: 0 8px 24px rgba(16, 185, 129, 0.4);
		animation: pill-pop 1500ms ease-out forwards;
	}
	@keyframes pill-pop {
		0% {
			transform: scale(0.4) translateY(20px);
			opacity: 0;
		}
		25% {
			transform: scale(1.15) translateY(0);
			opacity: 1;
		}
		60% {
			transform: scale(1) translateY(0);
			opacity: 1;
		}
		90% {
			transform: scale(1) translateY(-4px);
			opacity: 1;
		}
		100% {
			transform: scale(0.95) translateY(-12px);
			opacity: 0;
		}
	}

	.confetti {
		position: absolute;
		top: 50%;
		left: 50%;
		font-size: 1.25rem;
		opacity: 0;
	}
	.confetti-1 { animation: confetti-burst 1500ms ease-out forwards; --tx: -80px; --ty: -60px; --rot: -45deg; }
	.confetti-2 { animation: confetti-burst 1500ms ease-out forwards; --tx: 80px; --ty: -60px; --rot: 35deg; animation-delay: 80ms; }
	.confetti-3 { animation: confetti-burst 1500ms ease-out forwards; --tx: -100px; --ty: 30px; --rot: -90deg; animation-delay: 160ms; }
	.confetti-4 { animation: confetti-burst 1500ms ease-out forwards; --tx: 100px; --ty: 30px; --rot: 90deg; animation-delay: 120ms; }
	.confetti-5 { animation: confetti-burst 1500ms ease-out forwards; --tx: -50px; --ty: 80px; --rot: -120deg; animation-delay: 200ms; }
	.confetti-6 { animation: confetti-burst 1500ms ease-out forwards; --tx: 50px; --ty: 80px; --rot: 120deg; animation-delay: 240ms; }

	@keyframes confetti-burst {
		0% {
			transform: translate(-50%, -50%) scale(0.4) rotate(0deg);
			opacity: 0;
		}
		20% {
			opacity: 1;
		}
		100% {
			transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(1) rotate(var(--rot));
			opacity: 0;
		}
	}
</style>
