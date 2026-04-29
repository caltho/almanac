// Shared 8-color palette used everywhere we let the user tag a row with a
// color (projects, activities, shopping items, recipes, …).
//
// Tokens (not hex) are stored in the DB so the palette can be re-tuned in CSS
// without rewriting rows. Hex values below are colorblind-friendly
// (Wong / Okabe-Ito-derived), distinguishable in deuteranopia and protanopia.
//
// ColorPicker reads from PALETTE; consumers map a row's `color` token through
// `paletteHex(token)` (or use the `data-color` attribute + the CSS rules in
// layout.css) to render swatches.

export const PALETTE_TOKENS = [
	'slate',
	'red',
	'orange',
	'yellow',
	'green',
	'teal',
	'blue',
	'purple'
] as const;

export type PaletteToken = (typeof PALETTE_TOKENS)[number];

export const PALETTE: Record<PaletteToken, { label: string; hex: string }> = {
	slate: { label: 'Slate', hex: '#6B7280' },
	red: { label: 'Red', hex: '#D55E00' },
	orange: { label: 'Orange', hex: '#E69F00' },
	yellow: { label: 'Yellow', hex: '#E2C044' },
	green: { label: 'Green', hex: '#009E73' },
	teal: { label: 'Teal', hex: '#56B4E9' },
	blue: { label: 'Blue', hex: '#0072B2' },
	purple: { label: 'Purple', hex: '#CC79A7' }
};

export function isPaletteToken(v: unknown): v is PaletteToken {
	return typeof v === 'string' && (PALETTE_TOKENS as readonly string[]).includes(v);
}

/** Resolve a palette token to its hex, or null when no/unknown token. */
export function paletteHex(token: string | null | undefined): string | null {
	if (!token) return null;
	return isPaletteToken(token) ? PALETTE[token].hex : null;
}

export function paletteLabel(token: string | null | undefined): string {
	if (!token) return 'No color';
	return isPaletteToken(token) ? PALETTE[token].label : 'No color';
}
