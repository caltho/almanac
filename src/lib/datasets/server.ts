import { z } from 'zod';
import {
	DATASET_COLUMN_TYPES,
	MAX_DATASET_COLUMNS,
	type DatasetColumn,
	type DatasetColumnType
} from './types';

const KEY_RE = /^[a-z][a-z0-9_]{0,31}$/;

export const columnSchema = z.object({
	key: z.string().regex(KEY_RE, 'Key must be snake_case, start with a letter, ≤32 chars.'),
	label: z.string().min(1).max(64),
	type: z.enum(DATASET_COLUMN_TYPES)
});

export const columnsSchema = z.array(columnSchema).max(MAX_DATASET_COLUMNS);

/** Parse and validate the columns blob coming from a form. */
export function parseColumns(input: unknown): DatasetColumn[] {
	return columnsSchema.parse(input);
}

/** Generate a snake_case key from a label, with a uniqueness suffix if needed. */
export function suggestKey(label: string, existing: string[]): string {
	const base =
		label
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '_')
			.replace(/^_+|_+$/g, '')
			.slice(0, 24) || 'col';
	const safe = /^[a-z]/.test(base) ? base : `c_${base}`;
	if (!existing.includes(safe)) return safe;
	let i = 2;
	while (existing.includes(`${safe}_${i}`)) i++;
	return `${safe}_${i}`;
}

/**
 * Coerce a single raw cell value to its declared column type. Used when
 * persisting a row update so we don't store '"42"' for a number column.
 */
export function coerceCellValue(type: DatasetColumnType, raw: unknown): unknown {
	if (raw === null || raw === undefined || raw === '') return null;
	if (type === 'number') {
		const n = typeof raw === 'number' ? raw : Number(String(raw));
		return Number.isFinite(n) ? n : null;
	}
	if (type === 'date') {
		const s = String(raw);
		return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
	}
	return String(raw);
}
