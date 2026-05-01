// Render a sanitized rich-text body as a short plain-text preview.
//
// We strip tags rather than render with `{@html}` because previews appear
// inside list cards where layout is fragile. Decoding entities is the
// part that's easy to forget — without it, "Bob & Alice" comes out as
// "Bob &amp; Alice", and a non-breaking space lingers as "&nbsp;".
//
// Runs in both SSR and CSR, so we can't lean on `DOMParser` / `document`.
// Hand-roll the small set of entities that actually appear in our HTML
// (rich-text editor output + sanitizer pass-through).

const NAMED_ENTITIES: Record<string, string> = {
	amp: '&',
	lt: '<',
	gt: '>',
	quot: '"',
	apos: "'",
	nbsp: ' '
};

function decodeEntities(s: string): string {
	return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, body: string) => {
		if (body[0] === '#') {
			const code = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
			if (Number.isFinite(code)) return String.fromCodePoint(code);
			return match;
		}
		const named = NAMED_ENTITIES[body.toLowerCase()];
		return named ?? match;
	});
}

export function htmlPreview(html: string | null | undefined, max = 160): string {
	if (!html) return '';
	const stripped = html.replace(/<[^>]+>/g, ' ');
	const decoded = decodeEntities(stripped);
	const collapsed = decoded.replace(/\s+/g, ' ').trim();
	return collapsed.length > max ? collapsed.slice(0, max).trimEnd() + '…' : collapsed;
}
