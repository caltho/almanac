import Papa from 'papaparse';
import { anz } from './adapters/anz';
import { generic } from './adapters/generic';

export type ParsedRow = {
	row_index: number;
	raw: Record<string, string>;
	posted_at: string | null; // ISO date
	description: string;
	amount: number;
};

export type Adapter = {
	name: string;
	displayName: string;
	sniff: (header: string[]) => boolean;
	parse: (row: string[], header: string[]) => Partial<ParsedRow>;
};

export const ADAPTERS: Adapter[] = [anz, generic];

export type ParseResult = {
	source: string;
	rows: ParsedRow[];
	errors: { row_index: number; reason: string }[];
};

export function parseCsv(text: string): ParseResult {
	const parsed = Papa.parse<string[]>(text.trim(), {
		skipEmptyLines: true
	});

	if (parsed.errors.length > 0) {
		return {
			source: 'unknown',
			rows: [],
			errors: parsed.errors.map((e, i) => ({ row_index: i, reason: e.message }))
		};
	}

	const data = parsed.data;
	if (data.length === 0) {
		return { source: 'unknown', rows: [], errors: [{ row_index: 0, reason: 'Empty file.' }] };
	}

	// Treat the first row as a header. If adapters reject it, fall back to
	// assuming no header (use generic with positional mapping).
	const [rawHeader, ...dataRows] = data;
	const header = rawHeader.map((h) => h.trim().toLowerCase());

	const adapter = ADAPTERS.find((a) => a.sniff(header)) ?? generic;

	const rows: ParsedRow[] = [];
	const errors: { row_index: number; reason: string }[] = [];

	dataRows.forEach((r, i) => {
		try {
			const base = adapter.parse(r, header);
			if (
				!base.posted_at ||
				!base.description ||
				typeof base.amount !== 'number' ||
				Number.isNaN(base.amount)
			) {
				errors.push({ row_index: i, reason: 'Missing date / description / amount.' });
				return;
			}
			rows.push({
				row_index: i,
				raw: Object.fromEntries(header.map((h, idx) => [h, r[idx] ?? ''])),
				posted_at: base.posted_at,
				description: base.description.trim(),
				amount: base.amount
			});
		} catch (e) {
			errors.push({ row_index: i, reason: (e as Error).message });
		}
	});

	return { source: `csv:${adapter.name}`, rows, errors };
}

/**
 * Loosely parse a date string into YYYY-MM-DD. Accepts DD/MM/YYYY, D/M/YYYY,
 * MM/DD/YYYY (AU default is DD/MM), and ISO.
 */
export function parseDate(s: string, prefer: 'dmy' | 'mdy' = 'dmy'): string | null {
	if (!s) return null;
	const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
	if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

	const parts = s.split(/[/.-]/).map((p) => p.trim());
	if (parts.length !== 3) return null;
	const [a, b, c] = parts;
	if (!a || !b || !c) return null;
	const year = c.length === 2 ? `20${c}` : c;
	if (prefer === 'dmy') {
		return `${year}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
	}
	return `${year}-${a.padStart(2, '0')}-${b.padStart(2, '0')}`;
}

/** Parse a currency-ish string like "-$1,234.56" into a number. */
export function parseAmount(s: string): number {
	if (!s) return NaN;
	const cleaned = s.replace(/[\s,$]/g, '');
	const n = Number(cleaned);
	return Number.isFinite(n) ? n : NaN;
}
