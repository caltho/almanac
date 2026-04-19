<script lang="ts">
	import { page } from '$app/state';
	let { children } = $props();

	const tabs = [
		{ href: '/assets', label: 'Inventory' },
		{ href: '/assets/net-worth', label: 'Net worth' }
	];

	function isActive(href: string) {
		if (href === '/assets') return page.url.pathname === '/assets';
		return page.url.pathname === href || page.url.pathname.startsWith(href + '/');
	}
</script>

<section class="space-y-6">
	<nav class="-mx-4 -mt-8 mb-2 overflow-x-auto border-b border-border/60 px-4">
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
