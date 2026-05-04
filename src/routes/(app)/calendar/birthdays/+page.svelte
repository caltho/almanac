<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import Plus from '@lucide/svelte/icons/plus';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import MoreVertical from '@lucide/svelte/icons/more-vertical';
	import Cake from '@lucide/svelte/icons/cake';
	import ColorPicker from '$lib/components/ColorPicker.svelte';
	import { paletteHex, type PaletteToken } from '$lib/palette';
	import { localMidnight } from '$lib/dates';
	import { useUserData, type Person } from '$lib/stores/userData.svelte';

	const userData = useUserData();
	const today = localMidnight();

	let showForm = $state(false);
	let editingId = $state<string | null>(null);
	let saving = $state(false);

	let fName = $state('');
	let fDate = $state(''); // YYYY-MM-DD
	let fYearKnown = $state(true);
	let fNotes = $state('');
	let fColor = $state<PaletteToken | null>('purple');

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

	function resetForm() {
		fName = '';
		fDate = '';
		fYearKnown = true;
		fNotes = '';
		fColor = 'purple';
	}
	function openNew() {
		resetForm();
		editingId = null;
		showForm = true;
	}
	function startEdit(p: Person) {
		fName = p.name;
		const yr = p.birthday_year ?? 2000;
		const mm = String(p.birthday_month ?? 1).padStart(2, '0');
		const dd = String(p.birthday_day ?? 1).padStart(2, '0');
		fDate = `${yr}-${mm}-${dd}`;
		fYearKnown = p.birthday_year !== null;
		fNotes = p.notes ?? '';
		fColor = (p.color as PaletteToken | null) ?? 'purple';
		editingId = p.id;
		showForm = true;
	}
	function closeForm() {
		showForm = false;
		editingId = null;
	}

	function nextOccurrence(p: { birthday_month: number | null; birthday_day: number | null }): Date {
		const ref = new Date(today);
		const cand = new Date(ref.getFullYear(), (p.birthday_month ?? 1) - 1, p.birthday_day ?? 1);
		if (cand < ref) cand.setFullYear(cand.getFullYear() + 1);
		return cand;
	}
	function daysUntil(p: { birthday_month: number | null; birthday_day: number | null }): number {
		return Math.round((nextOccurrence(p).getTime() - today.getTime()) / 86400000);
	}
	function ageNext(p: Person): number | null {
		if (!p.birthday_year) return null;
		return nextOccurrence(p).getFullYear() - p.birthday_year;
	}

	const sortedByNext = $derived(
		userData.people
			.filter((p) => p.birthday_month !== null && p.birthday_day !== null)
			.slice()
			.sort((a, b) => nextOccurrence(a).getTime() - nextOccurrence(b).getTime())
	);

	function fmtMonthDay(p: Person) {
		return `${String(p.birthday_day).padStart(2, '0')}/${String(p.birthday_month).padStart(2, '0')}`;
	}
	function fmtCountdown(d: number) {
		if (d === 0) return 'Today!';
		if (d === 1) return 'Tomorrow';
		if (d < 7) return `in ${d} days`;
		if (d < 30) return `in ${Math.round(d / 7)} weeks`;
		const months = Math.round(d / 30);
		return `in ${months} month${months === 1 ? '' : 's'}`;
	}

	async function savePerson(ev: SubmitEvent) {
		ev.preventDefault();
		const name = fName.trim();
		if (!name || !fDate) return;
		const [yStr, mStr, dStr] = fDate.split('-');
		const birthday_year = fYearKnown ? Number(yStr) : null;
		const birthday_month = Number(mStr);
		const birthday_day = Number(dStr);
		saving = true;
		const payload = {
			name,
			notes: fNotes.trim() || null,
			color: fColor,
			birthday_month,
			birthday_day,
			birthday_year
		};
		try {
			const res = await fetch('/people/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(
					editingId ? { op: 'update', id: editingId, ...payload } : { op: 'create', ...payload }
				)
			});
			if (!res.ok) throw new Error();
			const body = (await res.json()) as { person: Person };
			if (editingId) userData.updatePerson(editingId, body.person);
			else userData.addPerson(body.person);
			closeForm();
			resetForm();
		} catch {
			// keep form open on failure
		} finally {
			saving = false;
		}
	}

	async function deletePerson(p: Person) {
		if (!confirm(`Remove ${p.name}?`)) return;
		const prev = p;
		userData.removePerson(p.id);
		try {
			const res = await fetch('/people/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ op: 'delete', id: p.id })
			});
			if (!res.ok) throw new Error();
		} catch {
			userData.addPerson(prev);
		}
	}
	void MONTH_NAMES; // legacy, kept for future use
</script>

<header class="flex items-start justify-between gap-2">
	<div class="space-y-1">
		<h1 class="text-2xl font-semibold tracking-tight">Birthdays</h1>
		<p class="text-sm text-muted-foreground">
			People sorted by who's up next. Same records as the
			<a class="underline" href="/people">People</a> directory.
		</p>
	</div>
	<Button size="sm" onclick={() => (showForm ? closeForm() : openNew())}>
		<Plus class="size-4" />
		<span>{showForm ? 'Close' : 'New'}</span>
	</Button>
</header>

{#if showForm}
	<form onsubmit={savePerson} class="space-y-3 rounded-lg border bg-muted/20 p-4">
		<div class="space-y-1.5">
			<Label for="bd-name">{editingId ? 'Edit person' : 'Name'}</Label>
			<Input id="bd-name" bind:value={fName} required autofocus />
		</div>

		<div class="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
			<div class="space-y-1.5">
				<Label for="bd-date">Date</Label>
				<Input id="bd-date" type="date" bind:value={fDate} required />
			</div>
			<label class="flex items-center gap-2 pb-2 text-sm">
				<input type="checkbox" bind:checked={fYearKnown} class="size-4" />
				<span>I know the year</span>
			</label>
		</div>

		<div class="space-y-1.5">
			<Label for="bd-notes">Notes <span class="text-muted-foreground">(optional)</span></Label>
			<Textarea id="bd-notes" bind:value={fNotes} rows={2} />
		</div>

		<div class="space-y-1.5">
			<Label class="text-xs">Color</Label>
			<ColorPicker bind:value={fColor} label="Birthday color" />
		</div>

		<div class="flex justify-end gap-2">
			<Button type="button" variant="ghost" size="sm" onclick={closeForm}>Cancel</Button>
			<Button type="submit" size="sm" disabled={saving || !fName.trim() || !fDate}>
				{saving ? 'Saving…' : editingId ? 'Save changes' : 'Add birthday'}
			</Button>
		</div>
	</form>
{/if}

{#if sortedByNext.length === 0}
	<div class="rounded-lg border border-dashed p-12 text-center">
		<Cake class="mx-auto mb-3 size-10 text-muted-foreground/60" />
		<p class="text-sm text-muted-foreground">
			No birthdays yet. <button class="underline" onclick={openNew}>Add the first one</button>.
		</p>
	</div>
{:else}
	<ul class="divide-y divide-border rounded-lg border">
		{#each sortedByNext as p (p.id)}
			{@const hex = paletteHex(p.color) ?? '#CC79A7'}
			{@const days = daysUntil(p)}
			{@const age = ageNext(p)}
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
						<span class="text-sm font-semibold leading-snug">{p.name}</span>
						<span class="text-xs tabular-nums text-muted-foreground">
							{fmtMonthDay(p)}{#if p.birthday_year}<span class="opacity-60"
									> · {p.birthday_year}</span
								>{/if}
						</span>
					</div>
					<div class="text-xs tabular-nums text-muted-foreground">
						{fmtCountdown(days)}{#if age !== null}<span> · turns {age}</span>{/if}
					</div>
					{#if p.notes}
						<p class="pt-0.5 text-xs text-muted-foreground">{p.notes}</p>
					{/if}
				</div>
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<Button
								{...props}
								type="button"
								variant="ghost"
								size="icon-sm"
								aria-label="Birthday actions"
							>
								<MoreVertical class="size-4" />
							</Button>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="end" class="w-44">
						<DropdownMenu.Item onclick={() => startEdit(p)}>
							<Pencil class="size-4" />
							<span>Edit</span>
						</DropdownMenu.Item>
						<DropdownMenu.Separator />
						<DropdownMenu.Item variant="destructive" onclick={() => deletePerson(p)}>
							<Trash2 class="size-4" />
							<span>Delete</span>
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</li>
		{/each}
	</ul>
{/if}
