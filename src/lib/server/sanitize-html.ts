// Server-side HTML sanitizer for rich-text fields (project bodies, recipe
// ingredients/method). Allowlist-based: only the tags and attributes we
// produce in RichTextEditor.svelte survive. Anything else (scripts, inline
// event handlers, javascript: URLs, style attributes, …) is stripped.
//
// We accept slightly imperfect rendering of pasted-in HTML in exchange for
// not hand-rolling a full HTML parser. The editor itself is the only writer
// in normal use; this is a defense-in-depth check on the way to the DB.

const ALLOWED_TAGS = new Set([
	'p',
	'br',
	'strong',
	'b',
	'em',
	'i',
	'u',
	's',
	'h2',
	'h3',
	'h4',
	'ul',
	'ol',
	'li',
	'blockquote',
	'a',
	'code',
	'pre',
	'hr'
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
	a: new Set(['href'])
};

const URL_SAFE = /^(https?:\/\/|mailto:|\/|#)/i;

/**
 * Sanitize an HTML string. Strips disallowed tags, attributes, and unsafe URLs.
 * The result is safe to write to the DB and render with `{@html ...}`.
 */
export function sanitizeHtml(input: string | null | undefined): string {
	if (!input) return '';
	const trimmed = input.trim();
	if (!trimmed) return '';
	if (trimmed.length > 200_000) {
		// Hard cap — way past anything a human types into a project body.
		return sanitizeFragment(trimmed.slice(0, 200_000));
	}
	return sanitizeFragment(trimmed);
}

function sanitizeFragment(html: string): string {
	let out = '';
	let i = 0;
	const n = html.length;
	while (i < n) {
		const lt = html.indexOf('<', i);
		if (lt === -1) {
			out += escapeText(html.slice(i));
			break;
		}
		out += escapeText(html.slice(i, lt));

		// Comment / CDATA — drop entirely.
		if (html.startsWith('<!--', lt)) {
			const close = html.indexOf('-->', lt + 4);
			i = close === -1 ? n : close + 3;
			continue;
		}

		const gt = html.indexOf('>', lt + 1);
		if (gt === -1) {
			out += escapeText(html.slice(lt));
			break;
		}

		const tagText = html.slice(lt + 1, gt);
		const sanitized = sanitizeTag(tagText);
		if (sanitized) out += sanitized;
		i = gt + 1;
	}
	return out;
}

function sanitizeTag(raw: string): string {
	if (!raw) return '';
	let body = raw.trim();
	const closing = body.startsWith('/');
	if (closing) body = body.slice(1).trim();

	// Self-closing slash on the way out — strip and treat as open tag.
	if (body.endsWith('/')) body = body.slice(0, -1).trim();

	const match = /^([a-zA-Z][a-zA-Z0-9]*)(\s+[\s\S]*)?$/.exec(body);
	if (!match) return '';
	const name = match[1].toLowerCase();
	if (!ALLOWED_TAGS.has(name)) return '';

	if (closing) return `</${name}>`;

	const attrs = match[2] ? sanitizeAttrs(name, match[2]) : '';
	return `<${name}${attrs}>`;
}

function sanitizeAttrs(tag: string, attrText: string): string {
	const allowed = ALLOWED_ATTRS[tag];
	if (!allowed) return '';
	let out = '';
	const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'<>`]+))/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(attrText))) {
		const name = m[1].toLowerCase();
		if (!allowed.has(name)) continue;
		const value = m[3] ?? m[4] ?? m[5] ?? '';
		if (name === 'href' && !URL_SAFE.test(value)) continue;
		out += ` ${name}="${escapeAttr(value)}"`;
	}
	if (tag === 'a') {
		out += ' rel="noopener noreferrer" target="_blank"';
	}
	return out;
}

function escapeText(s: string): string {
	return s.replace(/[&<>]/g, (c) => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'));
}

function escapeAttr(s: string): string {
	return s.replace(/[&"<>]/g, (c) =>
		c === '&' ? '&amp;' : c === '"' ? '&quot;' : c === '<' ? '&lt;' : '&gt;'
	);
}
