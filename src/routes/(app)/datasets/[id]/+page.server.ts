import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	asColumns,
	asRowData,
	MAX_DATASET_COLUMNS,
	type DatasetColumn,
	type DatasetColumnType
} from '$lib/datasets';
import { coerceCellValue, columnSchema, suggestKey } from '$lib/datasets/server';

export const load: PageServerLoad = async ({ params, locals }) => {
	const [{ data: dataset }, { data: rows }] = await Promise.all([
		locals.supabase
			.from('datasets')
			.select('id, owner_id, name, columns, updated_at')
			.eq('id', params.id)
			.maybeSingle(),
		locals.supabase
			.from('dataset_rows')
			.select('id, dataset_id, owner_id, name, data, order_index, updated_at')
			.eq('dataset_id', params.id)
			.order('order_index', { ascending: true })
			.order('created_at', { ascending: true })
	]);

	if (!dataset) throw error(404, 'Dataset not found');

	return {
		dataset,
		rows: rows ?? [],
		canEdit: dataset.owner_id === locals.user!.id
	};
};

async function loadColumns(
	supabase: App.Locals['supabase'],
	id: string
): Promise<DatasetColumn[]> {
	const { data } = await supabase.from('datasets').select('columns').eq('id', id).maybeSingle();
	return asColumns(data?.columns);
}

export const actions: Actions = {
	rename: async ({ request, params, locals }) => {
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		if (!name) return fail(400, { error: 'Name required.' });
		const { error: e } = await locals.supabase
			.from('datasets')
			.update({ name })
			.eq('id', params.id);
		if (e) return fail(500, { error: e.message });
		return { renamed: true };
	},

	addColumn: async ({ request, params, locals }) => {
		const form = await request.formData();
		const label = String(form.get('label') ?? '').trim();
		const type = String(form.get('type') ?? 'text') as DatasetColumnType;

		const cols = await loadColumns(locals.supabase, params.id);
		if (cols.length >= MAX_DATASET_COLUMNS) {
			return fail(400, { error: `At most ${MAX_DATASET_COLUMNS} columns.` });
		}

		const key = suggestKey(label, cols.map((c) => c.key));
		const candidate = { key, label, type };
		const parsed = columnSchema.safeParse(candidate);
		if (!parsed.success) {
			return fail(400, { error: parsed.error.issues[0]?.message ?? 'Invalid column.' });
		}

		const next = [...cols, parsed.data];
		const { error: e } = await locals.supabase
			.from('datasets')
			.update({ columns: next as never })
			.eq('id', params.id);
		if (e) return fail(500, { error: e.message });
		return { columnAdded: parsed.data.key };
	},

	renameColumn: async ({ request, params, locals }) => {
		const form = await request.formData();
		const key = String(form.get('key') ?? '');
		const label = String(form.get('label') ?? '').trim();
		if (!key || !label) return fail(400, { error: 'Missing key/label.' });

		const cols = await loadColumns(locals.supabase, params.id);
		const next = cols.map((c) => (c.key === key ? { ...c, label } : c));
		if (next.length === cols.length && cols.every((c, i) => c.label === next[i].label)) {
			return { columnRenamed: key };
		}
		const { error: e } = await locals.supabase
			.from('datasets')
			.update({ columns: next as never })
			.eq('id', params.id);
		if (e) return fail(500, { error: e.message });
		return { columnRenamed: key };
	},

	deleteColumn: async ({ request, params, locals }) => {
		const form = await request.formData();
		const key = String(form.get('key') ?? '');
		if (!key) return fail(400, { error: 'Missing key.' });

		const cols = await loadColumns(locals.supabase, params.id);
		const next = cols.filter((c) => c.key !== key);

		// Update the dataset's column list. Row data keeps the orphaned key
		// in jsonb; if the user re-adds a column with the same key, the data
		// is still there. (Cheap forgiveness; cleanup is manual.)
		const { error: e } = await locals.supabase
			.from('datasets')
			.update({ columns: next as never })
			.eq('id', params.id);
		if (e) return fail(500, { error: e.message });
		return { columnDeleted: key };
	},

	addRow: async ({ params, locals }) => {
		const { data: last } = await locals.supabase
			.from('dataset_rows')
			.select('order_index')
			.eq('dataset_id', params.id)
			.order('order_index', { ascending: false })
			.limit(1)
			.maybeSingle();

		const { data, error: e } = await locals.supabase
			.from('dataset_rows')
			.insert({
				owner_id: locals.user!.id,
				dataset_id: params.id,
				name: '',
				data: {} as never,
				order_index: (last?.order_index ?? -1) + 1
			})
			.select('id')
			.single();

		if (e) return fail(500, { error: e.message });
		return { rowAdded: data.id };
	},

	updateRow: async ({ request, params, locals }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { error: 'Missing id.' });

		const cols = await loadColumns(locals.supabase, params.id);
		const name = String(form.get('name') ?? '');

		const data: Record<string, unknown> = {};
		for (const c of cols) {
			const raw = form.get(`col:${c.key}`);
			if (raw === null) continue;
			data[c.key] = coerceCellValue(c.type, raw);
		}

		const { error: e } = await locals.supabase
			.from('dataset_rows')
			.update({ name, data: data as never })
			.eq('id', id);
		if (e) return fail(500, { error: e.message });
		return { rowUpdated: id };
	},

	deleteRow: async ({ request, locals }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { error: 'Missing id.' });
		const { error: e } = await locals.supabase.from('dataset_rows').delete().eq('id', id);
		if (e) return fail(500, { error: e.message });
		return { rowDeleted: id };
	},

	deleteDataset: async ({ params, locals }) => {
		await locals.supabase.from('datasets').delete().eq('id', params.id);
		throw redirect(303, '/datasets');
	}
};

