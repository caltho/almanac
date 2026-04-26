<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import Plus from '@lucide/svelte/icons/plus';
	import Check from '@lucide/svelte/icons/check';
	import Activity from '@lucide/svelte/icons/activity';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Archive from '@lucide/svelte/icons/archive';
	import {
		useUserData,
		type Activity as ActivityRow,
		type ActivityLog
	} from '$lib/stores/userData.svelte';

	const userData = useUserData();

	// --- date helpers ----------------------------------------------------
	const todayDate = new Date();
	todayDate.setHours(0, 0, 0, 0);
	const todayIso = iso(todayDate);

	function iso(d: Date): string {
		return d.toISOString().slice(0, 10);
	}
	function fromIso(s: string): Date {
		const d = new Date(s + 'T00:00:00');
		d.setHours(0, 0, 0, 0);
		return d;
	}
	function addDays(d: Date, n: number): Date {
		const out = new Date(d);
		out.setDate(out.getDate() + n);
		return out;
	}
	/** Monday of the week containing d (ISO-style: week starts Monday). */
	function weekStart(d: Date): Date {
		const out = new Date(d);
		out.setHours(0, 0, 0, 0);
		const dow = (out.getDay() + 6) % 7;
		out.setDate(out.getDate() - dow);
		return out;
	}

	// --- selection state -------------------------------------------------
	let activeIso = $state(todayIso);
	let activeDate = $derived(fromIso(activeIso));

	const weekDays = $derived.by(() => {
		const start = weekStart(activeDate);
		const out: { iso: string; weekday: string; day: number; isActive: boolean; isToday: boolean }[] =
			[];
		for (let i = 0; i < 7; i++) {
			const d = addDays(start, i);
			const di = iso(d);
			out.push({
				iso: di,
				weekday: d.toLocaleDateString(undefined, { weekday: 'short' }),
				day: d.getDate(),
				isActive: di === activeIso,
				isToday: di === todayIso
			});
		}
		return out;
	});

	const activeLabel = $derived(
		activeDate.toLocaleDateString(undefined, {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		})
	);

	// Activities ordered by order_index, then name. Stable shortcuts.
	const activities = $derived(
		userData.activities
			.slice()
			.sort((a, b) => a.order_index - b.order_index || a.name.localeCompare(b.name))
	);

	function isLogged(activity_id: string): boolean {
		return userData.activityLogs.some(
			(l) => l.activity_id === activity_id && l.log_date === activeIso
		);
	}

	const loggedCount = $derived(
		userData.activityLogs.filter((l) => l.log_date === activeIso).length
	);

	// --- mutations -------------------------------------------------------
	let busy = $state<Record<string, boolean>>({});
	let newName = $state('');
	let newInput = $state<HTMLInputElement | null>(null);

	async function toggle(activity: ActivityRow) {
		const dateIso = activeIso;
		const wasLogged = isLogged(activity.id);
		const tempId = `tmp-${Math.random().toString(36).slice(2)}`;
		userData.toggleActivityLog(activity.id, dateIso, !wasLogged, tempId);
		busy[activity.id] = true;
		try {
			const res = await fetch('/activities/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					op: 'toggle',
					activity_id: activity.id,
					log_date: dateIso,
					on: !wasLogged
				})
			});
			if (!res.ok) throw new Error(await res.text());
			const body = (await res.json()) as { log?: ActivityLog };
			if (body.log) userData.replaceActivityLog(tempId, body.log);
		} catch {
			// Rollback the optimistic flip.
			userData.toggleActivityLog(activity.id, dateIso, wasLogged);
		} finally {
			busy[activity.id] = false;
		}
	}

	async function createActivity(e: SubmitEvent) {
		e.preventDefault();
		const name = newName.trim();
		if (!name) return;
		newName = '';
		try {
			const res = await fetch('/activities/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ op: 'create', name })
			});
			if (!res.ok) throw new Error();
			const body = (await res.json()) as { activity: ActivityRow };
			userData.addActivity(body.activity);
		} catch {
			newName = name;
		}
	}

	async function archive(activity: ActivityRow) {
		userData.removeActivity(activity.id);
		try {
			const res = await fetch('/activities/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ op: 'archive', id: activity.id })
			});
			if (!res.ok) throw new Error();
		} catch {
			userData.addActivity(activity);
		}
	}

	function jumpToday() {
		activeIso = todayIso;
	}
	function shiftDays(n: number) {
		activeIso = iso(addDays(activeDate, n));
	}

	// --- keyboard shortcuts ---------------------------------------------
	// Ignore key handlers when the user is typing into a text input/textarea
	// or the focus is on a contenteditable surface.
	function isTypingTarget(e: KeyboardEvent): boolean {
		const t = e.target as HTMLElement | null;
		if (!t) return false;
		const tag = t.tagName;
		if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
		if (t.isContentEditable) return true;
		return false;
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.metaKey || e.ctrlKey || e.altKey) return;
		if (isTypingTarget(e)) return;

		if (e.key === 'ArrowLeft') {
			e.preventDefault();
			shiftDays(-1);
			return;
		}
		if (e.key === 'ArrowRight') {
			e.preventDefault();
			shiftDays(1);
			return;
		}
		if (e.key === 'ArrowUp') {
			e.preventDefault();
			shiftDays(-7);
			return;
		}
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			shiftDays(7);
			return;
		}
		if (e.key === 't' || e.key === 'T') {
			e.preventDefault();
			jumpToday();
			return;
		}
		if (e.key === 'n' || e.key === 'N') {
			e.preventDefault();
			newInput?.focus();
			return;
		}
		// Number 1-9 toggles the Nth activity.
		if (e.key >= '1' && e.key <= '9') {
			const idx = Number(e.key) - 1;
			const a = activities[idx];
			if (a) {
				e.preventDefault();
				toggle(a);
			}
		}
	}
</script>

<svelte:document onkeydown={onKeydown} />

<header class="space-y-1">
	<h1 class="text-2xl font-semibold tracking-tight">Activities</h1>
	<p class="text-sm text-muted-foreground">
		Log what you did each day. Pick a date, then tick the activities — keyboard-first.
	</p>
</header>

<!-- Week strip + nav -->
<section class="space-y-2">
	<div class="flex items-center gap-2">
		<Button
			variant="ghost"
			size="icon-sm"
			onclick={() => shiftDays(-7)}
			aria-label="Previous week"
		>
			<ChevronLeft class="size-4" />
		</Button>
		<div class="grid flex-1 grid-cols-7 gap-1">
			{#each weekDays as d (d.iso)}
				<button
					type="button"
					onclick={() => (activeIso = d.iso)}
					class={`flex flex-col items-center rounded-md py-2 transition-colors ${
						d.isActive
							? 'bg-foreground text-background'
							: d.isToday
								? 'border border-foreground/40 bg-muted/40'
								: 'hover:bg-muted/60'
					}`}
				>
					<span class="text-[10px] tracking-wider uppercase opacity-80">{d.weekday}</span>
					<span class="text-base font-semibold">{d.day}</span>
				</button>
			{/each}
		</div>
		<Button
			variant="ghost"
			size="icon-sm"
			onclick={() => shiftDays(7)}
			aria-label="Next week"
		>
			<ChevronRight class="size-4" />
		</Button>
	</div>
	<div class="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
		<div class="flex items-center gap-2">
			<span class="font-medium text-foreground">{activeLabel}</span>
			{#if loggedCount > 0}
				<Badge variant="secondary" class="text-[10px]">
					{loggedCount} logged
				</Badge>
			{/if}
		</div>
		<div class="flex items-center gap-2">
			<input
				type="date"
				value={activeIso}
				onchange={(e) => (activeIso = (e.currentTarget as HTMLInputElement).value)}
				class="h-7 rounded-md border border-input bg-background px-2 text-xs shadow-xs"
			/>
			<button
				type="button"
				onclick={jumpToday}
				class="rounded-md border px-2 py-1 text-[11px] hover:bg-muted/60"
				title="Press T"
			>
				Today
			</button>
		</div>
	</div>
</section>

<!-- Add new activity -->
<form
	onsubmit={createActivity}
	class="flex items-center gap-2 rounded-lg border bg-muted/20 p-2"
>
	<Plus class="ml-2 size-4 text-muted-foreground" />
	<Input
		bind:ref={newInput}
		bind:value={newName}
		placeholder="New activity (press N)…"
		class="h-8 border-transparent bg-transparent shadow-none focus:border-input focus:bg-background"
	/>
	<Button type="submit" size="sm" disabled={!newName.trim()}>Add</Button>
</form>

<!-- Activity list -->
{#if activities.length === 0}
	<div class="rounded-lg border border-dashed p-12 text-center">
		<Activity class="mx-auto mb-3 size-10 text-muted-foreground/60" />
		<p class="text-sm text-muted-foreground">
			No activities yet. Add one above (press <kbd class="rounded bg-muted px-1 text-[10px]">N</kbd>).
		</p>
	</div>
{:else}
	<ul class="divide-y divide-border rounded-lg border">
		{#each activities as a, i (a.id)}
			{@const logged = isLogged(a.id)}
			<li class="grid grid-cols-[auto_1fr_auto] items-center gap-3 p-3">
				<button
					type="button"
					onclick={() => toggle(a)}
					disabled={busy[a.id]}
					class={`flex size-9 shrink-0 items-center justify-center rounded-md border transition-colors ${
						logged
							? 'border-foreground bg-foreground text-background'
							: 'border-border hover:bg-muted/60'
					}`}
					aria-pressed={logged}
					aria-label={`Toggle ${a.name} on ${activeIso}`}
				>
					{#if logged}
						<Check class="size-5" />
					{:else if i < 9}
						<span class="text-sm font-medium text-muted-foreground">{i + 1}</span>
					{/if}
				</button>
				<button
					type="button"
					onclick={() => toggle(a)}
					class="min-w-0 text-left"
				>
					<div class={`font-medium ${logged ? '' : ''}`}>
						<span class="flex items-center gap-2">
							{#if a.color}
								<span
									class="size-2.5 rounded-full"
									style={`background:${a.color}`}
									aria-hidden="true"
								></span>
							{/if}
							{a.name}
						</span>
					</div>
					<div class="text-xs text-muted-foreground">
						{#if i < 9}
							Press <kbd class="rounded bg-muted px-1">{i + 1}</kbd>
						{/if}
					</div>
				</button>
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					aria-label="Archive activity"
					onclick={() => archive(a)}
				>
					<Archive class="size-4" />
				</Button>
			</li>
		{/each}
	</ul>

	<p class="text-[11px] text-muted-foreground">
		Shortcuts:
		<kbd class="rounded bg-muted px-1">←</kbd>
		<kbd class="rounded bg-muted px-1">→</kbd> day ·
		<kbd class="rounded bg-muted px-1">↑</kbd>
		<kbd class="rounded bg-muted px-1">↓</kbd> week ·
		<kbd class="rounded bg-muted px-1">T</kbd> today ·
		<kbd class="rounded bg-muted px-1">1</kbd>–<kbd class="rounded bg-muted px-1">9</kbd> toggle ·
		<kbd class="rounded bg-muted px-1">N</kbd> new
	</p>
{/if}
