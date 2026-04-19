import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { currentYearMonth, monthRange } from '$lib/finance';

export const load: PageServerLoad = async ({ locals, url }) => {
	const yearMonth = url.searchParams.get('month') ?? currentYearMonth();
	const categoryFilter = url.searchParams.get('category') ?? '';
	const q = url.searchParams.get('q') ?? '';
	const { start, end } = monthRange(yearMonth);

	let query = locals.supabase
		.from('transactions')
		.select('id, posted_at, description, amount, currency, category_id, source, custom, updated_at')
		.is('deleted_at', null)
		.gte('posted_at', start)
		.lte('posted_at', end)
		.order('posted_at', { ascending: false })
		.order('created_at', { ascending: false })
		.limit(500);

	if (categoryFilter === 'uncategorised') {
		query = query.is('category_id', null);
	} else if (categoryFilter) {
		query = query.eq('category_id', categoryFilter);
	}
	if (q) {
		query = query.ilike('description', `%${q}%`);
	}

	const [{ data: transactions }, { data: categories }] = await Promise.all([
		query,
		locals.supabase.from('categories').select('id, name, parent_id, color').order('name')
	]);

	return {
		transactions: transactions ?? [],
		categories: categories ?? [],
		filters: { yearMonth, categoryFilter, q }
	};
};

export const actions: Actions = {
	setCategory: async ({ request, locals }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const categoryRaw = String(form.get('category_id') ?? '');
		const category_id = categoryRaw || null;
		if (!id) return fail(400, { error: 'Missing id.' });

		const { error } = await locals.supabase
			.from('transactions')
			.update({ category_id })
			.eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { updated: true };
	},

	create: async ({ request, locals }) => {
		const form = await request.formData();
		const posted_at = String(form.get('posted_at') ?? '');
		const description = String(form.get('description') ?? '').trim();
		const amount = Number(form.get('amount'));
		const categoryRaw = String(form.get('category_id') ?? '');
		const category_id = categoryRaw || null;

		if (!/^\d{4}-\d{2}-\d{2}$/.test(posted_at)) return fail(400, { error: 'Pick a date.' });
		if (!description) return fail(400, { error: 'Description required.' });
		if (!Number.isFinite(amount)) return fail(400, { error: 'Amount must be a number.' });

		const { error } = await locals.supabase.from('transactions').insert({
			owner_id: locals.user!.id,
			posted_at,
			description,
			amount,
			category_id,
			source: 'manual'
		});
		if (error) {
			if (error.code === '23505') return fail(409, { error: 'Looks like a duplicate.' });
			return fail(500, { error: error.message });
		}
		return { created: true };
	},

	delete: async ({ request, locals }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { error: 'Missing id.' });
		const { error } = await locals.supabase
			.from('transactions')
			.update({ deleted_at: new Date().toISOString() })
			.eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { deleted: true };
	}
};
