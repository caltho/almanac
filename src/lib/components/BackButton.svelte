<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	let {
		href,
		label = 'Back'
	}: {
		href: string;
		label?: string;
	} = $props();
</script>

<a
	{href}
	aria-label={label}
	class="-ml-1 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
>
	<ArrowLeft class="size-4" />
</a>
