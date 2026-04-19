<script lang="ts">
	let { children } = $props();
</script>

<main class="flex min-h-screen items-center justify-center bg-background px-4 py-12">
	<div class="w-full max-w-sm space-y-6">
		<header class="space-y-2 text-center">
			<p class="text-xs tracking-[0.25em] text-muted-foreground uppercase">Almanac</p>
			<h1 class="text-2xl font-semibold tracking-tight">Personal life-tracking PWA</h1>
		</header>
		{@render children()}
	</div>
</main>
