<script lang="ts">
	import { page } from '$app/state';
	let { children } = $props();

	const tabs = [
		{ href: '/finance', label: 'Dashboard' },
		{ href: '/finance/transactions', label: 'Transactions' },
		{ href: '/finance/categories', label: 'Categories' },
		{ href: '/finance/budgets', label: 'Budgets' },
		{ href: '/finance/assets', label: 'Stuff' },
		{ href: '/finance/assets/net-worth', label: 'Net worth' },
		{ href: '/finance/import', label: 'Import' }
	];

	function isActive(href: string) {
		const path = page.url.pathname;
		if (href === '/finance') return path === '/finance';
		// Stuff covers all of /finance/assets EXCEPT /finance/assets/net-worth.
		if (href === '/finance/assets') {
			if (path.startsWith('/finance/assets/net-worth')) return false;
			return path === '/finance/assets' || path.startsWith('/finance/assets/');
		}
		return path === href || path.startsWith(href + '/');
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
