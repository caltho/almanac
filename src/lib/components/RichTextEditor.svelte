<script lang="ts">
	// Minimal contenteditable rich-text editor used for projects + recipes.
	//
	// Why not import a library: we only need a handful of marks (bold/italic,
	// h2/h3, lists, blockquote, link, hr) and the bundle cost of TipTap /
	// Lexical / ProseMirror is way out of proportion for the feature set.
	// document.execCommand is "deprecated" but every browser still supports
	// it and it does exactly what we need without any dependencies.
	//
	// Output is sanitized server-side (src/lib/server/sanitize-html.ts), so
	// even if a paste survives the browser's contenteditable scrub it gets
	// allowlisted before reaching the DB.

	import { onMount } from 'svelte';
	import Bold from '@lucide/svelte/icons/bold';
	import Italic from '@lucide/svelte/icons/italic';
	import Underline from '@lucide/svelte/icons/underline';
	import Heading2 from '@lucide/svelte/icons/heading-2';
	import Heading3 from '@lucide/svelte/icons/heading-3';
	import List from '@lucide/svelte/icons/list';
	import ListOrdered from '@lucide/svelte/icons/list-ordered';
	import Quote from '@lucide/svelte/icons/quote';
	import LinkIcon from '@lucide/svelte/icons/link';
	import Minus from '@lucide/svelte/icons/minus';
	import Eraser from '@lucide/svelte/icons/eraser';

	type Props = {
		value: string;
		onchange?: (next: string) => void;
		placeholder?: string;
		minHeight?: string;
		/** Optional hidden-input name so the value submits with a plain form action. */
		name?: string;
	};

	let { value = $bindable(''), onchange, placeholder, minHeight = '8rem', name }: Props = $props();

	let editor = $state<HTMLDivElement | null>(null);
	let focused = $state(false);

	// Hydrate the editor from props on mount, and whenever `value` changes
	// from the outside (form reset, etc.) without the editor itself being
	// the source of the change.
	// Direct DOM writes are intentional: we own the contenteditable surface and
	// only re-paint it when an *external* update arrives (form reset, prop set
	// from parent). Svelte never renders content into this node.
	let lastSeen = '';
	$effect(() => {
		if (!editor) return;
		if (value !== lastSeen && document.activeElement !== editor) {
			// eslint-disable-next-line svelte/no-dom-manipulating
			editor.innerHTML = value ?? '';
			lastSeen = value ?? '';
		}
	});

	onMount(() => {
		if (editor && !editor.innerHTML) {
			// eslint-disable-next-line svelte/no-dom-manipulating
			editor.innerHTML = value ?? '';
			lastSeen = value ?? '';
		}
	});

	function emit() {
		if (!editor) return;
		const html = editor.innerHTML;
		lastSeen = html;
		value = html;
		onchange?.(html);
	}

	function exec(command: string, arg?: string) {
		editor?.focus();
		document.execCommand(command, false, arg);
		emit();
	}

	function makeHeading(level: 2 | 3) {
		exec('formatBlock', `H${level}`);
	}

	function makeQuote() {
		exec('formatBlock', 'BLOCKQUOTE');
	}

	function clearFormat() {
		exec('removeFormat');
		exec('formatBlock', 'P');
	}

	function insertHr() {
		exec('insertHorizontalRule');
	}

	function insertLink() {
		const url = prompt('Link URL', 'https://');
		if (!url) return;
		if (!/^(https?:\/\/|mailto:|\/|#)/i.test(url)) return;
		exec('createLink', url);
	}
</script>

<div
	class={`rounded-md border bg-background transition-colors ${focused ? 'border-foreground/40 ring-2 ring-foreground/10' : 'border-input'}`}
>
	<div
		class="flex flex-wrap items-center gap-0.5 border-b border-border/60 px-1 py-1 text-muted-foreground"
	>
		{#snippet btn(label: string, onclick: () => void, icon: typeof Bold)}
			{@const Icon = icon}
			<button
				type="button"
				{onclick}
				class="grid size-7 place-items-center rounded transition-colors hover:bg-muted hover:text-foreground"
				title={label}
				aria-label={label}
			>
				<Icon class="size-3.5" />
			</button>
		{/snippet}
		{@render btn('Bold', () => exec('bold'), Bold)}
		{@render btn('Italic', () => exec('italic'), Italic)}
		{@render btn('Underline', () => exec('underline'), Underline)}
		<span class="mx-0.5 h-4 w-px bg-border"></span>
		{@render btn('Heading 2', () => makeHeading(2), Heading2)}
		{@render btn('Heading 3', () => makeHeading(3), Heading3)}
		{@render btn('Quote', makeQuote, Quote)}
		<span class="mx-0.5 h-4 w-px bg-border"></span>
		{@render btn('Bulleted list', () => exec('insertUnorderedList'), List)}
		{@render btn('Numbered list', () => exec('insertOrderedList'), ListOrdered)}
		<span class="mx-0.5 h-4 w-px bg-border"></span>
		{@render btn('Link', insertLink, LinkIcon)}
		{@render btn('Divider', insertHr, Minus)}
		{@render btn('Clear formatting', clearFormat, Eraser)}
	</div>

	<div
		bind:this={editor}
		role="textbox"
		aria-multiline="true"
		contenteditable="true"
		data-placeholder={placeholder ?? ''}
		class="prose prose-sm max-w-none px-3 py-2 text-sm focus:outline-none dark:prose-invert [&_*]:my-1 [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_h2]:mt-3 [&_h3]:mt-3 [&_hr]:border-border [&_ol]:ml-5 [&_ol]:list-decimal [&_ul]:ml-5 [&_ul]:list-disc"
		style:min-height={minHeight}
		oninput={emit}
		onfocus={() => (focused = true)}
		onblur={() => (focused = false)}
	></div>

	{#if name}
		<input type="hidden" {name} {value} />
	{/if}
</div>

<style>
	[contenteditable][data-placeholder]:empty::before {
		content: attr(data-placeholder);
		color: var(--color-muted-foreground);
		pointer-events: none;
	}
</style>
