<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Avatar from '$lib/components/ui/avatar';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import Settings from '@lucide/svelte/icons/settings';
	import LogOut from '@lucide/svelte/icons/log-out';
	import Users from '@lucide/svelte/icons/users';

	let { children, data } = $props();

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
</script>

<div class="min-h-screen bg-background">
	<header class="border-b border-border/60">
		<div class="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
			<a href="/" class="flex items-center gap-2 font-semibold tracking-tight">
				<span class="text-[10px] tracking-[0.25em] text-muted-foreground uppercase">Almanac</span>
			</a>

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
								<span>Profile</span>
							</a>
						{/snippet}
					</DropdownMenu.Item>
					<DropdownMenu.Item>
						{#snippet child({ props })}
							<a href="/settings/shares" {...props}>
								<Users class="size-4" />
								<span>Shares</span>
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
	</header>

	<main class="mx-auto max-w-5xl px-4 py-8">
		{@render children()}
	</main>
</div>
