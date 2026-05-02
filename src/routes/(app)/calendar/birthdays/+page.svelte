<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import MoreVertical from '@lucide/svelte/icons/more-vertical';
	import Cake from '@lucide/svelte/icons/cake';
	import ColorPicker from '$lib/components/ColorPicker.svelte';
	import { paletteHex, type PaletteToken } from '$lib/palette';
	import { useUserData, type Birthday } from '$lib/stores/userData.svelte';

	const userData = useUserData();

	const today = (() => {
		const t = new Date();
		t.setHours(0, 0, 0, 0);
		return t;
	})();

	let showNew = $state(false);
	let newName = $state('');
	let newDate = $state('');
	let newYearKnown = $state(true);
	let newNotes = $state('');
	let newColor = $state<PaletteToken | null>('purple');
	let saving = $state(false);

	function resetForm() {
		newName = '';
		newDate = '';
		newYearKnown = true;
		newNotes = '';
		newColor = 'purple';
	}

	function openNew() {
		resetForm();
		showNew = true;
	}

	const MONTH_NAMES = [
		'Jan',
		'Feb',
		'Mar',
		'Apr',
		'May',
		'Jun',
		'Jul',
		'Aug',
		'Sep',
		'Oct',
		'Nov',
		'Dec'
	];

	// Compute the next occurrence of a month/day for ordering. If month/day
	// has already passed this year, roll to next year.
	function nextOccurrence(b: Birthday): Date {
		const ref = new Date(today);
		const cand = new Date(ref.getFullYear(), b.month - 1, b.day);
		if (cand < ref) cand.setFullYear(cand.getFullYear() + 1);
		return cand;
	}
	function daysUntil(b: Birthday): number {
		const next = nextOccurrence(b);
		return Math.round((next.getTime() - today.getTime()) / 86400000);
	}
	function ageNext(b: Birthday): number | null {
		if (!b.year) return null;
		return nextOccurrence(b).getFullYear() - b.year;
	}

	const sortedByNext = $derived(
		userData.birthdays
			.slice()
			.sort((a, b) => nextOccurrence(a).getTime() - nextOccurrence(b).getTime())
	);

	function fmtMonthDay(b: Birthday) {
		return `${MONTH_NAMES[b.month - 1]} ${b.day}`;
	}
	function fmtCountdown(d: number) {
		if (d === 0) return 'Today!';
		if (d === 1) return 'Tomorrow';
		if (d < 7) return `in ${d} days`;
		if (d < 30) return `in ${Math.round(d / 7)} weeks`;
		const months = Math.round(d / 30);
		return `in ${months} month${months === 1 ? '' : 's'}`;
	}

	async function createBirthday(ev: SubmitEvent) {
		ev.preventDefault();
		const name = newName.trim();
		if (!name || !newDate) return;
		const [yStr, mStr, dStr] = newDate.split('-');
		const year = newYearKnown ? Number(yStr) : null;
		const month = Number(mStr);
		const day = Number(dStr);
		saving = true;
		try {
			const res = await fetch('/calendar/birthdays/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					op: 'create',
					name,
					month,
					day,
					year,
					notes: newNotes.trim() || null,
					color: newColor
				})
			});
			if (!res.ok) throw new Error();
			const body = (await res.json()) as { birthday: Birthday };
			userData.addBirthday(body.birthday);
			showNew = false;
			resetForm();
		} catch {
			// keep form open on failure
		} finally {
			saving = false;
		}
	}

	async function deleteBirthday(b: Birthday) {
		if (!confirm(`Remove ${b.name}?`)) return;
		const prev = b;
		userData.removeBirthday(b.id);
		try {
			const res = await fetch('/calendar/birthdays/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ op: 'delete', id: b.id })
			});
			if (!res.ok) throw new Error();
		} catch {
			userData.addBirthday(prev);
		}
	}
</script>

<header class="flex items-start justify-between gap-2">
	<div class="space-y-1">
		<h1 class="text-2xl font-semibold tracking-tight">Birthdays</h1>
		<p class="text-sm text-muted-foreground">
			Family + friends, sorted by who's up next.
		</p>
	</div>
	<Button size="sm" onclick={() => (showNew ? (showNew = false) : openNew())}>
		<Plus class="size-4" />
		<span>{showNew ? 'Close' : 'New'}</span>
	</Button>
</header>

{#if showNew}
	<form onsubmit={createBirthday} class="space-y-3 rounded-lg border bg-muted/20 p-4">
		<div class="space-y-1.5">
			<Label for="bd-name">Name</Label>
			<Input id="bd-name" bind:value={newName} required autofocus />
		</div>

		<div class="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
			<div class="space-y-1.5">
				<Label for="bd-date">Date</Label>
				<Input id="bd-date" type="date" bind:value={newDate} required />
			</div>
			<label class="flex items-center gap-2 pb-2 text-sm">
				<input type="checkbox" bind:checked={newYearKnown} class="size-4" />
				<span>I know the year</span>
			</label>
		</div>

		<div class="space-y-1.5">
			<Label for="bd-notes">Notes <span class="text-muted-foreground">(optional)</span></Label>
			<Textarea id="bd-notes" bind:value={newNotes} rows={2} />
		</div>

		<div class="space-y-1.5">
			<Label class="text-xs">Color</Label>
			<ColorPicker bind:value={newColor} label="Birthday color" />
		</div>

		<div class="flex justify-end gap-2">
			<Button type="button" variant="ghost" size="sm" onclick={() => (showNew = false)}>Cancel</Button>
			<Button type="submit" size="sm" disabled={saving || !newName.trim() || !newDate}>
				{saving ? 'Saving…' : 'Add birthday'}
			</Button>
		</div>
	</form>
{/if}

{#if userData.birthdays.length === 0}
	<div class="rounded-lg border border-dashed p-12 text-center">
		<Cake class="mx-auto mb-3 size-10 text-muted-foreground/60" />
		<p class="text-sm text-muted-foreground">
			No birthdays yet. <button class="underline" onclick={openNew}>Add the first one</button>.
		</p>
	</div>
{:else}
	<ul class="divide-y divide-border rounded-lg border">
		{#each sortedByNext as b (b.id)}
			{@const hex = paletteHex(b.color) ?? '#CC79A7'}
			{@const days = daysUntil(b)}
			{@const age = ageNext(b)}
			<li class="flex items-start gap-3 p-3">
				<span
					class="mt-1 grid size-7 shrink-0 place-items-center rounded-full text-base"
					style={`background:${hex}1A`}
					aria-hidden="true"
				>
					🎂
				</span>
				<div class="min-w-0 flex-1 space-y-0.5">
					<div class="flex flex-wrap items-baseline gap-2">
						<span class="text-sm font-semibold leading-snug">{b.name}</span>
						<span class="text-xs text-muted-foreground tabular-nums">
							{fmtMonthDay(b)}{#if b.year}<span class="opacity-60"> · {b.year}</span>{/if}
						</span>
					</div>
					<div class="text-xs text-muted-foreground tabular-nums">
						{fmtCountdown(days)}{#if age !== null}<span> · turns {age}</span>{/if}
					</div>
					{#if b.notes}
						<p class="pt-0.5 text-xs text-muted-foreground">{b.notes}</p>
					{/if}
				</div>
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<Button {...props} type="button" variant="ghost" size="icon-sm" aria-label="Birthday actions">
								<MoreVertical class="size-4" />
							</Button>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="end" class="w-44">
						<DropdownMenu.Item variant="destructive" onclick={() => deleteBirthday(b)}>
							<Trash2 class="size-4" />
							<span>Delete</span>
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</li>
		{/each}
	</ul>
{/if}
