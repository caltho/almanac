import { z } from 'zod';
import type { CustomAttrDef, UiHints } from './types';

/**
 * Parse a FormData object into typed custom-attribute values keyed by def.key.
 * Unknown keys are ignored. Returns { values, errors } — errors keyed by def.key.
 */
export function parseCustomFormData(
	defs: CustomAttrDef[],
	form: FormData
): { values: Record<string, unknown>; errors: Record<string, string> } {
	const values: Record<string, unknown> = {};
	const errors: Record<string, string> = {};

	for (const def of defs) {
		const raw = readRaw(def, form);
		const parsed = parseField(def, raw);
		if (parsed.success) {
			// Drop undefined so missing-optional fields don't clutter jsonb.
			if (parsed.data !== undefined) {
				values[def.key] = parsed.data;
			}
		} else {
			errors[def.key] = parsed.error;
		}
	}

	return { values, errors };
}

function readRaw(def: CustomAttrDef, form: FormData): unknown {
	const key = `custom.${def.key}`;
	if (def.type === 'multiselect') {
		return form.getAll(key).map(String);
	}
	const v = form.get(key);
	return v === null ? undefined : v;
}

function parseField(
	def: CustomAttrDef,
	raw: unknown
): { success: true; data: unknown } | { success: false; error: string } {
	const isEmpty =
		raw === undefined || raw === null || raw === '' || (Array.isArray(raw) && raw.length === 0);

	if (isEmpty) {
		if (def.required) return { success: false, error: `${def.label} is required.` };
		return { success: true, data: undefined };
	}

	const hints = (def.ui_hints ?? {}) as UiHints;
	const schema = zodForDef(def, hints);
	const result = schema.safeParse(raw);
	if (!result.success) {
		return { success: false, error: result.error.issues[0]?.message ?? 'Invalid value.' };
	}
	return { success: true, data: result.data };
}

function zodForDef(def: CustomAttrDef, hints: UiHints) {
	switch (def.type) {
		case 'text':
		case 'longtext':
			return z.string().min(1);
		case 'url':
			return z.string().url();
		case 'number': {
			let s = z.coerce.number();
			if (typeof hints.min === 'number') s = s.min(hints.min);
			if (typeof hints.max === 'number') s = s.max(hints.max);
			return s;
		}
		case 'boolean':
			return z
				.union([z.boolean(), z.string()])
				.transform((v) => v === true || v === 'on' || v === 'true');
		case 'date':
			return z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD.');
		case 'datetime':
			return z.coerce.date().transform((d) => d.toISOString());
		case 'select':
			return z.string().refine((v) => hints.options?.includes(v), 'Not a valid choice.');
		case 'multiselect':
			return z
				.array(z.string())
				.refine(
					(arr) => arr.every((v) => hints.options?.includes(v)),
					'One or more choices are invalid.'
				);
		case 'rating': {
			const max = hints.max ?? 5;
			return z.coerce.number().int().min(1).max(max);
		}
	}
}

/**
 * Turn a persisted values object back into form-safe strings for the editor
 * to seed initial input values.
 */
export function valueToFormString(def: CustomAttrDef, value: unknown): string {
	if (value === undefined || value === null) return '';
	if (def.type === 'boolean') return value ? 'on' : '';
	if (def.type === 'datetime' && typeof value === 'string') {
		// ISO → datetime-local
		return value.slice(0, 16);
	}
	if (Array.isArray(value)) return value.join(',');
	return String(value);
}
