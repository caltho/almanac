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
	import MessageCircle from '@lucide/svelte/icons/message-circle';
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
	let fTags = $state(''); // comma-separated for the form input

	let query = $state('');
	let tagFilter = $state<string | null>(null);
	let catchUpFilter = $state(false);

	const CATCHUP_DAYS = 30;

	function resetForm() {
		fName = '';
		fEmail = '';
		fPhone = '';
		fNotes = '';
		fBirthdayDate = '';
		fYearKnown = true;
		fColor = null;
		fTags = '';
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
		fTags = (p.tags ?? []).join(', ');
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

		const tags = fTags
			.split(',')
			.map((s) => s.trim().toLowerCase())
			.filter(Boolean);

		const payload = {
			name,
			email: fEmail.trim() || null,
			phone: fPhone.trim() || null,
			notes: fNotes.trim() || null,
			color: fColor,
			birthday_month,
			birthday_day,
			birthday_year,
			tags
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

	async function markContacted(p: Person) {
		const at = new Date().toISOString();
		userData.updatePerson(p.id, { last_contacted_at: at });
		try {
			const res = await fetch('/people/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ op: 'markContacted', id: p.id })
			});
			if (!res.ok) throw new Error();
			const body = (await res.json()) as { person: Person };
			userData.updatePerson(p.id, body.person);
		} catch {
			userData.updatePerson(p.id, { last_contacted_at: p.last_contacted_at });
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

	function daysSinceContact(p: Person): number | null {
		if (!p.last_contacted_at) return null;
		const ms = Date.now() - new Date(p.last_contacted_at).getTime();
		return Math.floor(ms / 86400000);
	}

	function fmtLastContacted(p: Person): string {
		const d = daysSinceContact(p);
		if (d === null) return 'Never';
		if (d === 0) return 'Today';
		if (d === 1) return 'Yesterday';
		if (d < 7) return `${d}d ago`;
		if (d < 30) return `${Math.round(d / 7)}w ago`;
		if (d < 365) return `${Math.round(d / 30)}mo ago`;
		return `${Math.round(d / 365)}y ago`;
	}

	function isOverdue(p: Person): boolean {
		const d = daysSinceContact(p);
		return d === null || d >= CATCHUP_DAYS;
	}

	// All distinct tags across the directory, sorted by count desc.
	const allTags = $derived.by(() => {
		const counts = new Map<string, number>();
		for (const p of userData.people) {
			for (const t of p.tags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
		}
		return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t, n]) => ({ tag: t, n }));
	});

	const filtered = $derived(
		userData.people
			.slice()
			.filter((p) => {
				if (tagFilter && !(p.tags ?? []).includes(tagFilter)) return false;
				if (catchUpFilter && !isOverdue(p)) return false;
				if (!query.trim()) return true;
				const q = query.toLowerCase();
				return (
					p.name.toLowerCase().includes(q) ||
					(p.email?.toLowerCase().includes(q) ?? false) ||
					(p.notes?.toLowerCase().includes(q) ?? false) ||
					(p.tags ?? []).some((t) => t.includes(q))
				);
			})
			.sort((a, b) => a.name.localeCompare(b.name))
	);

	const overdueCount = $derived(userData.people.filter(isOverdue).length);

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
			<Label for="p-tags">Tags <span class="text-muted-foreground">(comma separated)</span></Label>
			<Input id="p-tags" bind:value={fTags} placeholder="family, friends, work" />
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

{#if userData.people.length > 0 && (allTags.length > 0 || overdueCount > 0)}
	<div class="flex flex-wrap items-center gap-1.5">
		{#if overdueCount > 0}
			<button
				type="button"
				onclick={() => (catchUpFilter = !catchUpFilter)}
				class={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
					catchUpFilter
						? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300'
						: 'border-border bg-card hover:bg-muted/50'
				}`}
			>
				<MessageCircle class="size-3" />
				Due to catch up · {overdueCount}
			</button>
		{/if}
		{#each allTags as t (t.tag)}
			{@const active = tagFilter === t.tag}
			<button
				type="button"
				onclick={() => (tagFilter = active ? null : t.tag)}
				class={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
					active
						? 'border-foreground bg-foreground text-background'
						: 'border-border bg-card hover:bg-muted/50'
				}`}
			>
				#{t.tag}
				<span class="ml-1 opacity-60 tabular-nums">{t.n}</span>
			</button>
		{/each}
		{#if tagFilter || catchUpFilter}
			<button
				type="button"
				onclick={() => {
					tagFilter = null;
					catchUpFilter = false;
				}}
				class="rounded-full px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
			>
				Clear
			</button>
		{/if}
	</div>
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
							<DropdownMenu.Item onclick={() => markContacted(p)}>
								<MessageCircle class="size-4" />
								<span>Mark contacted</span>
							</DropdownMenu.Item>
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

				{#if (p.tags ?? []).length > 0}
					<div class="flex flex-wrap gap-1">
						{#each p.tags ?? [] as t (t)}
							<button
								type="button"
								onclick={() => (tagFilter = tagFilter === t ? null : t)}
								class="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-muted"
							>
								#{t}
							</button>
						{/each}
					</div>
				{/if}

				{#if p.email || p.phone}
					<div class="space-y-0.5 text-xs text-muted-foreground">
						{#if p.email}<div class="truncate">{p.email}</div>{/if}
						{#if p.phone}<div class="tabular-nums">{p.phone}</div>{/if}
					</div>
				{/if}

				{#if p.notes}
					<p class="text-xs whitespace-pre-wrap text-muted-foreground">{p.notes}</p>
				{/if}

				<div class="flex items-center justify-between gap-2 border-t border-border/60 pt-2">
					<span
						class={`text-[11px] tabular-nums ${
							isOverdue(p)
								? 'text-amber-600 dark:text-amber-400'
								: 'text-muted-foreground'
						}`}
					>
						<MessageCircle class="mr-1 inline size-3" />
						Last spoke <span class="font-medium">{fmtLastContacted(p)}</span>
					</span>
					<button
						type="button"
						onclick={() => markContacted(p)}
						class="rounded-md px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-muted/60 hover:text-foreground"
					>
						Mark contacted
					</button>
				</div>
			</li>
		{/each}
	</ul>
{/if}

