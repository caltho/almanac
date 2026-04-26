// Minimal allowlist HTML sanitizer for the rich-text page editor.
//
// Server-only — runs on every save. Keeps the dependency graph small (no
// sanitize-html / DOMPurify). Tradeoff: a tag-walking regex sanitizer is
// strictly less robust than a real HTML parser. Acceptable here because:
//   - Input comes from contenteditable + execCommand on the same user's
//     browser, so the structure is well-behaved HTML, not adversarial.
//   - The threat model is limited: pages are owner-only by default; sharing
//     a page with someone you don't trust is opt-in and explicit.
//   - We strip <script>/<style>/<iframe> wholesale, drop all `on*` handlers,
//     and gate URI schemes — the realistic XSS vectors.
//
// If we ever open page sharing more broadly, swap this for `sanitize-html`
// or DOMPurify and call it the same way.

const ALLOWED_TAGS = new Set([
	'p',
	'br',
	'strong',
	'b',
	'em',
	'i',
	'u',
	's',
	'h1',
	'h2',
	'h3',
	'h4',
	'h5',
	'h6',
	'ul',
	'ol',
	'li',
	'a',
	'blockquote',
	'code',
	'pre',
	'span',
	'div',
	'hr'
]);

const VOID_TAGS = new Set(['br', 'hr']);

const ALLOWED_ATTRS: Record<string, ReadonlySet<string>> = {
	a: new Set(['href'])
};

const SAFE_URI = /^(?:https?:|mailto:|tel:|\/|#)/i;

function escapeAttr(v: string): string {
	return v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

export function sanitizeHtml(input: string): string {
	if (!input) return '';

	let html = input
		// Strip comments and the script/style/iframe families (with content).
		.replace(/<!--[\s\S]*?-->/g, '')
		.replace(
			/<(script|style|iframe|object|embed|noscript|template)\b[\s\S]*?<\/\1\s*>/gi,
			''
		)
		// Self-closing or unmatched dangerous tags.
		.replace(/<(script|style|iframe|object|embed|link|meta|noscript)\b[^>]*>/gi, '');

	// Walk every remaining tag; drop disallowed, scrub attributes on allowed.
	html = html.replace(
		/<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^>]*)?)\s*\/?\s*>/g,
		(_match, slash: string, rawTag: string, rawAttrs: string) => {
			const tag = rawTag.toLowerCase();
			if (!ALLOWED_TAGS.has(tag)) return '';
			if (slash) return `</${tag}>`;

			const allowed = ALLOWED_ATTRS[tag];
			let cleanAttrs = '';
			let isExternalLink = false;

			if (allowed && rawAttrs) {
				const attrRe =
					/([a-zA-Z_:][a-zA-Z0-9._:-]*)\s*(?:=\s*("[^"]*"|'[^']*'|[^\s>]+))?/g;
				let m: RegExpExecArray | null;
				while ((m = attrRe.exec(rawAttrs))) {
					const name = m[1].toLowerCase();
					if (!allowed.has(name)) continue;
					let val = m[2] ?? '';
					if (
						(val.startsWith('"') && val.endsWith('"')) ||
						(val.startsWith("'") && val.endsWith("'"))
					) {
						val = val.slice(1, -1);
					}
					if (name === 'href') {
						if (!SAFE_URI.test(val)) continue;
						if (/^https?:/i.test(val)) isExternalLink = true;
					}
					cleanAttrs += ` ${name}="${escapeAttr(val)}"`;
				}
			}

			// Force noopener/noreferrer + new-tab for external links.
			if (tag === 'a' && isExternalLink) {
				cleanAttrs += ' target="_blank" rel="noopener noreferrer"';
			}

			return `<${tag}${cleanAttrs}${VOID_TAGS.has(tag) ? '/' : ''}>`;
		}
	);

	return html;
}
