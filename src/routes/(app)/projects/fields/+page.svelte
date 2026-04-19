<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { DefsManager } from '$lib/custom-attrs';

	let { data } = $props();
</script>

<section class="mx-auto max-w-2xl space-y-4">
	<header class="flex items-center justify-between">
		<h1 class="text-2xl font-semibold tracking-tight">Project fields</h1>
		<Button variant="ghost" size="sm" href="/projects">Back</Button>
	</header>
	<DefsManager defs={data.defs} tableName="projects" />
</section>
