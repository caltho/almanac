<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import MoreVertical from '@lucide/svelte/icons/more-vertical';
	import Calendar from '@lucide/svelte/icons/calendar';
	import ColorPicker from '$lib/components/ColorPicker.svelte';
	import { paletteHex, type PaletteToken } from '$lib/palette';
	import { useUserData, type CalendarEvent } from '$lib/stores/userData.svelte';

	const userData = useUserData();

	let showNew = $state(false);
	let newTitle = $state('');
	let newAllDay = $state(false);
	let newDate = $state('');
	let newTime = $state('');
	let newEndTime = $state('');
	let newLocation = $state('');
	let newDescription = $state('');
	let newColor = $state<PaletteToken | null>(null);
	let saving = $state(false);

	// Default the new-event date to today, time to next-hour-on-the-half-hour.
	function resetForm() {
		const t = new Date();
		newDate = t.toISOString().slice(0, 10);
		t.setMinutes(0, 0, 0);
		t.setHours(t.getHours() + 1);
		newTime = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
		newEndTime = '';
		newTitle = '';
		newAllDay = false;
		newLocation = '';
		newDescription = '';
		newColor = null;
	}

	function openNew() {
		resetForm();
		showNew = true;
	}

	const nowIso = new Date().toISOString();

	const grouped = $derived.by(() => {
		const upcoming: CalendarEvent[] = [];
		const past: CalendarEvent[] = [];
		for (const e of userData.events) {
			(e.start_at >= nowIso ? upcoming : past).push(e);
		}
		upcoming.sort((a, b) => a.start_at.localeCompare(b.start_at));
		past.sort((a, b) => b.start_at.localeCompare(a.start_at));
		return { upcoming, past };
	});

	function fmtWhen(e: CalendarEvent) {
		const d = new Date(e.start_at);
		const dateStr = d.toLocaleDateString(undefined, {
			weekday: 'short',
			day: 'numeric',
			month: 'short',
			year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric'
		});
		if (e.all_day) return `${dateStr} · All day`;
		const timeStr = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
		return `${dateStr} · ${timeStr}`;
	}

	async function createEvent(ev: SubmitEvent) {
		ev.preventDefault();
		if (!newTitle.trim() || !newDate) return;
		saving = true;
		// Build start_at in local time (the picker is local). For all-day,
		// snap to midnight.
		const start_at = newAllDay
			? new Date(`${newDate}T00:00:00`).toISOString()
			: new Date(`${newDate}T${newTime || '00:00'}:00`).toISOString();
		const end_at = newAllDay
			? null
			: newEndTime
				? new Date(`${newDate}T${newEndTime}:00`).toISOString()
				: null;
		try {
			const res = await fetch('/calendar/events/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					op: 'create',
					title: newTitle.trim(),
					description: newDescription.trim() || null,
					start_at,
					end_at,
					all_day: newAllDay,
					location: newLocation.trim() || null,
					color: newColor
				})
			});
			if (!res.ok) throw new Error();
			const body = (await res.json()) as { event: CalendarEvent };
			userData.addEvent(body.event);
			showNew = false;
			resetForm();
		} catch {
			// keep form open on failure
		} finally {
			saving = false;
		}
	}

	async function deleteEvent(e: CalendarEvent) {
		if (!confirm(`Delete "${e.title}"?`)) return;
		const prev = e;
		userData.removeEvent(e.id);
		try {
			const res = await fetch('/calendar/events/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ op: 'delete', id: e.id })
			});
			if (!res.ok) throw new Error();
		} catch {
			userData.addEvent(prev);
		}
	}
</script>

<header class="flex items-start justify-between gap-2">
	<div class="space-y-1">
		<h1 class="text-2xl font-semibold tracking-tight">Events</h1>
		<p class="text-sm text-muted-foreground">One-off dated things, listed by when.</p>
	</div>
	<Button size="sm" onclick={() => (showNew ? (showNew = false) : openNew())}>
		<Plus class="size-4" />
		<span>{showNew ? 'Close' : 'New event'}</span>
	</Button>
</header>

{#if showNew}
	<form onsubmit={createEvent} class="space-y-3 rounded-lg border bg-muted/20 p-4">
		<div class="space-y-1.5">
			<Label for="ev-title">Title</Label>
			<Input id="ev-title" bind:value={newTitle} required autofocus placeholder="What's happening?" />
		</div>

		<div class="grid gap-3 sm:grid-cols-3">
			<div class="space-y-1.5">
				<Label for="ev-date">Date</Label>
				<Input id="ev-date" type="date" bind:value={newDate} required />
			</div>
			<div class="space-y-1.5">
				<Label for="ev-start">Start</Label>
				<Input
					id="ev-start"
					type="time"
					bind:value={newTime}
					disabled={newAllDay}
				/>
			</div>
			<div class="space-y-1.5">
				<Label for="ev-end">End <span class="text-muted-foreground">(optional)</span></Label>
				<Input id="ev-end" type="time" bind:value={newEndTime} disabled={newAllDay} />
			</div>
		</div>

		<label class="flex items-center gap-2 text-sm">
			<input type="checkbox" bind:checked={newAllDay} class="size-4" />
			<span>All day</span>
		</label>

		<div class="space-y-1.5">
			<Label for="ev-loc">Location <span class="text-muted-foreground">(optional)</span></Label>
			<Input id="ev-loc" bind:value={newLocation} placeholder="Where?" />
		</div>

		<div class="space-y-1.5">
			<Label for="ev-desc">Description <span class="text-muted-foreground">(optional)</span></Label>
			<Textarea id="ev-desc" bind:value={newDescription} rows={2} />
		</div>

		<div class="space-y-1.5">
			<Label class="text-xs">Color</Label>
			<ColorPicker bind:value={newColor} label="Event color" />
		</div>

		<div class="flex justify-end gap-2">
			<Button type="button" variant="ghost" size="sm" onclick={() => (showNew = false)}>Cancel</Button>
			<Button type="submit" size="sm" disabled={saving || !newTitle.trim() || !newDate}>
				{saving ? 'Saving…' : 'Add event'}
			</Button>
		</div>
	</form>
{/if}

{#if userData.events.length === 0}
	<div class="rounded-lg border border-dashed p-12 text-center">
		<Calendar class="mx-auto mb-3 size-10 text-muted-foreground/60" />
		<p class="text-sm text-muted-foreground">No events yet.</p>
	</div>
{:else}
	{#if grouped.upcoming.length > 0}
		<section class="space-y-2">
			<h2 class="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
				Upcoming · {grouped.upcoming.length}
			</h2>
			<ul class="divide-y divide-border rounded-lg border">
				{#each grouped.upcoming as e (e.id)}
					{@render eventRow(e)}
				{/each}
			</ul>
		</section>
	{/if}

	{#if grouped.past.length > 0}
		<section class="space-y-2">
			<h2 class="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
				Past · {grouped.past.length}
			</h2>
			<ul class="divide-y divide-border rounded-lg border opacity-70">
				{#each grouped.past as e (e.id)}
					{@render eventRow(e)}
				{/each}
			</ul>
		</section>
	{/if}
{/if}

{#snippet eventRow(e: CalendarEvent)}
	{@const hex = paletteHex(e.color) ?? '#0072B2'}
	<li class="flex items-start gap-3 p-3">
		<span
			class="mt-1 size-2.5 shrink-0 rounded-full"
			style={`background:${hex}`}
			aria-hidden="true"
		></span>
		<div class="min-w-0 flex-1 space-y-0.5">
			<div class="text-sm font-semibold leading-snug">{e.title}</div>
			<div class="text-xs text-muted-foreground tabular-nums">
				{fmtWhen(e)}
				{#if e.location}
					· {e.location}
				{/if}
			</div>
			{#if e.description}
				<p class="pt-0.5 text-xs text-muted-foreground">{e.description}</p>
			{/if}
		</div>
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Button {...props} type="button" variant="ghost" size="icon-sm" aria-label="Event actions">
						<MoreVertical class="size-4" />
					</Button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="end" class="w-44">
				<DropdownMenu.Item variant="destructive" onclick={() => deleteEvent(e)}>
					<Trash2 class="size-4" />
					<span>Delete</span>
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</li>
{/snippet}
