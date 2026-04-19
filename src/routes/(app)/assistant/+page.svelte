<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Send from '@lucide/svelte/icons/send';
	import { tick } from 'svelte';

	type Msg = { role: 'user' | 'assistant'; content: string };

	let messages = $state<Msg[]>([]);
	let input = $state('');
	let busy = $state(false);
	let err = $state<string | null>(null);
	let listEl: HTMLDivElement | null = $state(null);

	async function send() {
		const text = input.trim();
		if (!text || busy) return;
		input = '';
		err = null;
		messages = [...messages, { role: 'user', content: text }];
		busy = true;
		await tick();
		scrollToBottom();

		try {
			const res = await fetch('/api/ai', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ messages })
			});
			if (!res.ok) {
				const txt = await res.text();
				throw new Error(txt || `HTTP ${res.status}`);
			}
			const body = (await res.json()) as Msg;
			messages = [...messages, body];
		} catch (e) {
			err = e instanceof Error ? e.message : 'Request failed';
		} finally {
			busy = false;
			await tick();
			scrollToBottom();
		}
	}

	function scrollToBottom() {
		if (listEl) listEl.scrollTop = listEl.scrollHeight;
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			send();
		}
	}

	function reset() {
		messages = [];
		err = null;
	}
</script>

<section class="flex min-h-[calc(100vh-8rem)] flex-col gap-4">
	<header class="flex items-start justify-between">
		<div class="space-y-1">
			<h1 class="flex items-center gap-2 text-2xl font-semibold tracking-tight">
				<Sparkles class="size-5" />
				<span>Assistant</span>
			</h1>
			<p class="text-sm text-muted-foreground">
				Ask for summaries, log things with natural language, query your data. Runs server-side with
				access to your domains only.
			</p>
		</div>
		{#if messages.length > 0}
			<Button variant="ghost" size="sm" onclick={reset}>Clear</Button>
		{/if}
	</header>

	<div
		bind:this={listEl}
		class="flex min-h-[20rem] flex-1 flex-col gap-4 overflow-y-auto rounded-md border bg-muted/20 p-4"
	>
		{#if messages.length === 0}
			<div class="m-auto max-w-md space-y-3 text-center text-sm text-muted-foreground">
				<p>Try:</p>
				<ul class="space-y-1">
					<li><em>"Log that I slept 7.5 hours with quality 8 last night."</em></li>
					<li><em>"Add a task to renew car rego due next Monday."</em></li>
					<li><em>"What did I spend on groceries this month?"</em></li>
					<li><em>"Show me last week's journal entries."</em></li>
				</ul>
			</div>
		{:else}
			{#each messages as m, i (i)}
				<div
					class={`max-w-2xl rounded-md px-3 py-2 text-sm ${
						m.role === 'user'
							? 'self-end bg-primary text-primary-foreground'
							: 'self-start border bg-background'
					}`}
				>
					<div class="whitespace-pre-wrap">{m.content}</div>
				</div>
			{/each}
			{#if busy}
				<div class="self-start rounded-md border bg-background px-3 py-2 text-sm">
					<span class="animate-pulse text-muted-foreground">Thinking…</span>
				</div>
			{/if}
		{/if}
	</div>

	{#if err}
		<div class="rounded-md border border-destructive/30 px-3 py-2 text-sm text-destructive">
			{err}
			{#if err.includes('ANTHROPIC_API_KEY')}
				<span class="text-xs text-muted-foreground">
					Add ANTHROPIC_API_KEY to the Vercel project env to enable the assistant.
				</span>
			{/if}
		</div>
	{/if}

	<form
		onsubmit={(e) => {
			e.preventDefault();
			send();
		}}
		class="flex items-end gap-2"
	>
		<Textarea
			bind:value={input}
			onkeydown={onKey}
			rows={2}
			placeholder="Ask or log something… (Ctrl+Enter to send)"
			disabled={busy}
			class="flex-1 resize-none"
		/>
		<Button type="submit" disabled={busy || input.trim() === ''}>
			<Send class="size-4" />
			<span>Send</span>
		</Button>
	</form>
</section>
