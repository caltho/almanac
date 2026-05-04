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
	import Users from '@lucide/svelte/icons/users';
	import ColorPicker from '$lib/components/ColorPicker.svelte';
	import { paletteHex, type PaletteToken } from '$lib/palette';
	import { useUserData, type Person } from '$lib/stores/userData.svelte';

	const userData = useUserData();

	let showForm = $state(false);
	let editingId = $state<string | null>(null);
	let saving = $state(false);

	let fName = $state('');
	let fEmail = $state('');
	let fPhone = $state('');
	let fNotes = $state('');
	let fBirthdayDate = $state(''); // YYYY-MM-DD or '' if no birthday
	let fYearKnown = $state(true);
	let fColor = $state<PaletteToken | null>(null);

	let query = $state('');

	function resetForm() {
		fName = '';
		fEmail = '';
		fPhone = '';
		fNotes = '';
		fBirthdayDate = '';
		fYearKnown = true;
		fColor = null;
	}

	function openNew() {
		resetForm();
		editingId = null;
		showForm = true;
	}

	function startEdit(p: Person) {
		fName = p.name;
		fEmail = p.email ?? '';
		fPhone = p.phone ?? '';
		fNotes = p.notes ?? '';
		if (p.birthday_month && p.birthday_day) {
			const yr = p.birthday_year ?? 2000;
			const mm = String(p.birthday_month).padStart(2, '0');
			const dd = String(p.birthday_day).padStart(2, '0');
			fBirthdayDate = `${yr}-${mm}-${dd}`;
			fYearKnown = p.birthday_year !== null;
		} else {
			fBirthdayDate = '';
			fYearKnown = true;
		}
		fColor = (p.color as PaletteToken | null) ?? null;
		editingId = p.id;
		showForm = true;
	}

	function closeForm() {
		showForm = false;
		editingId = null;
	}

	async function savePerson(ev: SubmitEvent) {
		ev.preventDefault();
		const name = fName.trim();
		if (!name) return;
		saving = true;

		let birthday_month: number | null = null;
		let birthday_day: number | null = null;
		let birthday_year: number | null = null;
		if (fBirthdayDate) {
			const [yStr, mStr, dStr] = fBirthdayDate.split('-');
			birthday_month = Number(mStr);
			birthday_day = Number(dStr);
			birthday_year = fYearKnown ? Number(yStr) : null;
		}

		const payload = {
			name,
			email: fEmail.trim() || null,
			phone: fPhone.trim() || null,
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
		if (!confirm(`Delete ${p.name}?`)) return;
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

	function fmtBirthday(p: Person): string | null {
		if (!p.birthday_month || !p.birthday_day) return null;
		const dd = String(p.birthday_day).padStart(2, '0');
		const mm = String(p.birthday_month).padStart(2, '0');
		if (p.birthday_year) return `${dd}/${mm}/${p.birthday_year}`;
		return `${dd}/${mm}`;
	}

	function ageNow(p: Person): number | null {
		if (!p.birthday_year || !p.birthday_month || !p.birthday_day) return null;
		const today = new Date();
		let age = today.getFullYear() - p.birthday_year;
		const beforeBirthday =
			today.getMonth() + 1 < p.birthday_month ||
			(today.getMonth() + 1 === p.birthday_month && today.getDate() < p.birthday_day);
		if (beforeBirthday) age--;
		return age;
	}

	function initials(name: string): string {
		return name
			.split(/\s+/)
			.map((s) => s[0])
			.filter(Boolean)
			.slice(0, 2)
			.join('')
			.toUpperCase();
	}

	const filtered = $derived(
		userData.people
			.slice()
			.filter((p) => {
				if (!query.trim()) return true;
				const q = query.toLowerCase();
				return (
					p.name.toLowerCase().includes(q) ||
					(p.email?.toLowerCase().includes(q) ?? false) ||
					(p.notes?.toLowerCase().includes(q) ?? false)
				);
			})
			.sort((a, b) => a.name.localeCompare(b.name))
	);

</script>

<header class="flex flex-wrap items-end justify-between gap-3">
	<div class="space-y-1">
		<h1 class="text-2xl font-semibold tracking-tight">People</h1>
		<p class="text-sm text-muted-foreground">
			Personal CMS — name, contact, birthday, notes. Birthdays here drive the calendar.
		</p>
	</div>
	<div class="flex items-center gap-2">
		<Input bind:value={query} placeholder="Search…" class="h-8 w-40 sm:w-56" />
		<Button size="sm" onclick={() => (showForm ? closeForm() : openNew())}>
			<Plus class="size-4" />
			<span>{showForm ? 'Close' : 'New person'}</span>
		</Button>
	</div>
</header>

{#if showForm}
	<form onsubmit={savePerson} class="space-y-3 rounded-lg border bg-muted/20 p-4">
		<div class="space-y-1.5">
			<Label for="p-name">{editingId ? 'Edit person' : 'Name'}</Label>
			<Input id="p-name" bind:value={fName} required autofocus placeholder="Who?" />
		</div>

		<div class="grid gap-3 sm:grid-cols-2">
			<div class="space-y-1.5">
				<Label for="p-email">Email <span class="text-muted-foreground">(optional)</span></Label>
				<Input id="p-email" type="email" bind:value={fEmail} />
			</div>
			<div class="space-y-1.5">
				<Label for="p-phone">Phone <span class="text-muted-foreground">(optional)</span></Label>
				<Input id="p-phone" bind:value={fPhone} />
			</div>
		</div>

		<div class="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
			<div class="space-y-1.5">
				<Label for="p-bd">Birthday <span class="text-muted-foreground">(optional)</span></Label>
				<Input id="p-bd" type="date" bind:value={fBirthdayDate} />
			</div>
			<label class="flex items-center gap-2 pb-2 text-sm">
				<input type="checkbox" bind:checked={fYearKnown} class="size-4" />
				<span>Year known</span>
			</label>
		</div>

		<div class="space-y-1.5">
			<Label for="p-notes">Notes <span class="text-muted-foreground">(optional)</span></Label>
			<Textarea id="p-notes" bind:value={fNotes} rows={3} />
		</div>

		<div class="space-y-1.5">
			<Label class="text-xs">Color</Label>
			<ColorPicker bind:value={fColor} label="Person color" />
		</div>

		<div class="flex justify-end gap-2">
			<Button type="button" variant="ghost" size="sm" onclick={closeForm}>Cancel</Button>
			<Button type="submit" size="sm" disabled={saving || !fName.trim()}>
				{saving ? 'Saving…' : editingId ? 'Save changes' : 'Add person'}
			</Button>
		</div>
	</form>
{/if}

{#if userData.people.length === 0}
	<div class="rounded-lg border border-dashed p-12 text-center">
		<Users class="mx-auto mb-3 size-10 text-muted-foreground/60" />
		<p class="text-sm text-muted-foreground">
			No people yet. <button class="underline" onclick={openNew}>Add the first one</button>.
		</p>
	</div>
{:else if filtered.length === 0}
	<p class="text-sm text-muted-foreground italic">No matches for "{query}".</p>
{:else}
	<ul class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
		{#each filtered as p (p.id)}
			{@const hex = paletteHex(p.color) ?? '#6B7280'}
			{@const bd = fmtBirthday(p)}
			{@const age = ageNow(p)}
			<li class="space-y-2 rounded-lg border bg-card p-4">
				<div class="flex items-start gap-3">
					<span
						class="grid size-10 shrink-0 place-items-center rounded-full text-sm font-semibold text-white"
						style={`background:${hex}`}
						aria-hidden="true"
					>
						{initials(p.name)}
					</span>
					<div class="min-w-0 flex-1">
						<h3 class="truncate font-semibold tracking-tight">{p.name}</h3>
						{#if bd}
							<p class="text-xs tabular-nums text-muted-foreground">
								🎂 {bd}{#if age !== null}<span> · {age}</span>{/if}
							</p>
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
									aria-label="Person actions"
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
				</div>

				{#if p.email || p.phone}
					<div class="space-y-0.5 text-xs text-muted-foreground">
						{#if p.email}<div class="truncate">{p.email}</div>{/if}
						{#if p.phone}<div class="tabular-nums">{p.phone}</div>{/if}
					</div>
				{/if}

				{#if p.notes}
					<p class="text-xs whitespace-pre-wrap text-muted-foreground">{p.notes}</p>
				{/if}
			</li>
		{/each}
	</ul>
{/if}

