<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import { AttrsRenderer } from '$lib/custom-attrs';
	import Plus from '@lucide/svelte/icons/plus';
	import Settings2 from '@lucide/svelte/icons/settings-2';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import { useUserData, type Task } from '$lib/stores/userData.svelte';

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
		return date.toLocaleDateString();
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
		// Optimistic placeholder with temp id until server echoes real row back.
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
</script>

<section class="space-y-6">
	<header class="flex items-start justify-between gap-4">
		<div class="space-y-1">
			<h1 class="text-2xl font-semibold tracking-tight">Tasks</h1>
			<p class="text-sm text-muted-foreground">Flat list by status. Projects land in M5.</p>
		</div>
		<div class="flex items-center gap-1">
			<Button size="sm" onclick={() => (showNew = !showNew)}>
				<Plus class="size-4" />
				<span>{showNew ? 'Close' : 'New task'}</span>
			</Button>
			<Button variant="outline" size="sm" href="/tasks/fields">
				<Settings2 class="size-4" />
				<span>Fields</span>
			</Button>
		</div>
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
</section>
