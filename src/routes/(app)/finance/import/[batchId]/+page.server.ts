import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const [{ data: batch }, { data: rows }, { data: categories }] = await Promise.all([
		locals.supabase.from('import_batches').select('*').eq('id', params.batchId).maybeSingle(),
		locals.supabase
			.from('import_staging_rows')
			.select('*')
			.eq('batch_id', params.batchId)
			.order('row_index'),
		locals.supabase.from('categories').select('id, name, color, parent_id').order('name')
	]);

	if (!batch) throw error(404, 'Batch not found');

	return { batch, rows: rows ?? [], categories: categories ?? [] };
};

export const actions: Actions = {
	updateRow: async ({ request, locals }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const catRaw = String(form.get('confirmed_category_id') ?? '');
		const include = form.get('include') === 'on';
		const confirmed_category_id = catRaw || null;

		if (!id) return fail(400, { error: 'Missing id.' });

		const { error: e } = await locals.supabase
			.from('import_staging_rows')
			.update({ confirmed_category_id, include })
			.eq('id', id);
		if (e) return fail(500, { error: e.message });
		return { updated: true };
	},

	confirm: async ({ params, locals }) => {
		const [{ data: batch }, { data: rows }] = await Promise.all([
			locals.supabase.from('import_batches').select('*').eq('id', params.batchId).maybeSingle(),
			locals.supabase
				.from('import_staging_rows')
				.select('*')
				.eq('batch_id', params.batchId)
				.eq('include', true)
		]);

		if (!batch) return fail(404, { error: 'Batch not found.' });
		if (batch.status !== 'staged') return fail(400, { error: 'Batch already processed.' });

		const toInsert = (rows ?? [])
			.filter((r) => r.posted_at && r.description && typeof r.amount === 'number')
			.map((r) => ({
				owner_id: locals.user!.id,
				posted_at: r.posted_at!,
				description: r.description!,
				amount: r.amount!,
				category_id: r.confirmed_category_id ?? r.proposed_category_id ?? null,
				source: batch.source ?? 'csv',
				raw: r.raw as never
			}));

		if (toInsert.length === 0) {
			return fail(400, { error: 'Nothing selected for import.' });
		}

		// Insert — dedupe unique index may drop some silently on conflict.
		// Use upsert with ignoreDuplicates to tolerate.
		const { data: inserted, error: insertError } = await locals.supabase
			.from('transactions')
			.upsert(toInsert, {
				onConflict: 'owner_id,posted_at,amount,description_hash',
				ignoreDuplicates: true
			})
			.select('id');

		if (insertError) return fail(500, { error: insertError.message });

		await locals.supabase
			.from('import_batches')
			.update({
				status: 'confirmed',
				confirmed_rows: inserted?.length ?? 0,
				confirmed_at: new Date().toISOString()
			})
			.eq('id', params.batchId);

		throw redirect(303, '/finance/transactions');
	},

	cancel: async ({ params, locals }) => {
		await locals.supabase
			.from('import_batches')
			.update({ status: 'cancelled' })
			.eq('id', params.batchId);
		throw redirect(303, '/finance/import');
	}
};
