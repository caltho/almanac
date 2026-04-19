<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import { AttrsRenderer } from '$lib/custom-attrs';
	import Settings2 from '@lucide/svelte/icons/settings-2';
	import Trash2 from '@lucide/svelte/icons/trash-2';

	let { data, form } = $props();
	let adding = $state(false);

	const byStatus = $derived({
		todo: data.tasks.filter((t) => t.status === 'todo'),
		doing: data.tasks.filter((t) => t.status === 'doing'),
		done: data.tasks.filter((t) => t.status === 'done'),
		cancelled: data.tasks.filter((t) => t.status === 'cancelled')
	});

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
</script>

<section class="space-y-6">
	<header class="flex items-start justify-between gap-4">
		<div class="space-y-1">
			<h1 class="text-2xl font-semibold tracking-tight">Tasks</h1>
			<p class="text-sm text-muted-foreground">Flat list by status. Projects land in M5.</p>
		</div>
		<Button variant="outline" size="sm" href="/tasks/fields">
			<Settings2 class="size-4" />
			<span>Fields</span>
		</Button>
	</header>

	<form
		method="POST"
		action="?/quickAdd"
		use:enhance={() => {
			adding = true;
			return async ({ update }) => {
				await update({ reset: true });
				adding = false;
			};
		}}
		class="flex gap-2"
	>
		<Input name="title" placeholder="Add a task and press enter…" required class="flex-1" />
		<Button type="submit" disabled={adding}>{adding ? 'Adding…' : 'Add'}</Button>
	</form>
	{#if form?.error}<p class="text-sm text-destructive">{form.error}</p>{/if}

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
								<form method="POST" action="?/setStatus" class="shrink-0 pt-0.5" use:enhance>
									<input type="hidden" name="id" value={t.id} />
									<input
										type="hidden"
										name="status"
										value={t.status === 'done' ? 'todo' : 'done'}
									/>
									<button
										type="submit"
										class={`grid size-4 place-items-center rounded border ${
											t.status === 'done'
												? 'border-primary bg-primary text-primary-foreground'
												: 'border-border'
										}`}
										aria-label={t.status === 'done' ? 'Mark todo' : 'Mark done'}
									>
										{#if t.status === 'done'}✓{/if}
									</button>
								</form>

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
									<AttrsRenderer defs={data.defs} values={t.custom as Record<string, unknown>} />
								</a>

								<form method="POST" action="?/delete" class="shrink-0" use:enhance>
									<input type="hidden" name="id" value={t.id} />
									<Button type="submit" variant="ghost" size="icon-sm" aria-label="Delete">
										<Trash2 class="size-4" />
									</Button>
								</form>
							</li>
						{/each}
					</ul>
				</section>
			{/if}
		{/each}
		{#if data.tasks.length === 0}
			<p class="text-sm text-muted-foreground">No tasks yet.</p>
		{/if}
	</div>
</section>
