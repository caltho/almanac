<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import * as Avatar from '$lib/components/ui/avatar';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import Settings from '@lucide/svelte/icons/settings';
	import LogOut from '@lucide/svelte/icons/log-out';
	import { NAV_ITEMS } from '$lib/nav';
	import { setUserData } from '$lib/stores/userData.svelte';

	let { children, data } = $props();

	// Hydrate the per-request store from the layout's hot-data load. Re-runs
	// whenever `data.userData` changes (e.g. after a form action's `update()`
	// or an explicit `invalidate('almanac:userData')`), so all child pages
	// reading from `useUserData()` see fresh values without a re-mount.
	// svelte-ignore state_referenced_locally
	const userData = setUserData(data.userData);
	$effect(() => {
		userData.hydrate(data.userData);
	});

	const displayName = $derived(
		data.profile?.display_name ?? data.user?.email?.split('@')[0] ?? 'You'
	);
	const initials = $derived(
		displayName
			.split(/\s+/)
			.map((s: string) => s[0])
			.join('')
			.slice(0, 2)
			.toUpperCase()
	);

	const currentMilestone = 7;
	const visibleNav = $derived(NAV_ITEMS.filter((n) => n.milestone <= currentMilestone));

	function isActive(href: string) {
		return page.url.pathname === href || page.url.pathname.startsWith(href + '/');
	}
</script>

<div class="min-h-screen bg-background">
	<header class="border-b border-border/60">
		<div class="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
			<a href="/" class="flex items-center gap-2 font-semibold tracking-tight">
				<span class="text-[10px] tracking-[0.25em] text-muted-foreground uppercase">Almanac</span>
			</a>

			<nav class="hidden items-center gap-1 md:flex">
				{#each visibleNav as item (item.href)}
					{@const Icon = item.icon}
					<a
						href={item.href}
						class={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors ${
							isActive(item.href)
								? 'bg-muted text-foreground'
								: 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
						}`}
					>
						<Icon class="size-4" />
						<span>{item.label}</span>
					</a>
				{/each}
			</nav>

			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<Button {...props} variant="ghost" size="sm" class="gap-2">
							<Avatar.Root class="size-7">
								<Avatar.Image src={data.profile?.avatar_url} alt={displayName} />
								<Avatar.Fallback class="text-xs">{initials}</Avatar.Fallback>
							</Avatar.Root>
							<span class="hidden text-sm sm:inline">{displayName}</span>
						</Button>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="end" class="w-48">
					<DropdownMenu.Label class="text-xs font-normal text-muted-foreground">
						{data.user?.email}
					</DropdownMenu.Label>
					<DropdownMenu.Separator />
					<DropdownMenu.Item>
						{#snippet child({ props })}
							<a href="/settings" {...props}>
								<Settings class="size-4" />
								<span>Settings</span>
							</a>
						{/snippet}
					</DropdownMenu.Item>
					<DropdownMenu.Separator />
					<DropdownMenu.Item>
						{#snippet child({ props })}
							<form method="POST" action="/auth/signout" class="w-full">
								<button type="submit" class="flex w-full items-center gap-2" {...props}>
									<LogOut class="size-4" />
									<span>Sign out</span>
								</button>
							</form>
						{/snippet}
					</DropdownMenu.Item>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</div>

		<!-- Mobile nav -->
		<nav class="flex gap-1 overflow-x-auto border-t border-border/40 px-2 py-2 md:hidden">
			{#each visibleNav as item (item.href)}
				{@const Icon = item.icon}
				<a
					href={item.href}
					class={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs ${
						isActive(item.href)
							? 'bg-muted text-foreground'
							: 'text-muted-foreground hover:bg-muted/60'
					}`}
				>
					<Icon class="size-3.5" />
					<span>{item.label}</span>
				</a>
			{/each}
		</nav>
	</header>

	<main class="mx-auto max-w-5xl space-y-6 px-4 py-6">
		{@render children()}
	</main>
</div>
