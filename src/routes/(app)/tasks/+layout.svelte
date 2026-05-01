<script lang="ts">
	import { page } from '$app/state';
	let { children } = $props();

	const tabs = [
		{ href: '/tasks', label: 'Tasks' },
		{ href: '/tasks/checklists', label: 'Checklists' },
		{ href: '/tasks/habits', label: 'Habits' },
		{ href: '/tasks/activities', label: 'Activities' }
	];

	function isActive(href: string) {
		const path = page.url.pathname;
		// Tasks is the bare /tasks list — must not light up on sibling sub-routes.
		if (href === '/tasks') {
			if (
				path.startsWith('/tasks/checklists') ||
				path.startsWith('/tasks/habits') ||
				path.startsWith('/tasks/activities')
			)
				return false;
			return path === '/tasks' || path.startsWith('/tasks/');
		}
		return path === href || path.startsWith(href + '/');
	}
</script>

<section class="space-y-6">
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
