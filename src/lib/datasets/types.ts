import type { Database } from '$lib/db/types';

export type DatasetRow = Database['public']['Tables']['datasets']['Row'];
export type DatasetRowRow = Database['public']['Tables']['dataset_rows']['Row'];

export const DATASET_COLUMN_TYPES = ['text', 'number', 'date'] as const;
export type DatasetColumnType = (typeof DATASET_COLUMN_TYPES)[number];

export const DATASET_COLUMN_TYPE_LABELS: Record<DatasetColumnType, string> = {
	text: 'Text',
	number: 'Number',
	date: 'Date'
};

export type DatasetColumn = {
	key: string;
	label: string;
	type: DatasetColumnType;
};

export const MAX_DATASET_COLUMNS = 7;

/** Coerce raw jsonb (validated server-side already) into typed columns. */
export function asColumns(raw: unknown): DatasetColumn[] {
	if (!Array.isArray(raw)) return [];
	const out: DatasetColumn[] = [];
	for (const c of raw) {
		if (
			c &&
			typeof c === 'object' &&
			typeof (c as Record<string, unknown>).key === 'string' &&
			typeof (c as Record<string, unknown>).label === 'string' &&
			typeof (c as Record<string, unknown>).type === 'string' &&
			(DATASET_COLUMN_TYPES as readonly string[]).includes(
				(c as Record<string, unknown>).type as string
			)
		) {
			out.push(c as DatasetColumn);
		}
	}
	return out;
}

/** Coerce raw jsonb row data to a key→value map. */
export function asRowData(raw: unknown): Record<string, unknown> {
	if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
		return raw as Record<string, unknown>;
	}
	return {};
}
