<script lang="ts">
	import { flip } from 'svelte/animate';
	import { fade } from 'svelte/transition';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import Plus from '@lucide/svelte/icons/plus';
	import Check from '@lucide/svelte/icons/check';
	import Activity from '@lucide/svelte/icons/activity';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Archive from '@lucide/svelte/icons/archive';
	import ColorDot from '$lib/components/ColorDot.svelte';
	import {
		useUserData,
		type Activity as ActivityRow,
		type ActivityLog
	} from '$lib/stores/userData.svelte';

	const userData = useUserData();

	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const todayIso = today.toISOString().slice(0, 10);
	const todayLabel = today.toLocaleDateString(undefined, {
		weekday: 'long',
		day: 'numeric',
		month: 'long'
	});

	let busy = $state<Record<string, boolean>>({});
	let burst = $state<Set<string>>(new Set());
	let newName = $state('');

	function isLoggedToday(activity_id: string): boolean {
		return userData.activityLogs.some(
			(l) => l.activity_id === activity_id && l.log_date === todayIso
		);
	}

	const sortedActivities = $derived(
		userData.activities
			.slice()
			.sort((a, b) => a.order_index - b.order_index || a.name.localeCompare(b.name))
	);

	const due = $derived(sortedActivities.filter((a) => !isLoggedToday(a.id)));
	const done = $derived(sortedActivities.filter((a) => isLoggedToday(a.id)));

	async function toggle(activity: ActivityRow) {
		const wasLogged = isLoggedToday(activity.id);
		const tempId = `tmp-${Math.random().toString(36).slice(2)}`;
		userData.toggleActivityLog(activity.id, todayIso, !wasLogged, tempId);

		if (!wasLogged) {
			burst = new Set([...burst, activity.id]);
			setTimeout(() => {
				burst.delete(activity.id);
				burst = new Set(burst);
			}, 800);
		}

		busy[activity.id] = true;
		try {
			const res = await fetch('/tracking/activities/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					op: 'toggle',
					activity_id: activity.id,
					log_date: todayIso,
					on: !wasLogged
				})
			});
			if (!res.ok) throw new Error(await res.text());
			const body = (await res.json()) as { log?: ActivityLog };
			if (body.log) userData.replaceActivityLog(tempId, body.log);
		} catch {
			userData.toggleActivityLog(activity.id, todayIso, wasLogged);
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
			const res = await fetch('/tracking/activities/api', {
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
			const res = await fetch('/tracking/activities/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ op: 'archive', id: activity.id })
			});
			if (!res.ok) throw new Error();
		} catch {
			userData.addActivity(activity);
		}
	}
</script>

<header class="space-y-1">
	<h1 class="text-2xl font-semibold tracking-tight">Activities</h1>
	<p class="text-sm text-muted-foreground">
		Tap what you did today — {todayLabel}.
	</p>
</header>

<form onsubmit={createActivity} class="flex items-center gap-2 rounded-lg border bg-muted/20 p-2">
	<Plus class="ml-2 size-4 text-muted-foreground" />
	<Input
		bind:value={newName}
		placeholder="New activity…"
		class="h-8 border-transparent bg-transparent shadow-none focus:border-input focus:bg-background"
	/>
	<Button type="submit" size="sm" disabled={!newName.trim()}>Add</Button>
</form>

{#if userData.activities.length === 0}
	<div class="rounded-lg border border-dashed p-12 text-center">
		<Activity class="mx-auto mb-3 size-10 text-muted-foreground/60" />
		<p class="text-sm text-muted-foreground">No activities yet. Add one above.</p>
	</div>
{:else}
	<!-- Not logged today -->
	{#if due.length > 0}
		<section class="space-y-2">
			<h2
				class="flex items-center gap-2 text-xs font-semibold tracking-widest text-amber-600 uppercase dark:text-amber-400"
			>
				<Activity class="size-3.5" />
				Today · {due.length}
			</h2>
			<ul
				class="divide-y divide-border rounded-lg border border-amber-300/60 bg-amber-50/40 dark:border-amber-500/30 dark:bg-amber-500/5"
			>
				{#each due as a (a.id)}
					<li animate:flip={{ duration: 350 }} class="flex items-center gap-3 p-3">
						<button
							type="button"
							onclick={() => toggle(a)}
							class="flex min-w-0 flex-1 items-center gap-2 text-left"
							disabled={busy[a.id]}
						>
							<ColorDot token={a.color} />
							<span class="font-medium">{a.name}</span>
						</button>
						<Button onclick={() => toggle(a)} size="sm" class="gap-1.5" disabled={busy[a.id]}>
							<Check class="size-3.5" />
							Did it
						</Button>
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
		</section>
	{/if}

	<!-- Logged today -->
	{#if done.length > 0}
		<section class="space-y-2">
			<h2
				class="flex items-center gap-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase"
			>
				<Check class="size-3.5" />
				Logged · {done.length}
			</h2>
			<ul class="divide-y divide-border rounded-lg border">
				{#each done as a (a.id)}
					{@const burstHere = burst.has(a.id)}
					<li animate:flip={{ duration: 350 }} class="relative flex items-center gap-3 p-3">
						<button
							type="button"
							onclick={() => toggle(a)}
							class="flex min-w-0 flex-1 items-center gap-2 text-left opacity-90"
							disabled={busy[a.id]}
						>
							<ColorDot token={a.color} />
							<span class="font-medium">{a.name}</span>
						</button>
						<Button
							onclick={() => toggle(a)}
							size="sm"
							variant="outline"
							class="gap-1.5"
							disabled={busy[a.id]}
							title="Untick"
						>
							<Check class="size-3.5" />
							Done
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							aria-label="Archive activity"
							onclick={() => archive(a)}
						>
							<Archive class="size-4" />
						</Button>

						{#if burstHere}
							<span
								class="pointer-events-none absolute inset-0 grid place-items-center"
								out:fade={{ duration: 800 }}
							>
								<span
									class="flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white shadow-lg"
									style="animation: activity-burst 800ms ease-out forwards;"
								>
									<Sparkles class="size-3" />
									Logged!
								</span>
							</span>
						{/if}
					</li>
				{/each}
			</ul>
		</section>
	{/if}
{/if}

<style>
	@keyframes activity-burst {
		0% {
			transform: scale(0.6) translateY(0);
			opacity: 0;
		}
		25% {
			transform: scale(1.05) translateY(0);
			opacity: 1;
		}
		70% {
			transform: scale(1) translateY(-4px);
			opacity: 1;
		}
		100% {
			transform: scale(0.9) translateY(-12px);
			opacity: 0;
		}
	}
</style>
