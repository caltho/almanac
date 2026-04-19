import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { parseCsv, categoriseByRules } from '$lib/finance';

export const load: PageServerLoad = async ({ locals }) => {
	const { data: batches } = await locals.supabase
		.from('import_batches')
		.select(
			'id, filename, source, total_rows, confirmed_rows, duplicate_rows, status, created_at, confirmed_at'
		)
		.order('created_at', { ascending: false })
		.limit(20);
	return { batches: batches ?? [] };
};

export const actions: Actions = {
	upload: async ({ request, locals }) => {
		const form = await request.formData();
		const file = form.get('file');
		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { error: 'Choose a CSV file.' });
		}
		if (file.size > 2 * 1024 * 1024) {
			return fail(400, { error: 'File too large (max 2 MB).' });
		}
		const text = await file.text();
		const parsed = parseCsv(text);

		if (parsed.rows.length === 0) {
			return fail(400, {
				error: parsed.errors[0]?.reason ?? 'No transactions found in file.'
			});
		}

		// Load categories (with rules) once for rule-based pre-categorisation.
		const { data: categories } = await locals.supabase
			.from('categories')
			.select('id, parent_id, name, rules, color');

		// Look up existing transactions in the date window for dedupe
		// against (posted_at, amount, description_hash).
		const dates = parsed.rows.map((r) => r.posted_at!).sort();
		const { data: existing } = await locals.supabase
			.from('transactions')
			.select('id, posted_at, amount, description_hash')
			.is('deleted_at', null)
			.gte('posted_at', dates[0])
			.lte('posted_at', dates[dates.length - 1]);

		const existingKeys = new Set(
			(existing ?? []).map((t) => `${t.posted_at}|${t.amount}|${t.description_hash}`)
		);

		function md5Hash(s: string): Promise<string> {
			// We're on Node (server). Use crypto.subtle for small strings.
			return import('node:crypto').then((m) =>
				m.createHash('md5').update(s.toLowerCase()).digest('hex')
			);
		}

		// Create batch
		const { data: batch, error: batchError } = await locals.supabase
			.from('import_batches')
			.insert({
				owner_id: locals.user!.id,
				filename: file.name,
				source: parsed.source,
				total_rows: parsed.rows.length
			})
			.select('id')
			.single();

		if (batchError) return fail(500, { error: batchError.message });

		// Build staging rows — propose by rule (skip trgm for speed; user can fix).
		let dupeCount = 0;
		const stagingRows = await Promise.all(
			parsed.rows.map(async (r) => {
				const proposed_category_id = categoriseByRules(categories ?? [], r.description);
				const hash = await md5Hash(r.description);
				const key = `${r.posted_at}|${r.amount}|${hash}`;
				const is_duplicate = existingKeys.has(key);
				if (is_duplicate) dupeCount++;
				return {
					batch_id: batch.id,
					owner_id: locals.user!.id,
					row_index: r.row_index,
					raw: r.raw as never,
					posted_at: r.posted_at,
					description: r.description,
					amount: r.amount,
					proposed_category_id,
					proposed_source: is_duplicate
						? 'duplicate'
						: proposed_category_id
							? 'rule'
							: 'unclassified',
					is_duplicate,
					include: !is_duplicate
				};
			})
		);

		const { error: insertError } = await locals.supabase
			.from('import_staging_rows')
			.insert(stagingRows);
		if (insertError) {
			await locals.supabase.from('import_batches').delete().eq('id', batch.id);
			return fail(500, { error: insertError.message });
		}

		await locals.supabase
			.from('import_batches')
			.update({ duplicate_rows: dupeCount })
			.eq('id', batch.id);

		throw redirect(303, `/finance/import/${batch.id}`);
	},

	cancelBatch: async ({ request, locals }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { error: 'Missing id.' });
		await locals.supabase.from('import_batches').update({ status: 'cancelled' }).eq('id', id);
		return { cancelled: true };
	}
};
