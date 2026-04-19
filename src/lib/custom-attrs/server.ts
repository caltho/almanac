import { fail } from '@sveltejs/kit';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/db/types';
import type { CustomAttrDef, CustomAttrType, UiHints } from './types';
import { ATTR_TYPES } from './types';

/**
 * Load defs for a table, ordered for display.
 */
export async function loadDefs(
	supabase: SupabaseClient<Database>,
	ownerId: string,
	tableName: string
): Promise<CustomAttrDef[]> {
	const { data } = await supabase
		.from('custom_attribute_defs')
		.select('*')
		.eq('owner_id', ownerId)
		.eq('table_name', tableName)
		.order('order_index', { ascending: true })
		.order('created_at', { ascending: true });
	return data ?? [];
}

/**
 * Shared form actions for DefsManager — spread into a page's `actions` object
 * on any route that renders <DefsManager />.
 */
export function defsActions(tableWhitelist: string[]) {
	return {
		addDef: async ({ request, locals }: { request: Request; locals: App.Locals }) => {
			const form = await request.formData();
			const tableName = String(form.get('table_name') ?? '');
			if (!tableWhitelist.includes(tableName)) {
				return fail(400, { error: 'Unknown domain.' });
			}
			const label = String(form.get('label') ?? '').trim();
			const key = String(form.get('key') ?? '').trim();
			const type = String(form.get('type') ?? '') as CustomAttrType;
			const required = form.get('required') === 'on';

			if (!label || label.length > 80) {
				return fail(400, { error: 'Label is required (max 80 chars).' });
			}
			if (!/^[a-z][a-z0-9_]{0,47}$/.test(key)) {
				return fail(400, { error: 'Key must be snake_case, start with a letter.' });
			}
			if (!(ATTR_TYPES as readonly string[]).includes(type)) {
				return fail(400, { error: 'Unknown type.' });
			}

			const ui_hints: UiHints = {};
			if (type === 'select' || type === 'multiselect') {
				const options = String(form.get('options') ?? '')
					.split(',')
					.map((s) => s.trim())
					.filter(Boolean);
				if (options.length === 0) return fail(400, { error: 'Provide at least one option.' });
				ui_hints.options = options;
			}
			if (type === 'rating') {
				const max = Number(form.get('max') ?? 5);
				if (!Number.isInteger(max) || max < 2 || max > 10) {
					return fail(400, { error: 'Max rating must be 2–10.' });
				}
				ui_hints.max = max;
			}

			// Order = append to the end
			const { data: existing } = await locals.supabase
				.from('custom_attribute_defs')
				.select('order_index')
				.eq('owner_id', locals.user!.id)
				.eq('table_name', tableName)
				.order('order_index', { ascending: false })
				.limit(1)
				.maybeSingle();

			const order_index = (existing?.order_index ?? -1) + 1;

			const { error } = await locals.supabase.from('custom_attribute_defs').insert({
				owner_id: locals.user!.id,
				table_name: tableName,
				key,
				label,
				type,
				ui_hints,
				required,
				order_index
			});

			if (error) {
				if (error.code === '23505') return fail(409, { error: 'That key already exists.' });
				return fail(500, { error: error.message });
			}
			return { added: true };
		},

		deleteDef: async ({ request, locals }: { request: Request; locals: App.Locals }) => {
			const form = await request.formData();
			const id = String(form.get('id') ?? '');
			if (!id) return fail(400, { error: 'Missing id.' });
			const { error } = await locals.supabase.from('custom_attribute_defs').delete().eq('id', id);
			if (error) return fail(500, { error: error.message });
			return { deleted: true };
		}
	};
}
