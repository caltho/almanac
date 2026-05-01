<script lang="ts">
	import { page } from '$app/state';
	let { children } = $props();

	const tabs = [
		{ href: '/settings', label: 'Profile' },
		{ href: '/settings/fields', label: 'Fields' },
		{ href: '/settings/shares', label: 'Shares' }
	];

	function isActive(href: string) {
		const path = page.url.pathname;
		if (href === '/settings') return path === '/settings';
		return path === href || path.startsWith(href + '/');
	}
</script>

<section class="mx-auto max-w-3xl space-y-6">
	<nav class="-mx-4 -mt-6 overflow-x-auto border-b border-border/60 px-4">
		<ul class="flex items-center gap-1">
			{#each tabs as t (t.href)}
				<li>
					<a
						href={t.href}
						class={`inline-block border-b-2 px-3 py-3 text-sm transition-colors ${
							isActive(t.href)
								? 'border-foreground text-foreground'
								: 'border-transparent text-muted-foreground hover:text-foreground'
						}`}
					>
						{t.label}
					</a>
				</li>
			{/each}
		</ul>
	</nav>

	{@render children()}
</section>
